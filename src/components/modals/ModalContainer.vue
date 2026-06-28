<template>
  <div class="modal-container">
    <DialogRoot
      v-for="modal in visibleModals"
      :key="modal.id"
      :open="modal.visible"
      modal
      @update:open="(open) => handleOpenChange(modal, open)"
    >
      <DialogPortal>
        <div
          class="modal-wrapper"
          :class="[
            modal.options?.className,
            {
              'visible': modal.visible,
              'fullscreen': modal.options?.fullscreen,
              'centered': modal.options?.centered !== false
            }
          ]"
          :style="{ zIndex: modal.zIndex }"
          :data-modal-id="modal.id"
        >
          <DialogOverlay class="modal-mask" />

          <DialogContent
            class="modal-content"
            :class="{ 'custom-size': modal.options?.width ?? modal.options?.height }"
            :style="getContentStyle(modal)"
            @escape-key-down="(event) => handleEscapeKeyDown(event, modal)"
            @pointer-down-outside="(event) => handlePointerDownOutside(event, modal)"
            @interact-outside="(event) => handleInteractOutside(event, modal)"
          >
            <VisuallyHidden>
              <DialogTitle>{{ getModalTitle(modal) }}</DialogTitle>
              <DialogDescription>{{ getModalDescription(modal) }}</DialogDescription>
            </VisuallyHidden>

            <component
              :is="modal.component"
              v-bind="modal.props"
              :on-close="() => closeModal(modal.id)"
              :on-navigate="modal.onNavigate"
              @close="() => closeModal(modal.id)"
              @modal-close="() => closeModal(modal.id)"
            />
          </DialogContent>
        </div>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>

<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui';
import { computed } from 'vue';

import { useModalStore, type ModalInstance } from '@/stores/modal';

const modalStore = useModalStore();
const visibleModals = computed(() => modalStore.visibleModals);

type DismissEvent = Event & { preventDefault: () => void };

const handleOpenChange = (modal: ModalInstance, open: boolean): void => {
  if (open) return;

  if (modal.options?.closable !== false) {
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

const handleEscapeKeyDown = (event: DismissEvent, modal: ModalInstance): void => {
  const isTopModal = modalStore.topModal?.id === modal.id;

  if (!isTopModal || modal.options?.escClosable === false || modal.options?.closable === false) {
    event.preventDefault();
  }
};

const handlePointerDownOutside = (event: DismissEvent, modal: ModalInstance): void => {
  const isTopModal = modalStore.topModal?.id === modal.id;

  if (!isTopModal || modal.options?.maskClosable === false || modal.options?.closable === false) {
    event.preventDefault();
  }
};

const handleInteractOutside = (event: DismissEvent, modal: ModalInstance): void => {
  const isTopModal = modalStore.topModal?.id === modal.id;

  if (!isTopModal || modal.options?.maskClosable === false || modal.options?.closable === false) {
    event.preventDefault();
  }
};

const getModalTitle = (modal: ModalInstance): string => `Modal ${modal.id}`;

const getModalDescription = (modal: ModalInstance): string => `Dialog content for ${modal.id}`;
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.modal-container {
  @apply contents;
  @apply pointer-events-none;
}

.modal-wrapper {
  @apply fixed inset-0 flex items-center justify-center;
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
  @apply bg-black/50;
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
