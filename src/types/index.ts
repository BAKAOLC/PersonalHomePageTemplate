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

// 作者链接配置
export interface AuthorLink {
  url: string; // 目标链接，用于跳转到作者主页之类的地方
  favicon?: string; // 目标网站的favicon url，如果没提供就尝试从 url 获取
  name?: I18nText; // i18n的目标名称，如果没提供就尝试从 url 获取
}

// 路由元数据类型
export interface RouteMeta {
  titleKey?: string | null; // 页面标题的国际化键
}

// 操作按钮配置类型
export interface ActionButton {
  id: string;
  text: I18nText;
  icon?: string;
  color?: string;
  type: 'internal' | 'external'; // 内部路由或外部链接
  target: string; // 路由路径或外部URL
  enabled?: boolean; // 是否启用，默认true
}

export interface PersonalInfo {
  avatar: string;
  name: I18nText;
  description: I18nText[];
  links: SocialLink[];
  backgroundImages?: string[]; // 可选的随机背景图像列表
  actionButtons?: ActionButton[]; // 可选的操作按钮配置
}

// FontAwesome 图标包类型
export type FontAwesomePackage = 'fas' | 'far' | 'fab' | 'fal' | 'fad' | 'fat' | 'fa-solid' | 'fa-regular' | 'fa-brands' | 'fa-light' | 'fa-duotone' | 'fa-thin';

// FontAwesome 图标配置
export interface FontAwesomeIcon {
  name: string; // 图标名称，如 'github', 'envelope'
  package?: FontAwesomePackage; // 图标包，如果未指定则使用默认包
}

export interface SocialLink {
  name: I18nText;
  url: string;
  icon: string | FontAwesomeIcon;
  color?: string;
}

export interface ImageTag {
  id: string;
  name: I18nText;
  color?: string;
  icon?: string | FontAwesomeIcon;
  isRestricted?: boolean; // 标识是否为限制级标签
  prerequisiteTags?: string[]; // 前置标签ID数组，只有当这些标签被选中时，当前标签才会显示
}

export interface ChildImage {
  id: string;
  name?: I18nText;
  listName?: I18nText; // Optional - name displayed in child image list viewer
  description?: I18nText;
  artist?: I18nText | I18nText[]; // 支持单个或多个作者
  authorLinks?: AuthorLink[]; // 作者链接数组
  src: string;
  tags?: string[]; // tag IDs
  characters?: string[]; // character IDs
  date?: string; // yyyy-MM-dd format
}

export interface CharacterImage {
  id: string;
  name: I18nText;
  listName?: I18nText; // Optional - name displayed in child image list viewer
  description?: I18nText; // Optional - fallback to empty string
  artist?: I18nText | I18nText[]; // 支持单个或多个作者
  authorLinks?: AuthorLink[]; // 作者链接数组
  src?: string; // Optional for image groups where src is only in childImages
  tags: string[]; // tag IDs
  characters: string[]; // character IDs
  date?: string; // yyyy-MM-dd format
  childImages?: ChildImage[]; // child images for image groups
}

// 外部图像信息（用于查看任意URL图像）
export interface ExternalImageInfo {
  url: string; // 图像URL
  name?: I18nText; // 可选的图像名称
  description?: I18nText; // 可选的图像描述
  artist?: I18nText | I18nText[]; // 支持单个或多个作者
  authorLinks?: AuthorLink[]; // 作者链接数组
  date?: string; // 可选的创作时间
  tags?: string[]; // 可选的标签
}

