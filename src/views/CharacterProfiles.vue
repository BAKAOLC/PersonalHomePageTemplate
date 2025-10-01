<template>
  <div class="character-profiles-page">
    <div class="container mx-auto px-4 py-2 h-full flex flex-col">

      <!-- 主内容布局 -->
      <div class="character-profiles-content">
        <!-- 选择器区域 -->
        <div class="selector-section">
          <div class="selector-container">
            <!-- 角色选择器 -->
            <div class="character-selector">
              <div class="selector-scroll-container">
                <button
                  v-for="character in characterProfiles"
                  :key="character.id"
                  :data-character-id="character.id"
                  @click="selectCharacter(character)"
                  class="selector-button"
                  :class="{ 'active': selectedCharacter?.id === character.id }"
                >
                  {{ getI18nText(character.name, currentLanguage) }}
                </button>
              </div>
            </div>

            <!-- 差分选择器 -->
            <div v-if="selectedCharacter" class="variant-selector">
              <div class="selector-scroll-container">
                <button
                  v-for="variant in selectedCharacter.variants"
                  :key="variant.id"
                  :data-variant-id="variant.id"
                  @click="selectVariant(variant)"
                  class="selector-button"
                  :class="{ 'active': selectedVariant?.id === variant.id }"
                >
                  {{ getI18nText(variant.name, currentLanguage) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div v-if="selectedCharacter && selectedVariant" class="main-content">
          <!-- 左侧信息卡片区域 -->
          <div class="info-section">
            <div class="info-cards">
              <div
                v-for="card in displayInfoCards"
                :key="card.id"
                class="info-card"
                :style="{ '--card-color': card.color ?? '#667eea' }"
              >
                <h3
                  v-if="card.title"
                  class="card-title">{{ getI18nText(card.title, currentLanguage) }}</h3>
                <p
                  v-if="card.content"
                  class="card-content">{{ getI18nText(card.content, currentLanguage) }}</p>
              </div>
            </div>
          </div>

          <!-- 右侧内容区域 -->
          <div class="right-content-section">
            <!-- 主图片区域 -->
            <div class="main-image-section">
              <div class="main-image-container">
                <div v-if="selectedImage" class="main-image-wrapper">
                  <ProgressiveImage
                    :src="selectedImage.src"
                    :alt="getI18nText(selectedImage.alt, currentLanguage)"
                    class="main-image"
                    object-fit="contain"
                    display-type="original"
                    @click="openImageViewer(selectedImage)"
                  />
                </div>
                <div v-else class="no-image-placeholder">
                  <i class="fas fa-image"></i>
                  <p>{{ $t('characterProfiles.noImageSelected') }}</p>
                </div>
              </div>
            </div>

            <!-- 图片列表区域 -->
            <div class="image-list-section">
              <div v-if="selectedVariant.images.length > 0" class="image-list">
                <button
                  v-for="image in selectedVariant.images"
                  :key="image.id"
                  @click="selectImage(image)"
                  class="image-item"
                  :class="{ 'active': selectedImage?.id === image.id }"
                >
                  <ProgressiveImage
                    :src="image.src"
                    :alt="getI18nText(image.alt, currentLanguage)"
                    class="image-thumbnail"
                    object-fit="contain"
                    display-type="thumbnail"
                    display-size="medium"
                  />
                </button>
              </div>
              <div v-else class="no-images-placeholder">
                <i class="fas fa-images"></i>
                <p>{{ $t('characterProfiles.noImages') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <i class="fas fa-user-circle"></i>
          <h3>{{ $t('characterProfiles.noCharacterSelected') }}</h3>
          <p>{{ $t('characterProfiles.selectCharacterToView') }}</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ProgressiveImage from '@/components/ProgressiveImage.vue';
import ImageViewerModal from '@/components/modals/ImageViewerModal.vue';
import { useModalManager } from '@/composables/useModalManager';
import characterProfilesData from '@/config/character-profiles.json';
import { useLanguageStore } from '@/stores/language';
import type { CharacterProfile, CharacterVariant, CharacterVariantImage } from '@/types';
import { CharacterConfigManager } from '@/utils/characterConfigManager';
import { getI18nText } from '@/utils/i18nText';

// 导入角色设定配置

// 不需要使用 useI18n 的返回值
useI18n();
const languageStore = useLanguageStore();
const modalManager = useModalManager();

// 获取当前语言
const currentLanguage = computed(() => languageStore.currentLanguage);

// 计算显示的信息卡片（使用新的解析器）
const displayInfoCards = computed(() => {
  if (!selectedCharacter.value || !selectedVariant.value) {
    return [];
  }

  // 使用CharacterConfigManager获取解析后的信息卡片
  return CharacterConfigManager.getCharacterCards(
    selectedCharacter.value,
    currentLanguage.value,
    selectedVariant.value.id,
    selectedImage.value?.id,
  );
});

// 响应式数据
const characterProfiles = ref<CharacterProfile[]>(characterProfilesData);
const selectedCharacter = ref<CharacterProfile | null>(null);
const selectedVariant = ref<CharacterVariant | null>(null);
const selectedImage = ref<CharacterVariantImage | null>(null);

// 选择角色
const selectCharacter = (character: CharacterProfile): void => {
  selectedCharacter.value = character;
  // 自动选择第一个差分
  if (character.variants.length > 0) {
    selectVariant(character.variants[0]);
  } else {
    selectedVariant.value = null;
    selectedImage.value = null;
  }

  // 滚动到选中的角色按钮
  nextTick(() => {
    const characterButton = document.querySelector(`[data-character-id="${character.id}"]`);
    if (characterButton) {
      characterButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
};

// 选择差分
const selectVariant = (variant: CharacterVariant): void => {
  selectedVariant.value = variant;

  // 自动选择第一张图片
  if (variant.images.length > 0) {
    selectImage(variant.images[0]);
  } else {
    selectedImage.value = null;
  }

  // 滚动到选中的差分按钮
  nextTick(() => {
    const variantButton = document.querySelector(`[data-variant-id="${variant.id}"]`);
    if (variantButton) {
      variantButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
};

// 选择图片
const selectImage = (image: CharacterVariantImage): void => {
  selectedImage.value = image;
};

// 打开图片查看器
const openImageViewer = (image: CharacterVariantImage): void => {
  if (!selectedCharacter.value || !selectedVariant.value) return;

  const imageData = {
    id: image.id,
    src: image.src,
  };

  const imageList = [imageData];

  modalManager.open({
    id: `character-image-viewer-${Date.now()}`,
    component: ImageViewerModal,
    props: {
      imageId: image.id,
      imageList: imageList,
      viewerUIConfig: {
        imageList: false,
        imageGroupList: false,
        viewerTitle: false,
        infoPanel: {
          title: false,
          description: false,
          artist: false,
          date: false,
          tags: false,
        },
        commentsButton: false,
      },
    },
    options: {
      fullscreen: true,
      closable: true,
      maskClosable: true,
      escClosable: true,
      destroyOnClose: true,
    },
  });
};

// 组件挂载时自动选择第一个角色
onMounted(() => {
  if (characterProfiles.value.length > 0) {
    selectCharacter(characterProfiles.value[0]);
  }
});
</script>

<style scoped>
/* 页面基础样式 */
.character-profiles-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 主内容布局 */
.character-profiles-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 2rem);
  overflow-y: auto;
  padding-right: 8px; /* 给滚动条留出空间 */
  margin-right: -8px; /* 抵消padding，保持内容对齐 */
}

/* 选择器区域 */
.selector-section {
  @apply mb-2 flex-shrink-0;
}

.selector-container {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2;
  @apply shadow-sm;
  max-width: 100%;
  overflow: hidden;
}

.character-selector {
  @apply mb-2;
}

.variant-selector {
  @apply border-t border-gray-200 dark:border-gray-700 pt-2;
}

.selector-scroll-container {
  @apply flex gap-2 overflow-x-auto;
  padding: 0.5rem 0.5rem 0.75rem 0.5rem; /* 增加四周padding，为键盘选择器提供空间 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  scroll-behavior: smooth;
  width: 100%;
  min-width: 0;
  /* 确保容器不会裁剪子元素的边框 */
  overflow: visible;
}

.selector-scroll-container::-webkit-scrollbar {
  height: 4px;
}

.selector-scroll-container::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700 rounded;
}

.selector-scroll-container::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-500 rounded;
}

.selector-scroll-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-400;
}

.selector-button {
  @apply px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap;
  @apply bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-200 dark:hover:bg-gray-600;
  @apply transition-colors duration-200;
  @apply border border-transparent;
  flex-shrink: 0;
  min-width: fit-content;
  /* 为键盘选择器边框提供额外空间 */
  margin: 0.125rem;
}

.selector-button.active {
  @apply bg-primary-500 text-white;
  @apply hover:bg-primary-600;
  @apply border-primary-500;
}

/* 主内容区域 - 三列布局 */
.main-content {
  @apply flex gap-6;
  min-height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 3rem);
  flex: 1;
  margin-top: 2rem;
}

/* 左侧信息卡片区域 */
.info-section {
  @apply w-80 flex-shrink-0;
}

/* 优化 768-1024px 级别的信息卡片区域宽度 */
@media (min-width: 768px) and (max-width: 1024px) {
  .info-section {
    @apply w-72;
  }
}

/* 桌面端信息卡片区域 */
@media (min-width: 768px) {
  .info-section {
    @apply h-full;
  }
}

.info-cards {
  @apply space-y-3 h-full overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.info-cards::-webkit-scrollbar {
  width: 6px;
}

.info-cards::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700 rounded;
}

.info-cards::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-500 rounded;
}

.info-cards::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-400;
}

.info-card {
  @apply p-4 rounded-lg border-l-4;
  @apply bg-white dark:bg-gray-800;
  @apply border-gray-200 dark:border-gray-700;
  @apply shadow-sm;
  border-left-color: var(--card-color, #667eea);
}

.dark .info-card {
  border-left-color: var(--card-color, #667eea);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}

.card-title {
  @apply text-lg font-semibold mb-2;
  @apply text-gray-900 dark:text-white;
}

.card-content {
  @apply text-sm text-gray-600 dark:text-gray-300;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* 中间主图片区域 */
.main-image-section {
  @apply flex-1 flex items-center justify-center h-full;
  min-width: 0; /* 允许flex项目收缩 */
  min-height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 3rem);
}

.main-image-container {
  @apply w-full h-full flex items-center justify-center;
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg;
  @apply border border-gray-200 dark:border-gray-700;
  position: relative;
  min-height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 3rem);
}

.main-image-wrapper {
  @apply w-full h-full flex items-center justify-center p-4;
  cursor: pointer;
  position: relative;
  min-height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 3rem);
}

.no-image-placeholder {
  @apply flex flex-col items-center justify-center text-gray-400 dark:text-gray-500;
  @apply p-8;
}

.no-image-placeholder i {
  @apply text-4xl mb-2;
}

/* 右侧图片列表区域 */
.image-list-section {
  @apply w-32 flex-shrink-0;
}

/* 优化 768-1024px 级别的图片列表区域宽度 */
@media (min-width: 768px) and (max-width: 1024px) {
  .image-list-section {
    @apply w-28;
  }
}

/* 桌面端图片列表区域 */
@media (min-width: 768px) {
  .image-list-section {
    @apply h-full;
  }
}

.image-list {
  @apply flex flex-col gap-2 h-full overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  /* 为键盘选择器提供额外空间 */
  padding: 0.25rem;
  /* 确保容器不会裁剪子元素的边框 */
  overflow: visible;
}

.image-list::-webkit-scrollbar {
  width: 6px;
}

.image-list::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700 rounded;
}

.image-list::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-500 rounded;
}

.image-list::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-400;
}

