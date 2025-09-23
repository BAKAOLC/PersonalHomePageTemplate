/**
 * i18n文本处理工具函数
 */

import { getDefaultLanguage, getFallbackLanguage } from './language';

import type { I18nReference, I18nText } from '@/types';

/**
 * 解析i18n引用字符串
 * @param value - 可能包含i18n引用的字符串
 * @param t - i18n翻译函数
 * @returns 解析后的字符串
 */
const resolveI18nReference = (value: string, t: any): string => {
  if (value.startsWith('$t:')) {
    const key = value.substring(3);
    if (t && typeof t === 'function') {
      try {
        return t(key);
      } catch (error) {
        console.warn(`Failed to resolve i18n reference: ${key}`, error);
        return key;
      }
    } else {
      console.warn(`i18n instance not provided for reference: ${key}`);
      return key;
    }
  }
  return value;
};

/**
 * 获取多语言文本，支持fallback，也支持直接传入字符串和i18n引用
 * @param text - 多语言文本对象、字符串或i18n引用
 * @param currentLang - 当前语言
 * @param i18nInstance - i18n实例（可选，如果不提供则跳过i18n引用解析）
 * @returns 对应语言的文本
 */
export const getI18nText = (
  text: I18nText | I18nReference | undefined,
  currentLang: string,
  i18nInstance?: any,
): string => {
  const t = i18nInstance?.global?.t;

  // 如果是字符串，检查是否为i18n引用
  if (typeof text === 'string') {
    // 检查是否为i18n引用格式：$t:key.path
    if (text.startsWith('$t:')) {
      return resolveI18nReference(text, t);
    }
    // 普通字符串直接返回
    return text;
  }

  // 如果是 undefined 或 null，返回空字符串
  if (!text || typeof text !== 'object') {
    return '';
  }

  // 优先返回当前语言的文本
  if (text[currentLang]) {
    return resolveI18nReference(text[currentLang], t);
  }

  // 尝试fallback语言
  const fallbackLang = getFallbackLanguage();
  if (text[fallbackLang]) {
    return resolveI18nReference(text[fallbackLang], t);
  }

  // 尝试默认语言
  const defaultLang = getDefaultLanguage();
  if (text[defaultLang]) {
    return resolveI18nReference(text[defaultLang], t);
  }

  // 返回第一个可用的文本
  const availableKeys = Object.keys(text);
  if (availableKeys.length > 0) {
    return resolveI18nReference(text[availableKeys[0]], t);
  }

  return '';
};
