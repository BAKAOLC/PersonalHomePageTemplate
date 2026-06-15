import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Language } from '@/types';
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/browser';
import { getDefaultLanguage, isValidLanguage } from '@/utils/language';

const LANGUAGE_STORAGE_KEY = 'locale';

export const useLanguageStore = defineStore('language', () => {
  // 语言相关
  const storedLanguage = getLocalStorageItem(LANGUAGE_STORAGE_KEY);
  const defaultLanguage = getDefaultLanguage();
  const currentLanguage = ref<Language>(
    (storedLanguage && isValidLanguage(storedLanguage)) ? storedLanguage : defaultLanguage,
  );

  // 设置语言
  const setLanguage = (lang: Language): void => {
    if (isValidLanguage(lang)) {
      currentLanguage.value = lang;
      setLocalStorageItem(LANGUAGE_STORAGE_KEY, lang);
    }
  };

  return {
    // 语言相关
    currentLanguage,
    setLanguage,
  };
});
