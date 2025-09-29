import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Language } from '@/types';
import { getDefaultLanguage, isValidLanguage } from '@/utils/language';

export const useLanguageStore = defineStore('language', () => {
  // 语言相关
  const storedLanguage = localStorage.getItem('locale');
  const defaultLanguage = getDefaultLanguage();
  const currentLanguage = ref<Language>(
    (storedLanguage && isValidLanguage(storedLanguage)) ? storedLanguage : defaultLanguage,
  );

  // 设置语言
  const setLanguage = (lang: Language): void => {
    if (isValidLanguage(lang)) {
      currentLanguage.value = lang;
      localStorage.setItem('locale', lang);
    }
  };

  return {
    // 语言相关
    currentLanguage,
    setLanguage,
  };
});
