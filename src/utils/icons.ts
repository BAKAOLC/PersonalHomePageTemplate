import type { FontAwesomeIcon, FontAwesomePackage } from '@/types';

import { siteConfig } from '@/config/site';

/**
 * 包名映射表，支持新旧格式转换
 */
const PACKAGE_MAP: Record<string, string> = {
  fas: 'fas',
  far: 'far',
  fab: 'fab',
  fal: 'fal',
  fad: 'fad',
  fat: 'fat',
  'fa-solid': 'fas',
  'fa-regular': 'far',
  'fa-brands': 'fab',
  'fa-light': 'fal',
  'fa-duotone': 'fad',
  'fa-thin': 'fat',
};

/**
 * 标准化包名，将新格式转换为旧格式
 * @param packageName - 包名
 * @returns 标准化的包名
 */
function normalizePackage(packageName: FontAwesomePackage): string {
  return PACKAGE_MAP[packageName] || packageName;
}

/**
 * 常见品牌图标映射，这些图标通常在 fab 包中
 */
const BRAND_ICONS = new Set([
  'github',
  'twitter',
  'x-twitter',
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'tiktok',
  'discord',
  'telegram',
  'whatsapp',
  'wechat',
  'qq',
  'weibo',
  'bilibili',
  'steam',
  'twitch',
  'spotify',
  'apple',
  'google',
  'microsoft',
  'amazon',
  'paypal',
  'visa',
  'mastercard',
]);

/**
 * 获取 FontAwesome 图标的完整类名
 * @param icon - 图标配置，可以是字符串或 FontAwesome 图标对象
 * @returns 完整的 FontAwesome 类名字符串
 */
export function getIconClass(icon: string | FontAwesomeIcon | undefined): string {
  if (!icon) {
    // 如果没有图标，使用回退图标
    const defaultPackage = normalizePackage(siteConfig.fontawesome.defaultPackage);
    return `${defaultPackage} fa-${siteConfig.fontawesome.fallbackIcon}`;
  }

  if (typeof icon === 'string') {
    // 检查是否已经包含了完整的类名（如 "fa-brands fa-bilibili"）
    if (icon.includes('fa-')) {
      return icon;
    }

    // 如果是简单字符串，智能选择包
    let iconPackage: string;
    if (BRAND_ICONS.has(icon)) {
      // 品牌图标使用 fab 包
      iconPackage = 'fab';
    } else {
      // 其他图标使用默认包
      iconPackage = normalizePackage(siteConfig.fontawesome.defaultPackage);
    }

    return `${iconPackage} fa-${icon}`;
  }

  // 如果是 FontAwesome 图标对象
  const iconPackage = normalizePackage(icon.package || siteConfig.fontawesome.defaultPackage);
  return `${iconPackage} fa-${icon.name}`;
}

/**
 * 获取图标名称（不包含包前缀）
 * @param icon - 图标配置
 * @returns 图标名称
 */
export function getIconName(icon: string | FontAwesomeIcon | undefined): string {
  if (!icon) {
    return siteConfig.fontawesome.fallbackIcon;
  }

  if (typeof icon === 'string') {
    return icon;
  }

  return icon.name;
}

/**
 * 获取图标包名称
 * @param icon - 图标配置
 * @returns 图标包名称
 */
export function getIconPackage(icon: string | FontAwesomeIcon | undefined): string {
  if (!icon || typeof icon === 'string') {
    return normalizePackage(siteConfig.fontawesome.defaultPackage);
  }

  return normalizePackage(icon.package || siteConfig.fontawesome.defaultPackage);
}

/**
 * 创建 FontAwesome 图标对象
 * @param name - 图标名称
 * @param iconPackage - 图标包（可选）
 * @returns FontAwesome 图标对象
 */
export function createIcon(name: string, iconPackage?: FontAwesomePackage): FontAwesomeIcon {
  return {
    name,
    package: iconPackage,
  };
}

/**
 * 验证图标包是否有效
 * @param iconPackage - 图标包名称
 * @returns 是否为有效的图标包
 */
export function isValidIconPackage(iconPackage: string): iconPackage is FontAwesomePackage {
  return Object.keys(PACKAGE_MAP).includes(iconPackage);
}
