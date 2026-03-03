// Live2D 配置类型定义

// ──────────────────────────────────────────────────
//  通用类型（供 useLive2D composable 及任意使用方使用）
// ──────────────────────────────────────────────────

/** 模型配置（通用） */
export interface Live2DModelConfig {
  /** 模型文件 URL（.model.json 或 .model3.json），留空则不加载 */
  url: string;
  /** 模型缩放比例（相对于 canvas 较短边） */
  scale: number;
  /** 模型相对 canvas 中心的 X 轴偏移（像素） */
  x: number;
  /** 模型相对 canvas 中心的 Y 轴偏移（像素） */
  y: number;
}

/** 交互配置（通用） */
export interface Live2DInteractionConfig {
  /** 是否启用视角跟踪鼠标 */
  cursorTracking: boolean;
  /** 是否启用点击切换表情 */
  clickExpression: boolean;
  /** 自动切换表情间隔（毫秒），0 = 仅手动触发 */
  expressionInterval: number;
  /**
   * 点击切换表情后，自动恢复默认表情的延迟（毫秒）。
   * 0 或缺省 = 不自动恢复。
   */
  expressionResetDelay?: number;
  /** 待机动作组名称（留空则不播放） */
  idleMotionGroup: string;
}

// ──────────────────────────────────────────────────
//  引擎全局配置（live2d-engine.json5 对应结构）
// ──────────────────────────────────────────────────

/** Live2D 引擎（SDK）全局配置，全站共享，与模型/展示无关 */
export interface Live2DEngineConfig {
  /**
   * Cubism 4 核心运行时脚本 URL
   * 使用 .model3.json 格式模型时必填，使用 Cubism 2（.model.json）时留空
   */
  cubism4Runtime: string;
  /**
   * Cubism 2 运行时脚本 URL（live2d.min.js）
   * 使用 .model.json 格式模型时必填，使用 Cubism 4（.model3.json）时留空
   */
  cubism2Runtime: string;
}

// ──────────────────────────────────────────────────
//  全局 Widget 专用类型（live2d.json5 对应结构）
// ──────────────────────────────────────────────────

/**
 * 9 点锚点枚举：控制挂件停靠在视口的哪个角/边/中心。
 * 格式为 "垂直-水平"，垂直取 top / middle / bottom，水平取 left / center / right。
 */
export type Live2DAnchor =
  | 'top-left'    | 'top-center'    | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** 全局 Widget 显示配置（仅 Live2DWidget 组件使用） */
export interface Live2DWidgetDisplayConfig {
  /** 挂件宽度（像素） */
  width: number;
  /** 挂件高度（像素） */
  height: number;
  /**
   * 9 点锚点：挂件停靠在视口哪个位置。
   * 例如 "bottom-right" 表示右下角，"bottom-left" 表示左下角。
   */
  anchor: Live2DAnchor;
  /** 沿水平方向相对锚点的额外偏移（像素，正数向内/向右，负数向外/向左） */
  offsetX: number;
  /** 沿垂直方向相对锚点的额外偏移（像素，正数向内/向下，负数向外/向上） */
  offsetY: number;
  /** 整体透明度（0.0 ~ 1.0） */
  opacity: number;
}

/** 全局 Live2D 挂件完整配置（live2d.json5 的对应类型） */
export interface Live2DWidgetConfig {
  model: Live2DModelConfig;
  display: Live2DWidgetDisplayConfig;
  interaction: Live2DInteractionConfig;
}

// ──────────────────────────────────────────────────
//  以下为供未来角色档案页使用的细粒度控制类型
// ──────────────────────────────────────────────────

/** 单个参数描述（用于可视化参数编辑器） */
export interface Live2DParameterInfo {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  default: number;
}

/** 动作定义（用于可视化动作列表） */
export interface Live2DMotionDef {
  group: string;
  index: number;
  name?: string;
  sound?: string;
}

/** 表情定义（用于可视化表情列表） */
export interface Live2DExpressionDef {
  index: number;
  name: string;
}
