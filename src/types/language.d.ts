// 语言配置接口
export interface LanguageConfig {
  code: string;
  name: string;
  enabled: boolean;
  giscus?: string; // Giscus 评论系统的语言代码映射
  aliases?: string[]; // 语言别名，用于浏览器语言检测
}

export interface LanguagesConfig {
  fallback: string;
  default: string;
  languages: Record<string, LanguageConfig>;
}

// 动态语言类型 - 基于配置文件
export type Language = string;

// i18n引用类型 - 用于在配置中引用i18n键
export type I18nReference = `$t:${string}`;

// 动态多语言文本接口 - 支持任意语言键，也可以是简单字符串或i18n引用
export type I18nText = Record<string, string> | I18nReference | string;
