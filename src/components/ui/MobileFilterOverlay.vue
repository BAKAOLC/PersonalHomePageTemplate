<template>
  <DialogRoot :open="visible" @update:open="handleOpenChange">
    <DialogPortal>
      <div class="mobile-filter-layer" :style="{ zIndex }">
        <DialogOverlay class="mobile-filter-overlay" />
        <DialogContent
          :id="contentId"
          class="mobile-filter-content"
          :aria-describedby="describedBy"
        >
          <header class="mobile-filter-header">
            <DialogTitle :id="titleId" class="mobile-filter-title">{{ title }}</DialogTitle>
            <DialogClose
              class="close-button"
              :aria-label="closeLabel"
              type="button"
            >
              <i :class="getIconClass('times')" aria-hidden="true"></i>
            </DialogClose>
          </header>
          <div
            :id="bodyId"
            class="mobile-filter-body"
            :role="bodyRole"
            :aria-label="bodyAriaLabel"
          >
            <slot />
          </div>
        </DialogContent>
      </div>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';

import { getIconClass } from '@/utils/icons';

interface Props {
  visible: boolean;
  title: string;
  closeLabel: string;
  titleId?: string;
  contentId?: string;
  bodyId?: string;
  bodyRole?: string;
  bodyAriaLabel?: string;
  describedBy?: string;
  zIndex?: number;
}

withDefaults(defineProps<Props>(), {
  titleId: 'mobile-filter-title',
  contentId: 'mobile-filter-content',
  bodyId: undefined,
  bodyRole: undefined,
  bodyAriaLabel: undefined,
  describedBy: undefined,
  zIndex: 1000,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleOpenChange = (open: boolean): void => {
  if (!open) {
    emit('close');
  }
};
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.mobile-filter-layer {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;
}

.mobile-filter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  touch-action: none;
  pointer-events: auto;
}

.mobile-filter-content {
  position: relative;
  width: 100%;
  max-height: 80vh;
  background: white;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  box-shadow: 0 -16px 40px rgba(0, 0, 0, 0.22);
  animation: mobileFilterIn 0.2s ease-out;
}

.dark .mobile-filter-content {
  background: rgb(31, 41, 55);
}

.mobile-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgb(229, 231, 235);
}

.dark .mobile-filter-header {
  border-bottom-color: rgb(75, 85, 99);
}

.mobile-filter-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(17, 24, 39);
}

.dark .mobile-filter-title {
  color: rgb(243, 244, 246);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgb(243, 244, 246);
  color: rgb(75, 85, 99);
  transition: background-color 0.2s;
}

.dark .close-button {
  background: rgb(55, 65, 81);
  color: rgb(209, 213, 219);
}

.close-button:hover {
  background: rgb(229, 231, 235);
}

.dark .close-button:hover {
  background: rgb(75, 85, 99);
}

.close-button:focus {
  outline: 2px solid rgb(59, 130, 246);
  outline-offset: 2px;
}

.mobile-filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  @apply flex flex-col gap-3;
}

@keyframes mobileFilterIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-filter-content {
    animation: none;
  }
}
</style>
