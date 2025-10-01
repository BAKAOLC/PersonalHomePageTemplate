import type { I18nText } from './language';

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
