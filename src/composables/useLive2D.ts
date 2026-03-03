/**
 * useLive2D — Live2D 模型控制 composable
 *
 * 核心功能：
 *  - 初始化 PIXI.Application + Live2D 模型
 *  - 鼠标视角跟踪（focus）
 *  - 点击随机切换表情
 *  - 自动待机动作
 *
 * 暴露的细粒度 API 供未来角色档案页的可视化编辑器使用：
 *  - expressions / motions / parameters（在模型就绪后填充）
 *  - setExpression(id) / playMotion(group, index) / setParameterValue(id, value)
 */

import { Application, Ticker } from 'pixi.js';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import engineConfig from '@/config/live2d-engine.json5';
import type { Live2DEngineConfig, Live2DExpressionDef, Live2DInteractionConfig, Live2DModelConfig, Live2DMotionDef, Live2DParameterInfo } from '@/types/live2d';
// type-only import 不会触发运行时 side-effect
import type { Live2DModel } from 'pixi-live2d-display';

const engine = engineConfig as Live2DEngineConfig;

// ─── 运行时加载工具 ──────────────────────────────────────────────────

let cubism2RuntimeLoaded = false;
let cubism4RuntimeLoaded = false;

async function loadExternalScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

async function ensureCubism2Runtime(): Promise<void> {
  if (cubism2RuntimeLoaded || !engine.cubism2Runtime) return;
  await loadExternalScript(engine.cubism2Runtime);
  cubism2RuntimeLoaded = true;
}

async function ensureCubism4Runtime(): Promise<void> {
  if (cubism4RuntimeLoaded || !engine.cubism4Runtime) return;
  await loadExternalScript(engine.cubism4Runtime);
  cubism4RuntimeLoaded = true;
}

// ─── Composable ────────────────────────────────────────────────────────

