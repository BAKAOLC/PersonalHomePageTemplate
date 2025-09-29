<template>
  <div class="fullscreen-viewer active" :class="{
    'transition-active': transitionActive,
    'closing': isClosing
  }" @keydown.esc="close" tabindex="0">
    <div class="viewer-header" :class="{ 'no-title': !effectiveViewerConfig.viewerTitle }">
      <div v-if="effectiveViewerConfig.viewerTitle" class="viewer-title">
        {{ t(getNameWithFallback, currentLanguage) }}
      </div>

      <div class="viewer-controls">
        <button class="control-button zoom-button" @click="zoomOut" :title="$t('viewer.zoomOut')"
          :class="{ 'disabled': isZoomDisabled }" :disabled="isZoomDisabled">
          <ZoomOutIcon class="icon" />
        </button>
        <button class="control-button zoom-button" @click="resetZoom" :title="$t('viewer.resetZoom')"
          :class="{ 'disabled': isZoomDisabled }" :disabled="isZoomDisabled">
          <RotateCcwIcon class="icon" />
        </button>
        <button class="control-button zoom-button" @click="zoomIn" :title="$t('viewer.zoomIn')"
          :class="{ 'disabled': isZoomDisabled }" :disabled="isZoomDisabled">
          <ZoomInIcon class="icon" />
        </button>
        <button
          v-if="hasInfoContent"
          class="control-button"
          @click="toggleInfoPanel"
          :class="{ 'disabled': infoPanelAnimating || mobileInfoOverlayAnimating }"
          :disabled="infoPanelAnimating || mobileInfoOverlayAnimating"
          :title="getInfoButtonTitle()">
          <InfoIcon class="icon" />
        </button>
        <button
          v-if="effectiveViewerConfig.commentsButton && siteConfig.features.comments"
          class="control-button"
          @click="toggleCommentsModal"
          :class="{ 'disabled': commentsModalAnimating }"
          :disabled="commentsModalAnimating"
          :title="getCommentsButtonTitle()">
          <MessageCircleIcon class="icon" />
        </button>
        <button class="control-button close-button" @click="close" :title="t('viewer.close')">
          <XIcon class="icon" />
        </button>
      </div>
    </div>

    <div class="viewer-content">
      <!-- 主图像区域 -->
      <div class="main-image-area"
        :class="{
          'with-left-group-selector': effectiveViewerConfig.imageGroupList && showGroupSelector && !isMobile
        }"
        :style="mainImageAreaStyle">
        <div class="image-container" ref="imageContainer" @wheel="handleImageWheel" @mousedown="handleImageMouseDown"
          @touchstart="handleImageTouchStart" @touchmove="handleImageTouchMove" @touchend="handleImageTouchEnd">
          <transition name="fade" mode="out-in">
            <ProgressiveImage v-if="currentImage && currentImage.src" :key="currentImage.id" :src="currentImage.src"
              :alt="t(getNameWithFallback, currentLanguage)" class="image" image-class="fullscreen-image"
              object-fit="contain" show-loader display-type="original" priority="high" @load="onImageLoad"
              ref="imageElement" :style="{
                transform: imageTransform,
                transition: imageTransitionStyle
              }" />
            <div v-else-if="currentImage" class="no-image-display">
              <div class="no-image-content">
                <svg class="no-image-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                       M9 17l1.5-2L12 17h7V5H5v12z"
                  />
                </svg>
                <p class="no-image-text">{{ t(getNameWithFallback, currentLanguage) }}</p>
              </div>
            </div>
          </transition>

          <!-- 小地图控件 -->
          <div v-if="showMinimap" class="minimap-container" :class="{ 'dragging': isDraggingMinimap }"
            @mousedown="handleMinimapMouseDown" @touchstart="handleMinimapTouchStart">
            <div class="minimap-image-container">
              <img :src="currentImage?.src" :alt="t(getNameWithFallback, currentLanguage)" class="minimap-image"
                ref="minimapImage" />
              <div class="minimap-image-border" :style="imageBorderStyle"></div>
              <div class="minimap-viewport" :style="viewportStyle"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 桌面端图像组选择器 - 左侧布局 -->
      <transition name="desktop-group-selector-slide">
        <div v-if="effectiveViewerConfig.imageGroupList && showGroupSelector && !isMobile"
          class="group-selector left-side"
          :class="{ 'resizing': isDraggingGroupResize }"
          :style="{ width: groupSelectorWidth ? `${groupSelectorWidth}px` : '200px' }">
          <div class="group-selector-header">
            <h4 class="group-title">{{ $t('viewer.imageGroupWithCount', { count: groupImageList.length }) }}</h4>
          </div>
          <div class="group-images-list" ref="groupImagesList">
            <button
              v-for="image in groupImageList"
              :key="image.id"
              @click="goToGroupImage(image.id)"
              class="group-image-button"
              :class="{ 'active': image.id === currentDisplayImageId }"
            >
              <ProgressiveImage
                v-if="image.src"
                :src="image.src"
                :alt="t(image.name, currentLanguage)"
                class="group-image-thumbnail"
                object-fit="contain"
                :show-loader="false"
                preload-size="tiny"
                display-type="thumbnail"
                display-size="small"
              />
              <div v-else class="group-image-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                       M9 17l1.5-2L12 17h7V5H5v12z"
                  />
                </svg>
              </div>
              <div class="group-image-info">
                <span class="group-image-name">{{ getChildImageDisplayName(image) }}</span>
                <div class="group-image-tags">
                  <span v-for="tagId in getSortedTags(getChildImageTags(image))" :key="tagId" class="group-image-tag"
                    :style="{ backgroundColor: getTagColor(tagId) }">
                    {{ getTagName(tagId, currentLanguage) }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </transition>

      <!-- 独立的拖拽条 - 在容器外面 -->
      <div v-if="showGroupSelector && !isMobile"
        class="group-selector-resize-border"
        :class="{ 'active': isDraggingGroupResize }"
        :style="{
          left: (groupSelectorWidth ?? 200) + 'px',
          transition: isDraggingGroupResize ? 'none' : 'width 0.15s ease, background 0.15s ease, left 0.1s ease'
        }"
        @mousedown="startResizeGroupSelector"
        @touchstart="startResizeGroupSelector"
        :title="$t('viewer.resizeGroupSelector')">
      </div>

      <!-- 移动端图像组悬浮按钮 -->
      <transition name="mobile-group-button-fade">
        <button
          v-if="effectiveViewerConfig.imageGroupList && showGroupSelector && isMobile && groupImageList.length > 1"
          @click="toggleMobileGroupSelector"
          class="mobile-group-selector-toggle"
          :class="{ 'active': isMobileGroupSelectorOpen }">
          <i :class="getIconClass('th')"></i>
          <span class="toggle-text">{{ $t('viewer.imageGroupWithCount', { count: groupImageList.length }) }}</span>
        </button>
      </transition>

      <!-- 移动端图像组悬浮窗 -->
      <transition name="mobile-group-selector-fade">
        <div
          v-if="effectiveViewerConfig.imageGroupList && isMobileGroupSelectorOpen"
          class="mobile-group-selector-overlay"
          @click="closeMobileGroupSelector">
          <transition name="mobile-group-selector-slide">
            <div v-if="isMobileGroupSelectorOpen" class="mobile-group-selector-content" @click.stop>
              <div class="mobile-group-selector-header">
                <h3>{{ $t('viewer.imageGroup') }}</h3>
                <button @click="closeMobileGroupSelector" class="close-button">
                  <i :class="getIconClass('times')"></i>
                </button>
              </div>
              <div class="mobile-group-selector-body">
                <div class="mobile-group-images-grid" ref="mobileGroupImagesGrid">
                  <div
                    v-for="image in groupImageList"
                    :key="image.id"
                    class="mobile-group-image-item"
                    :class="{ 'active': image.id === currentDisplayImageId }"
                    @click="handleMobileGroupImageClick(image.id)"
                  >
                    <div class="mobile-group-image-container">
                      <ProgressiveImage
                        v-if="image.src"
                        :src="image.src"
                        :alt="t(image.name, currentLanguage)"
                        class="mobile-group-image"
                        object-fit="contain"
                        :show-loader="false"
                        :show-progress="false"
                        preload-size="tiny"
                        display-type="thumbnail"
                        display-size="medium"
                      />
                      <div
                        v-else
                        class="mobile-group-image-placeholder"
                        :title="t(image.name, currentLanguage)"
                      >
                        <svg class="placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                               M9 17l1.5-2L12 17h7V5H5v12z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div class="mobile-group-image-info">
                      <span class="mobile-group-image-name">{{ getChildImageDisplayName(image) }}</span>
                      <div class="mobile-group-image-tags">
                        <span
                          v-for="tagId in getSortedTags(getChildImageTags(image))"
                          :key="tagId"
                          class="mobile-group-image-tag"
                          :style="{ backgroundColor: getTagColor(tagId) }">
                          {{ getTagName(tagId, currentLanguage) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </div>

    <div v-if="effectiveViewerConfig.imageList" class="viewer-navigation">
      <button class="nav-button prev-button" @click="prevImage" :disabled="!hasPrevImage" :title="t('viewer.prev')">
        <ChevronLeftIcon class="icon" />
      </button>

      <div class="image-thumbnails-container" :class="{ 'dragging': isDragging }" ref="thumbnailsContainer"
        @wheel="handleThumbnailWheel" @mousedown="handleThumbnailMouseDown" @touchstart="handleThumbnailTouchStart">
        <div class="image-thumbnails" :style="{
          transform: `translateX(${thumbnailsOffset}px)`
        }">
          <button v-for="(image, index) in imageList" :key="image.id" @click="handleThumbnailClick(index, $event)"
            @mousedown="handleThumbnailButtonMouseDown" @touchstart="handleThumbnailButtonTouchStart"
            class="thumbnail-button" :class="{ 'active': currentIndex === index }">
            <div class="thumbnail-container">
              <ProgressiveImage
                v-if="image.displaySrc"
                :src="image.displaySrc"
                :alt="t(image.name, currentLanguage)"
                class="thumbnail-image"
                object-fit="contain"
                :show-loader="false"
                preload-size="tiny"
                display-type="thumbnail"
                display-size="small"
              />
              <div v-else class="thumbnail-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z
                       M9 17l1.5-2L12 17h7V5H5v12z"
                  />
                </svg>
              </div>
              <!-- 图像组标识 -->
              <div v-if="hasValidChildImages(image)" class="thumbnail-group-indicator">
                <LayersIcon class="layers-icon" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <button class="nav-button next-button" @click="nextImage" :disabled="!hasNextImage" :title="t('viewer.next')">
        <ChevronRightIcon class="icon" />
      </button>
    </div>

    <!-- 桌面端信息面板 -->
    <transition name="slide-fade">
      <div v-show="hasInfoContent && showInfoPanel && !isMobile" class="viewer-footer">
        <div class="info-toggle-button" @click="toggleInfoPanel" style="display: none;">
          <!-- 信息切换按钮已移至顶部控制栏 -->
        </div>

        <div class="image-info">
          <div
            v-if="effectiveViewerConfig.infoPanel.title || effectiveViewerConfig.infoPanel.description"
            class="info-group">
            <h3
              v-if="effectiveViewerConfig.infoPanel.title"
              class="info-title">{{ t(getNameWithFallback, currentLanguage) }}</h3>
            <p
              v-if="effectiveViewerConfig.infoPanel.description"
              class="info-description">{{ t(getDescriptionWithFallback, currentLanguage) }}</p>
          </div>

          <div v-if="effectiveViewerConfig.infoPanel.artist" class="info-group">
            <h4 class="info-subtitle">{{ $t('gallery.artist') }}</h4>
            <div class="artist-info">
              <div class="artist-names">
                <span v-for="(artist, index) in getArtistListWithFallback" :key="index" class="artist-tag">
                  {{ t(artist, currentLanguage) }}
                </span>
              </div>
              <AuthorLinks
                :author-links="getAuthorLinksWithFallback"
              />
            </div>
          </div>

          <div v-if="effectiveViewerConfig.infoPanel.date" class="info-group">
            <h4 class="info-subtitle">{{ $t('gallery.date') }}</h4>
            <p>{{ getDateWithFallback }}</p>
          </div>

          <div v-if="effectiveViewerConfig.infoPanel.tags" class="info-group">
            <h4 class="info-subtitle">{{ $t('gallery.tags') }}</h4>
            <div class="tags-list">
              <span v-for="tagId in getSortedTags(getTagsWithFallback)" :key="tagId" class="tag"
                :style="{ backgroundColor: getTagColor(tagId) }">
                {{ getTagName(tagId, currentLanguage) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 移动端信息覆盖层 -->
    <transition name="mobile-overlay-fade">
      <div v-show="showMobileInfoOverlay && isMobile" class="mobile-info-overlay" @click="closeMobileInfoOverlay">
        <transition name="mobile-info-slide">
          <div v-show="showMobileInfoOverlay" class="mobile-info-panel" @click.stop>
            <div class="mobile-info-header">
              <h3 class="mobile-info-title">{{ $t('viewer.imageInfo') }}</h3>
              <button class="mobile-info-close" @click="closeMobileInfoOverlay">
                <XIcon class="icon" />
              </button>
            </div>

            <div class="mobile-info-content">
              <div
                v-if="effectiveViewerConfig.infoPanel.title || effectiveViewerConfig.infoPanel.description"
                class="info-group">
                <h3
                  v-if="effectiveViewerConfig.infoPanel.title"
                  class="info-title">{{ t(getNameWithFallback, currentLanguage) }}</h3>
                <p
                  v-if="effectiveViewerConfig.infoPanel.description"
                  class="info-description">{{ t(getDescriptionWithFallback, currentLanguage) }}</p>
              </div>

              <div v-if="effectiveViewerConfig.infoPanel.artist" class="info-group">
                <h4 class="info-subtitle">{{ $t('gallery.artist') }}</h4>
                <div class="artist-info">
                  <div class="artist-names">
                    <span v-for="(artist, index) in getArtistListWithFallback" :key="index" class="artist-tag">
                      {{ t(artist, currentLanguage) }}
                    </span>
                  </div>
                  <AuthorLinks
                    :author-links="getAuthorLinksWithFallback"
                  />
                </div>
              </div>

              <div v-if="effectiveViewerConfig.infoPanel.date" class="info-group">
                <h4 class="info-subtitle">{{ $t('gallery.date') }}</h4>
                <p>{{ getDateWithFallback }}</p>
              </div>

              <div v-if="effectiveViewerConfig.infoPanel.tags" class="info-group">
                <h4 class="info-subtitle">{{ $t('gallery.tags') }}</h4>
                <div class="tags-list">
                  <span v-for="tagId in getSortedTags(getTagsWithFallback)" :key="tagId" class="tag"
                    :style="{ backgroundColor: getTagColor(tagId) }">
                    {{ getTagName(tagId, currentLanguage) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>

    <!-- 评论模态框 -->
    <transition name="comments-modal-fade">
      <div
        v-show="effectiveViewerConfig.commentsButton && siteConfig.features.comments && showCommentsModal"
        class="comments-modal-overlay"
        @click="closeCommentsModal">
        <transition name="comments-modal-slide">
          <div v-show="showCommentsModal" class="comments-modal-panel" @click.stop>
            <div class="comments-modal-header">
              <h3 class="comments-modal-title">{{ $t('viewer.comments') }}</h3>
              <button class="comments-modal-close" @click="closeCommentsModal">
                <XIcon class="icon" />
              </button>
            </div>
            <div class="comments-modal-content">
              <GiscusComments
                :unique-id="props.commentsUniqueId ?? currentDisplayImageId"
                :prefix="props.commentsPrefix ?? 'gallery-comment'"
              />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">

import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, LayersIcon, MessageCircleIcon, RotateCcwIcon, XIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AuthorLinks from './AuthorLinks.vue';
import GiscusComments from './GiscusComments.vue';
import ProgressiveImage from './ProgressiveImage.vue';

import thumbnailMap from '@/assets/thumbnail-map.json';
import { useEventManager } from '@/composables/useEventManager';
import { useMobileDetection } from '@/composables/useScreenManager';
import { useTags } from '@/composables/useTags';
import { useTimers } from '@/composables/useTimers';
import { siteConfig } from '@/config/site';
import { getImageCache, LoadPriority } from '@/services/imageCache';
import { useGalleryStore } from '@/stores/gallery';
import { useLanguageStore } from '@/stores/language';
import type { DisplayImage, ExternalImageInfo, GroupImage, I18nText, ViewerUIConfig } from '@/types';
import { AnimationDurations } from '@/utils/animations';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';

const props = defineProps<{
  imageId?: string;
  childImageId?: string;
  externalImage?: ExternalImageInfo; // 外部图像信息（包含URL和其他信息）
  imageList?: DisplayImage[]; // 提供的图像列表
  viewerUIConfig?: ViewerUIConfig; // 结构化配置参数
  commentsUniqueId?: string; // 评论区唯一ID
  commentsPrefix?: string; // 评论区前缀
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t: $t } = useI18n();
const galleryStore = useGalleryStore();
const languageStore = useLanguageStore();
const { setTimeout, clearTimeout } = useTimers();
const eventManager = useEventManager();
const { addEventListener, removeEventListener } = useEventManager();
const { isMobile, onScreenChange } = useMobileDetection();
const { getSortedTags, getTagColor, getTagName } = useTags();

const currentLanguage = computed(() => languageStore.currentLanguage);

// 合并默认配置和传入的配置
const effectiveViewerConfig = computed((): ViewerUIConfig => {
  const defaultConfig = siteConfig.features.viewerUI;
  return {
    imageList: props.viewerUIConfig?.imageList ?? defaultConfig.imageList,
    imageGroupList: props.viewerUIConfig?.imageGroupList ?? defaultConfig.imageGroupList,
    viewerTitle: props.viewerUIConfig?.viewerTitle ?? defaultConfig.viewerTitle,
    infoPanel: {
      title: props.viewerUIConfig?.infoPanel?.title ?? defaultConfig.infoPanel.title,
      description: props.viewerUIConfig?.infoPanel?.description ?? defaultConfig.infoPanel.description,
      artist: props.viewerUIConfig?.infoPanel?.artist ?? defaultConfig.infoPanel.artist,
      date: props.viewerUIConfig?.infoPanel?.date ?? defaultConfig.infoPanel.date,
      tags: props.viewerUIConfig?.infoPanel?.tags ?? defaultConfig.infoPanel.tags,
    },
    commentsButton: props.viewerUIConfig?.commentsButton ?? defaultConfig.commentsButton,
  };
});

// 检查信息栏是否有任何内容需要显示
const hasInfoContent = computed((): boolean => {
  return effectiveViewerConfig.value.infoPanel.title
         || effectiveViewerConfig.value.infoPanel.description
         || effectiveViewerConfig.value.infoPanel.artist
         || effectiveViewerConfig.value.infoPanel.date
         || effectiveViewerConfig.value.infoPanel.tags;
});

// 缩略图容器引用
const thumbnailsContainer = ref<HTMLElement>();

// 图像组选择器容器引用
const groupImagesList = ref<HTMLElement | null>(null);

// 移动端图像组选择器容器引用
const mobileGroupImagesGrid = ref<HTMLElement | null>(null);

// 图像容器和图像元素引用
const imageContainer = ref<HTMLElement>();
const imageElement = ref<any>(); // Vue组件实例
const minimapImage = ref<HTMLElement>();

// 添加过渡动画状态
const transitionActive = ref(false);

// 图像缩放和拖拽状态
const imageScale = ref(1);
const imageOffset = ref({ x: 0, y: 0 });
const isDraggingImage = ref(false);
const isZooming = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const lastTouchDistance = ref(0);
const enableImageTransition = ref(true);

// 小地图相关状态
const showMinimap = ref(false);
const viewportRect = ref({ x: 0, y: 0, width: 0, height: 0 });
const isDraggingMinimap = ref(false);

// 移动端图像组选择器状态
const isMobileGroupSelectorOpen = ref(false);
const minimapDragStart = ref({ x: 0, y: 0 });

// 响应式切换动画状态
const isResponsiveTransitioning = ref(false);

// 图像加载状态
const isOriginalImageLoaded = ref(false);

// 当前图片索引和图片列表
const imageList = computed(() => {
  return props.imageList ?? [];
});

// 当前选中的子图像ID（独立状态）
const currentChildImageId = ref<string | undefined>(props.childImageId);

// 当前显示的图像ID（可能是父图像或子图像）
const currentDisplayImageId = computed(() => {
  return currentChildImageId.value ?? props.imageId;
});

const currentIndex = computed(() => {
  if (!currentDisplayImageId.value) return 0;

  // 首先尝试直接匹配ID
  let index = imageList.value.findIndex(img => img.id === currentDisplayImageId.value);

  // 如果没找到，可能是因为当前显示的是子图像，而列表中是父图像
  if (index === -1) {
    // 检查当前显示的是否是子图像
    const groupInfo = galleryStore.getImageGroupByChildId(currentDisplayImageId.value);
    if (groupInfo) {
      // 如果是子图像，查找父图像在列表中的位置
      index = imageList.value.findIndex(img => {
        // 检查是否是同一个图像组
        return img.id === groupInfo.parentImage.id
               || (img.childImages && img.childImages.some(child => child.id === currentDisplayImageId.value));
      });
    } else {
      index = imageList.value.findIndex(img => img.id === currentDisplayImageId.value);
    }
  }

  return index >= 0 ? index : 0;
});

const currentImage = computed(() => {
  // 如果传入了外部图像信息，创建一个临时的图像对象
  if (props.externalImage) {
    const info = props.externalImage;
    return {
      id: 'external-image',
      name: info.name ?? $t('common.externalImage'),
      description: info.description ?? '',
      artist: info.artist ?? 'N/A',
      src: info.url,
      tags: info.tags ?? [],
      characters: [],
      date: info.date,
      childImages: undefined,
    };
  }

  // 如果有子图像ID，优先获取子图像的具体信息
  if (currentChildImageId.value) {
    // 首先尝试在列表中直接查找子图像
    const childImage = imageList.value.find(img => img.id === currentChildImageId.value);
    if (childImage) {
      return childImage;
    }

    // 如果没找到，可能是子图像在父图像的childImages中
    for (const parentImage of imageList.value) {
      if (parentImage.childImages) {
        const childImage = parentImage.childImages.find(child => child.id === currentChildImageId.value);
        if (childImage) {
          return childImage;
        }
      }
    }
  }

  // 使用列表中的图像
  if (currentIndex.value >= 0 && currentIndex.value < imageList.value.length) {
    return imageList.value[currentIndex.value];
  }

  return null;
});

// 当前图像组信息（基于当前图像的子图像）
const currentImageGroup = computed(() => {
  if (!currentImage.value) return null;

  // 如果当前图像有子图像，这是一个图像组
  if (currentImage.value && 'childImages' in currentImage.value) {
    const image = currentImage.value as GroupImage;
    return {
      parentImage: image,
      validImages: image.childImages ?? [],
      isParent: true,
    };
  }

  // 如果当前图像是子图像，需要找到父图像
  const groupInfo = galleryStore.getImageGroupByChildId(currentImage.value.id);
  const parentImage = imageList.value.find(img => img.id === groupInfo?.parentImage.id);
  if (parentImage) {
    return {
      parentImage: parentImage,
      validImages: parentImage.childImages ?? [],
      isParent: false,
    };
  }

  return null;
});

// 图像组内的图像列表（用于选择器）
const groupImageList = computed(() => {
  // 先判断是不是 CharacterImage
  if (currentImage.value && 'childImages' in currentImage.value) {
    const image = currentImage.value as GroupImage;
    return image.childImages ?? [];
  }

  // 如果当前图像是子图像，需要找到父图像的childImages
  if (currentImage.value) {
    const groupInfo = galleryStore.getImageGroupByChildId(currentImage.value.id);
    if (groupInfo) {
      const parentImage = imageList.value.find(img => img.id === groupInfo.parentImage.id);
      if (parentImage && parentImage.childImages) {
        return parentImage.childImages ?? [];
      }
    }
  }

  // 否则返回空数组
  return [];
});

// 是否显示图像组选择器
const showGroupSelector = computed(() => {
  // 如果有多个图像则显示选择器
  return groupImageList.value.length > 1;
});

// 主图像区域的动态样式
const mainImageAreaStyle = computed(() => {
  if (showGroupSelector.value && !isMobile.value && groupSelectorWidth.value) {
    return {
      marginLeft: `${groupSelectorWidth.value}px`,
    };
  }
  return {};
});

// 导航控制
const hasPrevImage = computed(() => currentIndex.value > 0);
const hasNextImage = computed(() => currentIndex.value < imageList.value.length - 1);

// 获取带有默认值的图像信息
const getImageWithDefaults = computed(() => {
  if (!currentImage.value) return null;

  const currentGroup = currentImageGroup.value;
  if (currentGroup && !currentGroup.isParent) {
    // 当前是子图像，使用getChildImageWithDefaults获取完整信息
    const childImage = currentImage.value;
    const { parentImage } = currentGroup;
    return galleryStore.getChildImageWithDefaults(parentImage, childImage);
  }

  // 当前是父图像或普通图像，直接返回
  return currentImage.value;
});

// 获取作者列表
const getArtistListWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return ['N/A'];

  const artist = imageWithDefaults.artist ?? 'N/A';
  return Array.isArray(artist) ? artist : [artist];
});

// 获取作者链接（支持继承）
const getAuthorLinksWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return [];

  return imageWithDefaults.authorLinks ?? [];
});

// 获取描述
const getDescriptionWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return '';

  return imageWithDefaults.description ?? '';
});

