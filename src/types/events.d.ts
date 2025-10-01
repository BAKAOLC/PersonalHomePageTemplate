// 错误处理回调类型
export type ErrorCallback = (error?: Error) => void;
export type ProgressCallback = (progress?: number) => void;
export type LoadCallback = () => void;

// 通用事件处理器类型
export type EventHandler<T = Event> = (event: T) => void;
export type KeyboardEventHandler = EventHandler<KeyboardEvent>;
export type MouseEventHandler = EventHandler<MouseEvent>;
export type TouchEventHandler = EventHandler<TouchEvent>;

// 全屏查看器方法类型
export interface FullscreenViewerMethods {
  show: (index: number) => void;
  hide: () => void;
  next: () => void;
  prev: () => void;
}

// 图片操作方法类型
export interface ImageOperationMethods {
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
}

// 键盘快捷键配置
export interface KeyboardShortcuts {
  [key: string]: () => void;
}
