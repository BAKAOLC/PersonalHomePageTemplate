/**
 * 定时器管理 Composable
 * 用于管理组件中的 setTimeout 和 setInterval，确保在组件销毁时正确清理
 */

import { ref, onBeforeUnmount } from 'vue';

export interface TimerManager {
  setTimeout: (callback: () => void, delay: number) => number;
  setInterval: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  clearAll: () => void;
  getActiveTimersCount: () => { timeouts: number; intervals: number };
}

export function useTimers(): TimerManager {
  const timeouts = ref<Set<number>>(new Set());
  const intervals = ref<Set<number>>(new Set());

  const managedSetTimeout = (callback: () => void, delay: number): number => {
    const id = window.setTimeout(() => {
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

  const managedSetInterval = (callback: () => void, delay: number): number => {
    const id = window.setInterval(() => {
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
      window.clearTimeout(id);
      timeouts.value.delete(id);
    }
  };

  const managedClearInterval = (id: number): void => {
    if (intervals.value.has(id)) {
      window.clearInterval(id);
      intervals.value.delete(id);
    }
  };

  const clearAll = (): void => {
    // 清理所有 setTimeout
    timeouts.value.forEach(id => {
      window.clearTimeout(id);
    });
    timeouts.value.clear();

    // 清理所有 setInterval
    intervals.value.forEach(id => {
      window.clearInterval(id);
    });
    intervals.value.clear();
  };

  const getActiveTimersCount = (): { timeouts: number; intervals: number } => {
    return {
      timeouts: timeouts.value.size,
      intervals: intervals.value.size,
    };
  };

  // 组件销毁时自动清理所有定时器
  onBeforeUnmount(() => {
    clearAll();
  });

  return {
    setTimeout: managedSetTimeout,
    setInterval: managedSetInterval,
    clearTimeout: managedClearTimeout,
    clearInterval: managedClearInterval,
    clearAll,
    getActiveTimersCount,
  };
}
