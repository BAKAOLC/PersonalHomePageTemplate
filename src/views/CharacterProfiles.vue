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
              <div
                ref="characterScrollContainer"
                class="selector-scroll-container"
                :class="{ 'expanded': isCharacterListExpanded }"
              >
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
              <button
                v-if="showCharacterExpandButton"
                class="expand-toggle-button"
                @click="toggleCharacterListExpanded"
                :title="isCharacterListExpanded ? '收起列表' : '展开列表'"
              >
                <i class="fa" :class="getIconClass(isCharacterListExpanded ? 'chevron-up' : 'chevron-down')"></i>
              </button>
            </div>

            <!-- 差分选择器 -->
            <div v-if="selectedCharacter" class="variant-selector">
              <div
                ref="variantScrollContainer"
                class="selector-scroll-container"
                :class="{ 'expanded': isVariantListExpanded }"
              >
                <button
                  v-for="(variant, index) in selectedCharacter.variants"
                  :key="variant.id"
                  :data-variant-id="variant.id"
                  @click="selectVariant(variant)"
                  class="selector-button"
                  :class="{ 'active': selectedVariant?.id === variant.id }"
                >
                  <span class="variant-number">{{ index + 1 }}.</span>
                  {{ getI18nText(variant.name, currentLanguage) }}
                </button>
              </div>
              <button
                v-if="showVariantExpandButton"
                class="expand-toggle-button"
                @click="toggleVariantListExpanded"
                :title="isVariantListExpanded ? '收起列表' : '展开列表'"
              >
                <i class="fa" :class="getIconClass(isVariantListExpanded ? 'chevron-up' : 'chevron-down')"></i>
              </button>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ProgressiveImage from '@/components/ProgressiveImage.vue';
import ImageViewerModal from '@/components/modals/ImageViewerModal.vue';
import { useModalManager } from '@/composables/useModalManager';
import characterProfilesData from '@/config/character-profiles.json5';
import { useLanguageStore } from '@/stores/language';
import type { CharacterProfile, CharacterVariant, CharacterVariantImage } from '@/types';
import { CharacterConfigManager } from '@/utils/characterConfigManager';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';

// 导入角色设定配置

// 不需要使用 useI18n 的返回值
useI18n();
const languageStore = useLanguageStore();
const modalManager = useModalManager();
const route = useRoute();
const router = useRouter();

// 获取当前语言
const currentLanguage = computed(() => languageStore.currentLanguage);

// 响应式数据
const characterProfiles = ref<CharacterProfile[]>(characterProfilesData);
const selectedCharacter = ref<CharacterProfile | null>(null);
const selectedVariant = ref<CharacterVariant | null>(null);
const selectedImage = ref<CharacterVariantImage | null>(null);

// 列表展开状态
const isCharacterListExpanded = ref(false);
const isVariantListExpanded = ref(false);

// 滚动容器引用
const characterScrollContainer = ref<HTMLElement | null>(null);
const variantScrollContainer = ref<HTMLElement | null>(null);

// 是否显示展开按钮
const showCharacterExpandButton = ref(false);
const showVariantExpandButton = ref(false);

// 检测容器是否溢出（仅在未展开时检查）
const checkOverflow = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  // 未展开时，检查横向溢出
  return element.scrollWidth > element.clientWidth;
};

// 更新按钮显示状态
const updateButtonVisibility = (): void => {
  nextTick(() => {
    // 如果已展开，始终显示按钮以便缩回
    // 如果未展开，根据溢出情况决定是否显示
    showCharacterExpandButton.value = isCharacterListExpanded.value || checkOverflow(characterScrollContainer.value);
    showVariantExpandButton.value = isVariantListExpanded.value || checkOverflow(variantScrollContainer.value);
  });
};

// ResizeObserver 实例
let characterResizeObserver: ResizeObserver | null = null;
let variantResizeObserver: ResizeObserver | null = null;

// 切换角色列表展开状态
const toggleCharacterListExpanded = (): void => {
  isCharacterListExpanded.value = !isCharacterListExpanded.value;
  updateButtonVisibility();
};

// 切换差分列表展开状态
const toggleVariantListExpanded = (): void => {
  isVariantListExpanded.value = !isVariantListExpanded.value;
  updateButtonVisibility();
};

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

// 监听卡片更新，自动滚动到顶部
watch(displayInfoCards, () => {
  nextTick(() => {
    const infoCards = document.querySelector('.info-cards');
    if (infoCards) {
      infoCards.scrollTop = 0;
    }
  });
});

// 是否正在从URL初始化（避免循环更新）
const isInitializingFromUrl = ref(false);

// 更新URL参数（使用路径参数）
const updateUrl = (characterId?: string, variantId?: string, imageId?: string): void => {
  // 如果正在从URL初始化，不更新URL
  if (isInitializingFromUrl.value) return;

  const params: Record<string, string> = {};
  if (characterId) params.character = characterId;
  if (variantId) params.variant = variantId;
  if (imageId) params.image = imageId;

  // 检查是否需要更新URL（避免不必要的更新）
  const currentCharacter = route.params.character as string | undefined;
  const currentVariant = route.params.variant as string | undefined;
  const currentImage = route.params.image as string | undefined;

  if (
    currentCharacter !== characterId
    || currentVariant !== variantId
    || currentImage !== imageId
  ) {
    router.replace({
      name: 'character-profiles',
      params,
    });
  }
};

