/**
 * 事件管理 Composable
 * 用于管理组件中的自定义事件，确保在组件销毁时正确清理
 */

import { ref, onBeforeUnmount } from 'vue';

export interface EventManager {
  dispatchEvent: (eventName: string, detail?: any) => void;
  addEventListener: (eventName: string, handler: EventListener) => void;
  removeEventListener: (eventName: string, handler: EventListener) => void;
  removeAllListeners: () => void;
  getActiveListenersCount: () => number;
}

export function useEventManager(): EventManager {
  // 存储事件监听器的映射
  const eventListeners = ref<Map<string, Set<EventListener>>>(new Map());

  const dispatchEvent = (eventName: string, detail?: any): void => {
    try {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    } catch (error) {
      console.error(`Error dispatching event '${eventName}':`, error);
    }
  };

  const addEventListener = (eventName: string, handler: EventListener): void => {
    try {
      // 添加到window
      window.addEventListener(eventName, handler);

      // 记录到管理器中
      if (!eventListeners.value.has(eventName)) {
        eventListeners.value.set(eventName, new Set());
      }
      eventListeners.value.get(eventName)!.add(handler);
    } catch (error) {
      console.error(`Error adding event listener for '${eventName}':`, error);
    }
  };

  const removeEventListener = (eventName: string, handler: EventListener): void => {
    try {
      // 从window移除
      window.removeEventListener(eventName, handler);

      // 从管理器中移除
      const handlers = eventListeners.value.get(eventName);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventListeners.value.delete(eventName);
        }
      }
    } catch (error) {
      console.error(`Error removing event listener for '${eventName}':`, error);
    }
  };

  const removeAllListeners = (): void => {
    try {
      // 移除所有注册的事件监听器
      eventListeners.value.forEach((handlers, eventName) => {
        handlers.forEach(handler => {
          try {
            window.removeEventListener(eventName, handler);
          } catch (error) {
            console.error(`Error removing event listener for '${eventName}':`, error);
          }
        });
      });
      eventListeners.value.clear();
    } catch (error) {
      console.error('Error removing all event listeners:', error);
    }
  };

  const getActiveListenersCount = (): number => {
    let count = 0;
    eventListeners.value.forEach(handlers => {
      count += handlers.size;
    });
    return count;
  };

  // 组件销毁时自动清理所有事件监听器
  onBeforeUnmount(() => {
    removeAllListeners();
  });

  return {
    dispatchEvent,
    addEventListener,
    removeEventListener,
    removeAllListeners,
    getActiveListenersCount,
  };
}
