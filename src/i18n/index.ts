import { createI18n } from 'vue-i18n';

import type { Language } from '@/types';
import { getDefaultLanguage, getEnabledLanguages, getFallbackLanguage, getLanguagesConfig, isValidLanguage } from '@/utils/language';

// 使用 Vite 的 glob 导入功能动态加载所有语言文件
const languageModules = import.meta.glob('./*.json', { eager: true });

// 动态构建语言消息映射
const messages: Record<string, any> = {};
const enabledLanguages = getEnabledLanguages();

// 加载所有启用的语言文件
for (const lang of enabledLanguages) {
  const modulePath = `./${lang}.json`;
  const module = languageModules[modulePath];

  if (module) {
    messages[lang] = (module as any).default ?? module;
  } else {
    console.warn(`Language file '${lang}.json' not found.`);
  }
}

const getNavigatorLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
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
const storedLocale = localStorage.getItem('locale');

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
