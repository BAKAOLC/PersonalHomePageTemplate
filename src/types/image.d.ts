import type { FontAwesomeIcon } from './fontawesome';
import type { I18nText } from './language';
import type { AuthorLink } from './ui';

export interface ImageTag {
  id: string;
  name: I18nText;
  color?: string;
  icon?: string | FontAwesomeIcon;
  isRestricted?: boolean; // 标识是否为限制级标签
  prerequisiteTags?: string[]; // 前置标签ID数组，只有当这些标签被选中时，当前标签才会显示
}

export interface ImageBase {
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

export interface GroupImage extends ImageBase {
  childImages?: ImageBase[]; // child images for image groups
}

export interface DisplayImage extends GroupImage {
  displaySrc?: string;
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

// 图片尺寸信息
export interface ImageDimensions {
  width: number;
  height: number;
}

// 图片加载状态
export interface ImageLoadState {
  loaded: boolean;
  loading: boolean;
  error: boolean;
  dimensions?: ImageDimensions;
}