// 获取名称（支持fallback）
const getNameWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return '';

  return imageWithDefaults.name ?? '';
});

// 获取日期（支持fallback）
const getDateWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return 'N/A';

  return imageWithDefaults.date ?? 'N/A';
});

// 获取标签（支持fallback）
const getTagsWithFallback = computed(() => {
  const imageWithDefaults = getImageWithDefaults.value;
  if (!imageWithDefaults) return [];

  return imageWithDefaults.tags ?? [];
});

// 检查图像是否有有效的子图像（用于显示组图标识）
const hasValidChildImages = (image: GroupImage): boolean => {
  return !!(image.childImages && image.childImages.length > 1);
};

const prevImage = (): void => {
  if (hasPrevImage.value) {
    goToImage(currentIndex.value - 1);
  }
};

const nextImage = (): void => {
  if (hasNextImage.value) {
    goToImage(currentIndex.value + 1);
  }
};

// 导航到指定索引的图像
const goToImage = (index: number): void => {
  if (index >= 0 && index < imageList.value.length) {
    const targetImage = imageList.value[index];
    if (!targetImage?.id) {
      console.warn('Image ID is empty, cannot navigate');
      return;
    }

    // 重置子图像ID状态
    currentChildImageId.value = undefined;

    // 检查目标图像是否是图像组的一部分
    const groupInfo = galleryStore.getImageGroupByChildId(targetImage.id);
    if (groupInfo) {
      // 如果是子图像，设置正确的子图像ID
      const parentImageId = groupInfo.parentImage.id;
      currentChildImageId.value = targetImage.id;
      navigateToImage(parentImageId, targetImage.id);
    } else if (targetImage.childImages) {
      // 如果是父图像，导航到其第一个有效子图像
      const firstValidChildId = galleryStore.getFirstValidChildId(targetImage);
      if (firstValidChildId) {
        currentChildImageId.value = firstValidChildId;
        navigateToImage(targetImage.id, firstValidChildId);
      } else {
        navigateToImage(targetImage.id);
      }
    } else {
      // 普通图像，直接导航
      navigateToImage(targetImage.id);
    }
  }
};

