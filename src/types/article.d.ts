import type { I18nText } from './language';

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