export interface UseLive2DOptions {
  /** 模型配置 */
  model: Live2DModelConfig;
  /** 交互配置 */
  interaction: Live2DInteractionConfig;
  /** canvas 尺寸（由调用方决定，与 widget display 解耦） */
  canvasSize: { width: number; height: number };
  /** canvas 容器元素的 ref */
  containerRef: ReturnType<typeof ref<HTMLElement | null>>;
  /** 模型加载成功回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (err: unknown) => void;
}

export function useLive2D(options: UseLive2DOptions) {
  const { model, interaction, canvasSize, containerRef, onReady, onError } = options;

  // Pixi + model 实例（shallowRef 避免深层响应式）
  const pixiApp = shallowRef<Application | null>(null);
  const liveModel = shallowRef<Live2DModel | null>(null);

  // 模型信息（供可视化编辑器使用）
  const expressions = ref<Live2DExpressionDef[]>([]);
  const motions = ref<Live2DMotionDef[]>([]);
  const parameters = ref<Live2DParameterInfo[]>([]);

  // 状态
  const isReady = ref(false);
  const isLoading = ref(false);

  let expressionTimer: ReturnType<typeof setInterval> | null = null;
  let expressionResetTimer: ReturnType<typeof setTimeout> | null = null;
  let animFrameId: number | null = null;

  // ── 初始化 ────────────────────────────────────────────────────────────

  async function init(): Promise<void> {
    const container = containerRef.value;
    if (!container || !model.url) return;

    isLoading.value = true;

    try {
      // 1. 根据 URL 后缀判断 Cubism 版本，加载对应运行时和分包
      //    注意：必须使用子分包导入而非主入口，主入口在模块初始化时会同时尝试注册两种运行时
      let live2dModelClass: typeof Live2DModel;
      if (model.url.endsWith('.model3.json')) {
        await ensureCubism4Runtime();
        const mod = await import('pixi-live2d-display/cubism4');
        live2dModelClass = mod.Live2DModel as unknown as typeof Live2DModel;
      } else {
        await ensureCubism2Runtime();
        const mod = await import('pixi-live2d-display/cubism2');
        live2dModelClass = mod.Live2DModel as unknown as typeof Live2DModel;
      }
      // 注册 PIXI Ticker（仅首次加载时需要，重复做无害）
      live2dModelClass.registerTicker(Ticker);

      // 2. 创建 PIXI 应用
      const app = new Application({
        view: container.querySelector('canvas') as HTMLCanvasElement,
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundAlpha: 0,        // 透明背景
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });
      pixiApp.value = app;

      // 3. 加载 Live2D 模型
      const live2dModel = await live2dModelClass.from(model.url, {
        autoInteract: false, // 关闭内置交互，我们自己控制
        idleMotionGroup: interaction.idleMotionGroup || undefined,
      });

      liveModel.value = live2dModel;

      // 4. 设置模型尺寸和位置
      const { width: canvasW, height: canvasH } = canvasSize;
      live2dModel.x = canvasW / 2 + model.x;
      live2dModel.y = canvasH / 2 + model.y;
      live2dModel.anchor.set(0.5, 0.5);

      // 基于模型内部尺寸自动适配 canvas，model.scale 直接作为倍率乘数
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalModel = (live2dModel as any).internalModel;
      const modelW: number = internalModel?.originalWidth ?? internalModel?.width ?? canvasW;
      const modelH: number = internalModel?.originalHeight ?? internalModel?.height ?? canvasH;
      const fitScale = Math.min(canvasW / modelW, canvasH / modelH);
      live2dModel.scale.set(fitScale * model.scale);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app.stage.addChild(live2dModel as any);

      // 5. 收集元数据
      collectMetadata(live2dModel);

      // 6. 绑定交互
      bindInteraction(container, live2dModel);

      // 7. 启动表情自动切换
      if (interaction.expressionInterval > 0) {
        expressionTimer = setInterval(() => {
          live2dModel.expression();
        }, interaction.expressionInterval);
      }

      isReady.value = true;
      onReady?.();
    } catch (err) {
      console.error('[useLive2D] 模型加载失败:', err);
      onError?.(err);
    } finally {
      isLoading.value = false;
    }
  }

  // ── 元数据收集 ────────────────────────────────────────────────────────

  function collectMetadata(m: Live2DModel): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // 表情列表
      const exprMgr = m.internalModel.motionManager.expressionManager;
      if (exprMgr) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defs: any[] = (exprMgr as any).definitions ?? [];
        expressions.value = defs.map((d: { Name?: string; name?: string }, i: number) => ({
          index: i,
          name: d.Name ?? d.name ?? `Expression ${i}`,
        }));
      }

      // 动作列表
      const motionMgr = m.internalModel.motionManager;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const motionDefs: Record<string, any[]> = (motionMgr as any).definitions ?? {};
      const collected: Live2DMotionDef[] = [];
      for (const [group, list] of Object.entries(motionDefs)) {
        (list as unknown[]).forEach((_m: unknown, idx: number) => {
          collected.push({ group, index: idx });
        });
      }
      motions.value = collected;

      // 参数列表（Cubism 4）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coreModel = (m.internalModel as any).coreModel;
      if (coreModel?.parameters) {
        const ids: string[] = coreModel.parameters.ids ?? [];
        const values: number[] = coreModel.parameters.values ?? [];
        const minValues: number[] = coreModel.parameters.minimumValues ?? [];
        const maxValues: number[] = coreModel.parameters.maximumValues ?? [];
        const defaultValues: number[] = coreModel.parameters.defaultValues ?? [];
        parameters.value = ids.map((id: string, i: number) => ({
          id,
          name: id,
          value: values[i] ?? 0,
          min: minValues[i] ?? -1,
          max: maxValues[i] ?? 1,
          default: defaultValues[i] ?? 0,
        }));
      }
    } catch {
      // 元数据收集失败不影响正常功能
    }
  }

  // ── 交互绑定 ──────────────────────────────────────────────────────────

  function bindInteraction(container: HTMLElement, m: Live2DModel): void {
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    // ── 1. 视角跟踪 ──────────────────────────────────────────────────────
    if (interaction.cursorTracking) {
      const handleMouseMove = (e: MouseEvent): void => {
        const rect = canvas.getBoundingClientRect();
        m.focus(e.clientX - rect.left, e.clientY - rect.top);
      };
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      cleanups.push(() => document.removeEventListener('mousemove', handleMouseMove));
    }

    // ── 2. 点击切换表情 ──────────────────────────────────────────────────
    if (interaction.clickExpression) {
      const handleClick = (): void => {
        m.expression();
        scheduleExpressionReset(m);
      };
      canvas.addEventListener('click', handleClick);
      cleanups.push(() => canvas.removeEventListener('click', handleClick));

      // 触摸点击支持：touchstart 记录起点，touchend 若为轻触（移动 < 10px）则触发表情
      let touchStartX = 0;
      let touchStartY = 0;
      const handleTouchStart = (e: TouchEvent): void => {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
      };
      const handleTouchEnd = (e: TouchEvent): void => {
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) {
          e.preventDefault(); // 防止再次触发 click
          m.expression();
          scheduleExpressionReset(m);
        }
      };
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      cleanups.push(() => canvas.removeEventListener('touchstart', handleTouchStart));
      cleanups.push(() => canvas.removeEventListener('touchend', handleTouchEnd));
    }

  }

  // 设置表情自动恢复计时器
  function scheduleExpressionReset(m: Live2DModel): void {
    const delay = interaction.expressionResetDelay ?? 0;
    if (delay <= 0) return;
    if (expressionResetTimer) {
      clearTimeout(expressionResetTimer);
    }
    expressionResetTimer = setTimeout(() => {
      try {
        // 调用 ExpressionManager.resetExpression() 恢复 defaultExpression（真正的无表情状态）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exprMgr = (m.internalModel.motionManager as any).expressionManager;
        if (exprMgr?.resetExpression) {
          exprMgr.resetExpression();
        }
      } catch {
        // 忽略
      }
      expressionResetTimer = null;
    }, delay);
  }

  // ── 细粒度控制 API（供角色档案页使用）──────────────────────────────────

  /** 设置指定表情（index 或 name） */
  async function setExpression(id: number | string): Promise<boolean> {
    return liveModel.value?.expression(id) ?? false;
  }

