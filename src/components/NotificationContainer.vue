<template>
  <div
    class="notification-container"
    @mouseenter="pauseNotifications"
    @mouseleave="resumeNotifications"
  >
    <div
      class="notification-list"
      :style="{ height: `${containerHeight}px` }"
    >
      <div
        v-for="notification in sortedNotifications"
        :key="notification.renderId"
        :ref="element => setNotificationElement(notification.renderId, element)"
        class="notification-item"
        :class="[
          notification.type,
          {
            'is-closing': notification.closing,
          },
        ]"
        :style="getNotificationStyle(notification)"
        :role="getAriaRole(notification)"
        :aria-live="getAriaLive(notification)"
        :tabindex="isInteractive(notification) ? 0 : undefined"
        @click="activateNotification(notification)"
        @keydown.enter.prevent="activateNotification(notification)"
        @keydown.space.prevent="activateNotification(notification)"
      >
        <div class="notification-accent" aria-hidden="true"></div>

        <div class="notification-body">
          <div class="notification-icon" :class="notification.type" aria-hidden="true">
            <i :class="notification.icon ?? getIconClass(notification.type ?? 'info')"></i>
          </div>

          <div class="notification-content">
            <div v-if="getTitle(notification)" class="notification-title">
              {{ getTitle(notification) }}
            </div>
            <div class="notification-message">
              {{ getMessage(notification) }}
            </div>
          </div>
        </div>

        <button
          v-if="notification.closable !== false"
          class="notification-close"
          type="button"
          aria-label="Close notification"
          @click.stop="removeNotification(notification.id)"
        >
          <i class="fas fa-times"></i>
        </button>

        <div v-if="shouldShowProgress(notification)" class="notification-progress" aria-hidden="true">
          <div class="notification-progress-fill" :style="getProgressStyle(notification)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';

import { useTimers } from '@/composables/useTimers';
import { useLanguageStore } from '@/stores/language';
import { useNotificationStore, type NotificationConfig, type NotificationInstance } from '@/stores/notification';
import { getI18nText } from '@/utils/i18nText';

type NotificationType = NonNullable<NotificationConfig['type']>;

const notificationIcons = {
  success: 'fas fa-check-circle',
  error: 'fas fa-exclamation-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle',
} satisfies Record<NotificationType, string>;

const notificationStore = useNotificationStore();
const languageStore = useLanguageStore();
const { requestAnimationFrame, cancelAnimationFrame } = useTimers();
const toastGap = 12;
const motionDuration = 240;
const enterOffset = -24;
const exitOffset = -18;

interface NotificationLayout {
  y: number;
  targetY: number;
  startY: number;
  right: number;
  targetRight: number;
  startRight: number;
  opacity: number;
  targetOpacity: number;
  startOpacity: number;
  height: number;
  closing: boolean;
  animationStartedAt: number | undefined;
}

const itemElements = new Map<string, HTMLElement>();
const layouts = ref<Record<string, NotificationLayout>>({});
const containerHeight = ref(0);
const currentTime = ref(Date.now());
const isHovering = ref(false);
let layoutFrameId: number | undefined;
let animationFrameId: number | undefined;
let progressFrameId: number | undefined;
let resizeObserver: ResizeObserver | undefined;

// 获取可见通知，新的在前（反转数组顺序）
const sortedNotifications = computed<NotificationInstance[]>(() => {
  return notificationStore.notifications
    .filter(n => n.visible)
    .slice()
    .reverse();
});

const getMessage = (notification: NotificationInstance): string => {
  if (typeof notification.message === 'string') {
    return notification.message;
  }
  return getI18nText(notification.message, languageStore.currentLanguage);
};

const getTitle = (notification: NotificationInstance): string => {
  if (!notification.title) {
    return '';
  }
  if (typeof notification.title === 'string') {
    return notification.title;
  }
  return getI18nText(notification.title, languageStore.currentLanguage);
};

const getIconClass = (type: NotificationType): string => {
  return notificationIcons[type];
};