// 在图像组内导航到指定图像
const goToGroupImage = (imageId: string): void => {
  if (!currentImageGroup.value) return;

  const parentImageId = currentImageGroup.value.parentImage.id;
  const targetImage = groupImageList.value.find(img => img.id === imageId);

  if (!targetImage) return;

  // 直接更新子图像ID状态
  if (targetImage.id === parentImageId) {
    // 切换到父图像
    currentChildImageId.value = undefined;
  } else {
    // 切换到子图像
    currentChildImageId.value = targetImage.id;
  }

  // 通知父组件处理路由更新
  const childImageId = currentChildImageId.value;
  eventManager.dispatchEvent('viewerNavigate', {
    imageId: parentImageId,
    childImageId: childImageId,
  });

  // 滚动到当前选中的图像组项
  scrollToActiveGroupImage();
};

// 滚动图像组选择器到当前选中的项
const scrollToActiveGroupImage = (): void => {
  if (!currentDisplayImageId.value) return;

  // 桌面端图像组选择器滚动
  if (groupImagesList.value) {
    scrollToActiveItemInContainer(groupImagesList.value, '.group-image-button.active');
  }

  // 移动端图像组选择器滚动
  if (mobileGroupImagesGrid.value) {
    scrollToActiveItemInContainer(mobileGroupImagesGrid.value, '.mobile-group-image-item.active');
  }
};

// 通用的滚动到活跃项的函数
const scrollToActiveItemInContainer = (container: HTMLElement, activeSelector: string): void => {
  // 查找当前选中的项
  const activeItem = container.querySelector(activeSelector) as HTMLElement;
  if (!activeItem) {
    console.log('[FullscreenViewer] Active item not found:', activeSelector);
    return;
  }

  // 使用 scrollIntoView 方法，将选中的项滚动到中间位置
  activeItem.scrollIntoView({
    behavior: 'smooth',
    block: 'center', // 将项滚动到容器的中间位置
    inline: 'nearest',
  });
};

// 通用导航函数
const navigateToImage = (imageId: string, childImageId?: string): void => {
  // 触发自定义事件通知父组件处理路由
  eventManager.dispatchEvent('viewerNavigate', { imageId, childImageId });

  // 强制重置用户滚动状态，确保自动定位生效
  isUserScrolling.value = false;

  // 更新缩略图位置
  nextTick(() => {
    updateThumbnailsOffset();
  });
};

const onImageLoad = (): void => {
  // 标记原始图像已加载
  isOriginalImageLoaded.value = true;
  // 图片加载完成处理
  nextTick(() => {
    resetImageTransform();
    updateMinimapVisibility();
  });
};

// 图像变换样式
const imageTransform = computed(() => {
  return `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px) scale(${imageScale.value})`;
});

// 图像过渡样式
const imageTransitionStyle = computed(() => {
  return enableImageTransition.value ? 'transform 0.15s ease-out' : 'none';
});

// 检查是否应该禁用缩放功能
const isZoomDisabled = computed(() => {
  return !isOriginalImageLoaded.value;
});

// 小地图视口样式
const viewportStyle = computed(() => {
  return {
    left: `${viewportRect.value.x}px`,
    top: `${viewportRect.value.y}px`,
    width: `${viewportRect.value.width}px`,
    height: `${viewportRect.value.height}px`,
  };
});

// 小地图图像边框样式
const imageBorderStyle = computed(() => {
  if (!minimapImage.value || !currentImage.value) {
    return { display: 'none' };
  }

  const minimapRect = minimapImage.value.getBoundingClientRect();
  const info = getImageDisplayInfo();
  if (!info) {
    return { display: 'none' };
  }

  // 计算小地图中实际显示的图像区域
  const minimapAspect = minimapRect.width / minimapRect.height;
  const imageAspect = info.displayWidth / info.displayHeight;

  let imageBorderWidth, imageBorderHeight, imageBorderX, imageBorderY;
  if (imageAspect > minimapAspect) {
    // 图像更宽，以宽度为准
    imageBorderWidth = minimapRect.width;
    imageBorderHeight = minimapRect.width / imageAspect;
    imageBorderX = 0;
    imageBorderY = (minimapRect.height - imageBorderHeight) / 2;
  } else {
    // 图像更高，以高度为准
    imageBorderHeight = minimapRect.height;
    imageBorderWidth = minimapRect.height * imageAspect;
    imageBorderX = (minimapRect.width - imageBorderWidth) / 2;
    imageBorderY = 0;
  }

  return {
    left: `${imageBorderX}px`,
    top: `${imageBorderY}px`,
    width: `${imageBorderWidth}px`,
    height: `${imageBorderHeight}px`,
  };
});

// 重置图像变换
const resetImageTransform = (): void => {
  imageScale.value = 1;
  imageOffset.value = { x: 0, y: 0 };
  updateMinimapVisibility();
};

// 获取图像的实际显示信息（考虑object-fit: contain）
const getImageDisplayInfo = (): {
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  imageX: number;
  imageY: number;
  containerWidth: number;
  containerHeight: number;
  offsetX: number;
  offsetY: number;
} | null => {
  if (!imageElement.value || !imageContainer.value) {
    return null;
  }

  // 从Vue组件实例中获取实际的DOM元素
  const imageEl = imageElement.value.$el ?? imageElement.value;
  const image = imageEl.querySelector ? imageEl.querySelector('img') as HTMLImageElement : imageEl as HTMLImageElement;
  if (!image) {
    return null;
  }

  const containerRect = imageContainer.value.getBoundingClientRect();

  // 获取图像的原始尺寸
  const { naturalWidth } = image;
  const { naturalHeight } = image;

  // 计算contain模式下的实际显示尺寸
  const containerAspect = containerRect.width / containerRect.height;
  const imageAspect = naturalWidth / naturalHeight;

  let displayWidth, displayHeight;
  if (imageAspect > containerAspect) {
    // 图像更宽，以宽度为准
    displayWidth = containerRect.width;
    displayHeight = containerRect.width / imageAspect;
  } else {
    // 图像更高，以高度为准
    displayHeight = containerRect.height;
    displayWidth = containerRect.height * imageAspect;
  }

  // 应用用户缩放
  const scaledWidth = displayWidth * imageScale.value;
  const scaledHeight = displayHeight * imageScale.value;

  // 计算图像在容器中的位置（居中）
  const imageX = (containerRect.width - scaledWidth) / 2;
  const imageY = (containerRect.height - scaledHeight) / 2;

  return {
    naturalWidth,
    naturalHeight,
    displayWidth,
    displayHeight,
    scaledWidth,
    scaledHeight,
    imageX,
    imageY,
    containerWidth: containerRect.width,
    containerHeight: containerRect.height,
    offsetX: (containerRect.width - displayWidth) / 2,
    offsetY: (containerRect.height - displayHeight) / 2,
  };
};

