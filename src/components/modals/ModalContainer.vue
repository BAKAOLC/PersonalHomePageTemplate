<template>
  <div class="modal-container">
    <div
      v-for="modal in visibleModals"
      :key="modal.id"
      class="modal-wrapper" :class="[
        modal.options?.className,
        {
          'visible': modal.visible,
          'fullscreen': modal.options?.fullscreen,
          'centered': modal.options?.centered !== false
        }
      ]"
      :data-modal-id="modal.id"
    >
      <!-- 遮罩层 -->
      <div
        class="modal-mask"
        @click="handleMaskClick(modal)"
      ></div>

      <!-- 内容区域 -->
      <div
        class="modal-content"
        :class="{ 'custom-size': modal.options?.width || modal.options?.height }"
        :style="getContentStyle(modal)"
      >
        <!-- 渲染组件 -->
        <component
          :is="modal.component"
          v-bind="modal.props"
          @close="() => closeModal(modal.id)"
          @modal-close="() => closeModal(modal.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue';

import { useEventManager } from '@/composables/useEventManager';
import { useModalStore, type ModalInstance } from '@/stores/modal';

const modalStore = useModalStore();
const { addEventListener, removeEventListener } = useEventManager();
const visibleModals = computed(() => modalStore.visibleModals);

// 处理遮罩点击
const handleMaskClick = (modal: ModalInstance): void => {
  if (modal.options?.maskClosable !== false) {
    modalStore.close(modal.id);
  }
};

// 关闭弹窗
const closeModal = (id: string): void => {
  modalStore.close(id);
};

// 获取内容样式
const getContentStyle = (modal: ModalInstance): Record<string, string> => {
  const style: Record<string, string> = {};

  if (modal.options?.width) {
    style['--modal-width'] = typeof modal.options.width === 'number'
      ? `${modal.options.width}px`
      : modal.options.width;
  }

  if (modal.options?.height) {
    style['--modal-height'] = typeof modal.options.height === 'number'
      ? `${modal.options.height}px`
      : modal.options.height;
  }

  return style;
};

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    const { topModal } = modalStore;
    if (topModal && topModal.options?.escClosable !== false) {
      modalStore.close(topModal.id);
    }
  }
};

onMounted(() => {
  addEventListener('keydown', handleKeydown, undefined, document);
});

onBeforeUnmount(() => {
  removeEventListener('keydown', handleKeydown, undefined, document);
});
</script>

<style scoped>
.modal-container {
  @apply fixed inset-0;
  @apply pointer-events-none;
  @apply z-[2000];
}

.modal-wrapper {
  @apply absolute inset-0 flex items-center justify-center;
  @apply opacity-0 pointer-events-none;
  @apply transition-opacity duration-300 ease-in-out;
  @apply p-2;
}

.modal-wrapper.visible {
  @apply opacity-100 pointer-events-auto;
}

.modal-wrapper.fullscreen {
  @apply p-0;
}

.modal-mask {
  @apply absolute inset-0;
  @apply bg-black bg-opacity-50;
  @apply backdrop-blur-sm;
  @apply transition-all duration-300;
}

.modal-content {
  @apply relative;
  @apply overflow-hidden;
  @apply flex flex-col;
  @apply transform scale-95 translate-y-5;
  @apply transition-transform duration-300 ease-in-out;
}

.modal-wrapper.visible .modal-content {
  @apply transform scale-100 translate-y-0;
}

.modal-wrapper.fullscreen .modal-content {
  @apply w-screen h-screen max-w-none max-h-none;
  @apply rounded-none;
  @apply transform-none;
}

.modal-content.custom-size {
  width: var(--modal-width, auto);
  height: var(--modal-height, auto);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .modal-wrapper {
    @apply p-2;
  }

  .modal-content {
    @apply w-full rounded-lg;
  }

  .modal-wrapper:not(.fullscreen) .modal-content {
    @apply max-h-[calc(100vh-1rem)];
  }
}
</style>