  /** 随机切换表情 */
  async function randomExpression(): Promise<boolean> {
    return liveModel.value?.expression() ?? false;
  }

  /** 播放指定动作 */
  async function playMotion(group: string, index?: number): Promise<boolean> {
    return liveModel.value?.motion(group, index) ?? false;
  }

  /**
   * 强制覆写参数值（Cubism 4，仅在模型就绪后有效）
   * 注意：此值会在下一帧被模型动作覆盖，需要在 tick 中持续设置
   */
  function setParameterValue(id: string, value: number): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coreModel = (liveModel.value?.internalModel as any)?.coreModel;
      if (coreModel?.setParameterValueById) {
        coreModel.setParameterValueById(id, value);
      }
    } catch {
      // 忽略
    }
  }

  /** 同步当前参数值快照（用于可视化编辑器刷新） */
  function refreshParameters(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coreModel = (liveModel.value?.internalModel as any)?.coreModel;
      if (coreModel?.parameters?.values) {
        const vals: number[] = coreModel.parameters.values;
        parameters.value = parameters.value.map((p, i) => ({
          ...p,
          value: vals[i] ?? p.value,
        }));
      }
    } catch {
      // 忽略
    }
  }

  // ── 清理 ─────────────────────────────────────────────────────────────

  const cleanups: (() => void)[] = [];

  function destroy(): void {
    if (expressionTimer) {
      clearInterval(expressionTimer);
      expressionTimer = null;
    }
    if (expressionResetTimer) {
      clearTimeout(expressionResetTimer);
      expressionResetTimer = null;
    }
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    cleanups.forEach(fn => fn());
    cleanups.length = 0;

    if (pixiApp.value) {
      pixiApp.value.destroy(false, { children: true });
      pixiApp.value = null;
    }
    liveModel.value = null;
    isReady.value = false;
  }

  // ── 生命周期钩子 ──────────────────────────────────────────────────────

  onMounted(() => {
    // 等待 containerRef 挂载后初始化
    watch(
      containerRef,
      (el) => {
        if (!el || !model.url) return;
        // 若 PIXI app 已存在，检查其 canvas 是否仍属于当前容器
        // v-if 切换会销毁旧 DOM、创建新 canvas，此时需要销毁旧实例再重建
        if (pixiApp.value) {
          const view = pixiApp.value.view as HTMLCanvasElement;
          if (el.contains(view)) return; // 同一 canvas，无需重建
          destroy(); // canvas 已被替换，销毁旧实例
        }
        void init();
      },
      { immediate: true },
    );
  });

  onBeforeUnmount(() => {
    destroy();
  });

  return {
    // 状态
    isReady,
    isLoading,
    // 元数据（供可视化编辑器使用）
    expressions,
    motions,
    parameters,
    // 控制 API
    setExpression,
    randomExpression,
    playMotion,
    setParameterValue,
    refreshParameters,
    // 底层实例（高级用法）
    pixiApp,
    model: liveModel,
    // 手动销毁
    destroy,
  };
}
