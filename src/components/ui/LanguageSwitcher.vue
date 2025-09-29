<template>
  <div class="language-switcher">
    <button ref="buttonRef" @click="toggleLanguageMenu"
     class="language-button" :aria-expanded="isOpen" aria-haspopup="true">
      <GlobeIcon class="icon" />
      <span class="language-text">{{ displayLanguage }}</span>
      <ChevronDownIcon class="arrow-icon" :class="{ 'rotate-180': isOpen }" />
    </button>

    <div ref="menuRef" v-show="isOpen" class="language-menu" :class="{ 'menu-open': isOpen }">
      <button v-for="lang in languages" :key="lang.value" @click="changeLanguage(lang.value)" class="language-option"
        :class="{ 'active': currentLanguage === lang.value }">
        {{ lang.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, GlobeIcon } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useEventManager } from '@/composables/useEventManager';
import { useTimers } from '@/composables/useTimers';
import { useLanguageStore } from '@/stores/language';
import type { Language } from '@/types';
import { getEnabledLanguages, getLanguageNativeName } from '@/utils/language';

const { locale } = useI18n();
const languageStore = useLanguageStore();
const { setTimeout } = useTimers();
const { addEventListener, removeEventListener } = useEventManager();

const isOpen = ref(false);
const menuRef = ref<HTMLDivElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);

// 从配置文件获取语言列表
const enabledLanguages = getEnabledLanguages();

const languages = computed(() => {
  return enabledLanguages.map(langCode => ({
    value: langCode as Language,
    label: getLanguageNativeName(langCode),
  }));
});

const currentLanguage = computed(() => languageStore.currentLanguage);

const displayLanguage = computed(() => {
  return getLanguageNativeName(currentLanguage.value);
});

const toggleLanguageMenu = (): void => {
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

const changeLanguage = (lang: Language): void => {
  languageStore.setLanguage(lang);
  locale.value = lang;
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
.language-switcher {
  @apply relative;
}

.language-button {
  @apply flex items-center gap-2 py-2 px-3 rounded-lg;
  @apply bg-white dark:bg-gray-800;
  @apply text-gray-700 dark:text-gray-300;
  @apply border border-gray-200 dark:border-gray-700;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700;
  @apply transition-all duration-300;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
  transform-origin: center;
}

.language-button:hover {
  transform: scale(1.02);
}

.icon {
  @apply w-4 h-4;
  flex-shrink: 0;
}

.language-menu {
  @apply absolute right-0 mt-2 py-1;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg;
  @apply w-40 z-10;
  @apply opacity-0 scale-95 origin-top-right;
  @apply transition-all duration-300;
  @apply overflow-hidden;
  transform: translateY(-10px) scale(0.95);
}

.menu-open {
  @apply opacity-100 scale-100;
  transform: translateY(0) scale(1);
}

.language-option {
  @apply flex items-center w-full px-4 py-2;
  @apply text-left text-sm text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-colors duration-200;
}

.language-option.active {
  @apply bg-primary-50 dark:bg-primary-900/20;
  @apply text-primary-700 dark:text-primary-400;
  @apply font-medium;
}

.language-text {
  @apply sm:inline;
  transition: all 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .language-text {
    width: 0;
    opacity: 0;
    margin: 0;
    flex-shrink: 1;
  }
}

.arrow-icon {
  @apply w-4 h-4 ml-1 transition-all duration-300 ease-in-out;
  overflow: hidden;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .arrow-icon {
    width: 0;
    opacity: 0;
    margin: 0;
    flex-shrink: 1;
  }
}

@media (max-width: 640px) {
  .language-button {
    @apply p-2;
    gap: 0;
    min-width: 2.5rem;
    width: 2.5rem;
    height: 2.5rem;
    justify-content: center;
  }

  .language-menu {
    @apply w-32;
  }
}
</style>
