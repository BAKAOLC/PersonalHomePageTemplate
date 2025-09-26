/**
 * 定时器管理 Composable
 * 用于管理组件中的 setTimeout、setInterval 和 requestAnimationFrame，确保在组件销毁时正确清理
 */

import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';

import { getTimerService } from '@/services/timerService';

export interface TimerManager {
  setTimeout: (callback: (...args: any[]) => void, delay: number) => number;
  setInterval: (callback: (...args: any[]) => void, delay: number) => number;
  requestAnimationFrame: (callback: (timestamp: number) => void) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  cancelAnimationFrame: (id: number) => void;
  clearAll: () => void;
  getActiveTimersCount: () => { timeouts: number; intervals: number; animationFrames: number };
}

export function useTimers(): TimerManager {
  const timeouts = ref<Set<number>>(new Set());
  const intervals = ref<Set<number>>(new Set());
  const animationFrames = ref<Set<number>>(new Set());

  const managedSetTimeout = (callback: (...args: any[]) => void, delay: number): number => {
    const id = getTimerService().setTimeout(() => {
      try {
        // 执行回调
        callback();
      } catch (error) {
        // 记录错误但不阻止清理过程
        console.error('Timer callback error:', error);
      } finally {
        // 无论回调是否成功，都要从管理列表中移除定时器
        timeouts.value.delete(id);
      }
    }, delay);

    timeouts.value.add(id);
    return id;
  };

  const managedSetInterval = (callback: (...args: any[]) => void, delay: number): number => {
    const id = getTimerService().setInterval(() => {
      try {
        // 执行回调
        callback();
      } catch (error) {
        // 记录错误但不停止定时器执行
        console.error('Interval callback error:', error);
      }
    }, delay);
    intervals.value.add(id);
    return id;
  };

  const managedClearTimeout = (id: number): void => {
    if (timeouts.value.has(id)) {
      getTimerService().clearTimeout(id);
      timeouts.value.delete(id);
    }
  };

  const managedClearInterval = (id: number): void => {
    if (intervals.value.has(id)) {
      getTimerService().clearInterval(id);
      intervals.value.delete(id);
    }
  };

  const managedRequestAnimationFrame = (callback: (timestamp: number) => void): number => {
    const id = getTimerService().requestAnimationFrame((timestamp) => {
      try {
        // 执行回调
        callback(timestamp);
      } catch (error) {
        // 记录错误但不阻止清理过程
        console.error('AnimationFrame callback error:', error);
      } finally {
        // 无论回调是否成功，都要从管理列表中移除动画帧
        animationFrames.value.delete(id);
      }
    });

    animationFrames.value.add(id);
    return id;
  };

  const managedCancelAnimationFrame = (id: number): void => {
    if (animationFrames.value.has(id)) {
      getTimerService().cancelAnimationFrame(id);
      animationFrames.value.delete(id);
    }
  };

  const clearAll = (): void => {
    // 清理所有 setTimeout
    timeouts.value.forEach(id => {
      getTimerService().clearTimeout(id);
    });
    timeouts.value.clear();

    // 清理所有 setInterval
    intervals.value.forEach(id => {
      getTimerService().clearInterval(id);
    });
    intervals.value.clear();

    // 清理所有 requestAnimationFrame
    animationFrames.value.forEach(id => {
      getTimerService().cancelAnimationFrame(id);
    });
    animationFrames.value.clear();
  };

  const getActiveTimersCount = (): { timeouts: number; intervals: number; animationFrames: number } => {
    return {
      timeouts: timeouts.value.size,
      intervals: intervals.value.size,
      animationFrames: animationFrames.value.size,
    };
  };

  // 必须在组件上下文中使用
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useTimers must be called within Vue component setup function');
  }

  // 组件销毁时自动清理所有定时器
  onBeforeUnmount(() => {
    clearAll();
  });

  return {
    setTimeout: managedSetTimeout,
    setInterval: managedSetInterval,
    requestAnimationFrame: managedRequestAnimationFrame,
    clearTimeout: managedClearTimeout,
    clearInterval: managedClearInterval,
    cancelAnimationFrame: managedCancelAnimationFrame,
    clearAll,
    getActiveTimersCount,
  };
}
