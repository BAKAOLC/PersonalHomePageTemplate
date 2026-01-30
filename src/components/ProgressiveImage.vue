<template>
  <div class="progressive-image">
    <!-- 预加载缩略图 -->
    <img
      v-if="preloadThumbnailSrc && showThumbnail && !thumbnailHidden"
      :src="preloadThumbnailSrc"
      :alt="alt || $t('common.imagePlaceholder')"
      class="thumbnail"
      :class="{
        'fade-out': imageLoaded,
        'loaded': thumbnailLoaded
      }"
      draggable="false"
      role="img"
      @load="onThumbnailLoad"
      @error="onThumbnailError"
    />

    <!-- 实际显示的图像 -->
    <img
      v-if="displayImageSrc && shouldShowMainImage && !useProgressLoading"
      :src="displayImageSrc"
      :alt="alt || $t('common.imagePlaceholder')"
      :class="[imageClass, { 'fade-in': imageLoaded }]"
      draggable="false"
      role="img"
      @load="onImageLoad"
      @error="onImageError"
    />

    <!-- 使用进度加载的图像 -->
    <img
      v-if="progressImageUrl && useProgressLoading"
      :src="progressImageUrl"
      :alt="alt || $t('common.imagePlaceholder')"
      :class="[imageClass, { 'fade-in': imageLoaded }]"
      draggable="false"
      role="img"
      @load="onProgressImageLoad"
      @error="onImageError"
    />

    <!-- 加载指示器和进度条 -->
    <div v-if="isLoading && showLoader" class="loading-container" role="status" :aria-label="$t('common.loadingImage')">
      <div class="loading-spinner">
        <div class="spinner" aria-hidden="true"></div>
      </div>
      <!-- 加载进度条 - 只有在显示加载器且启用进度显示时才显示 -->
      <div v-if="showProgress && loadingProgress < 100 && showLoader" class="progress-container">
        <div
          class="progress-bar"
          role="progressbar"
          :aria-valuenow="Math.round(loadingProgress)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="$t('common.loadingProgress', { progress: Math.round(loadingProgress) })"
        >
          <div class="progress-fill" :style="{ width: `${loadingProgress}%` }"></div>
        </div>
        <div
          class="progress-text"
          :aria-label="$t('common.loadingProgress', { progress: Math.round(loadingProgress) })"
        >
          {{ Math.round(loadingProgress) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import thumbnailMap from '@/assets/thumbnail-map.json';
import { useTimers } from '@/composables/useTimers';
import { getImageCache, LoadPriority } from '@/services/imageCache';
import { AnimationDurations } from '@/utils/animations';

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  imageClass: '',
  showLoader: true,
  showProgress: true,
  priority: 'normal',
  objectFit: 'cover',
  preloadSize: 'tiny',
  displayType: 'original',
  displaySize: 'medium',
  delayMainImage: 200,
});

const emit = defineEmits<{
  load: [];
  error: [];
}>();

const { t: $t } = useI18n();

interface Props {
  src: string;
  alt?: string;
  imageClass?: string;
  showLoader?: boolean;
  showProgress?: boolean;
  priority?: 'low' | 'normal' | 'high'; // 加载优先级
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none';
  // 预加载缩略图的尺寸
  preloadSize?: 'tiny' | 'small' | 'medium';
  // 实际显示的图像类型和尺寸
  displayType?: 'original' | 'thumbnail';
  displaySize?: 'tiny' | 'small' | 'medium';
  // 延迟加载主图的时间（毫秒）
  delayMainImage?: number;
}

const imageLoaded = ref(false);
const isLoading = ref(true);
const showThumbnail = ref(false);
const thumbnailLoaded = ref(false);
const { setTimeout } = useTimers();
const thumbnailHidden = ref(false);
const shouldShowMainImage = ref(false);
const mainImageStartedLoading = ref(false);
const loadingProgress = ref(0);
const progressImageUrl = ref<string | null>(null);
const useProgressLoading = ref(false);
// 统一的请求ID来处理竞态条件
// 当快速切换src时，只有最新的请求应该更新UI状态
const currentRequestId = ref<number>(0);

// 检查请求是否仍然有效的辅助函数
const isCurrentRequest = (requestId: number): boolean => {
  return requestId === currentRequestId.value && requestId !== 0;
};

// 转换优先级字符串到枚举
const getPriority = (): LoadPriority => {
  switch (props.priority) {
    case 'high': return LoadPriority.CURRENT_IMAGE;
    case 'low': return LoadPriority.OTHER_IMAGE;
    default: return LoadPriority.OTHER_THUMBNAIL;
  }
};

// 获取缩略图优先级（总是比主图优先级高一级）
const getThumbnailPriority = (): LoadPriority => {
  switch (props.priority) {
    case 'high': return LoadPriority.CURRENT_THUMBNAIL;
    case 'low': return LoadPriority.OTHER_THUMBNAIL;
    default: return LoadPriority.OTHER_THUMBNAIL;
  }
};

