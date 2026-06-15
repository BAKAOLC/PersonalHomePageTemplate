<template>
  <div
    v-if="visible"
    class="mobile-filter-overlay"
    :style="{ zIndex }"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    :aria-describedby="describedBy"
    @click="$emit('close')"
  >
    <div :id="contentId" class="mobile-filter-content" @click.stop>
      <header class="mobile-filter-header">
        <h3 :id="titleId">{{ title }}</h3>
        <button
          class="close-button"
          :aria-label="closeLabel"
          type="button"
          @click="$emit('close')"
        >
          <i :class="getIconClass('times')" aria-hidden="true"></i>
        </button>
      </header>
      <div
        :id="bodyId"
        class="mobile-filter-body"
        :role="bodyRole"
        :aria-label="bodyAriaLabel"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.mobile-filter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  touch-action: none;
}

.mobile-filter-content {
  width: 100%;
  max-height: 80vh;
  background: white;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.mobile-filter-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(17, 24, 39);
}

.dark .mobile-filter-header h3 {
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
</style>