// 计算拖拽限制
const calculateDragLimits = (): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} => {
  const info = getImageDisplayInfo();
  if (!info) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  // 防止除零错误和极端值
  if (info.containerWidth <= 0 || info.containerHeight <= 0
    || info.scaledWidth <= 0 || info.scaledHeight <= 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  // 图像以容器中心为原点缩放
  // imageOffset是相对于图像默认居中位置的偏移
  // 缩放后图像的实际位置：
  // 左边界：containerWidth/2 - scaledWidth/2 + imageOffset.x
  // 右边界：containerWidth/2 + scaledWidth/2 + imageOffset.x
  // 上边界：containerHeight/2 - scaledHeight/2 + imageOffset.y
  // 下边界：containerHeight/2 + scaledHeight/2 + imageOffset.y

  // 限制条件：
  // 左边界 >= 0: containerWidth/2 - scaledWidth/2 + imageOffset.x >= 0
  // 右边界 <= containerWidth: containerWidth/2 + scaledWidth/2 + imageOffset.x <= containerWidth
  // 上边界 >= 0: containerHeight/2 - scaledHeight/2 + imageOffset.y >= 0
  // 下边界 <= containerHeight: containerHeight/2 + scaledHeight/2 + imageOffset.y <= containerHeight

  // 解出imageOffset的限制：
  let minX, maxX, minY, maxY;

  if (info.scaledWidth <= info.containerWidth) {
    // 图像宽度小于等于容器宽度，水平居中，不允许水平拖拽
    minX = maxX = 0;
  } else {
    // 图像宽度大于容器宽度，允许在限制范围内拖拽
    const halfWidthDiff = (info.scaledWidth - info.containerWidth) / 2;
    minX = -halfWidthDiff;
    maxX = halfWidthDiff;
  }

  if (info.scaledHeight <= info.containerHeight) {
    // 图像高度小于等于容器高度，垂直居中，不允许垂直拖拽
    minY = maxY = 0;
  } else {
    // 图像高度大于容器高度，允许在限制范围内拖拽
    const halfHeightDiff = (info.scaledHeight - info.containerHeight) / 2;
    minY = -halfHeightDiff;
    maxY = halfHeightDiff;
  }

  // 确保限制值是有限数值
  minX = isFinite(minX) ? minX : 0;
  maxX = isFinite(maxX) ? maxX : 0;
  minY = isFinite(minY) ? minY : 0;
  maxY = isFinite(maxY) ? maxY : 0;

  return { minX, maxX, minY, maxY };
};

// 应用拖拽限制
const applyDragLimits = (): void => {
  const limits = calculateDragLimits();

  // 限制在边界内
  imageOffset.value.x = Math.max(limits.minX, Math.min(limits.maxX, imageOffset.value.x));
  imageOffset.value.y = Math.max(limits.minY, Math.min(limits.maxY, imageOffset.value.y));
};

// 更新小地图可见性
const updateMinimapVisibility = (): void => {
  const info = getImageDisplayInfo();
  if (!info) {
    showMinimap.value = false;
    return;
  }

  // 检查图像是否超出容器边界或已缩放
  const isImageLarger = info.scaledWidth > info.containerWidth || info.scaledHeight > info.containerHeight;
  const isScaled = imageScale.value > 1;

  showMinimap.value = isImageLarger || isScaled;

  if (showMinimap.value) {
    nextTick(() => {
      updateMinimapViewport();
    });
  }
};

// 更新小地图视口位置
const updateMinimapViewport = (): void => {
  if (!imageElement.value || !imageContainer.value || !minimapImage.value) {
    return;
  }

  const info = getImageDisplayInfo();
  if (!info) return;

  const minimapRect = minimapImage.value.getBoundingClientRect();

  // 计算小地图中实际显示的图像区域
  // 小地图使用object-fit: contain，所以需要计算实际图像在小地图中的位置和尺寸
  const minimapAspect = minimapRect.width / minimapRect.height;
  const imageAspect = info.displayWidth / info.displayHeight;

  let minimapImageWidth, minimapImageHeight, minimapImageX, minimapImageY;
  if (imageAspect > minimapAspect) {
    // 图像更宽，以宽度为准
    minimapImageWidth = minimapRect.width;
    minimapImageHeight = minimapRect.width / imageAspect;
    minimapImageX = 0;
    minimapImageY = (minimapRect.height - minimapImageHeight) / 2;
  } else {
    // 图像更高，以高度为准
    minimapImageHeight = minimapRect.height;
    minimapImageWidth = minimapRect.height * imageAspect;
    minimapImageX = (minimapRect.width - minimapImageWidth) / 2;
    minimapImageY = 0;
  }

  // 计算当前视口在缩放后图像中的位置
  const imageLeft = info.imageX + imageOffset.value.x;
  const imageTop = info.imageY + imageOffset.value.y;

  // 计算视口在缩放后图像中的相对位置
  const viewportInScaledImageLeft = Math.max(0, -imageLeft);
  const viewportInScaledImageTop = Math.max(0, -imageTop);
  const viewportInScaledImageRight = Math.min(info.scaledWidth, info.containerWidth - imageLeft);
  const viewportInScaledImageBottom = Math.min(info.scaledHeight, info.containerHeight - imageTop);

  const viewportInScaledImageWidth = Math.max(0, viewportInScaledImageRight - viewportInScaledImageLeft);
  const viewportInScaledImageHeight = Math.max(0, viewportInScaledImageBottom - viewportInScaledImageTop);

  // 将缩放后图像中的视口位置转换为原始图像中的位置
  const scaleFactor = imageScale.value;
  const viewportInOriginalImageLeft = viewportInScaledImageLeft / scaleFactor;
  const viewportInOriginalImageTop = viewportInScaledImageTop / scaleFactor;
  const viewportInOriginalImageWidth = viewportInScaledImageWidth / scaleFactor;
  const viewportInOriginalImageHeight = viewportInScaledImageHeight / scaleFactor;

  // 计算小地图中图像区域的缩放比例
  const minimapScaleX = minimapImageWidth / info.displayWidth;
  const minimapScaleY = minimapImageHeight / info.displayHeight;

  // 计算视口框在小地图中的位置和尺寸
  const minimapViewportX = minimapImageX + viewportInOriginalImageLeft * minimapScaleX;
  const minimapViewportY = minimapImageY + viewportInOriginalImageTop * minimapScaleY;
  const minimapViewportWidth = viewportInOriginalImageWidth * minimapScaleX;
  const minimapViewportHeight = viewportInOriginalImageHeight * minimapScaleY;

  // 确保视口框不超出小地图中图像的实际显示范围
  const clampedX = Math.max(
    minimapImageX,
    Math.min(minimapViewportX, minimapImageX + minimapImageWidth - minimapViewportWidth),
  );
  const clampedY = Math.max(
    minimapImageY,
    Math.min(minimapViewportY, minimapImageY + minimapImageHeight - minimapViewportHeight),
  );
  const clampedWidth = Math.max(0, Math.min(minimapViewportWidth, minimapImageX + minimapImageWidth - clampedX));
  const clampedHeight = Math.max(0, Math.min(minimapViewportHeight, minimapImageY + minimapImageHeight - clampedY));

  viewportRect.value = {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
};

// 移动端检测现在通过 useMobileDetection 管理

// 信息面板控制
const showInfoPanel = ref(true);
const infoPanelAnimating = ref(false);

// 移动端覆盖层信息面板控制
const showMobileInfoOverlay = ref(false);
const mobileInfoOverlayAnimating = ref(false);

// 评论模态框控制
const showCommentsModal = ref(false);
const commentsModalAnimating = ref(false);

// 用户对固定信息栏的显示偏好（只针对桌面端的固定信息栏）
const userInfoPanelPreference = ref(true); // 默认显示固定信息栏

const toggleInfoPanel = (): void => {
  if (isMobile.value) {
    // 移动端：切换覆盖层显示（临时弹窗，不影响固定信息栏偏好）
    toggleMobileInfoOverlay();
  } else {
    // 桌面端：切换固定信息栏并记录用户偏好
    if (infoPanelAnimating.value) return; // 防止动画过程中重复触发

    infoPanelAnimating.value = true;
    showInfoPanel.value = !showInfoPanel.value;

    // 记录用户对固定信息栏的偏好
    userInfoPanelPreference.value = showInfoPanel.value;

    // 动画结束后重置状态 - 从CSS读取动画时长
    const duration = AnimationDurations.getInfoPanelTransition();
    if (duration === 0) {
      // 如果没有动画或动画时长为0，立即重置状态
      infoPanelAnimating.value = false;
    } else {
      setTimeout(() => {
        infoPanelAnimating.value = false;
      }, duration);
    }
  }
};

// 注意：handleInfoPanelToggleComplete 函数已被移除，
// 其功能已由 handleImageContainerResize 通过 ResizeObserver 实现

// 移动端信息覆盖层切换
const toggleMobileInfoOverlay = (): void => {
  if (mobileInfoOverlayAnimating.value) return;

  mobileInfoOverlayAnimating.value = true;
  showMobileInfoOverlay.value = !showMobileInfoOverlay.value;

  // 防止背景滚动
  if (showMobileInfoOverlay.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  // 动画结束后重置状态
  setTimeout(() => {
    mobileInfoOverlayAnimating.value = false;
    // 移动端覆盖层不会改变图像容器大小，无需额外处理
  }, 300); // 覆盖层动画时长
};

// 关闭移动端信息覆盖层
const closeMobileInfoOverlay = (): void => {
  if (mobileInfoOverlayAnimating.value) return;

  mobileInfoOverlayAnimating.value = true;
  showMobileInfoOverlay.value = false;

  // 恢复背景滚动
  document.body.style.overflow = '';

  setTimeout(() => {
    mobileInfoOverlayAnimating.value = false;
    // 移动端覆盖层不会改变图像容器大小，无需额外处理
  }, 300);
};

// 评论模态框切换
const toggleCommentsModal = (): void => {
  if (commentsModalAnimating.value) return;
  if (!effectiveViewerConfig.value.commentsButton || !siteConfig.features.comments) return;

  commentsModalAnimating.value = true;
  showCommentsModal.value = !showCommentsModal.value;

  // 防止背景滚动
  if (showCommentsModal.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  // 动画结束后重置状态
  setTimeout(() => {
    commentsModalAnimating.value = false;
  }, 300); // 模态框动画时长
};

// 关闭评论模态框
const closeCommentsModal = (): void => {
  if (commentsModalAnimating.value) return;

  commentsModalAnimating.value = true;
  showCommentsModal.value = false;

  // 恢复背景滚动
  document.body.style.overflow = '';

  setTimeout(() => {
    commentsModalAnimating.value = false;
  }, 300);
};

// 移动端图像组选择器相关方法
const toggleMobileGroupSelector = (): void => {
  isMobileGroupSelectorOpen.value = !isMobileGroupSelectorOpen.value;
  // 阻止背景滚动
  if (isMobileGroupSelectorOpen.value) {
    document.body.style.overflow = 'hidden';
    // 打开时滚动到当前选中的项
    nextTick(() => {
      scrollToActiveGroupImage();
    });
  } else {
    document.body.style.overflow = '';
  }
};

const closeMobileGroupSelector = (): void => {
  isMobileGroupSelectorOpen.value = false;
  // 恢复背景滚动
  document.body.style.overflow = '';
};

const handleMobileGroupImageClick = (imageId: string): void => {
  closeMobileGroupSelector();
  goToGroupImage(imageId);
};

// 缩略图滚动条逻辑
const thumbnailsOffset = ref(0);
const thumbnailPadding = ref(0);

// 子图像列表宽度调整功能
const groupSelectorWidth = ref<number | null>(null);
const isDraggingGroupResize = ref(false);
const groupResizeStartX = ref(0);
const groupResizeStartWidth = ref(0);
const minGroupSelectorWidth = 150; // 最小宽度
const maxGroupSelectorWidth = 400; // 最大宽度

// 从本地存储加载保存的子图像列表宽度
const loadGroupSelectorWidth = (): number | null => {
  try {
    const saved = localStorage.getItem('groupSelectorWidth');
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= minGroupSelectorWidth && width <= maxGroupSelectorWidth) {
        return width;
      }
    }
  } catch (error) {
    console.warn('Failed to load group selector width from localStorage:', error);
  }
  return null;
};

// 保存子图像列表宽度到本地存储
const saveGroupSelectorWidth = (width: number): void => {
  try {
    localStorage.setItem('groupSelectorWidth', width.toString());
  } catch (error) {
    console.warn('Failed to save group selector width to localStorage:', error);
  }
};

// 开始拖拽调整子图像列表宽度
const startResizeGroupSelector = (event: MouseEvent | TouchEvent): void => {
  event.preventDefault();
  event.stopPropagation();

  isDraggingGroupResize.value = true;

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  groupResizeStartX.value = clientX;

  // 获取当前容器宽度
  const currentWidth = groupSelectorWidth.value ?? 200; // 默认宽度
  groupResizeStartWidth.value = currentWidth;

  // 添加全局事件监听器
  const handleMouseMove = (e: MouseEvent | TouchEvent): void => handleResizeGroupSelector(e);
  const handleMouseUp = (e: MouseEvent | TouchEvent): void => stopResizeGroupSelector(e);

  if ('touches' in event) {
    addEventListener('touchmove', handleMouseMove, { passive: false });
    addEventListener('touchend', handleMouseUp);
  } else {
    addEventListener('mousemove', handleMouseMove);
    addEventListener('mouseup', handleMouseUp);
  }

  // 添加拖拽样式
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
};

// 拖拽调整子图像列表宽度过程
const handleResizeGroupSelector = (event: MouseEvent | TouchEvent): void => {
  if (!isDraggingGroupResize.value) return;

  event.preventDefault();

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const deltaX = clientX - groupResizeStartX.value;
  const newWidth = Math.max(
    minGroupSelectorWidth,
    Math.min(maxGroupSelectorWidth, groupResizeStartWidth.value + deltaX),
  );

  groupSelectorWidth.value = newWidth;
};

// 停止拖拽调整子图像列表宽度
const stopResizeGroupSelector = (event: MouseEvent | TouchEvent): void => {
  if (!isDraggingGroupResize.value) return;

  event.preventDefault();

  isDraggingGroupResize.value = false;

  // 保存新宽度到本地存储
  if (groupSelectorWidth.value) {
    saveGroupSelectorWidth(groupSelectorWidth.value);
  }

  // 移除全局事件监听器
  removeEventListener('mousemove', handleResizeGroupSelector);
  removeEventListener('mouseup', stopResizeGroupSelector);
  removeEventListener('touchmove', handleResizeGroupSelector);
  removeEventListener('touchend', stopResizeGroupSelector);

  // 恢复样式
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

// 动态获取缩略图的实际尺寸（基于DOM计算而非硬编码）
const getThumbnailDimensions = (): { width: number; gap: number } => {
  if (!thumbnailsContainer.value) {
    // 后备默认值，但通常不会用到
    return { width: 64, gap: 8 };
  }

  const thumbnailsElement = thumbnailsContainer.value.querySelector('.image-thumbnails') as HTMLElement;
  const thumbnailButtons = thumbnailsContainer.value.querySelectorAll('.thumbnail-button');

  if (thumbnailButtons.length < 1) {
    return { width: 64, gap: 8 };
  }

  const firstButton = thumbnailButtons[0] as HTMLElement;
  const firstRect = firstButton.getBoundingClientRect();
  const { width } = firstRect;

  let gap = 8; // 默认值

  if (thumbnailButtons.length >= 2 && thumbnailsElement) {
    // 通过前两个缩略图的位置计算实际间隙
    const second = thumbnailButtons[1] as HTMLElement;
    const secondRect = second.getBoundingClientRect();
    gap = secondRect.left - firstRect.right;
  } else if (thumbnailsElement) {
    // 如果只有一个缩略图，尝试从CSS计算gap值
    const computedStyle = window.getComputedStyle(thumbnailsElement);
    const gapValue = computedStyle.gap ?? computedStyle.columnGap;
    if (gapValue && gapValue !== 'normal') {
      const gapPx = parseFloat(gapValue);
      if (!isNaN(gapPx)) {
        gap = gapPx;
      }
    }
  }

  return { width, gap };
};

// 计算缩略图列表的总宽度
const getThumbnailsListWidth = (count: number): number => {
  if (count <= 0) return 0;
  const { width, gap } = getThumbnailDimensions();
  // 总宽度 = (数量-1) × (宽度+间隙) + 最后一个宽度
  return (count - 1) * (width + gap) + width;
};

// 计算特定索引缩略图的中心位置
const getThumbnailCenterPosition = (index: number): number => {
  const { width, gap } = getThumbnailDimensions();
  return index * (width + gap) + width / 2;
};

// 动态获取容器的实际可用宽度
const getThumbnailContainerWidth = (): number => {
  if (!thumbnailsContainer.value) {
    // 后备计算方式
    return window.innerWidth - 136;
  }

  // 基于实际DOM元素计算可用宽度
  const containerRect = thumbnailsContainer.value.getBoundingClientRect();
  return containerRect.width;
};

const updateThumbnailsOffset = (): void => {
  // 如果用户正在手动滚动，不要自动调整位置
  if (isUserScrolling.value) return;

  const containerWidth = getThumbnailContainerWidth();
  const totalWidth = getThumbnailsListWidth(imageList.value.length);
  const containerCenter = containerWidth / 2;

  // 不使用占位符，直接基于实际内容计算
  thumbnailPadding.value = 0;

  if (totalWidth <= containerWidth) {
    // 如果内容少于一屏，整体居中显示
    thumbnailsOffset.value = (containerWidth - totalWidth) / 2;
    return;
  }

  // 计算当前图片的实际中心位置
  const currentImageCenter = getThumbnailCenterPosition(currentIndex.value);

  // 计算让当前图片居中的理想偏移量
  const idealOffset = containerCenter - currentImageCenter;

  // 计算边界限制：
  // 左边界：第一张图片居中时的偏移量（第一张图片中心对齐容器中心）
  const firstImageCenter = getThumbnailCenterPosition(0);
  const maxOffset = containerCenter - firstImageCenter;

  // 右边界：最后一张图片居中时的偏移量（最后一张图片中心对齐容器中心）
  const lastImageCenter = getThumbnailCenterPosition(imageList.value.length - 1);
  const minOffset = containerCenter - lastImageCenter;

  // 应用边界限制
  thumbnailsOffset.value = Math.max(minOffset, Math.min(maxOffset, idealOffset));
};

// 手动滚动缩略图的状态
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartOffset = ref(0);
const isUserScrolling = ref(false); // 标记用户是否在手动滚动

// 手动设置缩略图偏移量（用户拖拽时）
const setManualThumbnailOffset = (offset: number): void => {
  const containerWidth = getThumbnailContainerWidth();
  const totalWidth = getThumbnailsListWidth(imageList.value.length);
  const containerCenter = containerWidth / 2;

  if (totalWidth <= containerWidth) {
    return; // 如果内容不足一屏，不允许滚动
  }

  // 使用与自动定位相同的边界计算
  // 左边界：第一张图片居中时的偏移量
  const firstImageCenter = getThumbnailCenterPosition(0);
  const maxOffset = containerCenter - firstImageCenter;

  // 右边界：最后一张图片居中时的偏移量
  const lastImageCenter = getThumbnailCenterPosition(imageList.value.length - 1);
  const minOffset = containerCenter - lastImageCenter;

  thumbnailsOffset.value = Math.max(minOffset, Math.min(maxOffset, offset));
};

// 滚轮事件处理
const handleThumbnailWheel = (event: WheelEvent): void => {
  event.preventDefault();
  isUserScrolling.value = true;

  const scrollSpeed = 40; // 滚动速度
  const delta = event.deltaY > 0 ? -scrollSpeed : scrollSpeed;
  setManualThumbnailOffset(thumbnailsOffset.value + delta);

  // 1秒后重置用户滚动状态
  setTimeout(() => {
    isUserScrolling.value = false;
  }, 1000);
};

// 鼠标拖拽处理
const handleThumbnailMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return; // 只处理左键

  event.preventDefault();
  isUserScrolling.value = true;
  dragStartX.value = event.clientX;
  dragStartOffset.value = thumbnailsOffset.value;

  const handleMouseMove = (e: MouseEvent): void => {
    const deltaX = e.clientX - dragStartX.value;

    // 降低拖拽阈值并立即启用拖拽状态以减少卡顿
    if (Math.abs(deltaX) > 2) { // 降低阈值从 dragThreshold 到 2
      if (!isDragging.value) {
        isDragging.value = true;
      }
    }

    if (isDragging.value) {
      setManualThumbnailOffset(dragStartOffset.value + deltaX);
    }
  };

  const handleMouseUp = (): void => {
    // 延迟重置拖拽状态，确保点击事件处理完毕
    setTimeout(() => {
      isDragging.value = false;
    }, 50);

    setTimeout(() => {
      isUserScrolling.value = false;
    }, 500);

    removeEventListener('mousemove', handleMouseMove);
    removeEventListener('mouseup', handleMouseUp);
  };

  addEventListener('mousemove', handleMouseMove);
  addEventListener('mouseup', handleMouseUp);
};

// 触摸拖拽处理
const handleThumbnailTouchStart = (event: TouchEvent): void => {
  if (event.touches.length !== 1) return;

  const touch = event.touches[0];
  isUserScrolling.value = true;
  dragStartX.value = touch.clientX;
  dragStartOffset.value = thumbnailsOffset.value;

  const handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartX.value;

    // 降低拖拽阈值并立即启用拖拽状态以减少卡顿
    if (Math.abs(deltaX) > 2) { // 降低阈值从 dragThreshold 到 2
      if (!isDragging.value) {
        isDragging.value = true;
        e.preventDefault(); // 防止页面滚动
      }
    }

    if (isDragging.value) {
      e.preventDefault(); // 防止页面滚动
      setManualThumbnailOffset(dragStartOffset.value + deltaX);
    }
  };

  const handleTouchEnd = (): void => {
    // 延迟重置拖拽状态，确保点击事件处理完毕
    setTimeout(() => {
      isDragging.value = false;
    }, 50);

    setTimeout(() => {
      isUserScrolling.value = false;
    }, 500);

    thumbnailsContainer.value?.removeEventListener('touchmove', handleTouchMove as any);
    thumbnailsContainer.value?.removeEventListener('touchend', handleTouchEnd);
  };

  thumbnailsContainer.value?.addEventListener('touchmove', handleTouchMove as any, { passive: false });
  thumbnailsContainer.value?.addEventListener('touchend', handleTouchEnd);
};

// 拖拽相关状态
const clickStartTime = ref(0);
const clickStartPosition = ref({ x: 0, y: 0 });
const dragThreshold = 5; // 拖拽阈值，超过这个距离算作拖拽而非点击

// 缩略图按钮点击处理（区分点击和拖拽）
const handleThumbnailClick = (index: number, event: MouseEvent): void => {
  // 如果是拖拽操作，则不触发点击
  if (isDragging.value) {
    event.preventDefault();
    return;
  }

  // 检查是否是真正的点击（而非拖拽结束）
  const currentTime = Date.now();
  const timeDiff = currentTime - clickStartTime.value;
  const currentPos = { x: event.clientX, y: event.clientY };
  const distance = Math.sqrt(
    Math.pow(currentPos.x - clickStartPosition.value.x, 2)
    + Math.pow(currentPos.y - clickStartPosition.value.y, 2),
  );

  // 如果时间太长或移动距离太大，认为是拖拽而非点击
  if (timeDiff > 500 || distance > dragThreshold) {
    event.preventDefault();
    return;
  }

  // 修正：确保使用图像组的位置索引
  // 如果点击的是图像组的子图像，应该导航到该图像组在列表中的位置
  const targetImage = imageList.value[index];
  if (targetImage) {
    // 检查目标图像是否是子图像
    const groupInfo = galleryStore.getImageGroupByChildId(targetImage.id);
    if (groupInfo) {
      // 如果是子图像，找到父图像在当前列表中的索引
      const parentIndex = imageList.value.findIndex(img => {
        // 检查是否是同一个图像组的显示图像
        return img.id === groupInfo.parentImage.id
               || (img.childImages && img.childImages.some(child => child.id === targetImage.id));
      });

      if (parentIndex >= 0) {
        // 导航到父图像组的位置，但显示选中的子图像
        goToImage(parentIndex);
        return;
      }
    }
  }

  // 普通情况，直接导航到指定索引
  goToImage(index);
};

// 缩略图按钮鼠标按下处理
const handleThumbnailButtonMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return; // 只处理左键

  clickStartTime.value = Date.now();
  clickStartPosition.value = { x: event.clientX, y: event.clientY };

  // 调用原有的拖拽逻辑
  handleThumbnailMouseDown(event);
};

