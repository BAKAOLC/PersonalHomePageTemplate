import { createI18n } from 'vue-i18n';

import enUS from './en.json';
import jaJP from './jp.json';
import zhCN from './zh.json';

import type { Language } from '@/types';

const FALLBACK_LOCALE = 'zh';

const getNavigatorLanguage = (): Language => {
  const lang = navigator.language.toLowerCase();

  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'jp';

  return FALLBACK_LOCALE as Language;
};

const storedLocale = localStorage.getItem('locale') as Language | null;
const locale = storedLocale || getNavigatorLanguage();

const i18n = createI18n({
  legacy: false,
  locale: locale,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {
    zh: zhCN,
    en: enUS,
    jp: jaJP,
  },
});

export default i18n;
