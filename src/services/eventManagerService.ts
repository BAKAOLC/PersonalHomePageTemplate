/* eslint-disable no-restricted-syntax */
// 事件管理服务 - 支持组件级别和全局级别的事件监听

interface EventManager {
  dispatchEvent: (eventName: string, detail?: any, target?: EventTarget) => void;
  addEventListener: (
    eventName: string,
    handler: Function,
    target?: EventTarget,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (
    eventName: string,
    handler: Function,
    target?: EventTarget,
    options?: boolean | EventListenerOptions,
  ) => void;
  removeAllListeners: (target?: EventTarget) => void;
  getActiveListenersCount: (target?: EventTarget) => number;
}

class EventManagerService implements EventManager {
  private eventListeners = new Map<string, Map<Function, EventListener>>();
  private targetListeners = new Map<EventTarget, Map<string, Map<Function, EventListener>>>();
  private isDestroyed = false;

  constructor() {
    // 页面卸载时清理所有事件监听器
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.removeAllListeners();
      });
    }
  }

  // 检查是否已销毁
  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('EventManagerService has been destroyed.');
    }
  }

  dispatchEvent(eventName: string, detail?: any, target?: EventTarget): void {
    this.checkDestroyed();

    const event = new CustomEvent(eventName, { detail });
    const eventTarget = target ?? window;
    eventTarget.dispatchEvent(event);
  }

  addEventListener(
    eventName: string,
    handler: Function,
    target?: EventTarget,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.checkDestroyed();

    const eventTarget = target ?? window;

    // 如果是 window 对象，使用原有的全局监听器管理
    if (eventTarget === window) {
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, new Map());
      }

      const listeners = this.eventListeners.get(eventName) ?? new Map();
      if (listeners.has(handler)) {
        return; // 已经添加过了
      }

      const eventListener = (event: Event): void => {
        handler(event);
      };

      listeners.set(handler, eventListener);
      window.addEventListener(eventName, eventListener, options);
    } else {
      // 对于其他目标元素，使用目标特定的监听器管理
      if (!this.targetListeners.has(eventTarget)) {
        this.targetListeners.set(eventTarget, new Map());
      }

      const targetMap = this.targetListeners.get(eventTarget) ?? new Map();
      if (!targetMap.has(eventName)) {
        targetMap.set(eventName, new Map());
      }

      const listeners = targetMap.get(eventName) ?? new Map();
      if (listeners.has(handler)) {
        return; // 已经添加过了
      }

      const eventListener = (event: Event): void => {
        handler(event);
      };

      listeners.set(handler, eventListener);
      eventTarget.addEventListener(eventName, eventListener, options);
    }
  }

  removeEventListener(
    eventName: string,
    handler: Function,
    target?: EventTarget,
    options?: boolean | EventListenerOptions,
  ): void {
    this.checkDestroyed();

    const eventTarget = target ?? window;

    // 如果是 window 对象，使用原有的全局监听器管理
    if (eventTarget === window) {
      const listeners = this.eventListeners.get(eventName);
      if (!listeners) return;

      const eventListener = listeners.get(handler);
      if (!eventListener) return;

      window.removeEventListener(eventName, eventListener, options);
      listeners.delete(handler);

      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    } else {
      // 对于其他目标元素，使用目标特定的监听器管理
      const targetMap = this.targetListeners.get(eventTarget);
      if (!targetMap) return;

      const listeners = targetMap.get(eventName);
      if (!listeners) return;

      const eventListener = listeners.get(handler);
      if (!eventListener) return;

      eventTarget.removeEventListener(eventName, eventListener, options);
      listeners.delete(handler);

      if (listeners.size === 0) {
        targetMap.delete(eventName);
      }

      if (targetMap.size === 0) {
        this.targetListeners.delete(eventTarget);
      }
    }
  }

  removeAllListeners(target?: EventTarget): void {
    this.checkDestroyed();

    if (target) {
      // 只清理指定目标的事件监听器
      const targetMap = this.targetListeners.get(target);
      if (targetMap) {
        for (const [eventName, listeners] of targetMap) {
          for (const [_handler, eventListener] of listeners) {
            target.removeEventListener(eventName, eventListener);
          }
        }
        this.targetListeners.delete(target);
      }
    } else {
      // 清理所有事件监听器
      // 清理全局监听器
      for (const [eventName, listeners] of this.eventListeners) {
        for (const [_handler, eventListener] of listeners) {
          window.removeEventListener(eventName, eventListener);
        }
      }
      this.eventListeners.clear();

      // 清理目标特定的监听器
      for (const [eventTarget, targetMap] of this.targetListeners) {
        for (const [eventName, listeners] of targetMap) {
          for (const [_handler, eventListener] of listeners) {
            eventTarget.removeEventListener(eventName, eventListener);
          }
        }
      }
      this.targetListeners.clear();
    }
  }

  getActiveListenersCount(target?: EventTarget): number {
    this.checkDestroyed();

    if (target) {
      // 只计算指定目标的监听器数量
      const targetMap = this.targetListeners.get(target);
      if (!targetMap) return 0;

      let count = 0;
      for (const listeners of targetMap.values()) {
        count += listeners.size;
      }
      return count;
    } else {
      // 计算所有监听器数量
      let count = 0;

      // 全局监听器
      for (const listeners of this.eventListeners.values()) {
        count += listeners.size;
      }

      // 目标特定的监听器
      for (const targetMap of this.targetListeners.values()) {
        for (const listeners of targetMap.values()) {
          count += listeners.size;
        }
      }

      return count;
    }
  }

  // 销毁服务
  destroy(): void {
    this.removeAllListeners();
    this.isDestroyed = true;
  }
}

// 创建全局单例
const eventManagerService = new EventManagerService();

// 获取实例
export const getEventManagerService = (): EventManagerService => {
  return eventManagerService;
};

// 导出类型
export type { EventManager };
