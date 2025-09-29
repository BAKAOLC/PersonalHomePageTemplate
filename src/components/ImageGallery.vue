<template>
  <div class="image-gallery" role="region" :aria-label="$t('gallery.imageDisplayArea')">
    <div v-if="images.length === 0" class="no-images" role="status" aria-live="polite">
      {{ $t('gallery.noImages') }}
    </div>

    <div
      v-else
      :class="{
        'image-grid': gridView,
        'image-list': !gridView,
        'transitioning': isTransitioning
      }"
      :key="transitionKey"
      role="grid"
      :aria-label="gridView ? $t('gallery.gridView') : $t('gallery.listView')"
    >
        <article
          v-for="(image) in images"
          :key="image.id"
          :class="{ 'image-card': gridView, 'image-list-item': !gridView }"
          @click="viewImage(image)"
          @keydown.enter="viewImage(image)"
          @keydown.space.prevent="viewImage(image)"
          role="gridcell"
          :tabindex="0"
          :aria-label="getImageAriaLabel(image)"
          :aria-describedby="`image-${image.id}-description`"
        >
          <div class="image-container">
            <ProgressiveImage
              v-if="image.displaySrc"
              :src="image.displaySrc"
              :alt="getImageAltText(image)"
              class="image"
              image-class="gallery-image"
              object-fit="contain"
              :show-loader="false"
              :show-progress="false"
              preload-size="tiny"
              display-type="thumbnail"
              display-size="medium"
              :delay-main-image="50"
            />
            <div
              v-else
              class="no-image-placeholder"
              :title="t(image.name, currentLanguage)"
              role="img"
              :aria-label="$t('gallery.noImageAvailable')"
            >
              <svg class="placeholder-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                     M9 17l1.5-2L12 17h7V5H5v12z"
                />
              </svg>
            </div>
            <!-- 图像组指示器 -->
            <div
              v-if="isImageGroup(image)"
              class="group-indicator"
              :title="$t('gallery.imageGroup')"
              role="img"
              :aria-label="$t('gallery.imageGroup')"
            >
              <LayersIcon class="group-icon" aria-hidden="true" />
            </div>
          </div>

          <div class="image-info">
            <h3 class="image-name">{{ t(image.name, currentLanguage) }}</h3>

            <div class="image-meta">
              <div class="image-tags" role="list" :aria-label="$t('gallery.tags')">
                <span
                  v-for="tagId in getSortedTags(getAllImageTags(image))"
                  :key="tagId"
                  class="image-tag"
                  :style="{ backgroundColor: getTagColor(tagId) }"
                  role="listitem"
                >
                  {{ getTagName(tagId, currentLanguage) }}
                </span>
              </div>
            </div>

            <!-- 屏幕阅读器专用描述 -->
            <div :id="`image-${image.id}-description`" class="sr-only">
              {{ getImageDescription(image) }}
            </div>
          </div>
        </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Layers as LayersIcon } from 'lucide-vue-next';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ProgressiveImage from './ProgressiveImage.vue';

import { useEventManager } from '@/composables/useEventManager';
import { useTags } from '@/composables/useTags';
import { useTimers } from '@/composables/useTimers';
import { siteConfig } from '@/config/site';
import { useGalleryStore } from '@/stores/gallery';
import { useLanguageStore } from '@/stores/language';
import type { DisplayImage, I18nText } from '@/types';
import { getI18nText } from '@/utils/i18nText';

const props = defineProps<{
  images: DisplayImage[];
  gridView: boolean;
}>();

const isTransitioning = ref(false);
const transitionKey = ref(0);

watch(() => props.gridView, async (newView, oldView) => {
  if (newView !== oldView) {
    isTransitioning.value = true;
    transitionKey.value++;

    await nextTick();

    setTimeout(() => {
      isTransitioning.value = false;
    }, 200);
  }
});

watch(() => props.images, async (newImages, oldImages) => {
  if (oldImages && newImages !== oldImages) {
    isTransitioning.value = true;
    transitionKey.value++;

    await nextTick();

    setTimeout(() => {
      isTransitioning.value = false;
    }, 100);
  }
}, { deep: true });

const { t: $t } = useI18n();
const { setTimeout } = useTimers();
const galleryStore = useGalleryStore();
const languageStore = useLanguageStore();
const eventManager = useEventManager();
const { getSortedTags, getTagColor, getTagName } = useTags();

const currentLanguage = computed(() => languageStore.currentLanguage);