.image-item {
  @apply w-20 h-20 rounded-lg overflow-hidden;
  @apply border-2 border-transparent;
  @apply hover:border-primary-300 dark:hover:border-primary-600;
  @apply transition-colors duration-200;
  cursor: pointer;
  flex-shrink: 0;
  @apply bg-gray-50 dark:bg-gray-800;
  /* 为键盘选择器边框提供额外空间 */
  margin: 0.125rem;
}

.image-item.active {
  @apply border-primary-500;
}

.no-images-placeholder {
  @apply flex flex-col items-center justify-center text-gray-400 dark:text-gray-500;
  @apply p-4 h-full;
}

.no-images-placeholder i {
  @apply text-2xl mb-2;
}

/* 空状态 */
.empty-state {
  @apply flex flex-col items-center justify-center;
  @apply text-gray-400 dark:text-gray-500;
  @apply p-12;
}

.empty-state i {
  @apply text-6xl mb-4;
}

.empty-state h3 {
  @apply text-xl font-semibold mb-2;
  @apply text-gray-600 dark:text-gray-400;
}

.empty-state p {
  @apply text-sm;
}

/* 移动端布局 */
.mobile-layout {
  @apply space-y-4;
}

.mobile-selectors {
  @apply space-y-3;
}

.mobile-character-selector,
.mobile-variant-selector {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2;
}

