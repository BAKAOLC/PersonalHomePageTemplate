<template>
  <div class="image-viewer-page">
    <fullscreen-viewer
      :image-id="imageId"
      :child-image-id="childImageId"
      :external-image="externalImage"
      :is-active="true"
      :viewer-u-i-config="effectiveConfig"
      @close="closeViewer"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';

import type { ViewerUIConfig, ExternalImageInfo } from '@/types';

import FullscreenViewer from '@/components/FullscreenViewer.vue';
import { useEventManager } from '@/composables/useEventManager';
import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';

// 获取路由参数和配置
const props = defineProps<{
  imageId?: string;
  childImageId?: string;
  externalImage?: ExternalImageInfo; // 外部图像信息（包含URL和其他信息）
  viewerUIConfig?: ViewerUIConfig; // 可选的配置参数
}>();

const router = useRouter();
const eventManager = useEventManager();
const appStore = useAppStore();

// 计算有效的配置：优先使用传入的配置，然后是路由state中的配置，最后是默认配置
const effectiveConfig = computed((): ViewerUIConfig => {
  // 优先使用props传入的配置
  if (props.viewerUIConfig) {
    return props.viewerUIConfig;
  }

  // 然后尝试从路由state中获取配置（画廊传递的配置）
  const stateConfig = history.state?.viewerUIConfig;
  if (stateConfig) {
    return stateConfig;
  }

  // 如果是外部图像模式，使用全关闭的默认配置
  if (props.externalImage) {
    return {
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
    };
  }

  // 最后使用默认配置
  return siteConfig.features.viewerUI;
});

// 关闭查看器
const closeViewer = (): void => {
  // 使用 store 中配置的返回路由，如果没有配置则默认返回画廊
  const returnRoute = appStore.getViewerReturnRoute();
  router.push(returnRoute);
};

// 监听查看器导航事件
const handleViewerNavigate = (event: CustomEvent): void => {
  if (event.detail && event.detail.imageId && typeof event.detail.imageId === 'string') {
    const { imageId, childImageId } = event.detail;

    if (childImageId) {
      router.push({
        name: 'image-viewer-child',
        params: { imageId, childImageId },
      });
    } else {
      router.push({
        name: 'image-viewer',
        params: { imageId },
      });
    }
  } else {
    console.warn('Invalid image ID, cannot navigate');
  }
};

onMounted(() => {
  // 检查是否是直接导航到查看器
  // 如果前一个路由不存在或不是gallery，说明是直接访问
  const isDirectNavigation = !history.state
                            || !history.state.back
                            || !history.state.back.includes('gallery');

  if (isDirectNavigation) {
    // 直接访问，重置从画廊进入的标记
    appStore.setFromGallery(false);
  }
  // 如果是从画廊来的（isFromGallery已经是true），保持状态不变

  eventManager.addEventListener('viewerNavigate', handleViewerNavigate as EventListener);
});

onBeforeUnmount(() => {
  // 当离开图像查看器时，清除查看器状态
  appStore.clearViewerState();
  // 事件会通过eventManager自动清理
});
</script>

<style scoped>
.image-viewer-page {
  @apply min-h-screen;
}
</style>
