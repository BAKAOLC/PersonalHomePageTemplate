/**
 * 事件管理 Composable
 * 用于管理组件中的自定义事件，确保在组件销毁时正确清理
 */

import { getCurrentInstance, onBeforeUnmount } from 'vue';

import { getEventManagerService } from '@/services/eventManagerService';

export interface EventManager {
  dispatchEvent: (eventName: string, detail?: unknown, target?: EventTarget) => void;
  addEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | AddEventListenerOptions,
    target?: EventTarget,
  ) => void;
  removeEventListener: <T extends Event = Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: boolean | EventListenerOptions,
    target?: EventTarget,
  ) => void;
  removeAllListeners: (target?: EventTarget) => void;
  getActiveListenersCount: (target?: EventTarget) => number;
}

type RegisteredHandler = (event: Event) => void;

interface ListenerRegistration {
  eventName: string;
  handler: RegisteredHandler;
  wrappedHandler: EventListener;
  capture: boolean;
  options?: boolean | AddEventListenerOptions;
  target?: EventTarget;
}

const getCaptureOption = (options?: boolean | EventListenerOptions): boolean => {
  if (typeof options === 'boolean') {
    return options;
  }

  return options?.capture === true;
};

export function useEventManager(): EventManager {
  let eventListeners: ListenerRegistration[] = [];

  const dispatchEvent = (eventName: string, detail?: unknown, target?: EventTarget): void => {
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
      const registeredHandler = handler as RegisteredHandler;
      const capture = getCaptureOption(options);
      const existingRegistration = eventListeners.find(registration => (
        registration.eventName === eventName
        && registration.handler === registeredHandler
        && registration.capture === capture
        && registration.target === target
      ));
      if (existingRegistration) {
        return;
      }

      // 创建一个包装函数来适配EventListener类型
      const wrappedHandler: EventListener = (event: Event) => {
        handler(event as T);
      };

      // 添加到事件管理器
      getEventManagerService().addEventListener(eventName, wrappedHandler, target, options);

      eventListeners.push({
        eventName,
        handler: registeredHandler,
        wrappedHandler,
        capture,
        options,
        target,
      });
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
      const registeredHandler = handler as RegisteredHandler;
      const capture = getCaptureOption(options);
      const registrationIndex = eventListeners.findIndex(registration => (
        registration.eventName === eventName
        && registration.handler === registeredHandler
        && registration.capture === capture
        && registration.target === target
      ));

      if (registrationIndex !== -1) {
        const [registration] = eventListeners.splice(registrationIndex, 1);
        getEventManagerService().removeEventListener(
          registration.eventName,
          registration.wrappedHandler,
          registration.target,
          options ?? registration.options,
        );
      }
    } catch (error) {
      console.error(`Error removing event listener for '${eventName}':`, error);
    }
  };

  const removeAllListeners = (target?: EventTarget): void => {
    try {
      const remainingRegistrations: ListenerRegistration[] = [];

      for (const registration of eventListeners) {
        if (target && registration.target !== target) {
          remainingRegistrations.push(registration);
          continue;
        }

        try {
          getEventManagerService().removeEventListener(
            registration.eventName,
            registration.wrappedHandler,
            registration.target,
            registration.options,
          );
        } catch (error) {
          console.error(`Error removing event listener for '${registration.eventName}':`, error);
        }
      }

      eventListeners = remainingRegistrations;
    } catch (error) {
      console.error('Error removing all event listeners:', error);
    }
  };

  const getActiveListenersCount = (target?: EventTarget): number => {
    if (!target) {
      return eventListeners.length;
    }

    return eventListeners.filter(registration => registration.target === target).length;
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