.selector-label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300 mb-2;
}

.mobile-info-cards {
  @apply space-y-2;
}

/* 移动端主图片 */
.mobile-main-image {
  @apply w-full;
}

.mobile-main-image-container {
  @apply w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700;
  min-height: 300px;
  @apply flex items-center justify-center;
}

.mobile-main-image-wrapper {
  @apply w-full h-full flex items-center justify-center p-4;
  cursor: pointer;
}

.mobile-main-image-content {
  @apply max-w-full max-h-full;
}

.mobile-no-image-placeholder {
  @apply flex flex-col items-center justify-center text-gray-400 dark:text-gray-500;
  @apply p-8;
}

.mobile-no-image-placeholder i {
  @apply text-4xl mb-2;
}

/* 移动端图像列表 */
.mobile-image-list {
  @apply space-y-3;
}

.gallery-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.mobile-image-list-container {
  @apply flex gap-2 overflow-x-auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  padding: 0.25rem;
}

.mobile-image-list-container::-webkit-scrollbar {
  height: 6px;
}

.mobile-image-list-container::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700 rounded;
}

.mobile-image-list-container::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-500 rounded;
}

.mobile-image-list-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-400;
}

.mobile-image-item {
  @apply w-20 h-20 rounded-lg overflow-hidden;
  @apply border-2 border-transparent;
  @apply hover:border-primary-300 dark:hover:border-primary-600;
  @apply transition-colors duration-200;
  cursor: pointer;
  flex-shrink: 0;
  @apply bg-gray-50 dark:bg-gray-800;
}

