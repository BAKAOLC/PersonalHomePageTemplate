/**
 * i18n文本处理工具函数
 */

import JSON5 from 'json5';

import { getDefaultLanguage, getFallbackLanguage } from './language';

import i18n from '@/i18n';
import type { I18nReference, I18nText } from '@/types';

/**
 * 解析参数中的i18n引用
 * @param param - 参数值
 * @param t - i18n翻译函数
 * @param params - 外层传入的参数
 * @returns 解析后的参数值
 */
const resolveParamI18nReference = (param: string, t: any, params?: Record<string, any> | any[]): string => {
  if (param.startsWith('$t:')) {
    return resolveI18nReference(param, t, params);
  }
  return param;
};

/**
 * 解析i18n引用字符串，支持参数列表和键值对参数
 * @param value - 可能包含i18n引用的字符串
 * @param t - i18n翻译函数
 * @param params - 可选的参数对象或数组，用于参数替换
 * @returns 解析后的字符串
 */
const resolveI18nReference = (value: string, t: any, params?: Record<string, any> | any[]): string => {
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
          return params ? t(key, params) : t(key);
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
            const parsedParams = parseKeyValueParams(paramsString);
            // 递归解析参数值中的i18n引用
            const resolvedParams = Object.fromEntries(
              Object.entries(parsedParams).map(([k, v]) => [k, resolveParamI18nReference(v, t, params)]),
            );
            // 合并传入的参数和解析的参数
            if (Array.isArray(params)) {
              // 如果外层传入的是数组参数，直接使用解析的参数对象
              return t(key, resolvedParams);
            } else {
              // 合并对象参数
              const finalParams = { ...params, ...resolvedParams };
              return t(key, finalParams);
            }
          } else {
            // 解析数组参数
            const parsedParams = parseParameterArray(paramsString).map(param => {
              // 递归解析参数中的i18n引用
              return resolveParamI18nReference(param, t, params);
            });
            return t(key, ...parsedParams);
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
    // 使用 JSON5.parse 解析参数数组（支持更宽松的 JSON5 格式）
    const params = JSON5.parse(paramsString);

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
 * 解析键值对参数字符串 {key:"value",...} 或 ['value',...]
 * @param paramsString - 键值对参数字符串
 * @returns 解析后的参数对象
 */
const parseKeyValueParams = (paramsString: string): Record<string, string> => {
  try {
    // 使用 JSON5.parse 解析键值对（支持更宽松的 JSON5 格式）
    const params = JSON5.parse(paramsString);

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
 * 处理文本和参数替换，支持i18n引用和普通字符串的参数替换
 * @param text - 文本字符串
 * @param t - i18n翻译函数
 * @param params - 参数对象或数组
 * @returns 处理后的文本
 */
const processTextWithParams = (text: string, t: any, params?: Record<string, any> | any[]): string => {
  // 如果是i18n引用，使用原有逻辑
  if (text.startsWith('$t:')) {
    return resolveI18nReference(text, t, params);
  }

  // 如果没有参数，直接返回原文本
  if (!params) {
    return text;
  }

  // 处理数组参数 - 替换 {0}, {1}, {2} 等占位符
  if (Array.isArray(params)) {
    let result = text;
    params.forEach((value, index) => {
      const placeholder = `{${index}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    });
    return result;
  }

  // 处理对象参数 - 替换 {key} 格式的占位符
  if (typeof params === 'object' && Object.keys(params).length > 0) {
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }
    return result;
  }

  // 没有有效参数，直接返回原文本
  return text;
};

/**
 * 获取多语言文本，支持fallback，也支持直接传入字符串和i18n引用
 * @param text - 多语言文本对象、字符串或i18n引用
 * @param currentLang - 当前语言
 * @param params - 可选的参数对象或数组，用于i18n文本中的参数替换
 * @returns 对应语言的文本
 *
 * @example
 * // 对象参数示例
 * const text1 = { en: "Hello {name}!", zh: "你好 {name}！" };
 * getI18nText(text1, "en", { name: "John" }); // "Hello John!"
 *
 * // 数组参数示例
 * const text2 = { en: "Hello {0} {1}!", zh: "你好 {0} {1}！" };
 * getI18nText(text2, "en", ["John", "Doe"]); // "Hello John Doe!"
 *
 * // i18n引用示例
 * getI18nText("$t:greeting{name:'John'}", "en"); // 查找i18n中的greeting键
 */
export const getI18nText = (
  text: I18nText | I18nReference | undefined,
  currentLang: string,
  params?: Record<string, any> | any[],
): string => {
  const { t } = i18n.global as any;

  // 如果是 undefined 或 null，返回空字符串
  if (!text || (typeof text !== 'string' && typeof text !== 'object')) {
    return '';
  }

  if (typeof text === 'string') {
    return processTextWithParams(text, t, params);
  }

  // 优先返回当前语言的文本
  if (text[currentLang]) {
    return processTextWithParams(text[currentLang], t, params);
  }
  // 尝试fallback语言
  const fallbackLang = getFallbackLanguage();
  if (text[fallbackLang]) {
    return processTextWithParams(text[fallbackLang], t, params);
  }

  // 尝试默认语言
  const defaultLang = getDefaultLanguage();
  if (text[defaultLang]) {
    return processTextWithParams(text[defaultLang], t, params);
  }

  // 返回第一个可用的文本
  const availableKeys = Object.keys(text);
  if (availableKeys.length > 0) {
    return processTextWithParams(text[availableKeys[0]], t, params);
  }

  return '';
};
