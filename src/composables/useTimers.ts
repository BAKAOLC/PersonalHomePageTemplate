/**
 * 定时器管理 Composable
 * 用于管理组件中的 setTimeout、setInterval 和 requestAnimationFrame，确保在组件销毁时正确清理
 */

import { getCurrentInstance, onBeforeUnmount } from 'vue';

import { getTimerService } from '@/services/timerService';

export interface TimerManager {
  setTimeout: (callback: () => void, delay: number) => number;
  setInterval: (callback: () => void, delay: number) => number;
  requestAnimationFrame: (callback: (timestamp: number) => void) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  cancelAnimationFrame: (id: number) => void;
  clearAll: () => void;
  getActiveTimersCount: () => { timeouts: number; intervals: number; animationFrames: number };
}

export function useTimers(): TimerManager {
  const timerService = getTimerService();
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  const animationFrames = new Set<number>();

  const managedSetTimeout = (callback: () => void, delay: number): number => {
    const id = timerService.setTimeout(() => {
      try {
        // 执行回调
        callback();
      } catch (error) {
        // 记录错误但不阻止清理过程
        console.error('Timer callback error:', error);
      } finally {
        // 无论回调是否成功，都要从管理列表中移除定时器
        timeouts.delete(id);
      }
    }, delay);

    timeouts.add(id);
    return id;
  };

  const managedSetInterval = (callback: () => void, delay: number): number => {
    const id = timerService.setInterval(() => {
      try {
        // 执行回调
        callback();
      } catch (error) {
        // 记录错误但不停止定时器执行
        console.error('Interval callback error:', error);
      }
    }, delay);
    intervals.add(id);
    return id;
  };

  const managedClearTimeout = (id: number): void => {
    if (timeouts.has(id)) {
      timerService.clearTimeout(id);
      timeouts.delete(id);
    }
  };

  const managedClearInterval = (id: number): void => {
    if (intervals.has(id)) {
      timerService.clearInterval(id);
      intervals.delete(id);
    }
  };

  const managedRequestAnimationFrame = (callback: (timestamp: number) => void): number => {
    const id = timerService.requestAnimationFrame((timestamp) => {
      try {
        // 执行回调
        callback(timestamp);
      } catch (error) {
        // 记录错误但不阻止清理过程
        console.error('AnimationFrame callback error:', error);
      } finally {
        // 无论回调是否成功，都要从管理列表中移除动画帧
        animationFrames.delete(id);
      }
    });

    animationFrames.add(id);
    return id;
  };

  const managedCancelAnimationFrame = (id: number): void => {
    if (animationFrames.has(id)) {
      timerService.cancelAnimationFrame(id);
      animationFrames.delete(id);
    }
  };

  const clearAll = (): void => {
    // 清理所有 setTimeout
    timeouts.forEach(id => {
      timerService.clearTimeout(id);
    });
    timeouts.clear();

    // 清理所有 setInterval
    intervals.forEach(id => {
      timerService.clearInterval(id);
    });
    intervals.clear();

    // 清理所有 requestAnimationFrame
    animationFrames.forEach(id => {
      timerService.cancelAnimationFrame(id);
    });
    animationFrames.clear();
  };

  const getActiveTimersCount = (): { timeouts: number; intervals: number; animationFrames: number } => {
    return {
      timeouts: timeouts.size,
      intervals: intervals.size,
      animationFrames: animationFrames.size,
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