// 缩略图按钮触摸开始处理
const handleThumbnailButtonTouchStart = (event: TouchEvent): void => {
  if (event.touches.length !== 1) return;

  const touch = event.touches[0];
  clickStartTime.value = Date.now();
  clickStartPosition.value = { x: touch.clientX, y: touch.clientY };

  // 调用原有的触摸拖拽逻辑
  handleThumbnailTouchStart(event);
};

// 图像缩放和拖拽处理
const handleImageWheel = (event: WheelEvent): void => {
  if (isZoomDisabled.value) return;

  event.preventDefault();

  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(0.5, Math.min(5, imageScale.value + delta));

  if (newScale !== imageScale.value) {
    imageScale.value = newScale;
    // 缩放后应用拖拽限制
    applyDragLimits();
    updateMinimapVisibility();
  }
};

const handleImageMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return;

  event.preventDefault();
  enableImageTransition.value = false; // 禁用过渡动画
  isDraggingImage.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDraggingImage.value) return;

    const deltaX = e.clientX - dragStart.value.x;
    const deltaY = e.clientY - dragStart.value.y;

    // 直接应用移动
    imageOffset.value.x += deltaX;
    imageOffset.value.y += deltaY;

    // 应用边界限制
    applyDragLimits();

    dragStart.value = { x: e.clientX, y: e.clientY };
    updateMinimapViewport();
  };

  const handleMouseUp = (): void => {
    isDraggingImage.value = false;
    enableImageTransition.value = true; // 重新启用过渡动画
    removeEventListener('mousemove', handleMouseMove);
    removeEventListener('mouseup', handleMouseUp);
  };

  addEventListener('mousemove', handleMouseMove);
  addEventListener('mouseup', handleMouseUp);
};

const handleImageTouchStart = (event: TouchEvent): void => {
  if (event.touches.length === 1) {
    // 单指拖拽
    enableImageTransition.value = false; // 禁用过渡动画
    const touch = event.touches[0];
    isDraggingImage.value = true;
    dragStart.value = { x: touch.clientX, y: touch.clientY };
  } else if (event.touches.length === 2) {
    // 双指缩放
    if (isZoomDisabled.value) return;

    event.preventDefault();
    enableImageTransition.value = false; // 禁用过渡动画
    isZooming.value = true;
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    lastTouchDistance.value = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2)
      + Math.pow(touch2.clientY - touch1.clientY, 2),
    );
  }
};

const handleImageTouchMove = (event: TouchEvent): void => {
  if (event.touches.length === 1 && isDraggingImage.value) {
    // 单指拖拽
    event.preventDefault(); // 防止页面滚动
    const touch = event.touches[0];
    const deltaX = touch.clientX - dragStart.value.x;
    const deltaY = touch.clientY - dragStart.value.y;

    // 直接应用移动
    imageOffset.value.x += deltaX;
    imageOffset.value.y += deltaY;

    // 应用边界限制
    applyDragLimits();

    dragStart.value = { x: touch.clientX, y: touch.clientY };
    updateMinimapViewport();
  } else if (event.touches.length === 2 && isZooming.value) {
    // 双指缩放
    if (isZoomDisabled.value) return;

    event.preventDefault();
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2)
      + Math.pow(touch2.clientY - touch1.clientY, 2),
    );

    const scaleChange = currentDistance / lastTouchDistance.value;
    const newScale = Math.max(0.5, Math.min(5, imageScale.value * scaleChange));

    if (newScale !== imageScale.value) {
      imageScale.value = newScale;
      lastTouchDistance.value = currentDistance;
      // 缩放后应用拖拽限制
      applyDragLimits();
      updateMinimapVisibility();
    }
  }
};

const handleImageTouchEnd = (): void => {
  isDraggingImage.value = false;
  isZooming.value = false;
  enableImageTransition.value = true; // 重新启用过渡动画
};

// 小地图交互处理
const handleMinimapMouseDown = (event: MouseEvent): void => {
  event.preventDefault();
  event.stopPropagation();

  if (!imageElement.value || !imageContainer.value || !minimapImage.value) return;

  const info = getImageDisplayInfo();
  if (!info) return;

  const minimapRect = minimapImage.value.getBoundingClientRect();
  const clickX = event.clientX - minimapRect.left;
  const clickY = event.clientY - minimapRect.top;

  // 计算小地图中实际显示的图像区域
  const minimapAspect = minimapRect.width / minimapRect.height;
  const imageAspect = info.displayWidth / info.displayHeight;

  let minimapImageWidth, minimapImageHeight, minimapImageX, minimapImageY;
  if (imageAspect > minimapAspect) {
    minimapImageWidth = minimapRect.width;
    minimapImageHeight = minimapRect.width / imageAspect;
    minimapImageX = 0;
    minimapImageY = (minimapRect.height - minimapImageHeight) / 2;
  } else {
    minimapImageHeight = minimapRect.height;
    minimapImageWidth = minimapRect.height * imageAspect;
    minimapImageX = (minimapRect.width - minimapImageWidth) / 2;
    minimapImageY = 0;
  }

  // 检查是否点击在图像区域内
  const isClickInImage = clickX >= minimapImageX && clickX <= minimapImageX + minimapImageWidth
    && clickY >= minimapImageY && clickY <= minimapImageY + minimapImageHeight;

  if (!isClickInImage) return; // 点击在图像区域外，忽略

  // 检查是否点击在视口框内
  const viewport = viewportRect.value;
  const isClickInViewport = clickX >= viewport.x && clickX <= viewport.x + viewport.width
    && clickY >= viewport.y && clickY <= viewport.y + viewport.height;

  if (isClickInViewport) {
    // 点击在视口框内，开始拖拽视口
    enableImageTransition.value = false; // 禁用过渡动画
    isDraggingMinimap.value = true;
    minimapDragStart.value = { x: clickX, y: clickY };

    const handleMinimapMouseMove = (e: MouseEvent): void => {
      if (!isDraggingMinimap.value) return;

      const minimapRect = minimapImage?.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
      const currentX = e.clientX - minimapRect.left;
      const currentY = e.clientY - minimapRect.top;

      const deltaX = currentX - minimapDragStart.value.x;
      const deltaY = currentY - minimapDragStart.value.y;

      // 计算小地图中图像区域到原始图像的缩放比例
      const scaleX = info.displayWidth / minimapImageWidth;
      const scaleY = info.displayHeight / minimapImageHeight;

      // 将小地图中的移动转换为原始图像中的移动
      const deltaXInOriginal = deltaX * scaleX;
      const deltaYInOriginal = deltaY * scaleY;

      // 转换为缩放后图像中的移动
      const deltaXInScaled = deltaXInOriginal * imageScale.value;
      const deltaYInScaled = deltaYInOriginal * imageScale.value;

      // 应用移动（注意方向相反）
      imageOffset.value.x -= deltaXInScaled;
      imageOffset.value.y -= deltaYInScaled;

      // 应用边界限制
      applyDragLimits();

      minimapDragStart.value = { x: currentX, y: currentY };
      updateMinimapViewport();
    };

    const handleMinimapMouseUp = (): void => {
      isDraggingMinimap.value = false;
      enableImageTransition.value = true; // 重新启用过渡动画
      removeEventListener('mousemove', handleMinimapMouseMove);
      removeEventListener('mouseup', handleMinimapMouseUp);
    };

    addEventListener('mousemove', handleMinimapMouseMove);
    addEventListener('mouseup', handleMinimapMouseUp);
  } else {
    // 点击在视口框外，直接跳转到点击位置
    // 将点击位置转换为相对于图像区域的坐标
    const clickXInImage = clickX - minimapImageX;
    const clickYInImage = clickY - minimapImageY;

    // 计算小地图中图像区域到原始图像的缩放比例
    const scaleX = info.displayWidth / minimapImageWidth;
    const scaleY = info.displayHeight / minimapImageHeight;

    // 计算点击位置在原始图像中的位置（相对于图像左上角）
    const targetXInOriginal = clickXInImage * scaleX;
    const targetYInOriginal = clickYInImage * scaleY;

    // 计算点击位置相对于原始图像中心的偏移
    const targetOffsetFromCenterX = targetXInOriginal - info.displayWidth / 2;
    const targetOffsetFromCenterY = targetYInOriginal - info.displayHeight / 2;

    // 转换为缩放后图像中相对于中心的偏移
    const targetOffsetScaledX = targetOffsetFromCenterX * imageScale.value;
    const targetOffsetScaledY = targetOffsetFromCenterY * imageScale.value;

    // 计算需要的imageOffset，使点击位置居中
    // imageOffset是相对于图像默认居中位置的偏移
    imageOffset.value = {
      x: -targetOffsetScaledX,
      y: -targetOffsetScaledY,
    };

    // 应用拖拽限制
    applyDragLimits();

    // 设置拖拽状态，允许接着拖拽
    isDraggingMinimap.value = true;
    minimapDragStart.value = { x: clickX, y: clickY };

    const handleMinimapMouseMove = (e: MouseEvent): void => {
      if (!isDraggingMinimap.value) return;

      const minimapRect = minimapImage?.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
      const currentX = e.clientX - minimapRect.left;
      const currentY = e.clientY - minimapRect.top;

      const deltaX = currentX - minimapDragStart.value.x;
      const deltaY = currentY - minimapDragStart.value.y;

      // 计算小地图中图像区域到原始图像的缩放比例
      const scaleX = info.displayWidth / minimapImageWidth;
      const scaleY = info.displayHeight / minimapImageHeight;

      // 将小地图中的移动转换为原始图像中的移动
      const deltaXInOriginal = deltaX * scaleX;
      const deltaYInOriginal = deltaY * scaleY;

      // 转换为缩放后图像中的移动
      const deltaXInScaled = deltaXInOriginal * imageScale.value;
      const deltaYInScaled = deltaYInOriginal * imageScale.value;

      // 应用移动（注意方向相反）
      imageOffset.value.x -= deltaXInScaled;
      imageOffset.value.y -= deltaYInScaled;

      // 应用边界限制
      applyDragLimits();

      minimapDragStart.value = { x: currentX, y: currentY };
      updateMinimapViewport();
    };

    const handleMinimapMouseUp = (): void => {
      isDraggingMinimap.value = false;
      enableImageTransition.value = true; // 重新启用过渡动画
      removeEventListener('mousemove', handleMinimapMouseMove);
      removeEventListener('mouseup', handleMinimapMouseUp);
    };

    addEventListener('mousemove', handleMinimapMouseMove);
    addEventListener('mouseup', handleMinimapMouseUp);

    updateMinimapViewport();
  }
};