// 获取图像在当前过滤条件下的所有可见标签
const getAllImageTags = (image: DisplayImage): string[] => {
  const allTags = new Set<string>();

  // 如果没有子图像，这是一个普通图像，直接返回其标签
  if (!image.childImages) {
    image.tags?.forEach(tag => allTags.add(tag));
    return Array.from(allTags);
  }

  // 对于图像组，我们需要检查哪些子图像在当前过滤条件下是可见的
  // 使用与 app store 相同的过滤逻辑
  const validChildImages = image.childImages.filter(child => {
    const fullChildImage = galleryStore.getChildImageWithDefaults(image, child);
    return doesImagePassCurrentFilter(fullChildImage);
  });

  // 首先添加父图像的标签
  image.tags?.forEach(tag => allTags.add(tag));

  // 如果有可见的子图像，收集它们的标签
  if (validChildImages.length > 0) {
    validChildImages.forEach(child => {
      if (child.tags) {
        child.tags.forEach(tag => allTags.add(tag));
      }
    });
  }

  return Array.from(allTags);
};

// 检查图像是否通过当前过滤条件（复制 app store 的逻辑）
const doesImagePassCurrentFilter = (image: DisplayImage): boolean => {
  // 获取所有限制级标签
  const allRestrictedTags = siteConfig.tags.filter(tag => tag.isRestricted);

  for (const restrictedTag of allRestrictedTags) {
    const imageHasTag = image.tags?.includes(restrictedTag.id);
    const tagIsEnabled = galleryStore.getRestrictedTagState(restrictedTag.id);

    // 如果图像有这个限制级标签，但标签没有被启用，则过滤掉
    if (imageHasTag && !tagIsEnabled) {
      return false;
    }
  }

  return true;
};

// 检查图像是否为图像组（当过滤结果只有一张图像时隐藏指示器）
const isImageGroup = (image: DisplayImage): boolean => {
  // 获取原始图像信息
  let originalImage = image;
  if (image && image.id) {
    const originalFromStore = galleryStore.getImageById(image.id);
    if (originalFromStore) {
      originalImage = originalFromStore;
    }
  }

  // 检查是否有子图像
  if (!originalImage || !originalImage.childImages) {
    return false;
  }

  // 当图集被过滤导致只有一张图时，隐藏图集标识
  const validChildren = galleryStore.getValidImagesInGroup(originalImage);
  return validChildren.length > 1;
};

// 通用的翻译辅助函数
const t = (text: I18nText | undefined, lang?: string): string => {
  if (typeof text === 'string') return text;
  const currentLang = lang ?? currentLanguage.value;
  return getI18nText(text, currentLang);
};

// 获取图像的alt文本
const getImageAltText = (image: DisplayImage): string => {
  const name = t(image.name, currentLanguage.value);
  const tags = getAllImageTags(image).map(tagId => getTagName(tagId, currentLanguage.value)).join(', ');
  const isGroup = isImageGroup(image);

  let altText = name;
  if (tags) {
    altText += `, ${$t('gallery.tags')}: ${tags}`;
  }
  if (isGroup) {
    altText += `, ${$t('gallery.imageGroup')}`;
  }

  return altText;
};

// 获取图像的ARIA标签
const getImageAriaLabel = (image: DisplayImage): string => {
  const name = t(image.name, currentLanguage.value);
  const isGroup = isImageGroup(image);
  const groupText = isGroup ? `, ${$t('gallery.imageGroup')}` : '';
  return `${name}${groupText}, ${$t('gallery.clickToView')}`;
};

// 获取图像的详细描述（用于屏幕阅读器）
const getImageDescription = (image: DisplayImage): string => {
  const name = t(image.name, currentLanguage.value);
  const tags = getAllImageTags(image).map(tagId => getTagName(tagId, currentLanguage.value));
  const isGroup = isImageGroup(image);

  let description = `${$t('gallery.imageName')}: ${name}`;

  if (tags.length > 0) {
    description += `. ${$t('gallery.tags')}: ${tags.join(', ')}`;
  }

  if (isGroup) {
    description += `. ${$t('gallery.imageGroupDescription')}`;
  }

  description += `. ${$t('gallery.clickToViewDescription')}`;

  return description;
};

const viewImage = (image: DisplayImage): void => {
  if (!image || !image.id) {
    console.warn('Invalid image data, cannot view');
    return;
  }

  eventManager.dispatchEvent('viewImage', { imageId: image.id });
};
</script>

<style scoped>
.image-gallery {
  @apply w-full;
}

.aspect-ratio-box {
  position: relative;
  width: 100%;
}

.no-images {
  @apply text-center py-12 text-gray-500 dark:text-gray-400;
  @apply text-lg italic;
}

