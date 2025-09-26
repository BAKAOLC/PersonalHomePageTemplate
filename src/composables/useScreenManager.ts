import { computed, getCurrentInstance, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue';

import { getScreenManagerService, type ScreenChangeCallback, type ScreenInfo } from '@/services/screenManagerService';

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
  /** 是否为大屏幕桌面端 */
  isLargeDesktop: ComputedRef<boolean>;
  /** 是否为小屏手机 */
  isSmallMobile: ComputedRef<boolean>;
  /** 是否为极小屏幕 */
  isTinyMobile: ComputedRef<boolean>;
  /** 注册屏幕变化回调 */
  onScreenChange: (callback: ScreenChangeCallback) => () => void;
  /** 手动触发屏幕信息更新 */
  updateScreenInfo: () => void;
  /** 获取当前活跃监听器数量 */
  getActiveListenersCount: () => number;
}

// 导出类型
export type { ScreenChangeCallback, ScreenInfo };

/**
 * 屏幕管理器 Composable
 */
export function useScreenManager(): ScreenManager {
  // 必须在组件上下文中使用
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useScreenManager must be called within Vue component setup function');
  }

  const screenManagerService = getScreenManagerService();

  // 组件级别的回调管理
  const componentCallbacks = ref<Set<ScreenChangeCallback>>(new Set());
  const unregisterFunctions = ref<Set<() => void>>(new Set());

  // 响应式屏幕信息
  const screenInfo = ref<ScreenInfo>(screenManagerService.getScreenInfo());

  // 计算属性
  const isMobile = computed(() => screenInfo.value.isMobile);
  const isTablet = computed(() => screenInfo.value.isTablet);
  const isDesktop = computed(() => screenInfo.value.isDesktop);
  const isLargeDesktop = computed(() => screenInfo.value.isLargeDesktop);
  const isSmallMobile = computed(() => screenInfo.value.isSmallMobile);
  const isTinyMobile = computed(() => screenInfo.value.isTinyMobile);

  /**
   * 注册屏幕变化回调
   */
  const onScreenChange = (callback: ScreenChangeCallback): (() => void) => {
    // 添加到组件级别的回调集合
    componentCallbacks.value.add(callback);

    // 创建包装的回调函数，同时更新响应式数据
    const wrappedCallback = (info: ScreenInfo): void => {
      screenInfo.value = info;
      callback(info);
    };

    // 注册到服务
    const unregister = screenManagerService.registerCallback(wrappedCallback);
    unregisterFunctions.value.add(unregister);

    // 返回取消注册函数
    return () => {
      componentCallbacks.value.delete(callback);
      unregisterFunctions.value.delete(unregister);
      unregister();
    };
  };

  /**
   * 获取当前活跃监听器数量
   */
  const getActiveListenersCount = (): number => {
    return componentCallbacks.value.size;
  };

  // 组件销毁时自动清理所有回调
  onBeforeUnmount(() => {
    unregisterFunctions.value.forEach(unregister => {
      unregister();
    });
    componentCallbacks.value.clear();
    unregisterFunctions.value.clear();
  });

  return {
    screenInfo: computed(() => screenInfo.value),
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallMobile,
    isTinyMobile,
    onScreenChange,
    updateScreenInfo: screenManagerService.updateScreenInfo.bind(screenManagerService),
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
  isLargeDesktop: Ref<boolean>;
  isSmallMobile: Ref<boolean>;
  isTinyMobile: Ref<boolean>;
  onScreenChange: (callback: (info: ScreenInfo) => void) => () => void;
} {
  const {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallMobile,
    isTinyMobile,
    onScreenChange,
  } = useScreenManager();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallMobile,
    isTinyMobile,
    onScreenChange: (
      callback: (info: ScreenInfo) => void,
    ) => {
      return onScreenChange(callback);
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
