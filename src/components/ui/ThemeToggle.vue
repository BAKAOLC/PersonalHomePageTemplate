<template>
  <button @click="toggleTheme" class="theme-toggle" :title="t(isDarkMode ? 'theme.light' : 'theme.dark')"
    aria-label="Toggle theme">
    <span class="sr-only">{{ t(isDarkMode ? 'theme.light' : 'theme.dark') }}</span>
    <sun-icon v-if="isDarkMode" class="icon" />
    <moon-icon v-else class="icon" />
  </button>
</template>

<script setup lang="ts">
import { SunIcon, MoonIcon } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/stores/app';

const { t } = useI18n();
const appStore = useAppStore();

const isDarkMode = computed(() => appStore.isDarkMode);

const toggleTheme = (): void => {
  appStore.toggleDarkMode();
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
