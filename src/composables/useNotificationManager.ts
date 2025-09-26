import { useNotificationStore, type NotificationConfig } from '@/stores/notification';
import type { I18nText } from '@/types';

interface NotificationManagerComposable {
  show: (message: string | I18nText, type?: NotificationConfig['type'], options?: Partial<NotificationConfig>) => string;
  success: (message: string | I18nText, options?: Partial<NotificationConfig>) => string;
  error: (message: string | I18nText, options?: Partial<NotificationConfig>) => string;
  warning: (message: string | I18nText, options?: Partial<NotificationConfig>) => string;
  info: (message: string | I18nText, options?: Partial<NotificationConfig>) => string;
  remove: (id: string) => void;
  clear: () => void;
  setMaxNotifications: (max: number) => void;
  getNotifications: () => any[];
}

export function useNotificationManager(): NotificationManagerComposable {
  const notificationStore = useNotificationStore();

  const show = (message: string | I18nText, type: NotificationConfig['type'] = 'info', options: Partial<NotificationConfig> = {}): string => {
    const id = options.id ?? `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return notificationStore.show({
      id,
      message,
      type,
      ...options,
    });
  };

  const success = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    return notificationStore.success(message, options);
  };

  const error = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    return notificationStore.error(message, options);
  };

  const warning = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    return notificationStore.warning(message, options);
  };

  const info = (message: string | I18nText, options: Partial<NotificationConfig> = {}): string => {
    return notificationStore.info(message, options);
  };

  const remove = (id: string): void => {
    notificationStore.remove(id);
  };

  const clear = (): void => {
    notificationStore.clear();
  };

  const setMaxNotifications = (max: number): void => {
    notificationStore.setMaxNotifications(max);
  };

  return {
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear,
    setMaxNotifications,
    getNotifications: () => notificationStore.notifications.filter(n => n.visible),
  };
}
