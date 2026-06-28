import { siteConfig } from './site';
import { validateGalleryConfig } from './validation';

import type { GalleryConfig } from '@/types';

let galleryConfigPromise: Promise<GalleryConfig> | null = null;

export const loadGalleryConfig = (): Promise<GalleryConfig> => {
  galleryConfigPromise ??= Promise.all([
    import('./images.json5'),
    import('./tags.json5'),
  ]).then(([imagesModule, tagsModule]) => validateGalleryConfig({
    characters: siteConfig.characters,
    tags: tagsModule.default,
    images: imagesModule.default,
  }));

  return galleryConfigPromise;
};