.image-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3;
  padding-right: 8px;
  width: 100%;
  padding-bottom: 1rem;
  transition: all 0.2s ease-out;
  transform-origin: center;
  position: relative;
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .image-grid {
    @apply grid-cols-2 gap-1.5;
    padding-bottom: 1.5rem;
  }
}

/* 小屏幕 */
@media (min-width: 481px) and (max-width: 640px) {
  .image-grid {
    @apply grid-cols-2 gap-2;
    padding-bottom: 2rem;
  }
}

/* 中等屏幕 */
@media (min-width: 641px) and (max-width: 768px) {
  .image-grid {
    @apply grid-cols-3 gap-2.5;
  }
}

/* 大屏幕 */
@media (min-width: 1024px) and (max-width: 1280px) {
  .image-grid {
    @apply grid-cols-4 gap-3;
  }
}

/* 超大屏幕 */
@media (min-width: 1281px) {
  .image-grid {
    @apply grid-cols-5 gap-3;
  }
}

.image-list {
  @apply flex flex-col gap-4;
  padding-right: 8px;
  width: 100%;
  transition: all 0.2s ease-out;
  transform-origin: center;
  position: relative;
}

/* 列表模式响应式间距 */
@media (max-width: 480px) {
  .image-list {
    @apply gap-2;
  }
}