const isInteractive = (notification: NotificationInstance): boolean => {
  return notification.dismissOnClick !== false || Boolean(notification.onClick);
};

const shouldShowProgress = (notification: NotificationInstance): boolean => {
  return notification.totalDuration > 0;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const getRemainingDuration = (notification: NotificationInstance): number => {
  if (notification.paused || notification.startedAt === undefined) {
    return notification.remainingDuration;
  }

  return notification.remainingDuration - (currentTime.value - notification.startedAt);
};

const getProgressRatio = (notification: NotificationInstance): number => {
  if (notification.totalDuration <= 0) {
    return 0;
  }

  return clamp(getRemainingDuration(notification) / notification.totalDuration, 0, 1);
};

const getProgressStyle = (notification: NotificationInstance): Record<string, string> => ({
  width: `${(getProgressRatio(notification) * 100).toFixed(2)}%`,
});

const getNotificationLayout = (notification: NotificationInstance): NotificationLayout => {
  return layouts.value[notification.renderId] ?? {
    y: 0,
    targetY: 0,
    startY: 0,
    right: notification.closing ? 0 : enterOffset,
    targetRight: notification.closing ? exitOffset : 0,
    startRight: notification.closing ? 0 : enterOffset,
    opacity: notification.closing ? 1 : 0,
    targetOpacity: notification.closing ? 0 : 1,
    startOpacity: notification.closing ? 1 : 0,
    height: 0,
    closing: notification.closing,
    animationStartedAt: undefined,
  };
};

const getNotificationStyle = (notification: NotificationInstance): Record<string, string> => ({
  '--notification-duration': `${Math.max(1, notification.totalDuration)}ms`,
  top: `${getNotificationLayout(notification).y}px`,
  right: `${getNotificationLayout(notification).right}px`,
  opacity: getNotificationLayout(notification).opacity.toFixed(3),
});

const getAriaRole = (notification: NotificationInstance): 'alert' | 'status' => {
  return notification.type === 'error' || notification.type === 'warning' ? 'alert' : 'status';
};

const getAriaLive = (notification: NotificationInstance): 'assertive' | 'polite' => {
  return notification.type === 'error' || notification.type === 'warning' ? 'assertive' : 'polite';
};

const activateNotification = (notification: NotificationInstance): void => {
  if (!isInteractive(notification)) {
    return;
  }
  notificationStore.activate(notification.id);
};

const removeNotification = (id: string): void => {
  notificationStore.remove(id);
};

const pauseNotifications = (): void => {
  isHovering.value = true;
  currentTime.value = Date.now();
  notificationStore.pauseAll();
};

const resumeNotifications = (): void => {
  isHovering.value = false;
  notificationStore.resumeAll();
  currentTime.value = Date.now();
  startProgressLoop();
};

const getResizeObserver = (): ResizeObserver | undefined => {
  if (resizeObserver || typeof ResizeObserver === 'undefined') {
    return resizeObserver;
  }

  resizeObserver = new ResizeObserver(() => {
    scheduleLayout();
  });
  return resizeObserver;
};

const setNotificationElement = (
  renderId: string,
  element: Element | ComponentPublicInstance | null,
): void => {
  const previousElement = itemElements.get(renderId);
  if (previousElement === element) {
    return;
  }

  if (previousElement) {
    resizeObserver?.unobserve(previousElement);
    itemElements.delete(renderId);
  }

  if (!(element instanceof HTMLElement)) {
    scheduleLayout();
    return;
  }

  itemElements.set(renderId, element);
  getResizeObserver()?.observe(element);
  scheduleLayout();
};

const scheduleLayout = (): void => {
  if (layoutFrameId !== undefined) {
    cancelAnimationFrame(layoutFrameId);
  }

  layoutFrameId = requestAnimationFrame(() => {
    layoutFrameId = undefined;
    void updateLayouts();
  });
};

const hasActiveProgress = (): boolean => {
  return sortedNotifications.value.some(notification => (
    notification.totalDuration > 0
    && notification.visible
    && !notification.closing
    && !notification.paused
    && notification.startedAt !== undefined
  ));
};

const startProgressLoop = (): void => {
  if (progressFrameId !== undefined || !hasActiveProgress()) {
    return;
  }

  progressFrameId = requestAnimationFrame(stepProgress);
};

const stepProgress = (): void => {
  progressFrameId = undefined;
  currentTime.value = Date.now();

  if (hasActiveProgress()) {
    progressFrameId = requestAnimationFrame(stepProgress);
  }
};

const prefersReducedMotion = (): boolean => {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const easeOutCubic = (value: number): number => {
  return 1 - Math.pow(1 - value, 3);
};

const lerp = (from: number, to: number, progress: number): number => {
  return from + (to - from) * progress;
};

const hasMotion = (layout: NotificationLayout): boolean => {
  return Math.abs(layout.y - layout.targetY) > 0.5
    || Math.abs(layout.right - layout.targetRight) > 0.5
    || Math.abs(layout.opacity - layout.targetOpacity) > 0.01;
};

const updateContainerHeight = (currentLayouts: Record<string, NotificationLayout>): void => {
  const maxBottom = Object.values(currentLayouts).reduce((bottom, layout) => (
    Math.max(bottom, layout.y + layout.height, layout.targetY + layout.height)
  ), 0);
  containerHeight.value = maxBottom;
};

const startAnimationLoop = (): void => {
  if (animationFrameId !== undefined) {
    return;
  }

  animationFrameId = requestAnimationFrame(stepAnimation);
};

const stepAnimation = (timestamp: number): void => {
  animationFrameId = undefined;

  const currentLayouts = layouts.value;
  const nextLayouts: Record<string, NotificationLayout> = {};
  let shouldContinue = false;

  Object.entries(currentLayouts).forEach(([renderId, layout]) => {
    if (prefersReducedMotion()) {
      nextLayouts[renderId] = {
        ...layout,
        y: layout.targetY,
        startY: layout.targetY,
        right: layout.targetRight,
        startRight: layout.targetRight,
        opacity: layout.targetOpacity,
        startOpacity: layout.targetOpacity,
        animationStartedAt: undefined,
      };
      return;
    }

    const animationStartedAt = layout.animationStartedAt ?? timestamp;
    const progress = Math.min(1, (timestamp - animationStartedAt) / motionDuration);
    const easedProgress = easeOutCubic(progress);
    const nextLayout: NotificationLayout = {
      ...layout,
      y: lerp(layout.startY, layout.targetY, easedProgress),
      right: lerp(layout.startRight, layout.targetRight, easedProgress),
      opacity: lerp(layout.startOpacity, layout.targetOpacity, easedProgress),
      animationStartedAt,
    };

    if (progress >= 1 || !hasMotion(nextLayout)) {
      nextLayout.y = nextLayout.targetY;
      nextLayout.startY = nextLayout.targetY;
      nextLayout.right = nextLayout.targetRight;
      nextLayout.startRight = nextLayout.targetRight;
      nextLayout.opacity = nextLayout.targetOpacity;
      nextLayout.startOpacity = nextLayout.targetOpacity;
      nextLayout.animationStartedAt = undefined;
    } else {
      shouldContinue = true;
    }

    nextLayouts[renderId] = nextLayout;
  });

  layouts.value = nextLayouts;
  updateContainerHeight(nextLayouts);

  if (shouldContinue) {
    animationFrameId = requestAnimationFrame(stepAnimation);
  }
};

const createLayout = (
  notification: NotificationInstance,
  previousLayout: NotificationLayout | undefined,
  targetY: number,
  measuredHeight: number,
): NotificationLayout => {
  const targetRight = notification.closing ? exitOffset : 0;
  const targetOpacity = notification.closing ? 0 : 1;
  const previousY = previousLayout?.y ?? targetY;
  const previousRight = previousLayout?.right ?? (notification.closing ? 0 : enterOffset);
  const previousOpacity = previousLayout?.opacity ?? (notification.closing ? 1 : 0);
  const targetChanged = previousLayout === undefined
    || Math.abs(previousLayout.targetY - targetY) > 0.5
    || Math.abs(previousLayout.targetRight - targetRight) > 0.5
    || Math.abs(previousLayout.targetOpacity - targetOpacity) > 0.01
    || previousLayout.closing !== notification.closing;

  if (prefersReducedMotion()) {
    return {
      y: targetY,
      targetY,
      startY: targetY,
      right: targetRight,
      targetRight,
      startRight: targetRight,
      opacity: targetOpacity,
      targetOpacity,
      startOpacity: targetOpacity,
      height: measuredHeight,
      closing: notification.closing,
      animationStartedAt: undefined,
    };
  }

  return {
    y: previousY,
    targetY,
    startY: targetChanged ? previousY : (previousLayout?.startY ?? previousY),
    right: previousRight,
    targetRight,
    startRight: targetChanged ? previousRight : (previousLayout?.startRight ?? previousRight),
    opacity: previousOpacity,
    targetOpacity,
    startOpacity: targetChanged ? previousOpacity : (previousLayout?.startOpacity ?? previousOpacity),
    height: measuredHeight,
    closing: notification.closing,
    animationStartedAt: targetChanged ? undefined : previousLayout?.animationStartedAt,
  };
};

const updateLayouts = async (): Promise<void> => {
  await nextTick();

  const previousLayouts = layouts.value;
  const nextLayouts: Record<string, NotificationLayout> = {};
  let nextY = 0;
  let maxBottom = 0;

  sortedNotifications.value.forEach(notification => {
    const previousLayout = previousLayouts[notification.renderId];
    const element = itemElements.get(notification.renderId);
    const measuredHeight = element?.offsetHeight ?? previousLayout?.height ?? 72;
    const targetY = notification.closing ? (previousLayout?.y ?? nextY) : nextY;

    const nextLayout = createLayout(notification, previousLayout, targetY, measuredHeight);
    nextLayouts[notification.renderId] = nextLayout;

    maxBottom = Math.max(maxBottom, nextLayout.y + measuredHeight, nextLayout.targetY + measuredHeight);

    if (!notification.closing) {
      nextY += measuredHeight + toastGap;
    }
  });

  containerHeight.value = maxBottom;
  layouts.value = nextLayouts;
  if (Object.values(nextLayouts).some(hasMotion)) {
    startAnimationLoop();
  }
};

watch(
  () => sortedNotifications.value.map(notification => (
    `${notification.renderId}:${notification.closing ? 'closing' : 'open'}`
  )).join('|'),
  () => {
    scheduleLayout();
  },
  { immediate: true },
);

watch(
  () => sortedNotifications.value.map(notification => (
    [
      notification.renderId,
      notification.startedAt ?? 0,
      notification.remainingDuration,
      notification.totalDuration,
      notification.paused ? 'paused' : 'running',
      notification.closing ? 'closing' : 'open',
    ].join(':')
  )).join('|'),
  () => {
    currentTime.value = Date.now();
    if (isHovering.value) {
      notificationStore.pauseAll();
    }
    startProgressLoop();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (layoutFrameId !== undefined) {
    cancelAnimationFrame(layoutFrameId);
  }
  if (animationFrameId !== undefined) {
    cancelAnimationFrame(animationFrameId);
  }
  if (progressFrameId !== undefined) {
    cancelAnimationFrame(progressFrameId);
  }
  resizeObserver?.disconnect();
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.notification-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 3000;
  pointer-events: none;
  width: min(420px, calc(100vw - 32px));
}

.notification-list {
  position: relative;
  width: 100%;
}

.notification-item {
  --notification-accent: #3b82f6;
  --notification-accent-soft: rgba(59, 130, 246, 0.14);
  --notification-surface: rgba(255, 255, 255, 0.96);
  --notification-border: rgba(17, 24, 39, 0.1);
  --notification-title: #111827;
  --notification-text: #4b5563;
  --notification-shadow: rgba(15, 23, 42, 0.16);
  pointer-events: auto;
  position: absolute;
  right: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), var(--notification-surface)),
    var(--notification-surface);
  border: 1px solid var(--notification-border);
  border-radius: 8px;
  box-shadow:
    0 14px 36px var(--notification-shadow),
    0 4px 10px rgba(15, 23, 42, 0.08);
  color: var(--notification-text);
  display: flex;
  align-items: stretch;
  min-width: 0;
  width: 100%;
  word-wrap: break-word;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
  outline: none;
}

.notification-item[tabindex="0"] {
  cursor: pointer;
}

.notification-item:hover,
.notification-item:focus-visible {
  border-color: color-mix(in srgb, var(--notification-accent) 48%, var(--notification-border));
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--notification-accent) 18%, var(--notification-shadow)),
    0 6px 14px rgba(15, 23, 42, 0.1);
}

