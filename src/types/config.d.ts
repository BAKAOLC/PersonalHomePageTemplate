import type { Character } from './character';
import type { FontAwesomeConfig } from './fontawesome';
import type { GroupImage, ImageTag } from './image';
import type { I18nText } from './language';
import type { PersonalInfo } from './ui';

// 路由元数据类型
export interface RouteMeta {
  titleKey?: string | null; // 页面标题的国际化键
}

export interface GiscusConfig {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'url' | 'title' | 'og:title' | 'specific' | 'number' | 'pathname';
  strict: '0' | '1';
  reactionsEnabled: '0' | '1';
  emitMetadata: '0' | '1';
  inputPosition: 'top' | 'bottom';
  loading: 'lazy' | 'eager';
}

// Viewer信息栏项目配置
export interface ViewerInfoItems {
  title: boolean; // 标题
  description: boolean; // 说明
  artist: boolean; // 作者
  date: boolean; // 创作时间
  tags: boolean; // 标签
}

// Viewer界面配置
export interface ViewerUIConfig {
  imageList: boolean; // 整体图像列表（画廊中的图像网格）
  imageGroupList: boolean; // 图像组内的子图像列表（左侧组选择器）
  viewerTitle: boolean; // 顶部标题
  infoPanel: ViewerInfoItems; // 信息栏项目
  commentsButton: boolean; // 评论区按钮
}

// Viewer配置（向后兼容的扁平结构）
export interface ViewerInfoConfig {
  showImageList: boolean; // 整体图像列表（画廊中的图像网格）
  showImageGroupList: boolean; // 图像组内的子图像列表（左侧组选择器）
  showTitle: boolean; // 标题
  showDescription: boolean; // 说明
  showArtist: boolean; // 作者
  showDate: boolean; // 创作时间
  showTags: boolean; // 标签
  showCommentsButton: boolean; // 评论区按钮
}

// 功能配置
export interface FeaturesConfig {
  gallery: boolean;
  articles: boolean;
  links: boolean;
  characterProfiles: boolean;
  comments: boolean;
  viewer: ViewerInfoConfig; // Viewer信息栏配置（向后兼容）
  viewerUI: ViewerUIConfig; // 新的结构化Viewer配置
}

// 应用基础配置
export interface AppConfig {
  title: I18nText;
  copyright: I18nText;
}

// 网站配置类型
export interface SiteInfo {
  [key: string]: string | undefined; // 支持多语言文本和可选属性
  iconUrl?: string; // 可选的网站图标URL
}

// Sites 配置类型
export type SitesConfig = Record<string, SiteInfo>;

export interface SiteConfig {
  app: AppConfig;
  personal: PersonalInfo;
  characters: Character[];
  tags: ImageTag[];
  images: GroupImage[];
  giscus: GiscusConfig;
  fontawesome: FontAwesomeConfig;
  features: FeaturesConfig;
}

export interface LoadingConfig {
  minLoadTime: number;
  messages: I18nText[];
  tips: I18nText[];
}
