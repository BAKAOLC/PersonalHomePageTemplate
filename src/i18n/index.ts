import { createI18n } from 'vue-i18n';

import type { Language } from '@/types';

import { getDefaultLanguage, getFallbackLanguage, getEnabledLanguages, isValidLanguage, getLanguagesConfig } from '@/utils/language';

const getNavigatorLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  const languagesConfig = getLanguagesConfig();

  // 遍历所有启用的语言，检查是否匹配
  for (const [langCode, config] of Object.entries(languagesConfig.languages)) {
    if (!config.enabled) continue;

    const langCodeLower = langCode.toLowerCase();

    // 1. 精确匹配语言代码
    if (browserLang === langCodeLower) {
      return langCode as Language;
    }

    // 2. 精确匹配别名
    if (config.aliases) {
      for (const alias of config.aliases) {
        const aliasLower = alias.toLowerCase();
        if (browserLang === aliasLower) {
          return langCode as Language;
        }
      }
    }

    // 3. 前缀匹配语言代码（如 zh-CN 匹配 zh）
    if (browserLang.startsWith(`${langCodeLower}-`)) {
      return langCode as Language;
    }

    // 4. 前缀匹配别名（如 zh-CN 匹配 zh-cn 别名）
    if (config.aliases) {
      for (const alias of config.aliases) {
        const aliasLower = alias.toLowerCase();
        if (browserLang.startsWith(`${aliasLower}-`)) {
          return langCode as Language;
        }
      }
    }
  }

  return getDefaultLanguage() as Language;
};

// 获取存储的语言设置
const storedLocale = localStorage.getItem('locale') as Language | null;

// 确定最终使用的语言，优先级：存储的有效语言 > 浏览器检测语言 > 默认语言
let locale: Language;
if (storedLocale && isValidLanguage(storedLocale)) {
  locale = storedLocale;
} else {
  const detectedLanguage = getNavigatorLanguage();
  // 双重验证检测到的语言是否有效
  if (isValidLanguage(detectedLanguage)) {
    locale = detectedLanguage;
  } else {
    // 如果检测失败，使用默认语言
    locale = getDefaultLanguage() as Language;
    console.warn(`Failed to detect valid language, falling back to default: ${locale}`);
  }
}

// 使用 Vite 的 glob 导入功能动态加载所有语言文件
const languageModules = import.meta.glob('./*.json', { eager: false });

// 动态加载语言文件
const loadLanguageMessages = async (): Promise<Record<string, any>> => {
  const messages: Record<string, any> = {};
  const enabledLanguages = getEnabledLanguages();

  for (const lang of enabledLanguages) {
    const modulePath = `./${lang}.json`;
    const moduleLoader = languageModules[modulePath];

    if (moduleLoader) {
      try {
        const module = await moduleLoader();
        messages[lang] = (module as any).default || module;
      } catch (error) {
        console.warn(`Failed to load language file for '${lang}':`, error);
      }
    } else {
      console.warn(`Language file '${lang}.json' not found.`);
      console.warn('Available language files:', Object.keys(languageModules));
    }
  }

  return messages;
};

// 异步初始化 i18n
const initializeI18n = async (): Promise<any> => {
  const messages = await loadLanguageMessages();

  // 最终安全检查：确保选择的语言在消息对象中存在
  if (!messages[locale]) {
    console.warn(`Selected locale '${locale}' not available in messages, falling back to '${getFallbackLanguage()}'`);
    locale = getFallbackLanguage() as Language;

    // 如果回退语言也不存在，使用第一个可用的语言
    if (!messages[locale] && Object.keys(messages).length > 0) {
      locale = Object.keys(messages)[0] as Language;
      console.warn(`Fallback locale not available, using first available: '${locale}'`);
    }
  }

  return createI18n({
    legacy: false,
    locale: locale,
    fallbackLocale: getFallbackLanguage(),
    messages,
  });
};

// 导出异步初始化函数和同步的临时实例
export const createI18nInstance = initializeI18n;

// 创建一个临时的 i18n 实例，用于应用启动时的占位
const tempI18n = createI18n({
  legacy: false,
  locale: getDefaultLanguage() as Language,
  fallbackLocale: getFallbackLanguage(),
  messages: {}, // 空消息，稍后会被替换
});

export default tempI18n;