.notification-item.success {
  --notification-accent: #10b981;
  --notification-accent-soft: rgba(16, 185, 129, 0.14);
}

.notification-item.error {
  --notification-accent: #ef4444;
  --notification-accent-soft: rgba(239, 68, 68, 0.14);
}

.notification-item.warning {
  --notification-accent: #f59e0b;
  --notification-accent-soft: rgba(245, 158, 11, 0.16);
}

.notification-item.info {
  --notification-accent: #3b82f6;
  --notification-accent-soft: rgba(59, 130, 246, 0.14);
}

.dark .notification-item {
  --notification-surface: rgba(17, 24, 39, 0.94);
  --notification-border: rgba(255, 255, 255, 0.12);
  --notification-title: #f9fafb;
  --notification-text: #d1d5db;
  --notification-shadow: rgba(0, 0, 0, 0.44);
  background:
    linear-gradient(135deg, rgba(31, 41, 55, 0.78), var(--notification-surface)),
    var(--notification-surface);
}

.notification-accent {
  flex: 0 0 4px;
  background: var(--notification-accent);
}

.notification-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
  padding: 12px 8px 14px 12px;
}

.notification-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  border-radius: 999px;
  background: var(--notification-accent-soft);
  color: var(--notification-accent);
  font-size: 13px;
}

