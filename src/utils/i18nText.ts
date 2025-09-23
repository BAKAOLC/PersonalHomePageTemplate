/**
 * i18n文本处理工具函数
 */

import { getDefaultLanguage, getFallbackLanguage } from './language';

import type { I18nReference, I18nText } from '@/types';

import i18n from '@/i18n';

/**
 * 解析参数中的i18n引用
 * @param param - 参数值
 * @param t - i18n翻译函数
 * @returns 解析后的参数值
 */
const resolveParamI18nReference = (param: string, t: any): string => {
  if (param.startsWith('$t:')) {
    return resolveI18nReference(param, t);
  }
  return param;
};

/**
 * 解析i18n引用字符串，支持参数列表和键值对参数
 * @param value - 可能包含i18n引用的字符串
 * @param t - i18n翻译函数
 * @returns 解析后的字符串
 */
const resolveI18nReference = (value: string, t: any): string => {
  if (value.startsWith('$t:')) {
    const content = value.substring(3);

    // 检查是否包含参数（使用 ["","",...] 或 {key:"value",...} 格式）
    const bracketIndex = content.indexOf('[');
    const braceIndex = content.indexOf('{');

    // 确定使用哪种参数格式
    let paramStartIndex = -1;
    let isKeyValueFormat = false;

    if (braceIndex !== -1 && (bracketIndex === -1 || braceIndex < bracketIndex)) {
      // 使用 {key:"value",...} 格式
      paramStartIndex = braceIndex;
      isKeyValueFormat = true;
    } else if (bracketIndex !== -1) {
      // 使用 ["","",...] 格式
      paramStartIndex = bracketIndex;
      isKeyValueFormat = false;
    }

    if (paramStartIndex === -1) {
      // 没有参数，直接解析key
      const key = content;
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
    } else {
      // 有参数，解析key和参数
      const key = content.substring(0, paramStartIndex);
      const paramsString = content.substring(paramStartIndex);

      if (t && typeof t === 'function') {
        try {
          if (isKeyValueFormat) {
            // 解析键值对参数
            const params = parseKeyValueParams(paramsString);
            // 递归解析参数值中的i18n引用
            const resolvedParams = Object.fromEntries(
              Object.entries(params).map(([k, v]) => [k, resolveParamI18nReference(v, t)]),
            );
            return t(key, resolvedParams);
          } else {
            // 解析数组参数
            const params = parseParameterArray(paramsString).map(param => {
              // 递归解析参数中的i18n引用
              return resolveParamI18nReference(param, t);
            });
            return t(key, ...params);
          }
        } catch (error) {
          console.warn(`Failed to resolve i18n reference with params: ${key}`, error);
          return key;
        }
      } else {
        console.warn(`i18n instance not provided for reference: ${key}`);
        return key;
      }
    }
  }
  return value;
};

/**
 * 解析参数数组字符串 ["","",...]
 * @param paramsString - 参数数组字符串
 * @returns 解析后的参数数组
 */
const parseParameterArray = (paramsString: string): string[] => {
  try {
    // 直接使用 JSON.parse 解析参数数组
    const params = JSON.parse(paramsString);

    // 确保返回的是字符串数组
    if (Array.isArray(params)) {
      return params.map(param => String(param));
    } else {
      throw new Error(`Expected array, got ${typeof params}`);
    }
  } catch (error) {
    console.warn(`Failed to parse parameter array: ${paramsString}`, error);
    return [];
  }
};

/**
 * 解析键值对参数字符串 {key:"value",...} 或 {key:'value',...}
 * @param paramsString - 键值对参数字符串
 * @returns 解析后的参数对象
 */
const parseKeyValueParams = (paramsString: string): Record<string, string> => {
  try {
    // 使用 JSON.parse 解析键值对
    const params = JSON.parse(paramsString);

    // 确保返回的是对象
    if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
      return Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      );
    } else {
      throw new Error(`Expected object, got ${typeof params}`);
    }
  } catch (error) {
    console.warn(`Failed to parse key-value params: ${paramsString}`, error);
    return {};
  }
};

/**
 * 获取多语言文本，支持fallback，也支持直接传入字符串和i18n引用
 * @param text - 多语言文本对象、字符串或i18n引用
 * @param currentLang - 当前语言
 * @returns 对应语言的文本
 */
export const getI18nText = (
  text: I18nText | I18nReference | undefined,
  currentLang: string,
): string => {
  const { t } = i18n.global as any;

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
