import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useTimers } from '@/composables/useTimers';
import type { I18nText } from '@/types';

export interface NotificationConfig {
  id: string;
  message: string | I18nText;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // 显示时长，0表示不自动关闭
  closable?: boolean; // 是否可手动关闭
  icon?: string; // 图标类名
}

export interface NotificationInstance extends NotificationConfig {
  visible: boolean;
  timer?: number;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationInstance[]>([]);
  const maxNotifications = ref(5);
  const pendingQueue = ref<NotificationConfig[]>([]);
  const { setTimeout, clearTimeout } = useTimers();

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
      visible: true,
      duration: config.duration ?? 3000,
      closable: config.closable ?? true,
      type: config.type ?? 'info',
    };

    notifications.value.push(notification);

    // 设置自动关闭定时器
    if (notification.duration && notification.duration > 0) {
      notification.timer = setTimeout(() => {
        remove(notification.id);
      }, notification.duration);
    }

    return config.id;
  };

  // 移除通知
  const remove = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index === -1) return;

    const notification = notifications.value[index];

    // 清除定时器
    if (notification.timer) {
      clearTimeout(notification.timer);
    }

    // 设置为不可见，让动画播放
    notification.visible = false;

    // 延迟移除，等待动画完成
    setTimeout(() => {
      const currentIndex = notifications.value.findIndex(n => n.id === id);
      if (currentIndex !== -1) {
        notifications.value.splice(currentIndex, 1);
      }

      // 处理等待队列
      processQueue();
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
        clearTimeout(notification.timer);
      }
    });

    notifications.value = [];
  };

  // 设置最大通知数量
  const setMaxNotifications = (max: number): void => {
    maxNotifications.value = Math.max(1, max);
  };

  // 便捷方法
  const success = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return show({
      id,
      message,
      type: 'success',
      ...options,
    });
  };

  const error = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return show({
      id,
      message,
      type: 'error',
      ...options,
    });
  };

  const warning = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return show({
      id,
      message,
      type: 'warning',
      ...options,
    });
  };

  const info = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    clear,
    setMaxNotifications,
    success,
    error,
    warning,
    info,
  };
});
