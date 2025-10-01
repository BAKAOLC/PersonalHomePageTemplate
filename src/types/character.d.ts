import type { I18nText } from './language';

export interface Character {
  id: string;
  name: I18nText;
  description: I18nText;
  avatar?: string;
  color?: string;
}

// 卡片模板变量类型
export interface CardTemplateVariables {
  [key: string]: I18nText | undefined;
}

// 信息卡片模板定义
export interface CharacterInfoCardTemplate {
  id: string;
  title?: I18nText;
  content?: I18nText;
  color?: string;
  variables?: CardTemplateVariables; // 默认变量值
}

// 信息卡片定义
export interface CharacterInfoCard {
  id: string;
  title?: I18nText;
  content?: I18nText;
  color?: string;
  from?: string; // 引用父级卡片的 ID
  template?: string; // 引用模板的 ID
  variables?: CardTemplateVariables; // 用于填充模板或覆盖 from 卡片的变量
}

export interface CharacterVariantImage {
  id: string;
  src: string;
  alt: I18nText;
  infoCards?: CharacterInfoCard[];
}

export interface CharacterVariant {
  id: string;
  name: I18nText;
  images: CharacterVariantImage[];
  infoCards?: CharacterInfoCard[];
}

export interface CharacterProfile {
  id: string;
  name: I18nText;
  color?: string;
  infoCardTemplates?: CharacterInfoCardTemplate[]; // 角色级别的模板定义
  infoCards?: CharacterInfoCard[]; // 角色级别的卡片
  variants: CharacterVariant[];
}

// 解析后的卡片（运行时使用）
export interface ResolvedCharacterInfoCard {
  id: string;
  title?: I18nText;
  content?: I18nText;
  color?: string;
  resolvedFrom?: string; // 解析来源：'self' | 'from' | 'template'
}

// 卡片解析上下文
export interface CardResolutionContext {
  characterCards: Map<string, CharacterInfoCard>;
  variantCards: Map<string, CharacterInfoCard>;
  imageCards: Map<string, CharacterInfoCard>;
  templates: Map<string, CharacterInfoCardTemplate>;
}

// 角色配置层级类型
export type CharacterConfigLevel = 'character' | 'variant' | 'image';