export interface Character {
  id: string;
  name: I18nText;
  description: I18nText;
  avatar?: string;
  color?: string;
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

// FontAwesome 配置
export interface FontAwesomeConfig {
  defaultPackage: FontAwesomePackage; // 默认图标包
  fallbackIcon: string; // 回退图标名称
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

export interface SiteConfig {
  app: AppConfig;
  personal: PersonalInfo;
  characters: Character[];
  tags: ImageTag[];
  images: CharacterImage[];
  giscus: GiscusConfig;
  fontawesome: FontAwesomeConfig;
  features: FeaturesConfig;
}

export interface LoadingConfig {
  minLoadTime: number;
  messages: I18nText[];
  tips: I18nText[];
}

// 缓存统计信息
export interface CacheStats {
  size: number;
  maxSize: number;
  items: Array<{
    url: string;
    loaded: boolean;
    loading: boolean;
    error: boolean;
    progress: number;
  }>;
}

// 错误处理回调类型
export type ErrorCallback = (error?: Error) => void;
export type ProgressCallback = (progress?: number) => void;
export type LoadCallback = () => void;

// 通用事件处理器类型
export type EventHandler<T = Event> = (event: T) => void;
export type KeyboardEventHandler = EventHandler<KeyboardEvent>;
export type MouseEventHandler = EventHandler<MouseEvent>;
export type TouchEventHandler = EventHandler<TouchEvent>;

// 图片尺寸信息
export interface ImageDimensions {
  width: number;
  height: number;
}

// 动画配置类型
export interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
}

// 图片加载状态
export interface ImageLoadState {
  loaded: boolean;
  loading: boolean;
  error: boolean;
  dimensions?: ImageDimensions;
}

// 手势处理相关类型
export interface GestureState {
  scale: number;
  x: number;
  y: number;
  isDragging: boolean;
  isZooming: boolean;
}

// 排序选项类型
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

// 筛选状态
export interface FilterState {
  selectedCharacters: string[];
  selectedTags: string[];
  sortBy: SortOption;
}

// 全屏查看器方法类型
export interface FullscreenViewerMethods {
  show: (index: number) => void;
  hide: () => void;
  next: () => void;
  prev: () => void;
}

// 图片操作方法类型
export interface ImageOperationMethods {
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
}

// 键盘快捷键配置
export interface KeyboardShortcuts {
  [key: string]: () => void;
}

// 友链相关类型
export interface FriendLink {
  id: string;
  name: string;
  url: string;
  avatar?: string;
  description: I18nText;
  tags?: string[];
}

export interface LinkCategory {
  id: string;
  name: I18nText;
  description: I18nText;
  links: FriendLink[];
}

export interface LinksConfig {
  tags?: Record<string, I18nText>;
  categories: LinkCategory[];
  settings: {
    showTags: boolean;
    showDescription: boolean;
    showAvatar: boolean;
    defaultAvatar: string;
  };
}

// 网站配置类型
export interface SiteInfo {
  [key: string]: string | undefined; // 支持多语言文本和可选属性
  iconUrl?: string; // 可选的网站图标URL
}

// Sites 配置类型
export type SitesConfig = Record<string, SiteInfo>;

// 文章相关类型
export interface ArticleCategory {
  name: I18nText;
  color?: string;
}

export interface Article {
  id: string;
  title: I18nText;
  cover?: I18nText; // 支持多语言封面
  categories: string[]; // category IDs
  date: string; // yyyy-MM-dd format
  content: I18nText;
  allowComments?: boolean; // 默认为 true
}

export interface ArticleCategoriesConfig {
  [categoryId: string]: ArticleCategory;
}

// 文章筛选状态
export interface ArticleFilterState {
  selectedCategories: string[];
  sortBy: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
  searchQuery: string;
  pageSize: number | 'all';
  currentPage: number;
}

// 文章分页信息
export interface ArticlePagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 额外信息卡片配置
export interface InfoCard {
  id: string;
  title?: I18nText;
  image: string | { light: string; dark: string }; // 图片URL，支持亮色暗色区分
}

// 文章列表配置
export interface ArticlesConfig {
  articles: Article[];
  infoCards?: InfoCard[]; // 额外的信息卡片
}

// 文章页面信息卡片配置
export interface ArticlesPageConfig {
  infoCards: InfoCard[];
}

// 角色设定相关类型
export interface CharacterVariant {
  id: string;
  name: I18nText;
  images: CharacterVariantImage[];
  infoCards?: CharacterInfoCard[];
}

export interface CharacterVariantImage {
  id: string;
  src: string;
  alt: I18nText;
  infoCards?: CharacterInfoCard[];
}

export interface CharacterInfoCard {
  id: string;
  title: I18nText;
  content: I18nText;
  color?: string;
}

export interface CharacterProfile {
  id: string;
  name: I18nText;
  color?: string;
  variants: CharacterVariant[];
}

export interface CharacterProfilesConfig {
  characters: CharacterProfile[];
}
