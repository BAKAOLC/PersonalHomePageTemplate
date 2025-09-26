import { ref, computed, onMounted, type ComputedRef, type Ref } from 'vue';

import { useEventManager } from '@/composables/useEventManager';
import { useTimers } from '@/composables/useTimers';

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
  screenInfo: ComputedRef<ScreenInfo>;
  /** 是否为移动端 */
  isMobile: ComputedRef<boolean>;
  /** 是否为平板 */
  isTablet: ComputedRef<boolean>;
  /** 是否为桌面端 */
  isDesktop: ComputedRef<boolean>;
  /** 注册屏幕变化回调 */
  onScreenChange: (callback: ScreenChangeCallback) => () => void;
  /** 手动触发屏幕信息更新 */
  updateScreenInfo: () => void;
  /** 获取当前活跃监听器数量 */
  getActiveListenersCount: () => number;
}

// 全局状态
const screenWidth = ref(0);
const screenHeight = ref(0);
const devicePixelRatio = ref(1);

// 回调函数集合
const callbacks = new Set<ScreenChangeCallback>();

// 防抖定时器
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const { setTimeout, clearTimeout } = useTimers();
const { addEventListener, removeEventListener } = useEventManager();

// 移动端断点配置
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * 计算屏幕信息
 */
const calculateScreenInfo = (): ScreenInfo => {
  const width = screenWidth.value;
  const height = screenHeight.value;
  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width >= TABLET_BREAKPOINT;
  const orientation = width > height ? 'landscape' : 'portrait';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    devicePixelRatio: devicePixelRatio.value,
    orientation,
  };
};

/**
 * 更新屏幕信息
 */
const updateScreenInfo = (): void => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  const newDevicePixelRatio = window.devicePixelRatio || 1;

  // 检查是否有实际变化
  const hasChanged
    = screenWidth.value !== newWidth
    || screenHeight.value !== newHeight
    || devicePixelRatio.value !== newDevicePixelRatio;

  if (hasChanged) {
    screenWidth.value = newWidth;
    screenHeight.value = newHeight;
    devicePixelRatio.value = newDevicePixelRatio;

    // 通知所有回调函数
    const screenInfo = calculateScreenInfo();
    callbacks.forEach(callback => {
      try {
        callback(screenInfo);
      } catch (error) {
        console.error('Screen change callback execution error', error);
      }
    });
  }
};

/**
 * 防抖处理的 resize 事件处理器
 */
const handleResize = (): void => {
  // 清除之前的防抖定时器
  if (resizeDebounceTimer !== null) {
    clearTimeout(resizeDebounceTimer);
  }

  // 设置新的防抖定时器
  resizeDebounceTimer = setTimeout(() => {
    updateScreenInfo();
    resizeDebounceTimer = null;
  }, 100); // 100ms 防抖延迟
};

/**
 * 立即处理的 resize 事件（用于移动端状态切换等需要立即响应的场景）
 */
const handleResizeImmediate = (): void => {
  updateScreenInfo();
};

// 全局事件监听器是否已初始化
let isGlobalListenerInitialized = false;

/**
 * 初始化全局事件监听器
 */
const initializeGlobalListener = (): void => {
  if (isGlobalListenerInitialized) return;

  // 初始化屏幕信息
  updateScreenInfo();

  // 添加事件监听器
  addEventListener('resize', handleResize);
  addEventListener('orientationchange', handleResizeImmediate);

  isGlobalListenerInitialized = true;
};

/**
 * 清理全局事件监听器
 */
const cleanupGlobalListener = (): void => {
  if (!isGlobalListenerInitialized) return;

  removeEventListener('resize', handleResize);
  removeEventListener('orientationchange', handleResizeImmediate);

  // 清理防抖定时器
  if (resizeDebounceTimer !== null) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }

  isGlobalListenerInitialized = false;
};

/**
 * 屏幕管理器 Composable
 */
export function useScreenManager(): ScreenManager {
  // 计算属性
  const screenInfo = computed(() => calculateScreenInfo());
  const isMobile = computed(() => screenInfo.value.isMobile);
  const isTablet = computed(() => screenInfo.value.isTablet);
  const isDesktop = computed(() => screenInfo.value.isDesktop);

  /**
   * 注册屏幕变化回调
   */
  const onScreenChange = (callback: ScreenChangeCallback): (() => void) => {
    // 确保全局监听器已初始化
    if (callbacks.size === 0) {
      initializeGlobalListener();
    }

    // 添加回调
    callbacks.add(callback);

    // 立即调用一次回调，传递当前屏幕信息
    try {
      callback(screenInfo.value);
    } catch (error) {
      console.error('Screen change callback initialization error', error);
    }

    // 返回取消注册函数
    return () => {
      callbacks.delete(callback);

      // 如果没有回调了，清理全局监听器
      if (callbacks.size === 0) {
        cleanupGlobalListener();
      }
    };
  };

  /**
   * 获取当前活跃监听器数量
   */
  const getActiveListenersCount = (): number => {
    return callbacks.size;
  };

  // 组件挂载时确保全局监听器已初始化
  onMounted(() => {
    if (callbacks.size > 0) {
      initializeGlobalListener();
    }
  });

  // 组件卸载时不自动清理全局监听器，因为可能有其他组件在使用
  // 全局监听器会在所有回调都被移除时自动清理

  return {
    screenInfo,
    isMobile,
    isTablet,
    isDesktop,
    onScreenChange,
    updateScreenInfo,
    getActiveListenersCount,
  };
}

/**
 * 简化版的移动端检测 Hook
 * 适用于只需要移动端状态的组件
 */
export function useMobileDetection(): {
  isMobile: Ref<boolean>;
  isTablet: Ref<boolean>;
  isDesktop: Ref<boolean>;
  onScreenChange: (callback: (isMobile: boolean, isTablet: boolean, isDesktop: boolean) => void) => () => void;
} {
  const { isMobile, isTablet, isDesktop, onScreenChange } = useScreenManager();

  return {
    isMobile,
    isTablet,
    isDesktop,
    onScreenChange: (callback: (isMobile: boolean, isTablet: boolean, isDesktop: boolean) => void) => {
      return onScreenChange((info) => {
        callback(info.isMobile, info.isTablet, info.isDesktop);
      });
    },
  };
}

/**
 * 屏幕尺寸检测 Hook
 * 适用于需要具体尺寸信息的组件
 */
export function useScreenSize(): {
  width: ComputedRef<number>;
  height: ComputedRef<number>;
  onScreenChange: (callback: (width: number, height: number) => void) => () => void;
} {
  const { screenInfo, onScreenChange } = useScreenManager();

  return {
    width: computed(() => screenInfo.value.width),
    height: computed(() => screenInfo.value.height),
    onScreenChange: (callback: (width: number, height: number) => void) => {
      return onScreenChange((info) => {
        callback(info.width, info.height);
      });
    },
  };
}
