<template>
  <button @click="toggleTheme" class="theme-toggle" :title="getThemeLabel()" aria-label="Toggle theme">
    <span class="sr-only">{{ getThemeLabel() }}</span>
    <component :is="getThemeIcon()" class="icon" />
  </button>
</template>

<script setup lang="ts">
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/stores/app';

const { t } = useI18n();
const appStore = useAppStore();

const themeMode = computed(() => appStore.themeMode);

const toggleTheme = (): void => {
  appStore.toggleThemeMode();
};

// 获取当前主题图标
const getThemeIcon = (): any => {
  switch (themeMode.value) {
    case 'light':
      return SunIcon;
    case 'dark':
      return MoonIcon;
    case 'auto':
    default:
      return MonitorIcon;
  }
};

// 获取主题标签
const getThemeLabel = (): string => {
  switch (themeMode.value) {
    case 'light':
      return t('theme.light');
    case 'dark':
      return t('theme.dark');
    case 'auto':
    default:
      return t('theme.auto');
  }
};
</script>

<style scoped>
.theme-toggle {
  @apply p-2 rounded-full transition-all duration-300;
  @apply text-gray-500 hover:text-gray-700;
  @apply dark:text-gray-400 dark:hover:text-gray-200;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
  transform-origin: center;
}

.theme-toggle:hover {
  transform: scale(1.1);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.icon {
  @apply w-5 h-5;
}
</style>
