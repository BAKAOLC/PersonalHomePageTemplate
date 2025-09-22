export interface I18nText {
  en: string;
  zh: string;
  jp: string;
}

// 语言类型
export type Language = 'en' | 'zh' | 'jp';

// 路由元数据类型
export interface RouteMeta {
  titleKey?: string | null; // 页面标题的国际化键
}

export interface PersonalInfo {
  avatar: string;
  name: I18nText;
  description: I18nText[];
  links: SocialLink[];
  backgroundImages?: string[]; // 可选的随机背景图像列表
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
  artist?: I18nText;
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
  artist?: I18nText; // Optional - fallback to "N/A"
  src?: string; // Optional for image groups where src is only in childImages
  tags: string[]; // tag IDs
  characters: string[]; // character IDs
  date?: string; // yyyy-MM-dd format
  childImages?: ChildImage[]; // child images for image groups
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
  links: boolean;
  comments: boolean;
  viewer: ViewerInfoConfig; // Viewer信息栏配置（向后兼容）
  viewerUI: ViewerUIConfig; // 新的结构化Viewer配置
}

export interface SiteConfig {
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