@media (min-width: 481px) and (max-width: 640px) {
  .image-list {
    @apply gap-3;
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .image-list {
    @apply gap-3.5;
  }
}

@media (min-width: 769px) {
  .image-list {
    @apply gap-4;
  }
}

.transitioning {
  pointer-events: none;
}

.transitioning .image-card,
.transitioning .image-list-item {
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.1s ease-out;
}

.image-card,
.image-list-item {
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

@media (prefers-reduced-motion: reduce) {
  .transitioning .image-card,
  .transitioning .image-list-item {
    transition: none !important;
    animation: none !important;
  }
}

.image-card {
  @apply bg-white dark:bg-gray-800 rounded-lg overflow-hidden;
  @apply border border-gray-200 dark:border-gray-700;
  @apply shadow-sm hover:shadow-md;
  @apply transition-all duration-300;
  @apply cursor-pointer;
  @apply flex flex-col;
  @apply transform hover:scale-[1.02];
}

.image-list-item {
  @apply bg-white dark:bg-gray-800 rounded-lg overflow-hidden;
  @apply border border-gray-200 dark:border-gray-700;
  @apply shadow-sm hover:shadow-md;
  @apply transition-all duration-300;
  @apply cursor-pointer;
  @apply flex flex-row;
  @apply transform hover:scale-[1.01];
}

.image-container {
  @apply overflow-hidden;
  position: relative;
}

/* 图像组指示器 */
.group-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  @apply bg-blue-600 text-white rounded-full p-1.5;
  @apply shadow-lg backdrop-blur-sm;
  opacity: 0.9;
  z-index: 10;
  transition: opacity 0.2s ease;
}

.group-indicator:hover {
  opacity: 1;
}

.group-icon {
  @apply w-4 h-4;
}

.image-card .image-container {
  width: 100%;
  height: 180px; /* 增加默认高度以提供更好的视觉比例 */
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  @apply rounded-lg;
  margin-bottom: 0.75rem;
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .image-card .image-container {
    height: 100px;
    margin-bottom: 0.5rem;
  }
}

/* 小屏幕 */
@media (min-width: 481px) and (max-width: 640px) {
  .image-card .image-container {
    height: 120px;
    margin-bottom: 0.5rem;
  }
}

/* 中等屏幕 */
@media (min-width: 641px) and (max-width: 768px) {
  .image-card .image-container {
    height: 140px;
    margin-bottom: 0.625rem;
  }
}

/* 大屏幕 */
@media (min-width: 769px) and (max-width: 1024px) {
  .image-card .image-container {
    height: 160px;
    margin-bottom: 0.75rem;
  }
}

/* 超大屏幕 */
@media (min-width: 1025px) {
  .image-card .image-container {
    height: 180px;
    margin-bottom: 0.75rem;
  }
}

.image-list-item .image-container {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  @apply rounded-lg;
  margin-right: 1rem;
}

/* 列表模式响应式调整 */
@media (max-width: 480px) {
  .image-list-item .image-container {
    width: 80px;
    height: 80px;
    margin-right: 0.75rem;
  }
}

@media (min-width: 481px) and (max-width: 640px) {
  .image-list-item .image-container {
    width: 100px;
    height: 100px;
    margin-right: 0.875rem;
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .image-list-item .image-container {
    width: 110px;
    height: 110px;
    margin-right: 0.875rem;
  }
}

@media (min-width: 769px) {
  .image-list-item .image-container {
    width: 120px;
    height: 120px;
    margin-right: 1rem;
  }
}

.progressive-image {
  transition: transform 0.3s ease;
}

.image-card:hover .progressive-image,
.image-list-item:hover .progressive-image {
  transform: scale(1.05);
}

.image-info {
  @apply p-3;
}

/* 网格模式：居中布局 */
.image-card .image-info {
  @apply text-center;
}

/* 列表模式：靠左布局 */
.image-list-item .image-info {
  @apply flex-1 flex flex-col justify-center text-left;
}

@media (max-width: 640px) {
  .image-info {
    @apply p-2; /* 移动端减小内边距 */
  }

  .image-card .image-info {
    @apply text-center;
  }

  .image-list-item .image-info {
    @apply text-left;
  }
}

.image-name {
  @apply font-medium text-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply mb-2;
}

/* 网格模式：名字居中，允许换行 */
.image-card .image-name {
  @apply text-center;
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.3;
}

/* 列表模式：名字靠左，单行截断 */
.image-list-item .image-name {
  @apply text-left truncate;
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .image-name {
    @apply text-xs mb-1;
  }

  .image-card .image-name {
    @apply text-center;
    font-size: 0.625rem;
    line-height: 1.2;
  }

  .image-list-item .image-name {
    @apply text-left truncate;
    font-size: 0.625rem;
  }
}

/* 小屏幕 */
@media (min-width: 481px) and (max-width: 640px) {
  .image-name {
    @apply text-xs mb-1;
  }

  .image-card .image-name {
    @apply text-center;
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .image-list-item .image-name {
    @apply text-left truncate;
    font-size: 0.75rem;
  }
}

/* 中等屏幕 */
@media (min-width: 641px) and (max-width: 768px) {
  .image-name {
    @apply text-sm mb-1.5;
  }

  .image-card .image-name {
    @apply text-center;
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .image-list-item .image-name {
    @apply text-left truncate;
    font-size: 0.875rem;
  }
}

/* 大屏幕及以上 */
@media (min-width: 769px) {
  .image-name {
    @apply text-sm mb-2;
  }

  .image-card .image-name {
    @apply text-center;
    font-size: 0.875rem;
    line-height: 1.3;
  }

  .image-list-item .image-name {
    @apply text-left truncate;
    font-size: 0.875rem;
  }
}

.image-meta {
  @apply flex items-center;
}

/* 网格模式：标签居中 */
.image-card .image-meta {
  @apply justify-center;
}

/* 列表模式：标签靠左 */
.image-list-item .image-meta {
  @apply justify-start;
}

.image-tags {
  @apply flex flex-wrap gap-1;
}

/* 网格模式：标签居中 */
.image-card .image-tags {
  @apply justify-center;
}

/* 列表模式：标签靠左 */
.image-list-item .image-tags {
  @apply justify-start;
}

.image-tag {
  @apply px-1.5 py-0.5 rounded-full;
  @apply text-white text-xs;
  @apply whitespace-nowrap;
  @apply opacity-90;
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .image-tag {
    @apply px-1 py-0.5;
    font-size: 0.5rem;
    line-height: 1;
  }
}

/* 小屏幕 */
@media (min-width: 481px) and (max-width: 640px) {
  .image-tag {
    @apply px-1 py-0.5;
    font-size: 0.625rem;
    line-height: 1;
  }
}

/* 中等屏幕 */
@media (min-width: 641px) and (max-width: 768px) {
  .image-tag {
    @apply px-1.5 py-0.5;
    font-size: 0.75rem;
    line-height: 1.1;
  }
}

/* 大屏幕及以上 */
@media (min-width: 769px) {
  .image-tag {
    @apply px-1.5 py-0.5;
    font-size: 0.75rem;
    line-height: 1.1;
  }
}

.no-image-placeholder {
  @apply w-full h-full flex items-center justify-center;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply text-gray-400 dark:text-gray-500;
}

.placeholder-icon {
  @apply w-8 h-8;
}

/* 屏幕阅读器专用样式 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 焦点样式优化 */
.image-card:focus,
.image-list-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.image-card:focus-visible,
.image-list-item:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .image-card,
  .image-list-item {
    border: 2px solid;
  }

  .image-card:focus,
  .image-list-item:focus {
    outline: 3px solid;
    outline-offset: 1px;
  }
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .image-card,
  .image-list-item {
    transition: none !important;
    transform: none !important;
  }

  .image-card:hover,
  .image-list-item:hover {
    transform: none !important;
  }
}

</style>
