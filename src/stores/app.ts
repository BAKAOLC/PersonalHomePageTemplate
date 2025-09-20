import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import type { Language, CharacterImage, ChildImage, I18nText } from '@/types';

// 路由信息类型
type RouteInfo = {
  name: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
};

import { siteConfig } from '@/config/site';

export const useAppStore = defineStore('app', () => {
  // 加载状态
  const isLoading = ref(true);
  const loadingProgress = ref(0);
  const loadingMessage = ref('');
  const loadingTip = ref('');

  // 搜索状态
  const searchQuery = ref('');

  // 是否处于搜索状态
  const isSearching = computed(() => !!searchQuery.value.trim());

  // 存储搜索前的状态，以便清除搜索时恢复
  const previousCharacterId = ref('');
  const previousTagId = ref('');

  // 主题相关
  const isDarkMode = ref(localStorage.getItem('theme') === 'dark'
    || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));

  // 设置暗色模式
  const toggleDarkMode = (): void => {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light');

    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 语言相关
  const currentLanguage = ref<Language>(localStorage.getItem('locale') as Language || 'zh');

  // 设置语言
  const setLanguage = (lang: Language): void => {
    currentLanguage.value = lang;
    localStorage.setItem('locale', lang);
  };

  // 当前选择的角色
  const selectedCharacterId = ref(siteConfig.characters[0]?.id || '');

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
    const resultImages: CharacterImage[] = [];

    for (const parentImage of siteConfig.images) {
      // 检查父图像和子图像中是否有任何一个通过过滤
      const validImages = getValidImagesInGroup(parentImage);

      if (validImages.length > 0) {
        // 获取要显示的图像（优先父图像，否则第一个有效子图像）
        const displayImage = getDisplayImageForGroup(parentImage);

        // 标记是否为图像组（有子图像且有多个有效图像）
        const isGroup = parentImage.childImages && validImages.length > 1;

        // 创建显示用的图像对象，保留组信息
        const imageForDisplay = {
          ...displayImage,
          // 如果是组图的显示图像，保留原始的childImages信息
          childImages: isGroup ? parentImage.childImages : displayImage.childImages,
        };

        resultImages.push(imageForDisplay);
      }
    }

    // 排序
    const sortedImages = sortImages(resultImages);

    return sortedImages;
  });

  // 图像排序函数
  const sortImages = (images: CharacterImage[]): CharacterImage[] => {
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
          const aDate = a.date || '0000-00-00';
          const bDate = b.date || '0000-00-00';
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
    const validImageGroups: CharacterImage[] = [];
    for (const parentImage of siteConfig.images) {
      const validImages = getValidImagesInGroup(parentImage);
      if (validImages.length > 0) {
        const displayImage = getDisplayImageForGroup(parentImage);
        validImageGroups.push(displayImage);
      }
    }

    // 计算每个标签的数量
    siteConfig.tags.forEach(tag => {
      const count = validImageGroups.filter(image => image.tags.includes(tag.id)).length;
      counts[tag.id] = count;
    });

    // "all"选项的计数是所有匹配的图像总数
    counts.all = validImageGroups.length;

    return counts;
  });

  // 获取每个角色的匹配图像数量（支持图像组）
  const getCharacterMatchCount = (characterId: string): number => {
    // 计算有效的图像组数量
    let validGroupCount = 0;

    for (const parentImage of siteConfig.images) {
      const validImages = getValidImagesInGroup(parentImage);
      if (validImages.length > 0) {
        const displayImage = getDisplayImageForGroup(parentImage);

        // 如果是"全部"选项，或者显示图像包含该角色
        if (characterId === 'all' || displayImage.characters.includes(characterId)) {
          validGroupCount++;
        }
      }
    }

    return validGroupCount;
  };

  // 获取单个图像（支持子图像ID）
  const getImageById = (id: string): CharacterImage | undefined => {
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

  // 在当前筛选条件下获取图像的索引
  const getImageIndexById = (id: string): number => {
    return characterImages.value.findIndex(img => img.id === id);
  };

  // 根据索引获取图像
  const getImageByIndex = (index: number): CharacterImage | undefined => {
    if (index < 0 || index >= characterImages.value.length) return undefined;
    return characterImages.value[index];
  };

  // 查看器状态管理
  const isFromGallery = ref(false);
  const viewerReturnRoute = ref<RouteInfo | null>(null);

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

  // 设置从画廊进入查看器的标记（向后兼容）
  const setFromGallery = (value: boolean): void => {
    isFromGallery.value = value;
    if (value) {
      // 如果是从画廊进入，设置默认返回路由
      viewerReturnRoute.value = { name: 'gallery' };
    } else {
      viewerReturnRoute.value = null;
    }
  };

  // 设置图像查看器的返回路由
  const setViewerReturnRoute = (route: RouteInfo | null): void => {
    viewerReturnRoute.value = route;
    // 同时更新 isFromGallery 以保持向后兼容
    isFromGallery.value = route?.name === 'gallery';
  };

  // 获取图像查看器的返回路由
  const getViewerReturnRoute = (): RouteInfo => {
    // 如果有设置的返回路由，使用它
    if (viewerReturnRoute.value) {
      return viewerReturnRoute.value;
    }
    // 默认返回画廊
    return { name: 'gallery' };
  };

  // 清除图像查看器状态
  const clearViewerState = (): void => {
    isFromGallery.value = false;
    viewerReturnRoute.value = null;
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
      && tag.prerequisiteTags
      && tag.prerequisiteTags.includes(tagId));

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
    return selectedRestrictedTags.value[tagId] || false;
  };

  // 图像组相关辅助函数

  // 根据child image ID获取父图像和子图像
  const getImageGroupByChildId = (childId: string): { parentImage: CharacterImage; childImage: ChildImage } | null => {
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
  const getChildImageWithDefaults = (parentImage: CharacterImage, childImage: ChildImage): CharacterImage => {
    const getI18NPropertyWithFallback = (
      property: keyof ChildImage & keyof CharacterImage,
      fallbackProperty?: keyof ChildImage & keyof CharacterImage | undefined,
      fallbackValue?: string,
    ): I18nText => {
      if (childImage[property]) return childImage[property] as I18nText;
      if (fallbackProperty && childImage[fallbackProperty]) return childImage[fallbackProperty] as I18nText;
      if (parentImage[property]) return parentImage[property] as I18nText;
      if (fallbackProperty && parentImage[fallbackProperty]) return parentImage[fallbackProperty] as I18nText;
      if (fallbackValue) return { en: fallbackValue, zh: fallbackValue, jp: fallbackValue };
      return { en: '', zh: '', jp: '' };
    };

    return {
      id: childImage.id,
      name: getI18NPropertyWithFallback('name'),
      listName: getI18NPropertyWithFallback('listName', 'name'),
      description: getI18NPropertyWithFallback('description'),
      artist: getI18NPropertyWithFallback('artist', undefined, 'N/A'),
      src: childImage.src,
      tags: childImage.tags || parentImage.tags,
      characters: childImage.characters || parentImage.characters,
      date: childImage.date || parentImage.date,
      // 子图像不会有自己的子图像
      childImages: undefined,
    };
  };

  // 检查图像是否通过过滤器
  const doesImagePassFilter = (image: CharacterImage): boolean => {
    // 应用限制级标签过滤
    const restrictedTags = siteConfig.tags.filter(tag => tag.isRestricted);

    for (const restrictedTag of restrictedTags) {
      // 检查父图像是否有该限制级标签
      let imageHasTag = image.tags.includes(restrictedTag.id);

      // 如果父图像没有，检查子图像是否有该限制级标签
      if (!imageHasTag && image.childImages) {
        imageHasTag = image.childImages.some(child => child.tags?.includes(restrictedTag.id));
      }

      const tagIsEnabled = selectedRestrictedTags.value[restrictedTag.id] || false;

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
      }) || false;

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
      if (!image.characters.includes(selectedCharacterId.value)) {
        return false;
      }
    }

    // 应用标签过滤
    if (selectedTag.value !== 'all') {
      if (!image.tags.includes(selectedTag.value)) {
        return false;
      }
    }

    return true;
  };

  // 获取图像组的显示图像（用于画廊显示）
  const getDisplayImageForGroup = (parentImage: CharacterImage): CharacterImage => {
    // 如果没有子图像，这是一个普通的单个图像，直接返回父图像
    if (!parentImage.childImages || parentImage.childImages.length === 0) {
      return parentImage;
    }

    // 对于图像组，永远不显示父图像本身，因为父图像不是合法的可选图像
    // 先计算有效图像数量
    let validCount = 0;
    let firstValidChild: ChildImage | null = null;

    for (const childImage of parentImage.childImages) {
      const fullChildImage = getChildImageWithDefaults(parentImage, childImage);
      if (doesImagePassFilter(fullChildImage)) {
        if (!firstValidChild) {
          firstValidChild = childImage;
        }
        validCount++;
      }
    }

    if (firstValidChild) {
      const fullFirstChild = getChildImageWithDefaults(parentImage, firstValidChild);
      // 传递有效图像数量信息，避免重复计算
      return getGroupDisplayInfo(parentImage, fullFirstChild, validCount > 1);
    }

    // 如果没有有效的子图像，返回父图像（用于标识这是个组图，但不可选）
    return parentImage;
  };

  // 获取图像组中第一个通过过滤的子图像ID
  const getFirstValidChildId = (parentImage: CharacterImage): string | null => {
    if (!parentImage.childImages || parentImage.childImages.length === 0) {
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

  // 获取图像组的显示信息（根据有效图像数量决定优先级）
  const getGroupDisplayInfo = (
    parentImage: CharacterImage,
    childImage: CharacterImage,
    hasMultipleValidImages?: boolean,
  ): CharacterImage => {
    // 如果没有提供有效图像数量信息，则计算
    let hasMultiple = hasMultipleValidImages;
    if (hasMultiple === undefined) {
      // 计算有效图像数量，但避免循环调用
      let validCount = 0;
      if (parentImage.childImages) {
        for (const child of parentImage.childImages) {
          const fullChildImage = getChildImageWithDefaults(parentImage, child);
          if (doesImagePassFilter(fullChildImage)) {
            validCount++;
            if (validCount > 1) break; // 只需要知道是否超过1个
          }
        }
      }
      hasMultiple = validCount > 1;
    }

    if (hasMultiple) {
      // 有多个图像时，优先使用图像组信息
      return {
        id: parentImage.id, // 使用父图像ID用于组图标识
        name: parentImage.name, // 优先显示父图像名称
        description: parentImage.description || childImage.description || { en: '', zh: '', jp: '' },
        artist: parentImage.artist || childImage.artist || { en: 'N/A', zh: 'N/A', jp: 'N/A' },
        src: childImage.src, // 显示子图像的实际图片
        tags: parentImage.tags, // 优先显示父图像标签
        characters: parentImage.characters, // 优先显示父图像角色
        date: parentImage.date || childImage.date, // 优先显示父图像日期
        childImages: parentImage.childImages, // 保留子图像信息用于组图判断
      };
    } else {
      // 只有一个图像时，优先使用该图像的信息
      return {
        id: childImage.id, // 使用子图像ID
        name: childImage.name, // 优先显示子图像名称
        description: childImage.description || parentImage.description || { en: '', zh: '', jp: '' },
        artist: childImage.artist || parentImage.artist || { en: 'N/A', zh: 'N/A', jp: 'N/A' },
        src: childImage.src, // 显示子图像的实际图片
        tags: childImage.tags, // 优先显示子图像标签
        characters: childImage.characters, // 优先显示子图像角色
        date: childImage.date || parentImage.date, // 优先显示子图像日期
        childImages: undefined, // 单个图像时不保留子图像信息
      };
    }
  };

  // 获取图像组的所有有效图像（通过过滤的）
  const getValidImagesInGroup = (parentImage: CharacterImage): CharacterImage[] => {
    const validImages: CharacterImage[] = [];

    // 如果没有子图像，这是一个普通的单个图像
    if (!parentImage.childImages || parentImage.childImages.length === 0) {
      // 检查父图像本身是否通过过滤
      if (doesImagePassFilter(parentImage)) {
        validImages.push(parentImage);
      }
    } else {
      // 这是一个图像组，父图像不再是合法的可选图像
      // 只检查子图像
      for (const childImage of parentImage.childImages) {
        const fullChildImage = getChildImageWithDefaults(parentImage, childImage);
        if (doesImagePassFilter(fullChildImage)) {
          validImages.push(fullChildImage);
        }
      }
    }

    return validImages;
  };

  return {
    // 加载状态
    isLoading,
    loadingProgress,
    loadingMessage,
    loadingTip,

    // 主题相关
    isDarkMode,
    toggleDarkMode,

    // 语言相关
    currentLanguage,
    setLanguage,

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
    getImageIndexById,
    getImageByIndex,

    // 查看器状态
    isFromGallery,
    setFromGallery,
    viewerReturnRoute,
    setViewerReturnRoute,
    getViewerReturnRoute,
    clearViewerState,

    // 图像组相关
    getImageGroupByChildId,
    getChildImageWithDefaults,
    getDisplayImageForGroup,
    getValidImagesInGroup,
    getGroupDisplayInfo,
    getFirstValidChildId,
  };
});
