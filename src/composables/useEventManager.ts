/* eslint-disable no-restricted-syntax */
/**
 * 事件管理 Composable
 * 用于管理组件中的自定义事件，确保在组件销毁时正确清理
 */

import { ref, onBeforeUnmount, getCurrentInstance } from 'vue';

export interface EventManager {
  dispatchEvent: (eventName: string, detail?: any) => void;
  addEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | { passive?: boolean; once?: boolean; capture?: boolean }
  ) => void;
  removeEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | { passive?: boolean; capture?: boolean }
  ) => void;
  removeAllListeners: () => void;
  getActiveListenersCount: () => number;
}

export function useEventManager(): EventManager {
  // 存储事件监听器的映射，key是事件名，value是原始处理器到包装处理器的映射
  const eventListeners = ref<Map<string, Map<Function, EventListener>>>(new Map());

  const dispatchEvent = (eventName: string, detail?: any): void => {
    try {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    } catch (error) {
      console.error(`Error dispatching event '${eventName}':`, error);
    }
  };

  const addEventListener = <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | { passive?: boolean; once?: boolean; capture?: boolean },
  ): void => {
    try {
      // 创建一个包装函数来适配EventListener类型
      const wrappedHandler: EventListener = (event: Event) => {
        handler(event as T);
      };

      // 添加到window
      window.addEventListener(eventName, wrappedHandler, options);

      // 记录到管理器中
      if (!eventListeners.value.has(eventName)) {
        eventListeners.value.set(eventName, new Map());
      }
      eventListeners.value.get(eventName)!.set(handler, wrappedHandler);
    } catch (error) {
      console.error(`Error adding event listener for '${eventName}':`, error);
    }
  };

  const removeEventListener = <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | { passive?: boolean; capture?: boolean },
  ): void => {
    try {
      // 从管理器中获取包装处理器
      const handlerMap = eventListeners.value.get(eventName);
      if (handlerMap) {
        const wrappedHandler = handlerMap.get(handler);
        if (wrappedHandler) {
          // 从window移除包装处理器
          window.removeEventListener(eventName, wrappedHandler, options);
          // 从管理器中移除
          handlerMap.delete(handler);
          if (handlerMap.size === 0) {
            eventListeners.value.delete(eventName);
          }
        }
      }
    } catch (error) {
      console.error(`Error removing event listener for '${eventName}':`, error);
    }
  };

  const removeAllListeners = (): void => {
    try {
      // 移除所有注册的事件监听器
      eventListeners.value.forEach((handlerMap, eventName) => {
        handlerMap.forEach(wrappedHandler => {
          try {
            window.removeEventListener(eventName, wrappedHandler);
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
    eventListeners.value.forEach(handlerMap => {
      count += handlerMap.size;
    });
    return count;
  };

  // 组件销毁时自动清理所有事件监听器（仅在组件上下文中）
  const instance = getCurrentInstance();
  if (instance) {
    onBeforeUnmount(() => {
      removeAllListeners();
    });
  }

  return {
    dispatchEvent,
    addEventListener,
    removeEventListener,
    removeAllListeners,
    getActiveListenersCount,
  };
}
