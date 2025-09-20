<template>
  <div class="image-viewer-page">
    <fullscreen-viewer :image-id="imageId" :child-image-id="childImageId" :is-active="true" @close="closeViewer" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import FullscreenViewer from '@/components/FullscreenViewer.vue';
import { useEventManager } from '@/composables/useEventManager';
import { useAppStore } from '@/stores/app';

// 获取路由参数
defineProps<{
  imageId: string;
  childImageId?: string;
}>();

const { t } = useI18n();
const router = useRouter();
const eventManager = useEventManager();
const appStore = useAppStore();

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
    console.warn(t('debug.invalidImageIdNavigate'));
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
