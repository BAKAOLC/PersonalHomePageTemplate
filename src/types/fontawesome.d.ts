// FontAwesome 图标包类型
export type FontAwesomePackage = 'fas' | 'far' | 'fab' | 'fal' | 'fad' | 'fat' | 'fa-solid' | 'fa-regular' | 'fa-brands' | 'fa-light' | 'fa-duotone' | 'fa-thin';

// FontAwesome 图标配置
export interface FontAwesomeIcon {
  name: string; // 图标名称，如 'github', 'envelope'
  package?: FontAwesomePackage; // 图标包，如果未指定则使用默认包
}

// FontAwesome 配置
export interface FontAwesomeConfig {
  defaultPackage: FontAwesomePackage; // 默认图标包
  fallbackIcon: string; // 回退图标名称
}