// 选择角色
const selectCharacter = (character: CharacterProfile, skipUrlUpdate = false): void => {
  selectedCharacter.value = character;
  // 自动选择第一个差分
  if (character.variants.length > 0) {
    selectVariant(character.variants[0], skipUrlUpdate);
  } else {
    selectedVariant.value = null;
    selectedImage.value = null;
    if (!skipUrlUpdate) {
      updateUrl(character.id);
    }
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
const selectVariant = (variant: CharacterVariant, skipUrlUpdate = false): void => {
  selectedVariant.value = variant;

  // 自动选择第一张图片
  if (variant.images.length > 0) {
    selectImage(variant.images[0], skipUrlUpdate);
  } else {
    selectedImage.value = null;
    if (!skipUrlUpdate && selectedCharacter.value) {
      updateUrl(selectedCharacter.value.id, variant.id);
    }
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
const selectImage = (image: CharacterVariantImage, skipUrlUpdate = false): void => {
  selectedImage.value = image;
  if (!skipUrlUpdate && selectedCharacter.value && selectedVariant.value) {
    updateUrl(selectedCharacter.value.id, selectedVariant.value.id, image.id);
  }
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

// 监听角色列表变化，更新按钮显示
watch([characterProfiles, currentLanguage], () => {
  updateButtonVisibility();
});

// 监听选中的角色变化，更新按钮显示
watch(selectedCharacter, () => {
  nextTick(() => {
    updateButtonVisibility();
    // 重新设置 variant 的 ResizeObserver
    if (variantResizeObserver && variantScrollContainer.value) {
      variantResizeObserver.disconnect();
      variantResizeObserver = new ResizeObserver(() => {
        updateButtonVisibility();
      });
      variantResizeObserver.observe(variantScrollContainer.value);
    }
  });
});

// 根据URL参数初始化选择
const initializeFromUrl = (): void => {
  isInitializingFromUrl.value = true;

  const characterId = route.params.character as string | undefined;
  const variantId = route.params.variant as string | undefined;
  const imageId = route.params.image as string | undefined;

  if (characterId && characterProfiles.value.length > 0) {
    const character = characterProfiles.value.find(c => c.id === characterId);
    if (character) {
      selectCharacter(character, true);

      if (variantId && character.variants.length > 0) {
        const variant = character.variants.find(v => v.id === variantId);
        if (variant) {
          selectVariant(variant, true);

          if (imageId && variant.images.length > 0) {
            const image = variant.images.find(img => img.id === imageId);
            if (image) {
              selectImage(image, true);
              isInitializingFromUrl.value = false;
              return;
            }
          }
        }
      }

      isInitializingFromUrl.value = false;
      // 如果URL参数不完整，更新URL
      if (selectedCharacter.value && selectedVariant.value && selectedImage.value) {
        updateUrl(selectedCharacter.value.id, selectedVariant.value.id, selectedImage.value.id);
      } else if (selectedCharacter.value && selectedVariant.value) {
        updateUrl(selectedCharacter.value.id, selectedVariant.value.id);
      } else if (selectedCharacter.value) {
        updateUrl(selectedCharacter.value.id);
      }
      return;
    }
  }

  isInitializingFromUrl.value = false;
  // 如果没有URL参数或找不到对应的角色，选择第一个角色
  if (characterProfiles.value.length > 0) {
    selectCharacter(characterProfiles.value[0]);
  }
};

// 组件挂载时根据URL参数初始化或选择第一个角色
onMounted(() => {
  initializeFromUrl();

  // 设置 ResizeObserver 监听容器大小变化
  if (characterScrollContainer.value) {
    characterResizeObserver = new ResizeObserver(() => {
      updateButtonVisibility();
    });
    characterResizeObserver.observe(characterScrollContainer.value);
  }

  if (variantScrollContainer.value) {
    variantResizeObserver = new ResizeObserver(() => {
      updateButtonVisibility();
    });
    variantResizeObserver.observe(variantScrollContainer.value);
  }

  // 初始检查
  updateButtonVisibility();
});

// 监听路由变化，当URL参数改变时更新选择（仅在浏览器前进/后退时）
watch(() => route.params, (newParams, oldParams) => {
  // 如果正在初始化，跳过
  if (isInitializingFromUrl.value) return;

  // 检查是否是外部URL变化（浏览器前进/后退）
  const newCharacterId = newParams.character as string | undefined;
  const newVariantId = newParams.variant as string | undefined;
  const newImageId = newParams.image as string | undefined;

  const oldCharacterId = oldParams?.character as string | undefined;
  const oldVariantId = oldParams?.variant as string | undefined;
  const oldImageId = oldParams?.image as string | undefined;

  // 只有当URL参数真正改变时才重新初始化
  if (
    newCharacterId !== oldCharacterId
    || newVariantId !== oldVariantId
    || newImageId !== oldImageId
  ) {
    // 检查是否需要更新选择
    if (
      (newCharacterId && newCharacterId !== selectedCharacter.value?.id)
      || (newVariantId && newVariantId !== selectedVariant.value?.id)
      || (newImageId && newImageId !== selectedImage.value?.id)
    ) {
      initializeFromUrl();
    }
  }
}, { deep: true });

// 组件卸载时清理 ResizeObserver
onUnmounted(() => {
  if (characterResizeObserver) {
    characterResizeObserver.disconnect();
  }
  if (variantResizeObserver) {
    variantResizeObserver.disconnect();
  }
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

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
  /* 确保独立的滚动上下文 */
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.variant-selector {
  @apply border-t border-gray-200 dark:border-gray-700 pt-2;
  /* 确保独立的滚动上下文 */
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.variant-number {
  @apply text-gray-500 dark:text-gray-400;
  font-weight: 600;
  margin-right: 0.25rem;
}

.selector-button.active .variant-number {
  @apply text-white opacity-90;
}

.selector-scroll-container {
  @apply flex gap-2 overflow-x-auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 transparent; /* 滚动条滑块颜色，轨道透明 */
  scroll-behavior: smooth;
  width: 100%;
  min-width: 0;
  /* 启用移动端平滑滚动 */
  -webkit-overflow-scrolling: touch;
  /* 确保每个容器都有独立的滚动上下文 */
  position: relative;
  isolation: isolate;
  transition: all 0.3s ease;
}

.selector-scroll-container.expanded {
  flex-wrap: wrap;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 400px;
  padding: 0.5rem;
}

.expand-toggle-button {
  @apply w-full py-2.5 rounded-b text-sm;
  @apply text-gray-600 dark:text-gray-400;
  @apply transition-all duration-300 ease-in-out;
  @apply border-t border-gray-200 dark:border-gray-700;
  @apply shadow-sm hover:shadow-md;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
  font-weight: 500;
}

.dark .expand-toggle-button {
  background: linear-gradient(to bottom, #374151 0%, #1f2937 100%);
}

.expand-toggle-button:hover {
  background: linear-gradient(to bottom, #f3f4f6 0%, #e5e7eb 100%);
  @apply text-gray-700 dark:text-gray-300;
}

.dark .expand-toggle-button:hover {
  background: linear-gradient(to bottom, #4b5563 0%, #374151 100%);
}

.expand-toggle-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-toggle-button:hover::before {
  left: 100%;
}

.dark .expand-toggle-button::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
}

.expand-toggle-button:hover {
  @apply border-gray-300 dark:border-gray-600;
  transform: translateY(-1px);
}

.expand-toggle-button:active {
  transform: translateY(0);
  @apply shadow-sm;
}

.expand-toggle-button i {
  font-size: 0.875rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.8;
}

.expand-toggle-button:hover i {
  transform: scale(1.15);
  opacity: 1;
}

.selector-scroll-container::-webkit-scrollbar {
  height: 8px;
}

/* 移动端使用更大的滚动条 */
@media (max-width: 767px) {
  .selector-scroll-container::-webkit-scrollbar {
    height: 12px;
  }
}

.selector-scroll-container.expanded::-webkit-scrollbar {
  width: 8px;
  height: auto;
}

@media (max-width: 767px) {
  .selector-scroll-container.expanded::-webkit-scrollbar {
    width: 12px;
  }
}

.selector-scroll-container::-webkit-scrollbar-track {
  background: transparent; /* 隐藏滚动条轨道背景 */
  border-radius: 0;
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
  /* 确保按钮不会超出容器，但允许滚动 */
  position: relative;
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
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.info-cards::-webkit-scrollbar {
  width: 6px;
}

.info-cards::-webkit-scrollbar-track {
  background: transparent;
}

.info-cards::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.info-cards::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .info-cards::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .info-cards::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
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
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  /* 为键盘选择器提供额外空间 */
  padding: 0.25rem;
  /* 确保容器不会裁剪子元素的边框 */
  overflow: visible;
}

.image-list::-webkit-scrollbar {
  width: 6px;
}

.image-list::-webkit-scrollbar-track {
  background: transparent;
}

.image-list::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.image-list::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .image-list::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .image-list::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
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
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  padding: 0.25rem;
}

.mobile-image-list-container::-webkit-scrollbar {
  height: 6px;
}

.mobile-image-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.mobile-image-list-container::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.mobile-image-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .mobile-image-list-container::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .mobile-image-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
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
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    /* 为桌面端键盘选择器提供额外空间 */
    padding: 0.25rem;
    overflow: visible;
  }

  .image-list::-webkit-scrollbar {
    width: 6px;
  }

  .image-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .image-list::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .image-list::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }

  .dark .image-list::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.5);
  }

  .dark .image-list::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.7);
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
