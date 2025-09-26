// 屏幕管理服务 - 使用单例模式管理屏幕尺寸变化

import { getEventManagerService } from './eventManagerService';
import { getTimerService } from './timerService';

/**
 * 屏幕尺寸变化回调函数类型
 */
export interface ScreenChangeCallback {
  (screenInfo: ScreenInfo): void;
}

/**
 * 屏幕信息接口
 */
export interface ScreenInfo {
  /** 窗口宽度 */
  width: number;
  /** 窗口高度 */
  height: number;
  /** 是否为移动端 */
  isMobile: boolean;
  /** 是否为平板 */
  isTablet: boolean;
  /** 是否为桌面端 */
  isDesktop: boolean;
  /** 设备像素比 */
  devicePixelRatio: number;
  /** 屏幕方向 */
  orientation: 'portrait' | 'landscape';
}

/**
 * 屏幕管理器接口
 */
export interface ScreenManager {
  /** 当前屏幕信息 */
  getScreenInfo: () => ScreenInfo;
  /** 是否为移动端 */
  getIsMobile: () => boolean;
  /** 是否为平板 */
  getIsTablet: () => boolean;
  /** 是否为桌面端 */
  getIsDesktop: () => boolean;
  /** 注册屏幕变化回调 */
  onScreenChange: (callback: ScreenChangeCallback) => () => void;
  /** 手动触发屏幕信息更新 */
  updateScreenInfo: () => void;
  /** 获取当前活跃监听器数量 */
  getActiveListenersCount: () => number;
  /** 销毁服务 */
  destroy: () => void;
}

class ScreenManagerService implements ScreenManager {
  private screenWidth = 0;
  private screenHeight = 0;
  private devicePixelRatio = 1;
  private callbacks = new Set<ScreenChangeCallback>();
  private resizeDebounceTimer: number | null = null;
  private isDestroyed = false;
  private isInitialized = false;
  private timerService = getTimerService();
  private eventService = getEventManagerService();

  // 移动端断点配置
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly TABLET_BREAKPOINT = 1024;

  constructor() {
    // 页面卸载时清理
    if (typeof window !== 'undefined') {
      this.eventService.addEventListener('beforeunload', this.destroy.bind(this));
    }
  }

  // 检查是否已销毁
  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('ScreenManagerService has been destroyed.');
    }
  }

  // 检查是否已初始化
  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ScreenManagerService has not been initialized. Call initialize() first.');
    }
  }

  /**
   * 初始化服务
   */
  initialize(): void {
    this.checkDestroyed();

    if (this.isInitialized) {
      return;
    }

    // 初始化屏幕信息
    this.updateScreenInfo();

    // 添加事件监听器
    this.eventService.addEventListener('resize', this.handleResize.bind(this));
    this.eventService.addEventListener('orientationchange', this.handleResizeImmediate.bind(this));

    this.isInitialized = true;
  }

  /**
   * 注册组件级别的屏幕变化回调
   * 返回取消注册函数
   */
  registerCallback(callback: ScreenChangeCallback): (() => void) {
    this.checkDestroyed();

    // 确保服务已初始化
    if (!this.isInitialized) {
      this.initialize();
    }

    // 添加回调
    this.callbacks.add(callback);

    // 立即调用一次回调，传递当前屏幕信息
    try {
      callback(this.calculateScreenInfo());
    } catch (error) {
      console.error('Screen change callback initialization error', error);
    }

    // 返回取消注册函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 计算屏幕信息
   */
  private calculateScreenInfo(): ScreenInfo {
    const width = this.screenWidth;
    const height = this.screenHeight;
    const isMobile = width < this.MOBILE_BREAKPOINT;
    const isTablet = width >= this.MOBILE_BREAKPOINT && width < this.TABLET_BREAKPOINT;
    const isDesktop = width >= this.TABLET_BREAKPOINT;
    const orientation = width > height ? 'landscape' : 'portrait';

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      devicePixelRatio: this.devicePixelRatio,
      orientation,
    };
  }

  /**
   * 更新屏幕信息
   */
  updateScreenInfo(): void {
    this.checkDestroyed();

    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    const newDevicePixelRatio = window.devicePixelRatio || 1;

    // 检查是否有实际变化
    const hasChanged
      = this.screenWidth !== newWidth
      || this.screenHeight !== newHeight
      || this.devicePixelRatio !== newDevicePixelRatio;

    if (hasChanged) {
      this.screenWidth = newWidth;
      this.screenHeight = newHeight;
      this.devicePixelRatio = newDevicePixelRatio;

      // 通知所有回调函数
      const screenInfo = this.calculateScreenInfo();
      this.callbacks.forEach(callback => {
        try {
          callback(screenInfo);
        } catch (error) {
          console.error('Screen change callback execution error', error);
        }
      });
    }
  }

  /**
   * 防抖处理的 resize 事件处理器
   */
  private handleResize(): void {
    this.checkDestroyed();

    // 清除之前的防抖定时器
    if (this.resizeDebounceTimer !== null) {
      this.timerService.clearTimeout(this.resizeDebounceTimer);
    }

    // 设置新的防抖定时器
    this.resizeDebounceTimer = this.timerService.setTimeout(() => {
      this.updateScreenInfo();
      this.resizeDebounceTimer = null;
    }, 100); // 100ms 防抖延迟
  }

  /**
   * 立即处理的 resize 事件（用于移动端状态切换等需要立即响应的场景）
   */
  private handleResizeImmediate(): void {
    this.checkDestroyed();
    this.updateScreenInfo();
  }

  getScreenInfo(): ScreenInfo {
    this.checkDestroyed();
    this.checkInitialized();
    return this.calculateScreenInfo();
  }

  getIsMobile(): boolean {
    this.checkDestroyed();
    this.checkInitialized();
    return this.screenWidth < this.MOBILE_BREAKPOINT;
  }

  getIsTablet(): boolean {
    this.checkDestroyed();
    this.checkInitialized();
    return this.screenWidth >= this.MOBILE_BREAKPOINT && this.screenWidth < this.TABLET_BREAKPOINT;
  }

  getIsDesktop(): boolean {
    this.checkDestroyed();
    this.checkInitialized();
    return this.screenWidth >= this.TABLET_BREAKPOINT;
  }

  onScreenChange(callback: ScreenChangeCallback): (() => void) {
    this.checkDestroyed();

    // 确保服务已初始化
    if (!this.isInitialized) {
      this.initialize();
    }

    // 添加回调
    this.callbacks.add(callback);

    // 立即调用一次回调，传递当前屏幕信息
    try {
      callback(this.calculateScreenInfo());
    } catch (error) {
      console.error('Screen change callback initialization error', error);
    }

    // 返回取消注册函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getActiveListenersCount(): number {
    this.checkDestroyed();
    return this.callbacks.size;
  }

  // 销毁服务
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    // 清理事件监听器
    if (this.isInitialized) {
      this.eventService.removeEventListener('resize', this.handleResize.bind(this));
      this.eventService.removeEventListener('orientationchange', this.handleResizeImmediate.bind(this));
    }

    // 清理防抖定时器
    if (this.resizeDebounceTimer !== null) {
      this.timerService.clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }

    // 清理所有回调
    this.callbacks.clear();

    this.isDestroyed = true;
    this.isInitialized = false;
  }
}

// 创建全局单例
const screenManagerService = new ScreenManagerService();

// 获取实例
export const getScreenManagerService = (): ScreenManagerService => {
  return screenManagerService;
};

// 导出类型
export type { ScreenManager as ScreenManagerService };
