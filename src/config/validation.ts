import { z } from 'zod';

import type { SiteConfig } from '@/types';

const i18nTextSchema = z.union([
  z.string(),
  z.record(z.string(), z.string()),
]);

const authorLinkSchema = z.object({
  url: z.string().min(1),
  favicon: z.string().optional(),
  name: i18nTextSchema.optional(),
}).passthrough();

const imageBaseSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean().optional(),
  name: i18nTextSchema.optional(),
  listName: i18nTextSchema.optional(),
  description: i18nTextSchema.optional(),
  artist: z.union([i18nTextSchema, z.array(i18nTextSchema)]).optional(),
  authorLinks: z.array(authorLinkSchema).optional(),
  src: z.string().optional(),
  tags: z.array(z.string()).optional(),
  characters: z.array(z.string()).optional(),
  date: z.string().optional(),
}).passthrough();

const groupImageSchema = imageBaseSchema.extend({
  src: z.string().optional(),
  childImages: z.array(imageBaseSchema.extend({
    src: z.string().min(1),
  }).passthrough()).optional(),
}).passthrough().superRefine((image, context) => {
  if (!image.src && (!image.childImages || image.childImages.length === 0)) {
    context.addIssue({
      code: 'custom',
      message: 'Image groups need either src or childImages.',
      path: ['src'],
    });
  }
});

const siteConfigSchema = z.object({
  app: z.object({
    title: i18nTextSchema,
    copyright: i18nTextSchema,
  }).passthrough(),
  personal: z.object({
    avatar: z.string().min(1),
    name: i18nTextSchema,
    description: z.array(i18nTextSchema),
    links: z.array(z.object({
      name: i18nTextSchema,
      url: z.string().min(1),
      icon: z.union([z.string(), z.object({
        name: z.string(),
        package: z.string().optional(),
      }).passthrough()]),
      color: z.string().optional(),
    }).passthrough()),
  }).passthrough(),
  characters: z.array(z.object({
    id: z.string().min(1),
    name: i18nTextSchema,
    avatar: z.string().optional(),
  }).passthrough()),
  tags: z.array(z.object({
    id: z.string().min(1),
    name: i18nTextSchema,
    color: z.string().optional(),
    icon: z.union([z.string(), z.object({
      name: z.string(),
      package: z.string().optional(),
    }).passthrough()]).optional(),
    isRestricted: z.boolean().optional(),
    prerequisiteTags: z.array(z.string()).optional(),
  }).passthrough()),
  images: z.array(groupImageSchema),
  giscus: z.object({}).passthrough(),
  fontawesome: z.object({
    defaultPackage: z.string(),
    fallbackIcon: z.string(),
  }).passthrough(),
  features: z.object({
    gallery: z.boolean(),
    articles: z.boolean(),
    links: z.boolean(),
    characterProfiles: z.boolean(),
    comments: z.boolean(),
    live2d: z.boolean(),
    viewer: z.object({}).passthrough().optional(),
    viewerUI: z.object({
      imageList: z.boolean(),
      imageGroupList: z.boolean(),
      viewerTitle: z.boolean(),
      infoPanel: z.object({
        title: z.boolean(),
        description: z.boolean(),
        artist: z.boolean(),
        date: z.boolean(),
        tags: z.boolean(),
      }).passthrough(),
      commentsButton: z.boolean(),
    }).passthrough(),
  }).passthrough(),
  live2d: z.object({}).passthrough(),
});

const collectImageIds = (images: SiteConfig['images']): string[] => {
  return images.flatMap(image => [
    image.id,
    ...(image.childImages?.map(child => child.id) ?? []),
  ]);
};

const assertUniqueIds = (label: string, ids: string[]): void => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  ids.forEach(id => {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  });

  if (duplicates.size > 0) {
    throw new Error(`${label} contains duplicate id(s): ${[...duplicates].join(', ')}`);
  }
};

const assertKnownReferences = (config: SiteConfig): void => {
  const tagIds = new Set(config.tags.map(tag => tag.id));
  const characterIds = new Set(config.characters.map(character => character.id));
  const unknownImageTags = new Map<string, Set<string>>();

  config.tags.forEach(tag => {
    tag.prerequisiteTags?.forEach(prerequisiteTag => {
      if (!tagIds.has(prerequisiteTag)) {
        throw new Error(`Tag "${tag.id}" references unknown prerequisite tag "${prerequisiteTag}".`);
      }
    });
  });

  config.images.forEach(image => {
    const imagesToCheck = [image, ...(image.childImages ?? [])];

    imagesToCheck.forEach(item => {
      item.tags?.forEach(tagId => {
        if (!tagIds.has(tagId)) {
          const imageIds = unknownImageTags.get(tagId) ?? new Set<string>();
          imageIds.add(item.id);
          unknownImageTags.set(tagId, imageIds);
        }
      });

      item.characters?.forEach(characterId => {
        if (!characterIds.has(characterId)) {
          throw new Error(`Image "${item.id}" references unknown character "${characterId}".`);
        }
      });
    });
  });

  if (unknownImageTags.size > 0) {
    console.warn(
      'Some image tags are not defined in site tags config. They will use fallback display behavior.',
      Object.fromEntries([...unknownImageTags].map(([tagId, imageIds]) => [tagId, [...imageIds]])),
    );
  }
};

export const validateSiteConfig = (config: unknown): SiteConfig => {
  const parsed = siteConfigSchema.parse(config) as unknown as SiteConfig;

  assertUniqueIds('characters', parsed.characters.map(character => character.id));
  assertUniqueIds('tags', parsed.tags.map(tag => tag.id));
  assertUniqueIds('images', collectImageIds(parsed.images));
  assertKnownReferences(parsed);

  return parsed;
};