const handleMinimapTouchStart = (event: TouchEvent): void => {
  if (event.touches.length !== 1) return;

  event.preventDefault();
  event.stopPropagation();

  if (!imageElement.value || !imageContainer.value || !minimapImage.value) return;

  const info = getImageDisplayInfo();
  if (!info) return;

  const touch = event.touches[0];
  const minimapRect = minimapImage.value.getBoundingClientRect();
  const clickX = touch.clientX - minimapRect.left;
  const clickY = touch.clientY - minimapRect.top;

  // 计算小地图中实际显示的图像区域
  const minimapAspect = minimapRect.width / minimapRect.height;
  const imageAspect = info.displayWidth / info.displayHeight;

  let minimapImageWidth, minimapImageHeight, minimapImageX, minimapImageY;
  if (imageAspect > minimapAspect) {
    minimapImageWidth = minimapRect.width;
    minimapImageHeight = minimapRect.width / imageAspect;
    minimapImageX = 0;
    minimapImageY = (minimapRect.height - minimapImageHeight) / 2;
  } else {
    minimapImageHeight = minimapRect.height;
    minimapImageWidth = minimapRect.height * imageAspect;
    minimapImageX = (minimapRect.width - minimapImageWidth) / 2;
    minimapImageY = 0;
  }

  // 检查是否点击在图像区域内
  const isClickInImage = clickX >= minimapImageX && clickX <= minimapImageX + minimapImageWidth
    && clickY >= minimapImageY && clickY <= minimapImageY + minimapImageHeight;

  if (!isClickInImage) return; // 点击在图像区域外，忽略

  // 检查是否点击在视口框内
  const viewport = viewportRect.value;
  const isClickInViewport = clickX >= viewport.x && clickX <= viewport.x + viewport.width
    && clickY >= viewport.y && clickY <= viewport.y + viewport.height;

  if (isClickInViewport) {
    // 点击在视口框内，开始拖拽视口
    enableImageTransition.value = false; // 禁用过渡动画
    isDraggingMinimap.value = true;
    minimapDragStart.value = { x: clickX, y: clickY };

    const handleMinimapTouchMove = (e: TouchEvent): void => {
      if (!isDraggingMinimap.value || e.touches.length !== 1) return;

      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const minimapRect = minimapImage?.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
      const currentX = touch.clientX - minimapRect.left;
      const currentY = touch.clientY - minimapRect.top;

      const deltaX = currentX - minimapDragStart.value.x;
      const deltaY = currentY - minimapDragStart.value.y;

      // 计算小地图中图像区域到原始图像的缩放比例
      const scaleX = info.displayWidth / minimapImageWidth;
      const scaleY = info.displayHeight / minimapImageHeight;

      // 将小地图中的移动转换为原始图像中的移动
      const deltaXInOriginal = deltaX * scaleX;
      const deltaYInOriginal = deltaY * scaleY;

      // 转换为缩放后图像中的移动
      const deltaXInScaled = deltaXInOriginal * imageScale.value;
      const deltaYInScaled = deltaYInOriginal * imageScale.value;

      // 应用移动（注意方向相反）
      imageOffset.value.x -= deltaXInScaled;
      imageOffset.value.y -= deltaYInScaled;

      // 应用边界限制
      applyDragLimits();

      minimapDragStart.value = { x: currentX, y: currentY };
      updateMinimapViewport();
    };

    const handleMinimapTouchEnd = (): void => {
      isDraggingMinimap.value = false;
      enableImageTransition.value = true; // 重新启用过渡动画
      removeEventListener('touchmove', handleMinimapTouchMove);
      removeEventListener('touchend', handleMinimapTouchEnd);
    };

    addEventListener('touchmove', handleMinimapTouchMove, { passive: false });
    addEventListener('touchend', handleMinimapTouchEnd);
  } else {
    // 点击在视口框外，直接跳转到点击位置
    // 将点击位置转换为相对于图像区域的坐标
    const clickXInImage = clickX - minimapImageX;
    const clickYInImage = clickY - minimapImageY;

    // 计算小地图中图像区域到原始图像的缩放比例
    const scaleX = info.displayWidth / minimapImageWidth;
    const scaleY = info.displayHeight / minimapImageHeight;

    // 计算点击位置在原始图像中的位置（相对于图像左上角）
    const targetXInOriginal = clickXInImage * scaleX;
    const targetYInOriginal = clickYInImage * scaleY;

    // 计算点击位置相对于原始图像中心的偏移
    const targetOffsetFromCenterX = targetXInOriginal - info.displayWidth / 2;
    const targetOffsetFromCenterY = targetYInOriginal - info.displayHeight / 2;

    // 转换为缩放后图像中相对于中心的偏移
    const targetOffsetScaledX = targetOffsetFromCenterX * imageScale.value;
    const targetOffsetScaledY = targetOffsetFromCenterY * imageScale.value;

    // 计算需要的imageOffset，使点击位置居中
    // imageOffset是相对于图像默认居中位置的偏移
    imageOffset.value = {
      x: -targetOffsetScaledX,
      y: -targetOffsetScaledY,
    };

    // 应用拖拽限制
    applyDragLimits();

    // 设置拖拽状态，允许接着拖拽
    isDraggingMinimap.value = true;
    minimapDragStart.value = { x: clickX, y: clickY };

    const handleMinimapTouchMove = (e: TouchEvent): void => {
      if (!isDraggingMinimap.value || e.touches.length !== 1) return;

      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const minimapRect = minimapImage?.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
      const currentX = touch.clientX - minimapRect.left;
      const currentY = touch.clientY - minimapRect.top;

      const deltaX = currentX - minimapDragStart.value.x;
      const deltaY = currentY - minimapDragStart.value.y;

      // 计算小地图中图像区域到原始图像的缩放比例
      const scaleX = info.displayWidth / minimapImageWidth;
      const scaleY = info.displayHeight / minimapImageHeight;

      // 将小地图中的移动转换为原始图像中的移动
      const deltaXInOriginal = deltaX * scaleX;
      const deltaYInOriginal = deltaY * scaleY;

      // 转换为缩放后图像中的移动
      const deltaXInScaled = deltaXInOriginal * imageScale.value;
      const deltaYInScaled = deltaYInOriginal * imageScale.value;

      // 应用移动（注意方向相反）
      imageOffset.value.x -= deltaXInScaled;
      imageOffset.value.y -= deltaYInScaled;

      // 应用边界限制
      applyDragLimits();

      minimapDragStart.value = { x: currentX, y: currentY };
      updateMinimapViewport();
    };

    const handleMinimapTouchEnd = (): void => {
      isDraggingMinimap.value = false;
      enableImageTransition.value = true; // 重新启用过渡动画
      removeEventListener('touchmove', handleMinimapTouchMove);
      removeEventListener('touchend', handleMinimapTouchEnd);
    };

    addEventListener('touchmove', handleMinimapTouchMove, { passive: false });
    addEventListener('touchend', handleMinimapTouchEnd);

    updateMinimapViewport();
  }
};

// 关闭查看器
const isClosing = ref(false);
const close = (): void => {
  // 关闭评论模态框（如果开启的话）
  if (showCommentsModal.value) {
    closeCommentsModal();
  }

  // 设置关闭状态
  isClosing.value = true;
  // 先添加淡出过渡动画，再关闭查看器
  transitionActive.value = false;

  // 从CSS读取过渡动画时长
  const duration = AnimationDurations.getViewerTransition();
  if (duration === 0) {
    // 如果没有动画或动画时长为0，立即关闭
    emit('close');
    // 重置关闭状态，以便下次打开
    isClosing.value = false;
  } else {
    setTimeout(() => {
      emit('close');
      // 重置关闭状态，以便下次打开
      isClosing.value = false;
    }, duration);
  }
};

// 键盘事件
const handleKeyDown = (event: KeyboardEvent): void => {
  switch (event.key) {
    case 'Escape':
      close();
      break;
    case 'ArrowLeft':
      prevImage();
      break;
    case 'ArrowRight':
      nextImage();
      break;
    case '0':
    case 'Home':
      if (!isZoomDisabled.value) {
        resetImageTransform();
      }
      break;
    case '+':
    case '=':
      if (!isZoomDisabled.value) {
        imageScale.value = Math.min(5, imageScale.value + 0.2);
        applyDragLimits();
        updateMinimapVisibility();
      }
      break;
    case '-':
      if (!isZoomDisabled.value) {
        imageScale.value = Math.max(0.5, imageScale.value - 0.2);
        applyDragLimits();
        updateMinimapVisibility();
      }
      break;
  }
};

// 缩放按钮功能
const zoomIn = (): void => {
  if (isZoomDisabled.value) return;
  imageScale.value = Math.min(5, imageScale.value + 0.2);
  applyDragLimits();
  updateMinimapVisibility();
};

const zoomOut = (): void => {
  if (isZoomDisabled.value) return;
  imageScale.value = Math.max(0.5, imageScale.value - 0.2);
  applyDragLimits();
  updateMinimapVisibility();
};

const resetZoom = (): void => {
  if (isZoomDisabled.value) return;
  resetImageTransform();
};

// 预加载相邻图片
const preloadAdjacentImages = (): void => {
  const currentIdx = currentIndex.value;
  const imagesToPreload: string[] = [];

  // 预加载前一张和后一张图片（普通优先级）
  if (currentIdx > 0 && imageList.value[currentIdx - 1].src) {
    imagesToPreload.push(imageList.value[currentIdx - 1].src ?? '');
  }
  if (currentIdx < imageList.value.length - 1 && imageList.value[currentIdx + 1].src) {
    imagesToPreload.push(imageList.value[currentIdx + 1].src ?? '');
  }

  // 异步预加载相邻图片
  imagesToPreload.forEach(src => {
    getImageCache().preloadImage(src, LoadPriority.OTHER_IMAGE).catch(() => {
      // 预加载失败不影响主要功能
    });
  });

  // 预加载前两张和后两张图片（低优先级）
  const lowPriorityImages: string[] = [];
  if (currentIdx > 1 && imageList.value[currentIdx - 2].src) {
    lowPriorityImages.push(imageList.value[currentIdx - 2].src ?? '');
  }
  if (currentIdx < imageList.value.length - 2 && imageList.value[currentIdx + 2].src) {
    lowPriorityImages.push(imageList.value[currentIdx + 2].src ?? '');
  }

  // 低优先级预加载 - 延迟执行以确保当前图片优先
  setTimeout(() => {
    lowPriorityImages.forEach(src => {
      getImageCache().preloadImage(src, LoadPriority.OTHER_IMAGE).catch(() => {
        // 预加载失败不影响主要功能
      });
    });
  }, 300); // 延迟300ms，给当前图片足够的加载时间
};

// 监听props变化，同步子图像ID状态
watch(() => props.childImageId, (newChildImageId) => {
  currentChildImageId.value = newChildImageId;
}, { immediate: true });

// 监听当前显示图像ID变化，自动滚动到对应的图像组项
watch(currentDisplayImageId, () => {
  // 延迟执行，确保DOM已更新
  nextTick(() => {
    scrollToActiveGroupImage();
  });
});

// 监听图像组选择器显示状态，确保显示时能正确定位
watch(showGroupSelector, (isVisible) => {
  if (isVisible) {
    // 延迟执行，确保DOM已渲染
    nextTick(() => {
      setTimeout(() => {
        scrollToActiveGroupImage();
      }, 50);
    });
  }
});

// 监听图片变化
watch(currentImage, (newImage) => {
  if (newImage) {
    // 重置图像变换状态
    resetImageTransform();

    // 重置图像加载状态
    isOriginalImageLoaded.value = false;

    // 只对有src的图像处理缓存
    if (newImage.src) {
      // 获取当前图片的缩略图URL
      const thumbnailSrc = getThumbnailUrl(newImage.src, 'tiny');

      // 设置当前图片，这会触发优先级重新评估
      getImageCache().setCurrentImage(newImage.src, thumbnailSrc ?? undefined);
    }

    // 延迟触发预加载，确保当前图片优先
    nextTick(() => {
      setTimeout(() => {
        updateThumbnailsOffset();
        // 预加载相邻图片
        preloadAdjacentImages();
      }, 150); // 给当前图片150ms的优先加载时间
    });
  }
});

// 获取缩略图URL的辅助函数
const getThumbnailUrl = (originalSrc: string, size: 'tiny' | 'small' | 'medium'): string | null => {
  const thumbnails = (thumbnailMap as Record<string, Record<string, string>>)[originalSrc] ?? undefined;
  return thumbnails?.[size] ?? null;
};

// 监听激活状态
// 组件激活时，先添加可见样式，然后再添加过渡动画样式
nextTick(() => {
  setTimeout(() => {
    transitionActive.value = true;
  }, 50);
});

// 检查图像宽度和高度是否能分别完全显示在当前容器中
const getImageFitStatus = (): { canFitWidth: boolean; canFitHeight: boolean } => {
  const info = getImageDisplayInfo();
  if (!info) return { canFitWidth: false, canFitHeight: false };

  // 分别检查宽度和高度是否能完全显示在容器中
  const canFitWidth = info.scaledWidth <= info.containerWidth;
  const canFitHeight = info.scaledHeight <= info.containerHeight;

  return { canFitWidth, canFitHeight };
};

