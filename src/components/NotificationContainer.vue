<template>
  <div class="notification-container">
      <transition-group
        name="notification"
        tag="div"
        class="notification-list"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-for="notification in sortedNotifications"
          :key="notification.id"
          class="notification-item" :class="[
            notification.type,
            { 'visible': notification.visible }
          ]"
        >
          <div class="notification-icon" :class="[notification.type]">
            <i :class="getIconClass(notification.type ?? 'info')"></i>
          </div>

          <div class="notification-content">
            <div class="notification-message">
              {{ getMessage(notification) }}
            </div>
          </div>

          <button
            v-if="notification.closable !== false"
            class="notification-close"
            @click="() => removeNotification(notification.id)"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </transition-group>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTimers } from '@/composables/useTimers';
import { useLanguageStore } from '@/stores/language';
import { useNotificationStore } from '@/stores/notification';
import { getI18nText } from '@/utils/i18nText';

const notificationStore = useNotificationStore();
const languageStore = useLanguageStore();
const { requestAnimationFrame } = useTimers();

// 获取可见通知，新的在前（反转数组顺序）
const sortedNotifications = computed(() => {
  return notificationStore.notifications
    .filter(n => n.visible)
    .slice()
    .reverse();
});

const getMessage = (notification: any): string => {
  if (typeof notification.message === 'string') {
    return notification.message;
  }
  return getI18nText(notification.message, languageStore.currentLanguage);
};

const getIconClass = (type: string): string => {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  };
  return icons[type as keyof typeof icons] ?? icons.info;
};

const removeNotification = (id: string | undefined): void => {
  if (id) {
    notificationStore.remove(id);
  }
};

const onEnter = (el: Element): void => {
  const element = el as HTMLElement;
  element.style.transform = 'translateX(100%)';
  element.style.opacity = '0';

  requestAnimationFrame(() => {
    element.style.transform = 'translateX(0)';
    element.style.opacity = '1';
  });
};

const onLeave = (el: Element): void => {
  const element = el as HTMLElement;
  element.style.transform = 'translateX(100%)';
  element.style.opacity = '0';
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 3000;
  pointer-events: none;
  max-width: 400px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  pointer-events: auto;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  max-width: 380px;
  word-wrap: break-word;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 4px solid;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.notification-item:hover {
  transform: translateX(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1);
}

/* 主题样式 */
.notification-item.success {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: rgba(16, 185, 129, 0.1);
}

.notification-item.error {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fef1f1 100%);
  border-color: rgba(239, 68, 68, 0.1);
}

.notification-item.warning {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%);
  border-color: rgba(245, 158, 11, 0.1);
}

.notification-item.info {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: rgba(59, 130, 246, 0.1);
}

/* 暗色主题 */
.dark .notification-item {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .notification-item.success {
  background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
  border-color: rgba(16, 185, 129, 0.2);
}

.dark .notification-item.error {
  background: linear-gradient(135deg, #7f1d1d 0%, #5f1515 100%);
  border-color: rgba(239, 68, 68, 0.2);
}

.dark .notification-item.warning {
  background: linear-gradient(135deg, #78350f 0%, #5a2a0a 100%);
  border-color: rgba(245, 158, 11, 0.2);
}

.dark .notification-item.info {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  border-color: rgba(59, 130, 246, 0.2);
}

.dark .notification-item:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.3);
}

.notification-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.notification-icon.success {
  color: #10b981;
}

.notification-icon.error {
  color: #ef4444;
}

.notification-icon.warning {
  color: #f59e0b;
}

.notification-icon.info {
  color: #3b82f6;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: #111827;
  margin: 0;
}

.dark .notification-message {
  color: #f9fafb;
}

.notification-close {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 11px;
  border-radius: 3px;
  transition: all 0.2s;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #374151;
}

.dark .notification-close {
  color: #9ca3af;
}

.dark .notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
}

/* 动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .notification-item {
    min-width: auto;
    max-width: none;
    padding: 10px 12px;
    gap: 8px;
  }

  .notification-icon {
    width: 16px;
    height: 16px;
    font-size: 12px;
  }

  .notification-message {
    font-size: 12px;
    line-height: 1.2;
  }

  .notification-close {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }
}
</style>
