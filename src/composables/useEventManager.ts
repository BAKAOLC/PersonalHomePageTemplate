/**
 * 事件管理 Composable
 * 用于管理组件中的自定义事件，确保在组件销毁时正确清理
 */

import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';

import { getEventManagerService } from '@/services/eventManagerService';

export interface EventManager {
  dispatchEvent: (eventName: string, detail?: any, target?: EventTarget) => void;
  addEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: AddEventListenerOptions,
    target?: EventTarget,
  ) => void;
  removeEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | { passive?: boolean; capture?: boolean },
    target?: EventTarget,
  ) => void;
  removeAllListeners: (target?: EventTarget) => void;
  getActiveListenersCount: (target?: EventTarget) => number;
}

export function useEventManager(): EventManager {
  // 存储事件监听器的映射，key是事件名，value是原始处理器到包装处理器的映射
  const eventListeners = ref<Map<string, Map<Function, EventListener>>>(new Map());

  const dispatchEvent = (eventName: string, detail?: any, target?: EventTarget): void => {
    try {
      getEventManagerService().dispatchEvent(eventName, detail, target);
    } catch (error) {
      console.error(`Error dispatching event '${eventName}':`, error);
    }
  };

  const addEventListener = <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | AddEventListenerOptions,
    target?: EventTarget,
  ): void => {
    try {
      // 创建一个包装函数来适配EventListener类型
      const wrappedHandler: EventListener = (event: Event) => {
        handler(event as T);
      };

      // 添加到事件管理器
      getEventManagerService().addEventListener(eventName, wrappedHandler, target, options);

      // 记录到管理器中，包含选项信息
      if (!eventListeners.value.has(eventName)) {
        eventListeners.value.set(eventName, new Map());
      }
      eventListeners.value.get(eventName)?.set(handler, wrappedHandler);
    } catch (error) {
      console.error(`Error adding event listener for '${eventName}':`, error);
    }
  };

  const removeEventListener = <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | EventListenerOptions,
    target?: EventTarget,
  ): void => {
    try {
      // 从管理器中获取包装处理器
      const handlerMap = eventListeners.value.get(eventName);
      if (handlerMap) {
        const wrappedHandler = handlerMap.get(handler);
        if (wrappedHandler) {
          // 从目标移除包装处理器
          getEventManagerService().removeEventListener(eventName, wrappedHandler, target, options);
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

  const removeAllListeners = (target?: EventTarget): void => {
    try {
      // 移除所有注册的事件监听器
      eventListeners.value.forEach((handlerMap, eventName) => {
        handlerMap.forEach(wrappedHandler => {
          try {
            getEventManagerService().removeEventListener(eventName, wrappedHandler, target);
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

  const getActiveListenersCount = (_target?: EventTarget): number => {
    let count = 0;
    eventListeners.value.forEach(handlerMap => {
      count += handlerMap.size;
    });
    return count;
  };

  // 必须在组件上下文中使用
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useEventManager must be called within Vue component setup function');
  }

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
