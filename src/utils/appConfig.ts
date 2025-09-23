import { siteConfig } from '@/config/site';
import { getI18nText } from '@/utils/i18nText';

/**
 * 获取应用标题（多语言）
 * @param language 当前语言
 * @returns 应用标题
 */
export const getAppTitle = (language: string): string => {
  return getI18nText(siteConfig.app.title, language);
};

/**
 * 获取应用版权信息（多语言）
 * @param language 当前语言
 * @returns 版权信息
 */
export const getAppCopyright = (language: string): string => {
  return getI18nText(siteConfig.app.copyright, language);
};
