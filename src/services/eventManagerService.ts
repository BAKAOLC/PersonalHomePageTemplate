// 事件管理服务 - 支持组件级别和全局级别的事件监听

import { getBrowserWindow } from '@/utils/browser';

interface EventManager {
  dispatchEvent: (eventName: string, detail?: unknown, target?: EventTarget) => void;
  addEventListener: (
    eventName: string,
    handler: EventListener,
    target?: EventTarget,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (
    eventName: string,
    handler: EventListener,
    target?: EventTarget,
    options?: boolean | EventListenerOptions,
  ) => void;
  removeAllListeners: (target?: EventTarget) => void;
  getActiveListenersCount: (target?: EventTarget) => number;
}

interface ListenerRecord {
  handler: EventListener;
  listener: EventListener;
  capture: boolean;
  options?: boolean | AddEventListenerOptions;
}

type ListenerOptions = boolean | AddEventListenerOptions;
type ListenerRemovalOptions = boolean | EventListenerOptions;
type ListenerMap = Map<string, ListenerRecord[]>;

const getCaptureOption = (options?: ListenerRemovalOptions): boolean => {
  if (typeof options === 'boolean') {
    return options;
  }

  return options?.capture === true;
};

class EventManagerService implements EventManager {
  private eventListeners: ListenerMap = new Map();
  private targetListeners = new Map<EventTarget, ListenerMap>();
  private isDestroyed = false;
  private readonly handleBeforeUnload = (): void => {
    if (!this.isDestroyed) {
      this.removeAllListeners();
    }
  };

  constructor() {
    // 页面卸载时清理所有事件监听器
    const browserWindow = getBrowserWindow();
    if (browserWindow) {
      browserWindow.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  // 检查是否已销毁
  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('EventManagerService has been destroyed.');
    }
  }

  private getEventTarget(target?: EventTarget): EventTarget | null {
    return target ?? getBrowserWindow();
  }

  private isWindowTarget(target: EventTarget): boolean {
    return target === getBrowserWindow();
  }

  dispatchEvent(eventName: string, detail?: unknown, target?: EventTarget): void {
    this.checkDestroyed();

    const eventTarget = this.getEventTarget(target);
    if (!eventTarget) return;

    const event = new CustomEvent(eventName, { detail });
    eventTarget.dispatchEvent(event);
  }

  addEventListener(
    eventName: string,
    handler: EventListener,
    target?: EventTarget,
    options?: ListenerOptions,
  ): void {
    this.checkDestroyed();

    const eventTarget = this.getEventTarget(target);
    if (!eventTarget) return;

    const capture = getCaptureOption(options);

    // 如果是 window 对象，使用原有的全局监听器管理
    if (this.isWindowTarget(eventTarget)) {
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, []);
      }

      const listeners = this.eventListeners.get(eventName) ?? [];
      if (listeners.some(record => record.handler === handler && record.capture === capture)) {
        return; // 已经添加过了
      }

      const eventListener = (event: Event): void => {
        handler(event);
      };

      listeners.push({
        handler,
        listener: eventListener,
        capture,
        options,
      });
      eventTarget.addEventListener(eventName, eventListener, options);
    } else {
      // 对于其他目标元素，使用目标特定的监听器管理
      if (!this.targetListeners.has(eventTarget)) {
        this.targetListeners.set(eventTarget, new Map());
      }

      const targetMap: ListenerMap = this.targetListeners.get(eventTarget) ?? new Map<string, ListenerRecord[]>();
      if (!targetMap.has(eventName)) {
        targetMap.set(eventName, []);
      }

      const listeners = targetMap.get(eventName) ?? [];
      if (listeners.some(record => record.handler === handler && record.capture === capture)) {
        return; // 已经添加过了
      }

      const eventListener = (event: Event): void => {
        handler(event);
      };

      listeners.push({
        handler,
        listener: eventListener,
        capture,
        options,
      });
      eventTarget.addEventListener(eventName, eventListener, options);
    }
  }

  removeEventListener(
    eventName: string,
    handler: EventListener,
    target?: EventTarget,
    options?: ListenerRemovalOptions,
  ): void {
    this.checkDestroyed();

    const eventTarget = this.getEventTarget(target);
    if (!eventTarget) return;

    const capture = getCaptureOption(options);

    // 如果是 window 对象，使用原有的全局监听器管理
    if (this.isWindowTarget(eventTarget)) {
      const listeners = this.eventListeners.get(eventName);
      if (!listeners) return;

      const recordIndex = listeners.findIndex(record => record.handler === handler && record.capture === capture);
      if (recordIndex === -1) return;

      const [record] = listeners.splice(recordIndex, 1);
      eventTarget.removeEventListener(eventName, record.listener, options ?? record.options);

      if (listeners.length === 0) {
        this.eventListeners.delete(eventName);
      }
    } else {
      // 对于其他目标元素，使用目标特定的监听器管理
      const targetMap = this.targetListeners.get(eventTarget);
      if (!targetMap) return;

      const listeners = targetMap.get(eventName);
      if (!listeners) return;

      const recordIndex = listeners.findIndex(record => record.handler === handler && record.capture === capture);
      if (recordIndex === -1) return;

      const [record] = listeners.splice(recordIndex, 1);
      eventTarget.removeEventListener(eventName, record.listener, options ?? record.options);

      if (listeners.length === 0) {
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
      if (this.isWindowTarget(target)) {
        for (const [eventName, listeners] of this.eventListeners) {
          for (const record of listeners) {
            target.removeEventListener(eventName, record.listener, record.options);
          }
        }
        this.eventListeners.clear();
        return;
      }

      // 只清理指定目标的事件监听器
      const targetMap = this.targetListeners.get(target);
      if (targetMap) {
        for (const [eventName, listeners] of targetMap) {
          for (const record of listeners) {
            target.removeEventListener(eventName, record.listener, record.options);
          }
        }
        this.targetListeners.delete(target);
      }
    } else {
      // 清理所有事件监听器
      // 清理全局监听器
      const browserWindow = getBrowserWindow();
      for (const [eventName, listeners] of this.eventListeners) {
        for (const record of listeners) {
          if (browserWindow) {
            browserWindow.removeEventListener(eventName, record.listener, record.options);
          }
        }
      }
      this.eventListeners.clear();

      // 清理目标特定的监听器
      for (const [eventTarget, targetMap] of this.targetListeners) {
        for (const [eventName, listeners] of targetMap) {
          for (const record of listeners) {
            eventTarget.removeEventListener(eventName, record.listener, record.options);
          }
        }
      }
      this.targetListeners.clear();
    }
  }

  getActiveListenersCount(target?: EventTarget): number {
    this.checkDestroyed();

    if (target) {
      if (this.isWindowTarget(target)) {
        let count = 0;
        for (const listeners of this.eventListeners.values()) {
          count += listeners.length;
        }
        return count;
      }

      // 只计算指定目标的监听器数量
      const targetMap = this.targetListeners.get(target);
      if (!targetMap) return 0;

      let count = 0;
      for (const listeners of targetMap.values()) {
        count += listeners.length;
      }
      return count;
    } else {
      // 计算所有监听器数量
      let count = 0;

      // 全局监听器
      for (const listeners of this.eventListeners.values()) {
        count += listeners.length;
      }

      // 目标特定的监听器
      for (const targetMap of this.targetListeners.values()) {
        for (const listeners of targetMap.values()) {
          count += listeners.length;
        }
      }

      return count;
    }
  }

  // 销毁服务
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.removeAllListeners();
    const browserWindow = getBrowserWindow();
    if (browserWindow) {
      browserWindow.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
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
