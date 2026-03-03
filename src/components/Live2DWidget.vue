<template>
  <!-- 移动端（< 768px）不渲染，至少平板端才显示；未配置模型 URL 时同样不渲染 -->
  <template v-if="config.model.url && !isMobile">
    <!-- Live2D 挂件主体 -->
    <Transition name="live2d-widget">
      <!-- 外层负责定位，不设 opacity，让 Transition CSS 类可以自由控制透明度 -->
      <div
        v-if="live2dStore.isWidgetVisible"
        ref="widgetRef"
        class="live2d-widget"
        :style="widgetPositionStyle"
      >
        <!-- 内层负责用户自定义透明度 -->
        <div class="live2d-widget-inner" :style="{ opacity: widgetOpacity }">
        <!-- canvas 容器 -->
        <div ref="canvasContainerRef" class="live2d-canvas-container">
          <canvas
            :width="config.display.width"
            :height="config.display.height"
            class="live2d-canvas"
          />

          <!-- 加载占位 -->
          <div v-if="isLoading" class="live2d-loading">
            <i class="fas fa-spinner fa-spin"></i>
          </div>

          <!-- 错误提示 -->
          <div v-if="live2dStore.hasError" class="live2d-error">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ t('live2d.loadError') }}</span>
          </div>
        </div>

        <!-- 关闭按钮 -->
        <button
          class="live2d-close-btn"
          :title="t('live2d.close')"
          @click="live2dStore.hideWidget()"
        >
          <i class="fas fa-times"></i>
        </button>
        </div><!-- end live2d-widget-inner -->
      </div>
    </Transition>

    <!-- 唤出按钮（挂件关闭时显示） -->
    <Transition name="live2d-summon">
      <button
        v-if="!live2dStore.isWidgetVisible"
        class="live2d-summon-btn"
        :style="summonBtnStyle"
        :title="t('live2d.show')"
        @click="live2dStore.showWidget()"
      >
        <i class="fas fa-user-circle"></i>
      </button>
    </Transition>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLive2D } from '@/composables/useLive2D';
import { useMobileDetection } from '@/composables/useScreenManager';
import live2dConfig from '@/config/live2d.json5';
import { useLive2DStore } from '@/stores/live2d';
import type { Live2DWidgetConfig } from '@/types/live2d';

const { t } = useI18n();
const live2dStore = useLive2DStore();
const { isMobile } = useMobileDetection();

const config = live2dConfig as Live2DWidgetConfig;

// ── refs ────────────────────────────────────────────────────────────────────
const widgetRef = ref<HTMLElement | null>(null);
const canvasContainerRef = ref<HTMLElement | null>(null);

// ── Live2D 逻辑 ─────────────────────────────────────────────────────────────
// useLive2D 不包含 display 配置，仅传入 model、interaction 和 canvas 尺寸
const { isLoading } = useLive2D({
  model: config.model,
  interaction: config.interaction,
  canvasSize: { width: config.display.width, height: config.display.height },
  containerRef: canvasContainerRef,
  onReady: () => live2dStore.onModelReady(),
  onError: () => live2dStore.onModelError(),
});

// ── 样式计算（9 点锚点 + 偏移）────────────────────────────────────────────────

type VAnchor = 'top' | 'middle' | 'bottom';
type HAnchor = 'left' | 'center' | 'right';

function anchorToStyle(
  anchor: string,
  offsetX: number,
  offsetY: number,
  elementW: number,
  elementH: number,
): Record<string, string> {
  const [vRaw, hRaw] = anchor.split('-');
  const v = vRaw as VAnchor;
  const h = hRaw as HAnchor;
  const styles: Record<string, string> = {};

  // 垂直方向
  if (v === 'top') {
    styles.top = `${offsetY}px`;
  } else if (v === 'bottom') {
    styles.bottom = `${offsetY}px`;
  } else {
    // middle：以视口中心对齐
    styles.top = '50%';
    styles.marginTop = `${-elementH / 2 + offsetY}px`;
  }

  // 水平方向
  if (h === 'left') {
    styles.left = `${offsetX}px`;
  } else if (h === 'right') {
    styles.right = `${offsetX}px`;
  } else {
    // center
    styles.left = '50%';
    styles.marginLeft = `${-elementW / 2 + offsetX}px`;
  }

  return styles;
}

