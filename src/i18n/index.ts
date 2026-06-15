import { createI18n, type DefineLocaleMessage } from 'vue-i18n';

import type { Language } from '@/types';
import { getBrowserLanguage, getLocalStorageItem } from '@/utils/browser';
import { getDefaultLanguage, getEnabledLanguages, getFallbackLanguage, getLanguagesConfig, isValidLanguage } from '@/utils/language';

type LocaleMessage = DefineLocaleMessage;

const isLocaleMessageObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getLocaleMessageFromModule = (module: unknown): LocaleMessage | null => {
  if (isLocaleMessageObject(module) && 'default' in module && isLocaleMessageObject(module.default)) {
    return module.default as LocaleMessage;
  }

  return isLocaleMessageObject(module) ? module as LocaleMessage : null;
};

// 使用 Vite 的 glob 导入功能动态加载所有语言文件
const languageModules = import.meta.glob('./*.json5', { eager: true });

// 动态构建语言消息映射
const messages: Record<string, LocaleMessage> = {};
const enabledLanguages = getEnabledLanguages();

// 加载所有启用的语言文件
for (const lang of enabledLanguages) {
  const modulePath = `./${lang}.json5`;
  const module = languageModules[modulePath];

  if (module) {
    const message = getLocaleMessageFromModule(module);
    if (message) {
      messages[lang] = message;
    } else {
      console.warn(`Language file '${lang}.json5' has an invalid format.`);
    }
  } else {
    console.warn(`Language file '${lang}.json5' not found.`);
  }
}

const getNavigatorLanguage = (): Language => {
  const browserLang = getBrowserLanguage()?.toLowerCase();
  if (!browserLang) {
    return getDefaultLanguage();
  }

  const languagesConfig = getLanguagesConfig();

  // 遍历所有启用的语言，检查是否匹配
  for (const [langCode, config] of Object.entries(languagesConfig.languages)) {
    if (!config.enabled) continue;

    const langCodeLower = langCode.toLowerCase();

    // 1. 精确匹配语言代码
    if (browserLang === langCodeLower) {
      return langCode;
    }

    // 2. 精确匹配别名
    if (config.aliases) {
      for (const alias of config.aliases) {
        const aliasLower = alias.toLowerCase();
        if (browserLang === aliasLower) {
          return langCode;
        }
      }
    }

    // 3. 前缀匹配语言代码（如 zh-CN 匹配 zh）
    if (browserLang.startsWith(`${langCodeLower}-`)) {
      return langCode;
    }

    // 4. 前缀匹配别名（如 zh-CN 匹配 zh-cn 别名）
    if (config.aliases) {
      for (const alias of config.aliases) {
        const aliasLower = alias.toLowerCase();
        if (browserLang.startsWith(`${aliasLower}-`)) {
          return langCode;
        }
      }
    }
  }

  return getDefaultLanguage();
};

// 获取存储的语言设置
const storedLocale = getLocalStorageItem('locale');

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
    locale = getDefaultLanguage();
    console.warn(`Failed to detect valid language, falling back to default: ${locale}`);
  }
}

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,
  locale: locale,
  fallbackLocale: getFallbackLanguage(),
  messages,
});

export default i18n;
