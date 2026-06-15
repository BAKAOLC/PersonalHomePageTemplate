<template>
  <button
    class="filter-option-button"
    :class="{
      'active': active,
      'restricted': variant === 'restricted',
    }"
    :style="optionStyle"
    type="button"
    @click="$emit('click')"
  >
    <span v-if="variant === 'restricted'" class="restricted-indicator" aria-hidden="true">
      <i :class="getIconClass('check')" class="indicator-icon"></i>
    </span>
    <span class="filter-option-left">
      <i v-if="icon" :class="getIconClass(icon)" class="filter-option-icon" aria-hidden="true"></i>
      <span class="filter-option-label">{{ label }}</span>
    </span>
    <span
      v-if="count !== undefined"
      class="filter-option-count"
      :class="{ 'invisible': !countVisible }"
      aria-hidden="true"
    >
      {{ count }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { FontAwesomeIcon } from '@/types';
import { getIconClass } from '@/utils/icons';

interface Props {
  label: string;
  active?: boolean;
  count?: number | string;
  countVisible?: boolean;
  icon?: string | FontAwesomeIcon;
  color?: string;
  hoverColor?: string;
  variant?: 'default' | 'restricted';
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  count: undefined,
  countVisible: true,
  icon: undefined,
  color: '#8b5cf6',
  hoverColor: undefined,
  variant: 'default',
});

defineEmits<{
  (e: 'click'): void;
}>();

const optionStyle = computed(() => ({
  '--filter-color': props.color,
  '--filter-hover-color': props.hoverColor ?? `${props.color}20`,
}));
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.filter-option-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  transition: all 200ms;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .filter-option-button {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 1rem;
  }
}

.dark .filter-option-button {
  background-color: #1f2937;
  color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.filter-option-button:hover {
  background-color: var(--filter-hover-color, #e5e7eb);
  border-color: var(--filter-color, #8b5cf6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .filter-option-button:hover {
  background-color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.filter-option-button.active {
  background-color: var(--filter-color, #8b5cf6);
  border-color: var(--filter-color, #8b5cf6);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.filter-option-button.restricted {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #7f1d1d;
  gap: 0.75rem;
}

.dark .filter-option-button.restricted {
  background-color: #1f1f1f;
  border-color: #374151;
  color: #dc2626;
}

.filter-option-button.restricted:hover {
  background-color: #fee2e2;
  border-color: #fca5a5;
}

.dark .filter-option-button.restricted:hover {
  background-color: #2d1b1b;
  border-color: #4b5563;
}

.filter-option-button.restricted.active {
  background-color: rgba(220, 38, 38, 0.1);
  border-color: var(--filter-color, #dc2626);
  color: var(--filter-color, #dc2626);
}

.dark .filter-option-button.restricted.active {
  background-color: rgba(220, 38, 38, 0.2);
}

.restricted-indicator {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  border: 2px solid #fca5a5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms;
  flex-shrink: 0;
}

.dark .restricted-indicator {
  border-color: #7f1d1d;
}

.filter-option-button.restricted.active .restricted-indicator {
  background-color: var(--filter-color, #dc2626);
  border-color: var(--filter-color, #dc2626);
}

.indicator-icon {
  font-size: 0.75rem;
  opacity: 0;
  transition: opacity 200ms;
  color: white;
}

.filter-option-button.restricted.active .indicator-icon {
  opacity: 1;
}

.filter-option-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.filter-option-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 1rem;
  flex-shrink: 0;
}

.filter-option-label {
  margin-right: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-option-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.25rem;
  padding: 0 0.375rem;
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: #e5e7eb;
  color: #4b5563;
  font-size: 0.75rem;
  font-weight: 600;
}

.dark .filter-option-count {
  background-color: #4b5563;
  color: #e5e7eb;
}

.filter-option-button.active .filter-option-count {
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.filter-option-count.invisible {
  opacity: 0;
  visibility: hidden;
}
</style>