// 使用缓存服务加载图片并跟踪进度
const loadImageWithProgress = (url: string, isThumbnail: boolean = false, requestId: number): Promise<string> => {
  const priority = isThumbnail ? getThumbnailPriority() : getPriority();
  return getImageCache().loadImage(url, priority, (progress: number) => {
    // 只有当前请求才更新进度
    if (isCurrentRequest(requestId)) {
      loadingProgress.value = progress;
    }
  }, isThumbnail);
};

// 从映射中获取预加载缩略图路径
const preloadThumbnailSrc = computed(() => {
  if (!props.src) return null;
  const thumbnails = (thumbnailMap as any)[props.src] as Record<string, string> | undefined;
  return thumbnails?.[props.preloadSize] ?? null;
});

// 获取实际显示的图像路径
const displayImageSrc = computed(() => {
  if (!props.src) return null;

  if (props.displayType === 'original') {
    return props.src;
  } else {
    const thumbnails = (thumbnailMap as any)[props.src] as Record<string, string> | undefined;
    return thumbnails?.[props.displaySize] ?? props.src;
  }
});

const onThumbnailLoad = (): void => {
  // 检查是否为当前请求的缩略图
  if (!isCurrentRequest(currentRequestId.value)) return;

  thumbnailLoaded.value = true;
  showThumbnail.value = true;

  // 缩略图加载完成后，延迟开始加载主图
  if (!mainImageStartedLoading.value) {
    mainImageStartedLoading.value = true;
    // 对于高优先级图片，减少延迟时间
    const delay = props.priority === 'high' ? 50 : props.delayMainImage;
    const requestId = currentRequestId.value; // 捕获当前请求ID
    setTimeout(() => {
      // 确保仍然是当前请求
      if (isCurrentRequest(requestId)) {
        startMainImageLoading();
      }
    }, delay);
  }
};

const onThumbnailError = (): void => {
  // 检查是否为当前请求
  if (!isCurrentRequest(currentRequestId.value)) return;

  console.warn('Thumbnail loading failed', preloadThumbnailSrc.value);
  // 如果缩略图加载失败，立即开始加载主图
  if (!mainImageStartedLoading.value) {
    mainImageStartedLoading.value = true;
    startMainImageLoading();
  }
};

const startMainImageLoading = (): void => {
  if (!displayImageSrc.value) return;

  // 获取当前请求ID，用于防止竞态条件
  const requestId = currentRequestId.value;

  // 决定是否使用进度加载：需要同时满足显示进度、是原始图片、且显示加载器
  useProgressLoading.value = props.showProgress && props.displayType === 'original' && props.showLoader;

  if (useProgressLoading.value) {
    // 使用带进度的加载
    const isThumbnailLoading = props.displayType !== 'original';
    loadImageWithProgress(displayImageSrc.value, isThumbnailLoading, requestId)
      .then((objectUrl) => {
        // 检查请求是否仍然有效（防止竞态条件）
        if (isCurrentRequest(requestId)) {
          progressImageUrl.value = objectUrl;
        }
      })
      .catch((error) => {
        // 检查请求是否仍然有效（防止竞态条件）
        if (isCurrentRequest(requestId)) {
          console.warn('Progress loading failed, fallback to normal loading', error);
          useProgressLoading.value = false;
          shouldShowMainImage.value = true;
        }
      });
  } else {
    // 使用普通加载
    shouldShowMainImage.value = true;
  }
};

const onImageLoad = (): void => {
  if (!isCurrentRequest(currentRequestId.value)) return;

  imageLoaded.value = true;
  isLoading.value = false;

  // 主图加载完成后，等待fade-out动画完成再隐藏缩略图
  // 这样可以避免透明图片的光晕效果
  const transitions = AnimationDurations.getProgressiveImageTransitions();
  const fadeOutDuration = transitions.thumbnailFade;
  const waitTime = fadeOutDuration + 50;
  const requestId = currentRequestId.value; // 捕获当前请求ID
  setTimeout(() => {
    // 确保仍然是当前请求
    if (isCurrentRequest(requestId)) {
      thumbnailHidden.value = true;
    }
  }, waitTime); // 如果没有动画则等待50ms，有动画则等待动画时长+50ms

  emit('load');
};

const onProgressImageLoad = (): void => {
  if (!isCurrentRequest(currentRequestId.value)) return;

  imageLoaded.value = true;
  isLoading.value = false;

  // 主图加载完成后，等待fade-out动画完成再隐藏缩略图
  const transitions = AnimationDurations.getProgressiveImageTransitions();
  const fadeOutDuration = transitions.thumbnailFade;
  const waitTime = fadeOutDuration + 50;
  const requestId = currentRequestId.value; // 捕获当前请求ID
  setTimeout(() => {
    // 确保仍然是当前请求
    if (isCurrentRequest(requestId)) {
      thumbnailHidden.value = true;
    }
  }, waitTime); // 如果没有动画则等待50ms，有动画则等待动画时长+50ms

  emit('load');
};

