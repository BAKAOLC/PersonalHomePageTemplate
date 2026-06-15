import type { Article, I18nText } from '@/types';

type ConfigRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ConfigRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isI18nText = (value: unknown): value is I18nText => {
  if (typeof value === 'string') {
    return true;
  }

  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'string');
};

const requireRecord = (value: unknown, path: string): ConfigRecord => {
  if (!isRecord(value)) {
    throw new Error(`Invalid articles config: ${path} must be an object.`);
  }

  return value;
};

const requireString = (value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid articles config: ${path} must be a string.`);
  }

  return value;
};

const requireI18nText = (value: unknown, path: string): I18nText => {
  if (!isI18nText(value)) {
    throw new Error(`Invalid articles config: ${path} must be a localized text value.`);
  }

  return value;
};

const readOptionalBoolean = (record: ConfigRecord, key: string, path: string): boolean | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid articles config: ${path}.${key} must be a boolean.`);
  }

  return value;
};

const readOptionalI18nText = (record: ConfigRecord, key: string, path: string): I18nText | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  return requireI18nText(value, `${path}.${key}`);
};

const readStringArray = (value: unknown, path: string): string[] => {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`Invalid articles config: ${path} must be a string array.`);
  }

  return value;
};

const parseArticle = (value: unknown, index: number): Article => {
  const path = `[${index}]`;
  const article = requireRecord(value, path);
  const hidden = readOptionalBoolean(article, 'hidden', path);
  const cover = readOptionalI18nText(article, 'cover', path);
  const content = readOptionalI18nText(article, 'content', path);
  const markdownPath = readOptionalI18nText(article, 'markdownPath', path);
  const summary = readOptionalI18nText(article, 'summary', path);
  const allowComments = readOptionalBoolean(article, 'allowComments', path);

  return {
    id: requireString(article.id, `${path}.id`),
    ...(hidden !== undefined ? { hidden } : {}),
    title: requireI18nText(article.title, `${path}.title`),
    ...(cover !== undefined ? { cover } : {}),
    categories: readStringArray(article.categories, `${path}.categories`),
    date: requireString(article.date, `${path}.date`),
    ...(content !== undefined ? { content } : {}),
    ...(markdownPath !== undefined ? { markdownPath } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(allowComments !== undefined ? { allowComments } : {}),
  };
};

export const parseArticlesConfig = (value: unknown): Article[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid articles config: root must be an array.');
  }

  return value.map(parseArticle);
};
