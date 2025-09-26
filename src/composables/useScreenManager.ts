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

  // 计算属性
  const screenInfo = computed(() => screenManagerService.getScreenInfo());
  const isMobile = computed(() => screenManagerService.getIsMobile());
  const isTablet = computed(() => screenManagerService.getIsTablet());
  const isDesktop = computed(() => screenManagerService.getIsDesktop());

  /**
   * 注册屏幕变化回调
   */
  const onScreenChange = (callback: ScreenChangeCallback): (() => void) => {
    // 添加到组件级别的回调集合
    componentCallbacks.value.add(callback);

    // 注册到服务
    const unregister = screenManagerService.registerCallback(callback);
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
    screenInfo,
    isMobile,
    isTablet,
    isDesktop,
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
