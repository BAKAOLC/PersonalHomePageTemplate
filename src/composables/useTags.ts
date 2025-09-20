import { computed } from 'vue';

import type { I18nText } from '@/types';

import { siteConfig } from '@/config/site';

/**
 * Composable for tag operations with optimized sorting performance
 */
export function useTags(): {
  getSortedTags: (tagIds: string[]) => string[];
  getTagColor: (tagId: string) => string;
  getTagName: (tagId: string, language?: string) => string;
  tagIndexMap: Map<string, number>;
} {
  // Precompute tag index map for O(1) lookup performance
  const tagIndexMap = computed(() => {
    const map = new Map<string, number>();
    siteConfig.tags.forEach((tag, index) => {
      map.set(tag.id, index);
    });
    return map;
  });

  /**
   * Sort tag IDs based on their definition order in siteConfig.tags
   * Uses precomputed index map for O(n) performance instead of O(n*m)
   * @param tagIds Array of tag IDs to sort
   * @returns Sorted array of tag IDs
   */
  const getSortedTags = (tagIds: string[]): string[] => {
    if (!tagIds || tagIds.length === 0) return [];

    return [...tagIds].sort((a, b) => {
      const indexA = tagIndexMap.value.get(a);
      const indexB = tagIndexMap.value.get(b);

      // If tag not found in config, put it at the end
      if (indexA === undefined && indexB === undefined) return 0;
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;

      // Sort by definition order
      return indexA - indexB;
    });
  };

  /**
   * Get tag color by tag ID
   * @param tagId Tag ID
   * @returns Tag color or default purple color
   */
  const getTagColor = (tagId: string): string => {
    const tag = siteConfig.tags.find(t => t.id === tagId);
    return tag?.color || '#8b5cf6';
  };

  /**
   * Get tag name by tag ID and language
   * @param tagId Tag ID
   * @param language Target language
   * @returns Localized tag name or tag ID if not found
   */
  const getTagName = (tagId: string, language?: string): string => {
    const tag = siteConfig.tags.find(t => t.id === tagId);
    if (!tag) return tagId;

    if (!language) return tag.name.zh || tag.name.en || tagId;

    const t = (text: I18nText): string => {
      return text[language as keyof I18nText] || text.en || '';
    };

    return t(tag.name);
  };

  return {
    getSortedTags,
    getTagColor,
    getTagName,
    tagIndexMap: tagIndexMap.value,
  };
}
