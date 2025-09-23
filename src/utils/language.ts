/**
 * 语言处理工具函数
 */

import type { I18nText, LanguagesConfig } from '@/types';

import languagesConfig from '@/config/languages.json';

/**
 * 获取语言配置
 */
export const getLanguagesConfig = (): LanguagesConfig => {
  return languagesConfig as LanguagesConfig;
};

/**
 * 获取启用的语言列表
 */
export const getEnabledLanguages = (): string[] => {
  const config = getLanguagesConfig();
  return Object.keys(config.languages).filter(
    lang => config.languages[lang].enabled,
  );
};

/**
 * 获取默认语言
 */
export const getDefaultLanguage = (): string => {
  return getLanguagesConfig().default;
};

/**
 * 获取fallback语言
 */
export const getFallbackLanguage = (): string => {
  return getLanguagesConfig().fallback;
};

/**
 * 获取语言的本地化名称
 */
export const getLanguageNativeName = (langCode: string): string => {
  const config = getLanguagesConfig();
  return config.languages[langCode]?.name || langCode;
};

/**
 * 获取多语言文本，支持fallback
 * @param text - 多语言文本对象
 * @param currentLang - 当前语言
 * @returns 对应语言的文本
 */
export const getI18nText = (text: I18nText, currentLang: string): string => {
  if (!text || typeof text !== 'object') {
    return '';
  }

  // 优先返回当前语言的文本
  if (text[currentLang]) {
    return text[currentLang];
  }

  // 尝试fallback语言
  const fallbackLang = getFallbackLanguage();
  if (text[fallbackLang]) {
    return text[fallbackLang];
  }

  // 尝试默认语言
  const defaultLang = getDefaultLanguage();
  if (text[defaultLang]) {
    return text[defaultLang];
  }

  // 返回第一个可用的文本
  const availableKeys = Object.keys(text);
  if (availableKeys.length > 0) {
    return text[availableKeys[0]];
  }

  return '';
};

/**
 * 获取 Giscus 评论系统的语言代码
 * @param langCode - 当前语言代码
 * @returns Giscus 对应的语言代码
 */
export const getGiscusLanguage = (langCode: string): string => {
  const config = getLanguagesConfig();

  // 优先使用当前语言的 giscus 映射
  const currentLangConfig = config.languages[langCode];
  if (currentLangConfig?.giscus) {
    return currentLangConfig.giscus;
  }

  // 尝试 fallback 语言
  const fallbackLangConfig = config.languages[config.fallback];
  if (fallbackLangConfig?.giscus) {
    return fallbackLangConfig.giscus;
  }

  // 最后默认返回英文
  return 'en';
};

/**
 * 验证语言代码是否有效
 */
export const isValidLanguage = (langCode: string): boolean => {
  const config = getLanguagesConfig();
  return langCode in config.languages && config.languages[langCode].enabled;
};
