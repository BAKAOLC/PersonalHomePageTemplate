<template>
  <div class="sort-selector" ref="menuRef">
    <button @click="toggleSortMenu" class="sort-button" :aria-expanded="isOpen" aria-haspopup="true" ref="buttonRef">
      <i :class="getIconClass('sort')" class="sort-icon"></i>
      <span class="sort-text">{{ displaySort }}</span>
      <i class="arrow-icon" :class="[getIconClass('chevron-down'), { 'rotate-180': isOpen }]"></i>
    </button>

    <div v-show="isOpen" class="sort-menu" :class="{ 'menu-open': isOpen }">
      <button v-for="option in sortOptions" :key="option.value" @click="changeSort(option.value)" class="sort-option"
        :class="{ 'active': currentSort === option.value }">
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useEventManager } from '@/composables/useEventManager';
import { useTimers } from '@/composables/useTimers';
import { useAppStore } from '@/stores/app';
import { getIconClass } from '@/utils/icons';

const { t } = useI18n();
const appStore = useAppStore();
const { setTimeout } = useTimers();
const { addEventListener, removeEventListener } = useEventManager();

const isOpen = ref(false);
const menuRef = ref<HTMLDivElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);

const sortOptions = computed(() => [
  { label: t('gallery.sortName'), value: 'name' },
  { label: t('gallery.sortArtist'), value: 'artist' },
  { label: t('gallery.sortDate'), value: 'date' },
]);

const currentSort = computed(() => appStore.sortBy);

const displaySort = computed(() => {
  const option = sortOptions.value.find(o => o.value === currentSort.value);
  return option ? option.label : t('gallery.sortDate');
});

const toggleSortMenu = (): void => {
  // 添加点击动画效果
  const button = event?.target as HTMLElement;
  if (button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = '';
    }, 150);
  }

  isOpen.value = !isOpen.value;
};

const changeSort = (sort: string): void => {
  appStore.sortBy = sort as 'name' | 'artist' | 'date';
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  if (
    isOpen.value
    && menuRef.value
    && buttonRef.value
    && !menuRef.value.contains(target)
    && !buttonRef.value.contains(target)
  ) {
    isOpen.value = false;
  }
};

onMounted(() => {
  addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.sort-selector {
  @apply relative;
}

.sort-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(209, 213, 219);
  border-radius: 0.375rem;
  background-color: white;
  color: rgb(107, 114, 128);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  height: 2.25rem;
  box-sizing: border-box;
  transform-origin: center;
  min-width: 100px;
}

.dark .sort-button {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(156, 163, 175);
}

.sort-button:hover {
  background-color: rgb(243, 244, 246);
  color: rgb(55, 65, 81);
}

.dark .sort-button:hover {
  background-color: rgb(75, 85, 99);
  color: rgb(209, 213, 219);
}

.sort-icon {
  @apply w-4 h-4;
  flex-shrink: 0;
}

.sort-menu {
  @apply absolute right-0 mt-2 py-1;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg;
  @apply w-32 z-10;
  @apply opacity-0 scale-95 origin-top-right;
  @apply transition-all duration-300;
  transform: translateY(-10px) scale(0.95);
}

.menu-open {
  @apply opacity-100 scale-100;
  transform: translateY(0) scale(1);
}

.sort-option {
  @apply flex items-center w-full px-4 py-2;
  @apply text-left text-sm text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  transform-origin: left center;
}

.sort-option.active {
  @apply bg-primary-50 dark:bg-primary-900/20;
  @apply text-primary-700 dark:text-primary-400;
  @apply font-medium;
}

.sort-text {
  transition: all 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
}

.arrow-icon {
  @apply w-4 h-4 ml-1 transition-all duration-300 ease-in-out;
  overflow: hidden;
  flex-shrink: 0;
}

/* 移动端响应式调整 */
@media (max-width: 767px) {
  .sort-button {
    min-width: 44px;
    padding: 0.375rem;
    height: 2rem;
  }

  .sort-menu {
    @apply w-28;
  }
}
</style>
