<template>
  <div class="image-viewer-modal">
    <FullscreenViewer
      :image-id="imageId"
      :child-image-id="childImageId"
      :external-image="externalImage"
      :image-list="imageList"
      :viewer-u-i-config="effectiveConfig"
      @close="handleClose"
      @navigate="handleNavigate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';

import FullscreenViewer from '@/components/FullscreenViewer.vue';
import { useEventManager } from '@/composables/useEventManager';
import { siteConfig } from '@/config/site';
import type { ExternalImageInfo, ViewerUIConfig } from '@/types';

// 定义组件props
interface Props {
  imageId?: string;
  childImageId?: string;
  externalImage?: ExternalImageInfo;
  imageList?: any[];
  viewerUIConfig?: ViewerUIConfig;
  onNavigate?: (imageId: string, childImageId?: string) => void;
  onClose?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  imageId: undefined,
  childImageId: undefined,
  externalImage: undefined,
  imageList: () => [],
  viewerUIConfig: undefined,
  onNavigate: undefined,
  onClose: undefined,
});

const eventManager = useEventManager();

// 计算有效的配置：优先使用传入的配置，然后是默认配置
const effectiveConfig = computed((): ViewerUIConfig => {
  // 优先使用props传入的配置
  if (props.viewerUIConfig) {
    return props.viewerUIConfig;
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

// 处理关闭事件
const handleClose = (): void => {
  if (props.onClose) {
    props.onClose();
  }
};

// 处理导航事件
const handleNavigate = (imageId: string, childImageId?: string): void => {
  if (props.onNavigate) {
    props.onNavigate(imageId, childImageId);
  }
};

// 监听查看器导航事件
const handleViewerNavigate = (event: CustomEvent): void => {
  if (event.detail && event.detail.imageId && typeof event.detail.imageId === 'string') {
    const { imageId, childImageId } = event.detail;
    handleNavigate(imageId, childImageId);
  } else {
    console.warn('Invalid image ID, cannot navigate');
  }
};

onMounted(() => {
  eventManager.addEventListener('viewerNavigate', handleViewerNavigate);
});

onBeforeUnmount(() => {
  // 事件会通过eventManager自动清理
});
</script>

<style scoped>
.image-viewer-modal {
  @apply w-full h-full;
}
</style>
