import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { siteConfig } from '@/config/site';
import type { DisplayImage, GroupImage, ImageBase } from '@/types';

export const useGalleryStore = defineStore('gallery', () => {
  // 搜索状态
  const searchQuery = ref('');

  // 是否处于搜索状态
  const isSearching = computed(() => !!searchQuery.value.trim());

  // 存储搜索前的状态，以便清除搜索时恢复
  const previousCharacterId = ref('');
  const previousTagId = ref('');

  // 当前选择的角色
  const selectedCharacterId = ref(siteConfig.characters[0]?.id ?? '');

  // 当前选择的标签
  const selectedTag = ref('all');

  // 特殊标签的选择状态（默认都不选中）
  const selectedRestrictedTags = ref<Record<string, boolean>>({});

  // 排序设置
  const sortBy = ref<'name' | 'artist' | 'date'>('date');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // 当前选择的角色
  const selectedCharacter = computed(() => {
    return siteConfig.characters.find(character => character.id === selectedCharacterId.value);
  });

  // 当前角色的图像列表（支持图像组）
  const characterImages = computed(() => {
    const resultImages: DisplayImage[] = [];

    for (const parentImage of siteConfig.images) {
      const validImages = getValidImagesInGroup(parentImage);
      if (validImages.length > 0) {
        const displayImage = getDisplayImageForGroup(parentImage, validImages);
        resultImages.push(displayImage);
      }
    }

    // 排序
    const sortedImages = sortImages(resultImages);

    return sortedImages;
  });

  // 图像排序函数
  const sortImages = (images: ImageBase[]): ImageBase[] => {
    return [...images].sort((a, b) => {
      let comparison = 0;

      switch (sortBy.value) {
        case 'name': {
          const aName = getSearchableText(a.name);
          const bName = getSearchableText(b.name);
          comparison = aName.localeCompare(bName);
          break;
        }
        case 'artist': {
          const aArtist = a.artist ? getSearchableText(a.artist) : 'n/a';
          const bArtist = b.artist ? getSearchableText(b.artist) : 'n/a';
          comparison = aArtist.localeCompare(bArtist);
          break;
        }
        case 'date': {
          // 将无日期的项目视为最早的作品
          const aDate = a.date ?? '0000-00-00';
          const bDate = b.date ?? '0000-00-00';
          comparison = aDate.localeCompare(bDate);
          break;
        }
      }

      return sortOrder.value === 'asc' ? comparison : -comparison;
    });
  };

  // 从I18nText或字符串中提取可搜索文本
  const getSearchableText = (text: any): string => {
    if (typeof text === 'string') {
      return text.toLowerCase();
    }

    // 确保是对象
    if (!text || typeof text !== 'object') return '';

    // 将所有语言版本组合成一个字符串
    return Object.values(text)
      .filter(value => typeof value === 'string')
      .join(' ')
      .toLowerCase();
  };

  // 标签计数（支持图像组）
  const tagCounts = computed(() => {
    const counts: Record<string, number> = { all: 0 };

    // 计算有效的图像组数量
    const validImageGroups: GroupImage[] = [];
    for (const parentImage of siteConfig.images) {
      const validImages = getValidImagesInGroup(parentImage);
      const firstValidImage = validImages.shift();
      if (firstValidImage) {
        validImageGroups.push({
          ...firstValidImage,
          childImages: validImages,
        });
      }
    }

    // 计算每个标签的数量
    siteConfig.tags.forEach(tag => {
      const count = validImageGroups.filter(image => image.tags?.includes(tag.id)).length;
      counts[tag.id] = count;
    });

    // "all"选项的计数是所有匹配的图像总数
    counts.all = validImageGroups.length;

    return counts;
  });

  // 获取每个角色的匹配图像数量（支持图像组）
  const getCharacterMatchCount = (characterId: string): number => {
    const validImageGroups = siteConfig.images.filter(getValidImagesInGroup);
    if (characterId === 'all') {
      return validImageGroups.length;
    }

    const validImages = validImageGroups.filter(image => image.characters?.includes(characterId));
    return validImages.length;
  };

  // 获取单个图像（支持子图像ID）
  const getImageById = (id: string): ImageBase | undefined => {
    // 首先查找父图像
    const parentImage = siteConfig.images.find(img => img.id === id);
    if (parentImage) {
      return parentImage;
    }

    // 如果没找到，查找子图像
    const groupInfo = getImageGroupByChildId(id);
    if (groupInfo) {
      return getChildImageWithDefaults(groupInfo.parentImage, groupInfo.childImage);
    }

    return undefined;
  };

  // 递归获取所有依赖某个标签的子标签
  const getAllDependentTags = (tagId: string, visited = new Set<string>()): string[] => {
    if (visited.has(tagId)) {
      return []; // 防止循环依赖
    }

    visited.add(tagId);
    const dependentTags: string[] = [];

    // 找到所有直接依赖当前标签的子标签
    const directDependents = siteConfig.tags.filter(tag => tag.isRestricted
      && tag.prerequisiteTags?.includes(tagId));

    directDependents.forEach(dependentTag => {
      dependentTags.push(dependentTag.id);
      // 递归获取子标签的依赖标签
      const subDependents = getAllDependentTags(dependentTag.id, new Set(visited));
      dependentTags.push(...subDependents);
    });

    return dependentTags;
  };

  // 设置特殊标签的选择状态
  const setRestrictedTagState = (tagId: string, enabled: boolean): void => {
    selectedRestrictedTags.value[tagId] = enabled;

    // 如果取消选择一个标签，需要递归取消选择所有依赖它的子标签
    if (!enabled) {
      const allDependentTags = getAllDependentTags(tagId);

      allDependentTags.forEach(dependentTagId => {
        if (selectedRestrictedTags.value[dependentTagId]) {
          selectedRestrictedTags.value[dependentTagId] = false;
        }
      });
    }
  };

  // 获取特殊标签的选择状态
  const getRestrictedTagState = (tagId: string): boolean => {
    return selectedRestrictedTags.value[tagId] ?? false;
  };

  // 图像组相关辅助函数

  // 根据child image ID获取父图像和子图像
  const getImageGroupByChildId = (childId: string): { parentImage: GroupImage; childImage: ImageBase } | null => {
    for (const image of siteConfig.images) {
      if (image.childImages) {
        const childImage = image.childImages.find(child => child.id === childId);
        if (childImage) {
          return { parentImage: image, childImage };
        }
      }
    }
    return null;
  };

  // 获取子图像的完整信息（继承父图像属性）
  const getChildImageWithDefaults = (parentImage: GroupImage, childImage: ImageBase): ImageBase => {
    const resultImage: ImageBase = {
      id: childImage.id,
      name: childImage.name ?? parentImage.name ?? '',
      listName: childImage.listName ?? parentImage.listName ?? '',
      description: childImage.description ?? parentImage.description ?? '',
      artist: childImage.artist ?? parentImage.artist ?? 'N/A',
      authorLinks: childImage.authorLinks ?? parentImage.authorLinks,
      src: childImage.src,
      tags: childImage.tags ?? parentImage.tags,
      characters: childImage.characters ?? parentImage.characters,
      date: childImage.date ?? parentImage.date,
    };
    return resultImage;
  };

  const doesImageValid = (image: ImageBase): boolean => {
    if (!image.src) {
      return false;
    }
    return true;
  };

  // 检查图像是否通过过滤器
  const doesImagePassFilter = (image: GroupImage | ImageBase): boolean => {
    if (!doesImageValid(image)) {
      return false;
    }

    // 应用限制级标签过滤
    const restrictedTags = siteConfig.tags.filter(tag => tag.isRestricted);

    for (const restrictedTag of restrictedTags) {
      // 检查父图像是否有该限制级标签
      let imageHasTag = image.tags?.includes(restrictedTag.id) ?? false;

      // 如果父图像没有，检查子图像是否有该限制级标签
      if (!imageHasTag && 'childImages' in image && image.childImages) {
        imageHasTag = image.childImages.some((child: ImageBase) => child.tags?.includes(restrictedTag.id));
      }

      const tagIsEnabled = selectedRestrictedTags.value[restrictedTag.id] ?? false;

      // 如果图片（或其子图像）有这个特殊标签，但是这个标签没有被启用，则过滤掉
      if (imageHasTag && !tagIsEnabled) {
        return false;
      }
    }

    // 应用搜索过滤
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();

      // 搜索图片名称
      const name = getSearchableText(image.name);

      // 搜索描述
      const description = image.description ? getSearchableText(image.description) : '';

      // 搜索艺术家名称
      const artist = image.artist ? getSearchableText(image.artist) : '';

      // 搜索标签
      const tagsMatch = image.tags?.some(tagId => {
        const tag = siteConfig.tags.find(t => t.id === tagId);
        if (!tag) return false;

        const tagName = getSearchableText(tag.name);
        return tagName.includes(query);
      }) ?? false;

      const matchesSearch = name.includes(query)
                         || description.includes(query)
                         || artist.includes(query)
                         || tagsMatch;

      if (!matchesSearch) {
        return false;
      }
    }

    // 应用角色过滤
    if (selectedCharacterId.value !== 'all') {
      if (!image.characters?.includes(selectedCharacterId.value)) {
        return false;
      }
    }

    // 应用标签过滤
    if (selectedTag.value !== 'all') {
      if (!image.tags?.includes(selectedTag.value)) {
        return false;
      }
    }

    return true;
  };

  const getDisplayImageForGroup = (parentImage: GroupImage, validImages: ImageBase[]): DisplayImage => {
    const childImages = validImages.filter(image => image.id !== parentImage.id);
    const displaySrc = parentImage.src ?? validImages[0].src;
    const displayImage: DisplayImage = {
      ...parentImage,
      childImages,
      displaySrc,
    };
    return displayImage;
  };

  // 获取图像组中第一个通过过滤的子图像ID
  const getFirstValidChildId = (parentImage: GroupImage): string | null => {
    if (doesImageValid(parentImage)) {
      return parentImage.id;
    }

    if (!parentImage.childImages) {
      return null;
    }

    for (const childImage of parentImage.childImages) {
      const fullChildImage = getChildImageWithDefaults(parentImage, childImage);
      if (doesImagePassFilter(fullChildImage)) {
        return childImage.id;
      }
    }

    return null;
  };

  // 获取图像组的所有有效图像（通过过滤的）
  const getValidImagesInGroup = (parentImage: GroupImage): ImageBase[] => {
    const validImages: ImageBase[] = [];

    if (doesImagePassFilter(parentImage)) {
      validImages.push(parentImage as ImageBase);
    }
    if (parentImage.childImages && parentImage.childImages.length > 0) {
      for (const childImage of parentImage.childImages) {
        const fullChildImage = getChildImageWithDefaults(parentImage, childImage);
        if (doesImagePassFilter(fullChildImage)) {
          validImages.push(fullChildImage);
        }
      }
    }

    return validImages;
  };

  const getValidImagesInGroupWithoutFilter = (parentImage: GroupImage): ImageBase[] => {
    const validImages: ImageBase[] = [];
    if (doesImageValid(parentImage)) {
      validImages.push(parentImage as ImageBase);
    }
    if (parentImage.childImages && parentImage.childImages.length > 0) {
      for (const childImage of parentImage.childImages) {
        const fullChildImage = getChildImageWithDefaults(parentImage, childImage);
        if (doesImageValid(fullChildImage)) {
          validImages.push(fullChildImage);
        }
      }
    }
    return validImages;
  };

  // 设置搜索查询
  const setSearchQuery = (query: string): void => {
    // 先设置查询
    searchQuery.value = query;

    // 如果开始搜索（之前无搜索，现在有搜索），保存当前选择
    if (query.trim()) {
      // 如果没有保存之前的选择，则保存
      if (!previousCharacterId.value) {
        previousCharacterId.value = selectedCharacterId.value;
        previousTagId.value = selectedTag.value;

        // 切换到"全部"角色和标签
        selectedCharacterId.value = 'all';
        selectedTag.value = 'all';
      }
    } else {
      // 如果清空了搜索，恢复之前的选择
      if (previousCharacterId.value) {
        selectedCharacterId.value = previousCharacterId.value;
        previousCharacterId.value = '';
      }

      if (previousTagId.value) {
        selectedTag.value = previousTagId.value;
        previousTagId.value = '';
      }
    }
  };

  // 清除搜索
  const clearSearch = (): void => {
    // 设置空字符串会触发setSearchQuery中的恢复逻辑
    setSearchQuery('');
  };

  return {
    // 搜索相关
    searchQuery,
    isSearching,
    setSearchQuery,
    clearSearch,

    // 画廊相关
    selectedCharacterId,
    selectedTag,
    selectedCharacter,
    characterImages,
    tagCounts,
    getCharacterMatchCount,

    // 特殊标签相关
    selectedRestrictedTags,
    setRestrictedTagState,
    getRestrictedTagState,

    // 排序相关
    sortBy,
    sortOrder,

    // 图像查询
    getImageById,

    // 图像组相关
    getImageGroupByChildId,
    getChildImageWithDefaults,
    getDisplayImageForGroup,
    getValidImagesInGroup,
    getFirstValidChildId,
    getValidImagesInGroupWithoutFilter,
  };
});