const onImageError = (): void => {
  isLoading.value = false;
  emit('error');
};

// 监听src变化，重置状态
watch(() => props.src, (newSrc) => {
  if (newSrc) {
    // 递增请求ID来标识新的加载请求，防止竞态条件
    currentRequestId.value += 1;

    // 不取消之前图片的加载，让它们在后台继续加载到缓存中
    // 这样用户切换回来时可以立即显示

    // 清理之前的对象URL（如果是通过progressImageUrl创建的）
    if (progressImageUrl.value) {
      // 注意：不要撤销缓存中的URL，因为可能还在被其他组件使用
      progressImageUrl.value = null;
    }

    // 重置所有状态
    imageLoaded.value = false;
    isLoading.value = true;
    showThumbnail.value = false;
    thumbnailLoaded.value = false;
    thumbnailHidden.value = false;
    shouldShowMainImage.value = false;
    mainImageStartedLoading.value = false;
    loadingProgress.value = 0;
    useProgressLoading.value = false;

    // 检查缓存中是否已有这个图片
    const cachedImage = getImageCache().getCachedImage(newSrc);
    if (cachedImage && cachedImage.loaded && !cachedImage.error) {
      // 如果图片已经缓存且加载完成，直接使用
      const requestId = currentRequestId.value; // 捕获当前请求ID

      if (props.showProgress && props.displayType === 'original' && props.showLoader) {
        useProgressLoading.value = true;
        progressImageUrl.value = cachedImage.objectUrl;
        loadingProgress.value = 100;
        // 稍微延迟一下让用户看到已完成的状态
        setTimeout(() => {
          // 确保仍然是当前请求
          if (isCurrentRequest(requestId)) {
            imageLoaded.value = true;
            isLoading.value = false;
          }
        }, 50);
      } else {
        shouldShowMainImage.value = true;
        setTimeout(() => {
          // 确保仍然是当前请求
          if (isCurrentRequest(requestId)) {
            imageLoaded.value = true;
            isLoading.value = false;
          }
        }, 50);
      }
      return;
    }

    // 如果有预加载缩略图，立即开始加载
    if (preloadThumbnailSrc.value) {
      // 立即显示缩略图元素，让浏览器开始加载
      showThumbnail.value = true;
    } else {
      // 如果没有缩略图，直接加载主图
      mainImageStartedLoading.value = true;
      // 对于高优先级图片，立即开始加载
      const delay = props.priority === 'high' ? 0 : 100;
      const requestId = currentRequestId.value; // 捕获当前请求ID
      setTimeout(() => {
        // 确保仍然是当前请求
        if (isCurrentRequest(requestId)) {
          startMainImageLoading();
        }
      }, delay);
    }
  }
}, { immediate: true });

onMounted(() => {
  // 组件挂载时的初始化逻辑已在 watch 中处理
});

// 组件卸载时清理资源
onUnmounted(() => {
  // 不取消正在进行的请求，让图片继续在后台加载到缓存中
  // 这样其他组件或用户回来时可以立即使用
  progressImageUrl.value = null;
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.progressive-image {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: transparent;
}

@media (prefers-color-scheme: dark) {
  .progressive-image {
    background-color: transparent;
  }
}

.thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: v-bind(objectFit);
  opacity: 1;
  transition: opacity 0.3s ease-out;
  z-index: 1;
  /* 添加轻微的模糊效果以表明这是预览图 */
  filter: blur(1px);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 禁止拖拽 */
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  pointer-events: auto;
}

.thumbnail.fade-out {
  opacity: 0;
  transition: opacity 0.4s ease-out;
}

.thumbnail.loaded {
  filter: blur(0.2px);
}

.progressive-image img:not(.thumbnail) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: v-bind(objectFit);
  opacity: 0;
  transition: opacity 0.4s ease-in;
  z-index: 2;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 禁止拖拽 */
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  pointer-events: auto;
}

.progressive-image img.fade-in {
  opacity: 1;
}

.loading-spinner {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  padding: 6px;
  backdrop-filter: blur(4px);
}

.loading-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 120px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  backdrop-filter: blur(4px);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 2px;
  transition: width 0.2s ease-out;
}

.progress-text {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

@media (prefers-color-scheme: dark) {
  .loading-spinner {
    background-color: rgba(0, 0, 0, 0.8);
  }

  .progress-bar {
    background-color: rgba(0, 0, 0, 0.3);
  }

  .progress-text {
    color: #d1d5db;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 深色模式下的loading spinner */
@media (prefers-color-scheme: dark) {
  .spinner {
    border: 2px solid rgba(96, 165, 250, 0.3);
    border-top: 2px solid #60a5fa;
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  .spinner {
    width: 20px;
    height: 20px;
  }

  .loading-spinner {
    padding: 6px;
  }

  .progress-container {
    min-width: 100px;
  }

  .progress-text {
    font-size: 11px;
  }
}
</style>