const SUMMON_BTN_SIZE = 38;
/**
 * 唤出按钮固定边距（px），不随 widget 偏移变化。
 * - 水平方向：12px（贴近视口边缘）
 * - bottom 锚点垂直方向：68px（越过 footer，不被遮挡；同时与回到顶部按钮错开）
 * - 其余锚点垂直方向：12px
 */
const SUMMON_BTN_INSET_X = 12;
const SUMMON_BTN_INSET_Y_BOTTOM = 68;
const SUMMON_BTN_INSET_Y_OTHER = 12;

/** 外层：只含定位，不含 opacity（预留给 Transition 类控制） */
const widgetPositionStyle = computed(() => {
  const { anchor, offsetX, offsetY, width, height } = config.display;
  return anchorToStyle(anchor, offsetX, offsetY, width, height);
});

/** 内层：用户自定义透明度（config.display.opacity） */
const widgetOpacity = computed(() => config.display.opacity);

const summonBtnStyle = computed(() => {
  const { anchor } = config.display;
  const [v] = anchor.split('-');
  const insetY = v === 'bottom' ? SUMMON_BTN_INSET_Y_BOTTOM
    : v === 'top' ? SUMMON_BTN_INSET_Y_OTHER
    : SUMMON_BTN_INSET_Y_OTHER;
  // 唤出按钮始终停靠锚点角落，独立于 widget 偏移
  return anchorToStyle(anchor, SUMMON_BTN_INSET_X, insetY, SUMMON_BTN_SIZE, SUMMON_BTN_SIZE);
});
</script>

<style scoped>
/* ── 挂件容器 ───────────────────────────────────────────────────── */
.live2d-widget {
  position: fixed;
  z-index: 100;
  pointer-events: none;
}

/* 内层 wrapper：撑满外层，应用用户自定义 opacity */
.live2d-widget-inner {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}


/* ── canvas 容器 ────────────────────────────────────────────────── */
.live2d-canvas-container {
  position: relative;
  pointer-events: auto;
}

.live2d-canvas {
  display: block;
  cursor: pointer;
}

/* ── 关闭按钮 ────────────────────────────────────────────────────── */
.live2d-close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  z-index: 10;
}

.live2d-widget:hover .live2d-close-btn {
  opacity: 1;
}

.live2d-close-btn:hover {
  background: rgba(220, 38, 38, 0.75);
}

/* ── 唤出按钮 ────────────────────────────────────────────────────── */
.live2d-summon-btn {
  position: fixed;
  z-index: 100;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: var(--color-bg-elevated, rgba(255, 255, 255, 0.85));
  color: var(--color-text-secondary, #666);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
  pointer-events: auto;
}

.live2d-summon-btn:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  transform: scale(1.08);
  background: var(--color-bg-elevated, #fff);
}

/* ── 加载 / 错误状态 ─────────────────────────────────────────────── */
.live2d-loading,
.live2d-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted, #aaa);
  font-size: 13px;
  pointer-events: none;
}

.live2d-loading i {
  font-size: 22px;
}

.live2d-error {
  color: var(--color-danger, #ef4444);
}

/* ── 过渡动画 ────────────────────────────────────────────────────── */

/* Widget 主体：只用 opacity 淡入淡出。
   对含 WebGL canvas 的 fixed 容器施加 transform 动画会导致浏览器提前
   将合成层裁出视口，表现为"平移中途突然消失"，因此禁用 transform。 */
.live2d-widget-enter-active,
.live2d-widget-leave-active {
  transition: opacity 0.35s ease;
}

.live2d-widget-enter-from,
.live2d-widget-leave-to {
  opacity: 0;
}

/* 唤出按钮：缩放 + 淡入淡出 */
.live2d-summon-enter-active,
.live2d-summon-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.live2d-summon-enter-from,
.live2d-summon-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
</style>
