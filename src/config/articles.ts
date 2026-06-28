import type { Article } from '@/types';
import { parseArticlesConfig } from '@/utils/articlesConfig';

let articlesPromise: Promise<Article[]> | null = null;

export const loadArticlesConfig = (): Promise<Article[]> => {
  articlesPromise ??= import('./articles.json5')
    .then(module => parseArticlesConfig(module.default));

  return articlesPromise;
};
