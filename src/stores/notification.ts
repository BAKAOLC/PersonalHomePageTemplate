import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getTimerService } from '@/services/timerService';
import type { I18nText } from '@/types';
import { createPrefixedId } from '@/utils/id';

export interface NotificationConfig {
  id: string;
  message: string | I18nText;
  title?: string | I18nText;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // 显示时长，0表示不自动关闭
  closable?: boolean; // 是否可手动关闭
  icon?: string; // 图标类名
  onClick?: () => void;
  dismissOnClick?: boolean;
}

export interface NotificationInstance extends NotificationConfig {
  renderId: string;
  visible: boolean;
  closing: boolean;
  timer?: number;
  totalDuration: number;
  remainingDuration: number;
  startedAt?: number;
  paused: boolean;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationInstance[]>([]);
  const maxNotifications = ref(5);
  const pendingQueue = ref<NotificationConfig[]>([]);
  const timerService = getTimerService();

  // 获取可见通知数量
  const visibleCount = computed(() => notifications.value.filter(n => n.visible).length);

  // 显示通知
  const show = (config: NotificationConfig): string => {
    // 如果超过最大数量，加入等待队列
    if (visibleCount.value >= maxNotifications.value) {
      pendingQueue.value.push(config);
      return config.id;
    }

    return showNotification(config);
  };

  // 立即显示通知
  const showNotification = (config: NotificationConfig): string => {
    const notification: NotificationInstance = {
      ...config,
      renderId: createPrefixedId('notification-render'),
      visible: true,
      duration: config.duration ?? 3000,
      closable: config.closable ?? true,
      dismissOnClick: config.dismissOnClick ?? true,
      type: config.type ?? 'info',
      totalDuration: config.duration ?? 3000,
      remainingDuration: config.duration ?? 3000,
      paused: false,
      closing: false,
    };

    notifications.value.push(notification);

    // 设置自动关闭定时器
    startAutoCloseTimer(notification);

    return config.id;
  };

  const startAutoCloseTimer = (notification: NotificationInstance): void => {
    if (notification.timer) {
      timerService.clearTimeout(notification.timer);
      notification.timer = undefined;
    }

    if (notification.remainingDuration <= 0) {
      return;
    }

    notification.startedAt = Date.now();
    notification.paused = false;
    notification.timer = timerService.setTimeout(() => {
      remove(notification.id);
    }, notification.remainingDuration);
  };

  const pauseNotificationTimer = (notification: NotificationInstance): void => {
    if (!notification.timer || notification.paused) {
      return;
    }

    const elapsed = notification.startedAt ? Date.now() - notification.startedAt : 0;
    notification.remainingDuration = Math.max(0, notification.remainingDuration - elapsed);
    timerService.clearTimeout(notification.timer);
    notification.timer = undefined;
    notification.paused = true;
  };

  const resumeNotificationTimer = (notification: NotificationInstance): void => {
    if (!notification.visible || notification.closing || !notification.paused || notification.remainingDuration <= 0) {
      return;
    }

    startAutoCloseTimer(notification);
  };

  const pauseAll = (): void => {
    notifications.value
      .filter(notification => notification.visible && !notification.closing)
      .forEach(pauseNotificationTimer);
  };

  const resumeAll = (): void => {
    notifications.value
      .filter(notification => notification.visible && !notification.closing)
      .forEach(resumeNotificationTimer);
  };

  const activate = (id: string): void => {
    const notification = notifications.value.find(n => n.id === id);
    if (!notification?.visible || notification.closing) {
      return;
    }

    notification.onClick?.();
    if (notification.dismissOnClick !== false) {
      remove(id);
    }
  };

  // 移除通知
  const remove = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index === -1) return;

    const notification = notifications.value[index];
    if (!notification.visible || notification.closing) return;

    // 清除定时器
    if (notification.timer) {
      timerService.clearTimeout(notification.timer);
      notification.timer = undefined;
    }

    notification.closing = true;

    // 延迟移除，等待动画完成
    timerService.setTimeout(() => {
      const currentIndex = notifications.value.findIndex(n => n.id === id);
      if (currentIndex !== -1 && notifications.value[currentIndex] === notification) {
        notifications.value.splice(currentIndex, 1);
      }

      timerService.requestAnimationFrame(() => {
        processQueue();
      });
    }, 300);
  };

  // 处理等待队列
  const processQueue = (): void => {
    // 立即处理队列，不使用延迟，确保严格按顺序显示
    while (pendingQueue.value.length > 0 && visibleCount.value < maxNotifications.value) {
      const nextNotification = pendingQueue.value.shift();
      if (nextNotification) {
        showNotification(nextNotification);
      }
    }
  };

  // 清除所有通知
  const clear = (): void => {
    // 清空等待队列
    pendingQueue.value = [];

    // 清除所有定时器并移除通知
    notifications.value.forEach(notification => {
      if (notification.timer) {
        timerService.clearTimeout(notification.timer);
        notification.timer = undefined;
      }
      notification.closing = true;
    });

    notifications.value = [];
  };

  // 设置最大通知数量
  const setMaxNotifications = (max: number): void => {
    maxNotifications.value = Math.max(1, max);
  };

  // 便捷方法
  const success = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? createPrefixedId('notification');
    return show({
      id,
      message,
      type: 'success',
      ...options,
    });
  };

  const error = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? createPrefixedId('notification');
    return show({
      id,
      message,
      type: 'error',
      ...options,
    });
  };

  const warning = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? createPrefixedId('notification');
    return show({
      id,
      message,
      type: 'warning',
      ...options,
    });
  };

  const info = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? createPrefixedId('notification');
    return show({
      id,
      message,
      type: 'info',
      ...options,
    });
  };

  return {
    notifications,
    maxNotifications,
    visibleCount,
    show,
    remove,
    pauseAll,
    resumeAll,
    activate,
    clear,
    setMaxNotifications,
    success,
    error,
    warning,
    info,
  };
});