// 自动居中图像（分别处理宽度和高度）
const autoCenterImage = (): void => {
  const { canFitWidth, canFitHeight } = getImageFitStatus();

  // 只有当宽度或高度能完全显示时，才对相应方向进行居中
  let needsUpdate = false;
  const newOffset = { ...imageOffset.value };

  if (canFitWidth) {
    // 如果图像宽度能完全显示，重置水平偏移量使其水平居中
    newOffset.x = 0;
    needsUpdate = true;
  }

  if (canFitHeight) {
    // 如果图像高度能完全显示，重置垂直偏移量使其垂直居中
    newOffset.y = 0;
    needsUpdate = true;
  }

  if (needsUpdate) {
    imageOffset.value = newOffset;
    // 启用过渡动画使居中更平滑
    enableImageTransition.value = true;
    setTimeout(() => {
      enableImageTransition.value = false;
    }, 150);
  }
};

// resize事件防抖定时器
let resizeDebounceTimer: number | null = null;

// ResizeObserver 用于监听图像容器尺寸变化
let imageContainerResizeObserver: ResizeObserver | null = null;
let containerResizeDebounceTimer: number | null = null;

// 处理图像容器尺寸变化
const handleImageContainerResize = (): void => {
  if (containerResizeDebounceTimer !== null) {
    clearTimeout(containerResizeDebounceTimer);
  }

  containerResizeDebounceTimer = setTimeout(() => {
    // 立即应用拖拽限制修正，确保图像在新的容器尺寸下保持在有效范围内
    applyDragLimits();

    // 更新小地图
    updateMinimapVisibility();

    // 检查图像是否能完全显示，如果可以则自动居中
    autoCenterImage();

    containerResizeDebounceTimer = null;
  }, 16);
};

// 处理屏幕变化（移动端状态切换等）
const handleScreenChange = (info: any): void => {
  const wasMobile = info.wasMobile ?? false;
  const currentIsMobile = info.isMobile;
  // 标记正在进行响应式切换
  isResponsiveTransitioning.value = true;

  // 如果从移动端切换到桌面端
  if (wasMobile && !currentIsMobile) {
    // 关闭移动端覆盖层和图像组选择器
    showMobileInfoOverlay.value = false;
    mobileInfoOverlayAnimating.value = false;
    isMobileGroupSelectorOpen.value = false;

    // 根据用户对固定信息栏的偏好设置桌面端信息面板状态
    showInfoPanel.value = userInfoPanelPreference.value;
  } else if (!wasMobile && currentIsMobile) {
    // 如果从桌面端切换到移动端
    // 移动端不显示桌面端的固定信息面板
    showInfoPanel.value = false;
    // 移动端信息浮窗保持关闭状态（临时弹窗不持久化）
    showMobileInfoOverlay.value = false;
  }

  // 清除之前的防抖定时器
  if (resizeDebounceTimer !== null) {
    clearTimeout(resizeDebounceTimer);
  }

  // 使用防抖处理图像相关的更新，避免频繁重新计算
  resizeDebounceTimer = setTimeout(() => {
    handleResizeDebounced();
    resizeDebounceTimer = null;
  }, 150); // 150ms防抖延迟

  // 动画完成后重置过渡状态
  setTimeout(() => {
    isResponsiveTransitioning.value = false;
  }, 400); // 与动画时长保持一致
};

// 防抖后的resize处理函数
const handleResizeDebounced = (): void => {
  // 窗口大小变化时，强制重新计算位置（忽略用户滚动状态）
  const wasUserScrolling = isUserScrolling.value;
  isUserScrolling.value = false;
  updateThumbnailsOffset();

  // 立即应用拖拽限制修正，确保图像在新的容器尺寸下保持在有效范围内
  applyDragLimits();

  // 更新小地图
  updateMinimapVisibility();

  // 检查图像是否能完全显示，如果可以则自动居中
  nextTick(() => {
    autoCenterImage();
  });

  // 如果用户之前在滚动，延迟恢复状态
  if (wasUserScrolling) {
    setTimeout(() => {
      isUserScrolling.value = true;
    }, 100);
  }
};

// 屏幕变化监听器取消函数
let unsubscribeScreenChange: (() => void) | null = null;

onMounted(() => {
  // 初始化子图像列表宽度
  const savedGroupWidth = loadGroupSelectorWidth();
  if (savedGroupWidth !== null) {
    groupSelectorWidth.value = savedGroupWidth;
  }

  // 根据设备类型和用户偏好设置初始状态
  if (isMobile.value) {
    showInfoPanel.value = false; // 移动端不显示桌面端的固定信息面板
    showMobileInfoOverlay.value = false; // 移动端信息浮窗默认关闭
  } else {
    showInfoPanel.value = userInfoPanelPreference.value; // 桌面端使用用户对固定信息栏的偏好
  }

  // 注册屏幕变化监听器
  let previousMobile = isMobile.value;
  unsubscribeScreenChange = onScreenChange((info) => {
    handleScreenChange({ wasMobile: previousMobile, ...info });
    previousMobile = info.isMobile;
  });

  addEventListener('keydown', handleKeyDown);

  // 设置图像容器的 ResizeObserver
  nextTick(() => {
    if (imageContainer.value && 'ResizeObserver' in window) {
      imageContainerResizeObserver = new ResizeObserver((entries) => {
        // 只有当容器尺寸确实发生变化时才处理
        for (const entry of entries) {
          if (entry.target === imageContainer.value) {
            handleImageContainerResize();
            break;
          }
        }
      });

      imageContainerResizeObserver.observe(imageContainer.value);
    }

    updateThumbnailsOffset();

    // 初始化时滚动到当前选中的图像组项
    setTimeout(() => {
      scrollToActiveGroupImage();
    }, 100); // 延迟一点时间确保DOM完全渲染
  });
});

