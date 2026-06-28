<template>
  <SelectRoot
    :model-value="modelValue"
    @update:model-value="handleValueChange"
  >
    <SelectTrigger class="accessible-select-trigger" :aria-label="ariaLabel">
      <span v-if="icon" class="accessible-select-leading">
        <i :class="getIconClass(icon)" aria-hidden="true"></i>
      </span>
      <SelectValue :placeholder="placeholder" class="accessible-select-value" />
      <SelectIcon class="accessible-select-icon">
        <i :class="getIconClass('chevron-down')" aria-hidden="true"></i>
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="accessible-select-content"
        position="popper"
        :side-offset="6"
      >
        <SelectViewport class="accessible-select-viewport">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            class="accessible-select-item"
            :value="option.value"
            :disabled="option.disabled"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator class="accessible-select-indicator">
              <i :class="getIconClass('check')" aria-hidden="true"></i>
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui';

import { getIconClass } from '@/utils/icons';

export interface AccessibleSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string;
  options: AccessibleSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: '',
  ariaLabel: undefined,
  icon: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const handleValueChange = (value: unknown): void => {
  if (typeof value === 'string') {
    emit('update:modelValue', value);
  }
};
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.accessible-select-trigger {
  @apply inline-flex items-center justify-center gap-2;
  @apply h-9 min-w-24 px-3;
  @apply rounded-md border border-gray-300 dark:border-gray-600;
  @apply bg-white dark:bg-gray-700;
  @apply text-sm font-medium text-gray-600 dark:text-gray-300;
  @apply transition-colors duration-200;
  @apply whitespace-nowrap;
}

.accessible-select-trigger:hover {
  @apply bg-gray-100 dark:bg-gray-600;
  @apply text-gray-800 dark:text-gray-100;
}

.accessible-select-trigger:focus-visible {
  @apply outline-none ring-2 ring-blue-500/60 ring-offset-2 ring-offset-white dark:ring-offset-gray-900;
}

.accessible-select-leading,
.accessible-select-icon {
  @apply flex h-4 w-4 shrink-0 items-center justify-center;
}

.accessible-select-value {
  @apply min-w-0 truncate;
}

.accessible-select-content {
  @apply z-[3200] min-w-[var(--reka-select-trigger-width)];
  @apply overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700;
  @apply bg-white dark:bg-gray-800;
  @apply shadow-xl;
}

.accessible-select-viewport {
  @apply p-1;
}

.accessible-select-item {
  @apply relative flex min-h-9 cursor-pointer select-none items-center rounded-md;
  @apply py-2 pl-3 pr-8;
  @apply text-sm text-gray-700 dark:text-gray-200;
  @apply outline-none transition-colors duration-150;
}

.accessible-select-item[data-highlighted] {
  @apply bg-gray-100 dark:bg-gray-700;
}

.accessible-select-item[data-state="checked"] {
  @apply bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300;
}

.accessible-select-item[data-disabled] {
  @apply pointer-events-none opacity-50;
}

.accessible-select-indicator {
  @apply absolute right-2 inline-flex h-4 w-4 items-center justify-center;
}

@media (max-width: 767px) {
  .accessible-select-trigger {
    @apply h-8 min-w-11 px-2;
  }
}
</style>