.mobile-image-item.active {
  @apply border-primary-500;
}

.mobile-empty-state {
  @apply flex flex-col items-center justify-center;
  @apply text-gray-400 dark:text-gray-500;
  @apply p-8;
}

.mobile-empty-state i {
  @apply text-4xl mb-3;
}

.mobile-empty-state h3 {
  @apply text-lg font-semibold mb-2;
  @apply text-gray-600 dark:text-gray-400;
}

.mobile-empty-state p {
  @apply text-sm text-center;
}

/* 右侧内容区域 */
.right-content-section {
  @apply flex-1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 移动端布局 - 全竖 */
@media (max-width: 767px) {
  .main-content {
    @apply flex-col gap-8;
  }

  .info-section {
    @apply w-full;
  }

  .right-content-section {
    @apply w-full;
  }

  .main-image-section {
    @apply w-full;
  }

  .image-list-section {
    @apply w-full;
    margin-top: 1.5rem;
  }

  .image-list {
    @apply flex-row gap-3 overflow-x-auto;
    @apply h-24;
    /* 为移动端键盘选择器提供额外空间 */
    padding: 0.25rem;
    overflow: visible;
  }

  .image-item {
    @apply w-20 h-20 flex-shrink-0;
  }
}

/* 中等屏幕布局 - 右边竖 */
@media (min-width: 768px) and (max-width: 1280px) {
  .main-content {
    @apply flex-row gap-8;
    height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 4rem);
  }

  .info-section {
    @apply w-80 flex-shrink-0;
    height: 100%;
  }

  .info-cards {
    height: 100%;
    max-height: none;
  }

  .right-content-section {
    @apply flex-1;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: calc(100% - 20rem - 2rem); /* 容器宽度 - 左侧卡片宽度(20rem) - 主内容gap(2rem) */
  }

  .main-image-section {
    @apply flex-1;
    min-height: 0;
    width: 100%;
  }

  .main-image-container {
    @apply flex-1;
    min-height: 0;
    width: 100%;
  }

  .main-image-wrapper {
    @apply h-full;
    min-height: 0;
    width: 100%;
  }

  .image-list-section {
    @apply w-full;
    height: auto;
  }

  .image-list {
    @apply flex-row gap-3 overflow-x-auto;
    @apply h-24;
    @apply justify-start;
    /* 为中等屏幕键盘选择器提供额外空间 */
    padding: 0.25rem;
    overflow: visible;
  }

  .image-item {
    @apply w-20 h-20 flex-shrink-0;
  }
}