onBeforeUnmount(() => {
  removeEventListener('keydown', handleKeyDown);

  // 取消屏幕变化监听器
  if (unsubscribeScreenChange) {
    unsubscribeScreenChange();
    unsubscribeScreenChange = null;
  }

  // 清理resize防抖定时器
  if (resizeDebounceTimer !== null) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }

  // 清理容器resize防抖定时器
  if (containerResizeDebounceTimer !== null) {
    clearTimeout(containerResizeDebounceTimer);
    containerResizeDebounceTimer = null;
  }

  // 清理 ResizeObserver
  if (imageContainerResizeObserver) {
    imageContainerResizeObserver.disconnect();
    imageContainerResizeObserver = null;
  }

  // 清理移动端覆盖层状态
  if (showMobileInfoOverlay.value) {
    document.body.style.overflow = '';
  }

  // 清理子图像列表拖拽调整宽度的事件监听器
  if (isDraggingGroupResize.value) {
    removeEventListener('mousemove', handleResizeGroupSelector);
    removeEventListener('mouseup', stopResizeGroupSelector);
    removeEventListener('touchmove', handleResizeGroupSelector);
    removeEventListener('touchend', stopResizeGroupSelector);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// 获取信息按钮标题
const getInfoButtonTitle = (): string => {
  if (isMobile.value) {
    return showMobileInfoOverlay.value ? $t('viewer.hideInfo') : $t('viewer.showInfo');
  } else {
    return showInfoPanel.value ? $t('viewer.hideInfo') : $t('viewer.showInfo');
  }
};

// 获取评论按钮标题
const getCommentsButtonTitle = (): string => {
  return showCommentsModal.value ? $t('viewer.hideComments') : $t('viewer.showComments');
};

// 获取子图像在列表中的显示名称
const getChildImageDisplayName = (image: any): string => {
  // 优先使用 listName，如果没有则使用 name
  if (image.listName) {
    return t(image.listName, currentLanguage.value);
  }
  return t(image.name, currentLanguage.value);
};

// 获取子图像的标签（优先使用子图像自己的标签，没有时才使用父图像的）
const getChildImageTags = (image: any): string[] => {
  // 如果子图像定义了自己的标签，直接使用子图像的标签
  if (image.tags && image.tags.length > 0) {
    return image.tags;
  }

  // 如果子图像没有定义标签，则使用父图像的标签
  const currentGroup = currentImageGroup.value;
  if (currentGroup && currentGroup.parentImage.tags) {
    return currentGroup.parentImage.tags;
  }

  // 都没有则返回空数组
  return [];
};

// 本地化辅助函数
const t = (text: I18nText | undefined, lang?: string): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  const currentLang = lang ?? languageStore.currentLanguage;
  return getI18nText(text, currentLang);
};
</script>

<style scoped>
.fullscreen-viewer {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  visibility: hidden;
  opacity: 0;
  outline: none;
  will-change: opacity, visibility;
  /* 默认禁用选择，但允许文本元素覆盖此设置 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.dark .fullscreen-viewer {
  background-color: rgba(0, 0, 0, 0.9);
}

/* 全局禁止图片拖拽 */
.fullscreen-viewer img {
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  pointer-events: auto;
}

.fullscreen-viewer.active {
  visibility: visible;
  opacity: 0;
}

.fullscreen-viewer.transition-active {
  transition: opacity 400ms ease;
  opacity: 1;
}

/* 关闭动画 - 与打开动画相同，只有不透明度变化 */
.fullscreen-viewer.closing {
  transition: opacity 400ms ease;
  opacity: 0;
}

.viewer-header {
  @apply flex items-center justify-between;
  @apply py-3 px-4;
  @apply bg-white/90 border-b border-gray-200;
}

.viewer-header.no-title {
  @apply justify-end;
}

.viewer-header .viewer-title {
  @apply flex-1;
}

.dark .viewer-header {
  @apply bg-black/50 border-gray-700;
}

.viewer-title {
  @apply text-gray-900 text-lg font-medium truncate;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.dark .viewer-title {
  @apply text-white;
}

.viewer-controls {
  @apply flex items-center gap-2;
}

.control-button {
  @apply p-2 rounded-full;
  @apply text-gray-700 hover:text-gray-900;
  @apply bg-gray-200/80 hover:bg-gray-300/80;
  @apply transition-colors duration-200;
}

.dark .control-button {
  @apply text-gray-200 hover:text-white;
  @apply bg-gray-800/60 hover:bg-gray-700/60;
}

.control-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-button {
  @apply bg-blue-200/80 hover:bg-blue-300/80;
}

.dark .zoom-button {
  @apply bg-blue-800/60 hover:bg-blue-700/60;
}

.close-button {
  @apply bg-red-200/80 hover:bg-red-300/80;
  @apply ml-2;
}

.dark .close-button {
  @apply bg-red-800/60 hover:bg-red-700/60;
}

.icon {
  @apply w-5 h-5;
}

.viewer-content {
  @apply flex-1 overflow-hidden;
  @apply flex;
  @apply relative;
}

.main-image-area {
  @apply flex-1;
  @apply flex items-center justify-center;
  @apply relative;
  transition: margin-left 0.3s ease;
}

.main-image-area.with-left-group-selector {
  margin-left: 220px; /* 为左侧选择器留出空间 */
  transition: margin-left 0.1s ease;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  overflow: hidden;
}

.image-container:active {
  cursor: grabbing;
}

.image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 禁止拖拽 */
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

/* 图像切换过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移除了图像和信息面板的单独关闭动画 */

.viewer-navigation {
  @apply flex items-center;
  @apply h-24 py-2 px-4;
  @apply bg-white/90 border-t border-gray-200;
}

.dark .viewer-navigation {
  @apply bg-black/50 border-gray-700;
}

.nav-button {
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-full;
  @apply text-gray-700 hover:text-gray-900;
  @apply bg-gray-200/60 hover:bg-gray-300/60;
  @apply transition-colors duration-200;
}

.dark .nav-button {
  @apply text-gray-200 hover:text-white;
  @apply bg-gray-800/60 hover:bg-gray-700/60;
}

.nav-button:disabled {
  @apply opacity-30 cursor-not-allowed;
}

.image-thumbnails-container {
  @apply flex-1 mx-3;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 为键盘选择器提供额外空间，避免边框被裁剪 */
  @apply py-1;
  overflow: visible;
}

.image-thumbnails-container.dragging {
  cursor: grabbing;
}

.image-thumbnails {
  @apply flex items-center gap-2;
  @apply transition-transform duration-300 ease-out;
}

/* 拖拽时禁用动画以避免卡顿 */
.image-thumbnails-container.dragging .image-thumbnails {
  transition: none !important;
}

.thumbnail-button {
  @apply w-16 h-16 rounded-md overflow-hidden;
  @apply border-2 border-transparent;
  @apply transition-all duration-200;
  @apply flex-shrink-0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 为键盘选择器边框提供额外空间 */
  margin: 0.125rem;
}

.thumbnail-container {
  @apply w-full h-full relative;
  position: relative; /* 确保子元素绝对定位相对于此容器 */
}

.image-thumbnails-container.dragging .thumbnail-button {
  cursor: grabbing;
}

.thumbnail-button.active {
  @apply border-blue-500;
}

.thumbnail-image {
  @apply w-full h-full object-contain;
  background-color: rgba(255, 255, 255, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 禁止拖拽 */
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

.dark .thumbnail-image {
  background-color: rgba(0, 0, 0, 0.1);
}

.thumbnail-group-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  @apply bg-blue-600/90 rounded;
  @apply p-1;
  @apply flex items-center justify-center;
  z-index: 10; /* 确保指示器显示在图像之上 */
}

.layers-icon {
  @apply w-3 h-3 text-white;
}

/* 独立的拖拽条 - 简洁样式 */
.group-selector-resize-border {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px; /* 扩大感应区域 */
  cursor: ew-resize;
  z-index: 30;
  transition: none;
}

/* 使用伪元素显示实际的条 */
.group-selector-resize-border::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(59, 130, 246, 0.3);
  transition: width 0.15s ease, background 0.15s ease;
}

.dark .group-selector-resize-border::after {
  background: rgba(96, 165, 250, 0.3);
}

.group-selector-resize-border:hover::after,
.group-selector-resize-border.active::after {
  width: 3px;
  background: rgba(59, 130, 246, 0.8);
}

.dark .group-selector-resize-border:hover::after,
.dark .group-selector-resize-border.active::after {
  background: rgba(96, 165, 250, 0.8);
}

/* 小地图样式 */
.minimap-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  z-index: 10;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.minimap-container:hover {
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.minimap-image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.minimap-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.7;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  transition: opacity 0.2s ease;
}

.minimap-image-border {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: none;
  transition: border-color 0.2s ease;
}

.minimap-viewport {
  position: absolute;
  border: 2px solid #3b82f6;
  background-color: rgba(59, 130, 246, 0.2);
  pointer-events: auto;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  cursor: move;
}

.minimap-container:hover .minimap-image {
  opacity: 0.9;
}

.minimap-container:hover .minimap-image-border {
  border-color: rgba(255, 255, 255, 0.4);
}

.minimap-container:hover .minimap-viewport {
  border-color: #60a5fa;
  background-color: rgba(96, 165, 250, 0.3);
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.5);
}

/* 拖拽时保持视口框样式稳定，避免hover效果影响 */
.minimap-container.dragging .minimap-viewport {
  border-color: #3b82f6 !important;
  background-color: rgba(59, 130, 246, 0.2) !important;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4) !important;
}

/* 响应式设计 */
@media (max-width: 767px) {
  .minimap-container {
    width: 150px;
    height: 112px;
    bottom: 15px;
    right: 15px;
  }
}

@media (max-width: 480px) {
  .minimap-container {
    width: 120px;
    height: 90px;
    bottom: 10px;
    right: 10px;
  }
}

.viewer-footer {
  padding: 1rem 1.5rem;
  background-color: rgba(255, 255, 255, 0.95);
  position: relative;
  max-height: 24rem;
  overflow: hidden;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .viewer-footer {
  background-color: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 添加滑动动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 24rem;
}

.slide-fade-enter-active .image-info,
.slide-fade-leave-active .image-info {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-fade-enter-from .image-info,
.slide-fade-leave-to .image-info {
  opacity: 0;
  transform: translateY(10px);
}

.info-toggle-button {
  @apply absolute top-0 left-1/2;
  @apply -translate-x-1/2 -translate-y-1/2;
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-full;
  @apply text-gray-700 hover:text-gray-900;
  @apply bg-gray-200/80 hover:bg-gray-300/80;
  @apply shadow-lg;
  @apply transition-colors duration-200;
  @apply cursor-pointer;
  @apply z-10;
}

.dark .info-toggle-button {
  @apply text-gray-200 hover:text-white;
  @apply bg-gray-800/80 hover:bg-gray-700/80;
}

.image-info {
  @apply text-gray-900;
  will-change: opacity, transform;
  transform: translateY(0);
  opacity: 1;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.dark .image-info {
  @apply text-white;
}

.info-group {
  @apply mb-3;
}

.info-title {
  @apply text-xl font-bold mb-1;
}

.info-subtitle {
  @apply text-sm uppercase tracking-wider text-gray-600 mb-1;
}

.dark .info-subtitle {
  @apply text-gray-400;
}

.info-description {
  @apply text-gray-700 mb-2;
}

.dark .info-description {
  @apply text-gray-300;
}

.artist-info {
  @apply flex flex-wrap items-center gap-2;
}

.artist-names {
  @apply flex flex-wrap items-center gap-2;
}

.artist-tag {
  @apply inline-flex items-center px-2.5 py-1
         bg-blue-100 dark:bg-blue-900/30
         text-blue-800 dark:text-blue-200
         text-sm font-medium rounded-full
         transition-colors duration-200;
}

.tags-list {
  @apply flex flex-wrap gap-1;
}

.tag {
  @apply px-2 py-0.5 rounded-full;
  @apply text-xs text-white;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

/* 移动端信息覆盖层样式 */
.mobile-info-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  touch-action: none;
}

.mobile-info-panel {
  width: 100%;
  max-height: 70vh;
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .mobile-info-panel {
  background-color: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-info-header {
  @apply flex items-center justify-between;
  @apply py-4 px-6;
  @apply border-b border-gray-300;
  flex-shrink: 0;
}

.dark .mobile-info-header {
  @apply border-gray-600;
}

.mobile-info-title {
  @apply text-gray-900 text-lg font-semibold;
}

.dark .mobile-info-title {
  @apply text-white;
}

.mobile-info-close {
  @apply p-2 rounded-full;
  @apply text-gray-700 hover:text-gray-900;
  @apply bg-gray-200/60 hover:bg-gray-300/60;
  @apply transition-colors duration-200;
}

.dark .mobile-info-close {
  @apply text-gray-300 hover:text-white;
  @apply bg-gray-700/60 hover:bg-gray-600/60;
}

.mobile-info-content {
  @apply flex-1 overflow-y-auto;
  @apply p-6;
  @apply text-gray-900;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.dark .mobile-info-content {
  @apply text-white;
}

/* 移动端覆盖层动画 */
.mobile-overlay-fade-enter-active,
.mobile-overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.mobile-overlay-fade-enter-from,
.mobile-overlay-fade-leave-to {
  opacity: 0;
}

.mobile-info-slide-enter-active,
.mobile-info-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-info-slide-enter-from,
.mobile-info-slide-leave-to {
  transform: translateY(100%);
}

/* 图像组选择器 */
.group-selector.left-side {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 200px;
  min-width: 150px;
  max-width: 400px;
  @apply bg-white/95 backdrop-blur-sm shadow-2xl;
  @apply text-gray-900;
  @apply flex flex-col;
  z-index: 10;
  overflow: hidden;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.group-selector.left-side.resizing {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.dark .group-selector.left-side {
  @apply bg-gray-900/95 text-white;
  border-right: 1px solid rgba(75, 85, 99, 0.3);
}

.group-selector-header {
  @apply px-4 py-3 border-b border-gray-300/50;
}

.dark .group-selector-header {
  @apply border-gray-700/50;
}

.group-title {
  @apply text-sm font-medium text-gray-800 m-0;
}

.dark .group-title {
  @apply text-gray-200;
}

.group-images-list {
  @apply flex-1 overflow-y-auto p-2;
  @apply space-y-2;
  /* 为键盘选择器提供额外空间，避免边框被裁剪 */
  @apply py-1;
  overflow: visible;
}

.group-image-button {
  @apply w-full flex items-center p-2 rounded-lg;
  @apply bg-transparent hover:bg-gray-200/60;
  @apply transition-colors duration-200;
  @apply border border-transparent;
  @apply cursor-pointer;
  /* 为键盘选择器边框提供额外空间 */
  margin: 0.125rem 0;
}

.dark .group-image-button {
  @apply hover:bg-gray-800/60;
}

.group-image-button.active {
  @apply bg-blue-600/30 border-blue-500/50;
}

.group-image-thumbnail {
  @apply w-12 h-12 rounded object-contain flex-shrink-0;
  background-color: rgba(0, 0, 0, 0.1);
}

.group-image-info {
  @apply ml-3 flex-1 text-left overflow-hidden;
}

.group-image-name {
  @apply text-sm text-gray-800 block truncate;
}

.dark .group-image-name {
  @apply text-gray-200;
}

.group-image-tags {
  @apply mt-1 flex flex-wrap gap-1;
}

.group-image-tag {
  @apply px-1.5 py-0.5 text-xs text-white rounded-full font-medium;
  font-size: 0.625rem;
  line-height: 1;
}

/* 组选择器进入动画 */
.slide-in-right-enter-active,
.slide-in-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.slide-in-right-enter-from,
.slide-in-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .main-image-area.with-left-group-selector {
    margin-left: 0; /* 移动端不使用固定左侧布局 */
  }

  .group-selector.left-side {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 180px;
    z-index: 10;
    border-right: 1px solid rgba(75, 85, 99, 0.3);
    border-left: none;
  }

  .group-image-thumbnail {
    @apply w-10 h-10;
  }

  .group-image-name {
    @apply text-xs;
  }
}

/* 确保移动端覆盖层在小屏幕上正确显示 */
@media (max-width: 767px) {
  .mobile-info-panel {
    max-height: 80vh;
  }

  .mobile-info-content {
    @apply p-4;
  }

  .mobile-info-header {
    @apply py-3 px-4;
  }
}

/* Image placeholders */
.no-image-display {
  @apply w-full h-full flex items-center justify-center;
  @apply bg-gray-900/50;
  @apply text-gray-400;
}

.no-image-content {
  @apply text-center;
}

.no-image-icon {
  @apply w-16 h-16 mx-auto mb-4;
}

.no-image-text {
  @apply text-lg;
}

.group-image-placeholder,
.thumbnail-placeholder {
  @apply w-full h-full flex items-center justify-center;
  @apply bg-gray-700/50 text-gray-500;
}

.group-image-placeholder .placeholder-icon,
.thumbnail-placeholder .placeholder-icon {
  @apply w-6 h-6;
}

/* 移动端图像组选择器悬浮按钮 */
.mobile-group-selector-toggle {
  position: fixed;
  left: 1rem;
  bottom: calc(96px + 1rem);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  z-index: 45;
  cursor: pointer;
}

.mobile-group-selector-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.9);
}

.mobile-group-selector-toggle.active {
  background: rgb(59, 130, 246);
  border-color: rgb(59, 130, 246);
  color: white;
}

.mobile-group-selector-toggle .toggle-text {
  white-space: nowrap;
}

/* 移动端图像组选择器悬浮窗 */
.mobile-group-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  touch-action: none;
}

.mobile-group-selector-content {
  width: 100%;
  max-height: 75vh;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-group-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.mobile-group-selector-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.mobile-group-selector-header .close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.mobile-group-selector-header .close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.mobile-group-selector-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  /* 为键盘选择器提供额外空间，避免边框被裁剪 */
  @apply py-1;
  overflow: visible;
}

.mobile-group-images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.mobile-group-image-item {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  /* 为键盘选择器边框提供额外空间 */
  margin: 0.125rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.mobile-group-image-item:hover {
  transform: scale(1.02);
  background: rgba(255, 255, 255, 0.1);
}

.mobile-group-image-item.active {
  border-color: rgb(59, 130, 246);
  background: rgba(59, 130, 246, 0.2);
}

.mobile-group-image-container {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.mobile-group-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-group-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
}

.mobile-group-image-placeholder .placeholder-icon {
  width: 2rem;
  height: 2rem;
}

.mobile-group-image-info {
  padding: 0.5rem;
  text-align: center;
}

.mobile-group-image-name {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-group-image-tags {
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
}

.mobile-group-image-tag {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  color: white;
  border-radius: 9999px;
  font-weight: 500;
  line-height: 1;
}

/* 移动端图像组按钮渐变动画 */
.mobile-group-button-fade-enter-active,
.mobile-group-button-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.mobile-group-button-fade-enter-from,
.mobile-group-button-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.mobile-group-button-fade-enter-active .toggle-text {
  transition: opacity 0.3s ease 0.1s;
}

.mobile-group-button-fade-enter-from .toggle-text,
.mobile-group-button-fade-leave-to .toggle-text {
  opacity: 0;
}

/* 桌面端图像组选择器滑动动画 */
.desktop-group-selector-slide-enter-active,
.desktop-group-selector-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.desktop-group-selector-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.desktop-group-selector-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.desktop-group-selector-slide-enter-active .group-selector-header,
.desktop-group-selector-slide-enter-active .group-images-list {
  transition: opacity 0.3s ease 0.1s;
}

.desktop-group-selector-slide-enter-from .group-selector-header,
.desktop-group-selector-slide-enter-from .group-images-list,
.desktop-group-selector-slide-leave-to .group-selector-header,
.desktop-group-selector-slide-leave-to .group-images-list {
  opacity: 0;
}

/* 移动端图像组选择器动画 */
.mobile-group-selector-fade-enter-active,
.mobile-group-selector-fade-leave-active {
  transition: opacity 0.3s ease;
}

.mobile-group-selector-fade-enter-from,
.mobile-group-selector-fade-leave-to {
  opacity: 0;
}

.mobile-group-selector-slide-enter-active,
.mobile-group-selector-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-group-selector-slide-enter-from,
.mobile-group-selector-slide-leave-to {
  transform: translateY(100%);
}

/* 确保按钮在小屏幕上不被遮挡 */
@media (max-width: 480px) {
  .mobile-group-selector-toggle {
    left: 0.75rem;
    bottom: calc(96px + 0.75rem);
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }

  .mobile-group-images-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

/* 评论模态框样式 */
.comments-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70; /* 比 mobile-info-overlay 的 z-index: 60 更高 */
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.comments-modal-panel {
  width: 95vw;
  max-width: 800px;
  height: 80vh;
  max-height: 600px;
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .comments-modal-panel {
  background-color: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.comments-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.dark .comments-modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.comments-modal-title {
  @apply text-lg font-medium text-gray-900;
  margin: 0;
}

.dark .comments-modal-title {
  @apply text-white;
}

.comments-modal-close {
  @apply p-2 rounded-full;
  @apply text-gray-700 hover:text-gray-900;
  @apply bg-gray-200/60 hover:bg-gray-300/60;
  @apply transition-colors duration-200;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .comments-modal-close {
  @apply text-gray-200 hover:text-white;
  @apply bg-gray-800/60 hover:bg-gray-700/60;
}

.comments-modal-close .icon {
  @apply w-5 h-5;
}

.comments-modal-content {
  flex: 1;
  overflow: auto;
  padding: 1rem 1.5rem;
}

/* 评论模态框动画 */
.comments-modal-fade-enter-active,
.comments-modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.comments-modal-fade-enter-from,
.comments-modal-fade-leave-to {
  opacity: 0;
}

.comments-modal-slide-enter-active,
.comments-modal-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.comments-modal-slide-enter-from,
.comments-modal-slide-leave-to {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

</style>
