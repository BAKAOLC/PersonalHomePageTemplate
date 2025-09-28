/**
 * 语言处理工具函数
 */

import languagesConfig from '@/config/languages.json';
import type { LanguagesConfig } from '@/types';

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
  return config.languages[langCode]?.name ?? langCode;
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

  // 最后默认返回 fallback 语言
  return getFallbackLanguage();
};

/**
 * 验证语言代码是否有效
 */
export const isValidLanguage = (langCode: string): boolean => {
  const config = getLanguagesConfig();
  return langCode in config.languages && config.languages[langCode].enabled;
};
