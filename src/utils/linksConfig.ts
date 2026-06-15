import type { FriendLink, I18nText, LinkCategory, LinksConfig } from '@/types';

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
    throw new Error(`Invalid links config: ${path} must be an object.`);
  }

  return value;
};

const requireString = (value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid links config: ${path} must be a string.`);
  }

  return value;
};

const requireBoolean = (value: unknown, path: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid links config: ${path} must be a boolean.`);
  }

  return value;
};

const requireI18nText = (value: unknown, path: string): I18nText => {
  if (!isI18nText(value)) {
    throw new Error(`Invalid links config: ${path} must be a localized text value.`);
  }

  return value;
};

const readOptionalHidden = (record: ConfigRecord, path: string): boolean | undefined => {
  if (record.hidden === undefined) {
    return undefined;
  }

  if (typeof record.hidden !== 'boolean') {
    throw new Error(`Invalid links config: ${path}.hidden must be a boolean.`);
  }

  return record.hidden;
};

const readOptionalString = (record: ConfigRecord, key: string, path: string): string | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, `${path}.${key}`);
};

const readOptionalStringArray = (record: ConfigRecord, key: string, path: string): string[] | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`Invalid links config: ${path}.${key} must be a string array.`);
  }

  return value;
};

const parseTags = (value: unknown): Record<string, I18nText> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const tags = requireRecord(value, 'tags');

  return Object.fromEntries(
    Object.entries(tags).map(([tagId, tagText]) => [tagId, requireI18nText(tagText, `tags.${tagId}`)]),
  );
};

const parseLink = (value: unknown, path: string): FriendLink => {
  const link = requireRecord(value, path);
  const hidden = readOptionalHidden(link, path);
  const avatar = readOptionalString(link, 'avatar', path);
  const tags = readOptionalStringArray(link, 'tags', path);

  return {
    id: requireString(link.id, `${path}.id`),
    ...(hidden !== undefined ? { hidden } : {}),
    name: requireI18nText(link.name, `${path}.name`),
    url: requireString(link.url, `${path}.url`),
    ...(avatar !== undefined ? { avatar } : {}),
    description: requireI18nText(link.description, `${path}.description`),
    ...(tags !== undefined ? { tags } : {}),
  };
};

const parseCategory = (value: unknown, index: number): LinkCategory => {
  const path = `categories[${index}]`;
  const category = requireRecord(value, path);
  const { links } = category;
  const hidden = readOptionalHidden(category, path);

  if (!Array.isArray(links)) {
    throw new Error(`Invalid links config: ${path}.links must be an array.`);
  }

  return {
    id: requireString(category.id, `${path}.id`),
    ...(hidden !== undefined ? { hidden } : {}),
    name: requireI18nText(category.name, `${path}.name`),
    description: requireI18nText(category.description, `${path}.description`),
    links: links.map((link, linkIndex) => parseLink(link, `${path}.links[${linkIndex}]`)),
  };
};

export const parseLinksConfig = (value: unknown): LinksConfig => {
  const config = requireRecord(value, 'root');
  const { categories } = config;
  const settings = requireRecord(config.settings, 'settings');

  if (!Array.isArray(categories)) {
    throw new Error('Invalid links config: categories must be an array.');
  }

  return {
    tags: parseTags(config.tags),
    categories: categories.map(parseCategory),
    settings: {
      showTags: requireBoolean(settings.showTags, 'settings.showTags'),
      showDescription: requireBoolean(settings.showDescription, 'settings.showDescription'),
      showAvatar: requireBoolean(settings.showAvatar, 'settings.showAvatar'),
      defaultAvatar: requireString(settings.defaultAvatar, 'settings.defaultAvatar'),
    },
  };
};
