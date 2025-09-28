import type { Article, ArticleFilterState, ArticlePagination, I18nText } from '@/types';
import { getI18nText } from '@/utils/i18nText';

/**
 * 获取文章封面URL（支持多语言）
 */
export function getArticleCover(cover: I18nText | undefined, currentLanguage: string): string {
  if (!cover) return '';
  return getI18nText(cover, currentLanguage);
}

/**
 * 生成文章摘要
 */
export function generateArticleSummary(content: I18nText, currentLanguage: string, maxLength = 100): string {
  const text = getI18nText(content, currentLanguage);

  // 移除 Markdown 格式
  const plainText = text
    .replace(/#{1,6}\s+/g, '') // 标题
    .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体
    .replace(/\*(.*?)\*/g, '$1') // 斜体
    .replace(/`(.*?)`/g, '$1') // 行内代码
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 图片
    .replace(/^\s*[-*+]\s+/gm, '') // 列表
    .replace(/^\s*\d+\.\s+/gm, '') // 有序列表
    .replace(/^\s*>\s+/gm, '') // 引用
    .replace(/\n\s*\n/g, '\n') // 多个换行
    .replace(/\n/g, ' ') // 换行转空格
    .trim();

  // 截取指定长度
  if (plainText.length > maxLength) {
    return `${plainText.substring(0, maxLength)}...`;
  }

  return plainText;
}

/**
 * 筛选文章
 */
export function filterArticles(
  articles: Article[],
  filterState: ArticleFilterState,
  currentLanguage: string,
): Article[] {
  let filtered = [...articles];

  // 分类筛选
  if (filterState.selectedCategories.length > 0) {
    filtered = filtered.filter(
      article => filterState.selectedCategories.some(categoryId => article.categories.includes(categoryId)),
    );
  }

  // 搜索筛选
  if (filterState.searchQuery.trim()) {
    const query = filterState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(article => {
      const title = getI18nText(article.title, currentLanguage).toLowerCase();
      const summary = generateArticleSummary(article.content, currentLanguage).toLowerCase();
      const content = getI18nText(article.content, currentLanguage).toLowerCase();

      return title.includes(query) || summary.includes(query) || content.includes(query);
    });
  }

  // 排序
  filtered.sort((a, b) => {
    switch (filterState.sortBy) {
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'title-asc': {
        const titleA = getI18nText(a.title, currentLanguage);
        const titleB = getI18nText(b.title, currentLanguage);
        return titleA.localeCompare(titleB);
      }
      case 'title-desc': {
        const titleA = getI18nText(a.title, currentLanguage);
        const titleB = getI18nText(b.title, currentLanguage);
        return titleB.localeCompare(titleA);
      }
      default:
        return 0;
    }
  });

  return filtered;
}

/**
 * 计算分页信息
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  pageSize: number | 'all',
): ArticlePagination {
  if (pageSize === 'all') {
    return {
      currentPage: 1,
      totalPages: 1,
      pageSize: totalItems,
      totalItems,
      hasNext: false,
      hasPrev: false,
    };
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const safePage = Math.max(1, Math.min(currentPage, totalPages));

  return {
    currentPage: safePage,
    totalPages,
    pageSize,
    totalItems,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

/**
 * 获取分页后的文章列表
 */
export function paginateArticles(
  articles: Article[],
  currentPage: number,
  pageSize: number | 'all',
): Article[] {
  if (pageSize === 'all') {
    return articles;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return articles.slice(startIndex, endIndex);
}

/**
 * 获取文章的上一篇和下一篇
 */
export function getAdjacentArticles(
  articles: Article[],
  currentArticleId: string,
): { prev: Article | null; next: Article | null } {
  const currentIndex = articles.findIndex(article => article.id === currentArticleId);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? articles[currentIndex - 1] : null,
    next: currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null,
  };
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string, locale = 'zh-CN'): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * 统计分类文章数量
 */
export function countArticlesByCategory(articles: Article[]): Record<string, number> {
  const counts: Record<string, number> = {};

  articles.forEach(article => {
    article.categories.forEach(categoryId => {
      counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    });
  });

  return counts;
}
