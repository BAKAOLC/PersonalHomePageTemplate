<template>
  <div class="image-gallery">
    <div v-if="images.length === 0" class="no-images">
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
    >
        <div
          v-for="image in images"
          :key="image.id"
          :class="{ 'image-card': gridView, 'image-list-item': !gridView }"
          @click="viewImage(image)"
        >
          <div class="image-container">
            <ProgressiveImage
              v-if="image.src"
              :src="image.src"
              :alt="t(image.name, currentLanguage)"
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
            >
              <svg class="placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                     M9 17l1.5-2L12 17h7V5H5v12z"
                />
              </svg>
            </div>
            <!-- 图像组指示器 -->
            <div v-if="isImageGroup(image)" class="group-indicator" :title="$t('gallery.imageGroup')">
              <LayersIcon class="group-icon" />
            </div>
          </div>

          <div class="image-info">
            <h3 class="image-name">{{ t(image.name, currentLanguage) }}</h3>

            <div class="image-meta">
              <div class="image-tags">
                <span v-for="tagId in getSortedTags(getAllImageTags(image))" :key="tagId" class="image-tag"
                  :style="{ backgroundColor: getTagColor(tagId) }">
                  {{ getTagName(tagId, currentLanguage) }}
                </span>
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Layers as LayersIcon } from 'lucide-vue-next';
import { computed, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

import ProgressiveImage from './ProgressiveImage.vue';

import { useEventManager } from '@/composables/useEventManager';
import { useTags } from '@/composables/useTags';
import { useTimers } from '@/composables/useTimers';
import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';
import type { I18nText, CharacterImage } from '@/types';
import { getI18nText } from '@/utils/i18nText';

const props = defineProps<{
  images: CharacterImage[];
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
const appStore = useAppStore();
const eventManager = useEventManager();
const { getSortedTags, getTagColor, getTagName } = useTags();

const currentLanguage = computed(() => appStore.currentLanguage);

// 获取图像在当前过滤条件下的所有可见标签
const getAllImageTags = (image: CharacterImage): string[] => {
  const allTags = new Set<string>();

  // 如果没有子图像，这是一个普通图像，直接返回其标签
  if (!image.childImages || image.childImages.length === 0) {
    image.tags.forEach(tag => allTags.add(tag));
    return Array.from(allTags);
  }

  // 对于图像组，我们需要检查哪些子图像在当前过滤条件下是可见的
  // 使用与 app store 相同的过滤逻辑
  const validChildImages = image.childImages.filter(child => {
    const fullChildImage = appStore.getChildImageWithDefaults(image, child);
    return doesImagePassCurrentFilter(fullChildImage);
  });

  // 首先添加父图像的标签
  image.tags.forEach(tag => allTags.add(tag));

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
const doesImagePassCurrentFilter = (image: CharacterImage): boolean => {
  // 获取所有限制级标签
  const allRestrictedTags = siteConfig.tags.filter(tag => tag.isRestricted);

  for (const restrictedTag of allRestrictedTags) {
    const imageHasTag = image.tags.includes(restrictedTag.id);
    const tagIsEnabled = appStore.getRestrictedTagState(restrictedTag.id);

    // 如果图像有这个限制级标签，但标签没有被启用，则过滤掉
    if (imageHasTag && !tagIsEnabled) {
      return false;
    }
  }

  return true;
};

// 检查图像是否为图像组（当过滤结果只有一张图像时隐藏指示器）
const isImageGroup = (image: CharacterImage): boolean => {
  // 获取原始图像信息
  let originalImage = image;
  if (image && image.id) {
    const originalFromStore = appStore.getImageById(image.id);
    if (originalFromStore) {
      originalImage = originalFromStore;
    }
  }

  // 检查是否有子图像
  if (!originalImage || !originalImage.childImages || originalImage.childImages.length === 0) {
    return false;
  }

  // 当图集被过滤导致只有一张图时，隐藏图集标识
  const validChildren = appStore.getValidImagesInGroup(originalImage);
  return validChildren.length > 1;
};

// 通用的翻译辅助函数
const t = (text: I18nText | undefined, lang?: string): string => {
  if (typeof text === 'string') return text;
  const currentLang = lang ?? currentLanguage.value;
  return getI18nText(text, currentLang);
};

const viewImage = (image: CharacterImage): void => {
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
  @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3;
  padding-right: 8px;
  width: 100%;
  padding-bottom: 1rem;
  transition: all 0.2s ease-out;
  transform-origin: center;
  position: relative;
}

@media (max-width: 640px) {
  .image-grid {
    @apply grid-cols-2 gap-2;
    padding-bottom: 2rem;
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
  height: 160px; /* 减小默认高度 */
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  @apply rounded-lg;
  margin-bottom: 0.75rem; /* 减小间距 */
}

@media (max-width: 640px) {
  .image-card .image-container {
    height: 120px; /* 移动端进一步减小高度 */
    margin-bottom: 0.5rem;
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

@media (max-width: 640px) {
  .image-info {
    @apply text-center p-2; /* 移动端减小内边距 */
  }
}

.image-list-item .image-info {
  @apply flex-1 flex flex-col justify-center;
}

.image-name {
  @apply font-medium text-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply mb-2 truncate;
}

@media (max-width: 640px) {
  .image-name {
    @apply text-xs mb-1; /* 移动端更小的字体和间距 */
  }
}

.image-meta {
  @apply flex items-center justify-between;
}

@media (max-width: 640px) {
  .image-meta {
    @apply justify-center;
  }
}

.image-tags {
  @apply flex flex-wrap gap-1;
}

@media (max-width: 640px) {
  .image-tags {
    @apply justify-center;
  }
}

.image-tag {
  @apply px-1.5 py-0.5 rounded-full;
  @apply text-white text-xs;
  @apply whitespace-nowrap;
  @apply opacity-90;
}

@media (max-width: 640px) {
  .image-tag {
    @apply px-1 py-0.5 text-xs; /* 移动端更紧凑的标签 */
    font-size: 10px; /* 更小的字体 */
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

</style>
