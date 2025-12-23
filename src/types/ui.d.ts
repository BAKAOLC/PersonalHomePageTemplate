import type { FontAwesomeIcon } from './fontawesome';
import type { I18nText } from './language';

// 作者链接配置
export interface AuthorLink {
  url: string; // 目标链接，用于跳转到作者主页之类的地方
  favicon?: string; // 目标网站的favicon url，如果没提供就尝试从 url 获取
  name?: I18nText; // i18n的目标名称，如果没提供就尝试从 url 获取
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

export interface SocialLink {
  name: I18nText;
  url: string;
  icon: string | FontAwesomeIcon;
  color?: string;
}

export interface PersonalInfo {
  avatar: string;
  name: I18nText;
  description: I18nText[];
  animationDelayInterval?: number; // 社交链接动画延迟间隔（秒），默认 0.1
  actionButtonsWaitForLinks?: boolean; // 操作按钮是否等待社交链接动画完成，默认 true
  actionButtonsAnimationDelayInterval?: number; // 操作按钮动画延迟间隔（秒），默认使用 animationDelayInterval
  actionButtonsInitialDelay?: number; // 操作按钮初始等待时间（秒），默认 0.1，无论是否等待前面的链接都会先等待这个时间
  links: SocialLink[];
  backgroundImages?: string[]; // 可选的随机背景图像列表
  actionButtons?: ActionButton[]; // 可选的操作按钮配置
}