/* 桌面端布局 - 全横 */
@media (min-width: 1281px) {
  .main-content {
    @apply flex-row gap-8;
    min-height: calc(100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) - 3rem);
  }

  .info-section {
    @apply w-80 flex-shrink-0;
    @apply h-full;
  }

  .info-cards {
    @apply h-full;
    max-height: none;
  }

  .right-content-section {
    @apply flex-1;
    @apply h-full;
    display: flex;
    flex-direction: row;
    gap: 2rem;
  }

  .main-image-section {
    @apply flex-1;
    min-height: 0;
  }

  .main-image-container {
    @apply flex-1;
    min-height: 0;
  }

  .main-image-wrapper {
    @apply flex-1;
    min-height: 0;
  }

  .image-list-section {
    @apply w-28 flex-shrink-0;
    @apply h-full;
  }

  .image-list {
    @apply flex flex-col gap-3 h-full overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
    /* 为桌面端键盘选择器提供额外空间 */
    padding: 0.25rem;
    overflow: visible;
  }

  .image-list::-webkit-scrollbar {
    width: 6px;
  }

  .image-list::-webkit-scrollbar-track {
    @apply bg-gray-100 dark:bg-gray-700 rounded;
  }

  .image-list::-webkit-scrollbar-thumb {
    @apply bg-gray-400 dark:bg-gray-500 rounded;
  }

  .image-list::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-500 dark:bg-gray-400;
  }

  .image-item {
    @apply w-20 h-20 rounded-lg overflow-hidden;
    @apply border-2 border-transparent;
    @apply hover:border-primary-300 dark:hover:border-primary-600;
    @apply transition-colors duration-200;
    cursor: pointer;
    flex-shrink: 0;
    @apply bg-gray-50 dark:bg-gray-800;
  }

  .image-item.active {
    @apply border-primary-500;
  }
}

/* 为减少动画偏好的用户禁用过渡 */
@media (prefers-reduced-motion: reduce) {
  .character-profiles-page,
  .character-profiles-header,
  .character-profiles-title,
  .selector-button,
  .main-image,
  .image-item {
    transition: none !important;
  }
}
</style>