.notification-content {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.notification-title {
  color: var(--notification-title);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 3px;
}

.notification-message {
  color: var(--notification-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  margin: 0;
}

.notification-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 10px 0 0;
  background: rgba(107, 114, 128, 0.08);
  border: 1px solid rgba(107, 114, 128, 0.12);
  cursor: pointer;
  color: #6b7280;
  font-size: 11px;
  border-radius: 999px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.notification-close:hover,
.notification-close:focus-visible {
  background: var(--notification-accent-soft);
  border-color: color-mix(in srgb, var(--notification-accent) 40%, transparent);
  color: var(--notification-accent);
  outline: none;
}

.dark .notification-close {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
}

.notification-progress {
  position: absolute;
  left: 54px;
  right: 50px;
  bottom: 8px;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--notification-accent) 18%, transparent);
}

.notification-progress-fill {
  width: 0;
  height: 100%;
  background: color-mix(in srgb, var(--notification-accent) 68%, var(--notification-surface));
  border-radius: inherit;
}

.notification-item.is-closing {
  pointer-events: none;
}

@media (max-width: 640px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
    width: auto;
  }

  .notification-list {
    gap: 8px;
  }

  .notification-body {
    padding: 10px 6px 12px 10px;
    gap: 8px;
  }

  .notification-icon {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .notification-title,
  .notification-message {
    font-size: 12px;
    line-height: 1.35;
  }

  .notification-close {
    width: 26px;
    height: 26px;
    margin: 8px 8px 0 0;
    font-size: 10px;
  }

  .notification-progress {
    left: 50px;
    right: 44px;
    bottom: 7px;
  }
}
</style>
