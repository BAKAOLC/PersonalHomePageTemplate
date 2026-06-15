<template>
  <div class="filter-section">
    <button
      class="filter-section-button"
      type="button"
      :aria-expanded="expanded"
      :aria-controls="optionsId"
      :aria-label="buttonAriaLabel"
      @click="expanded = !expanded"
    >
      <h3 class="filter-section-title" :class="{ 'danger': tone === 'danger' }">
        <i v-if="icon" :class="getIconClass(icon)" class="title-icon" aria-hidden="true"></i>
        {{ title }}
      </h3>
      <i
        class="fa expand-icon"
        :class="getIconClass(expanded ? 'chevron-up' : 'chevron-down')"
        aria-hidden="true"
      ></i>
    </button>
    <Transition name="filter-list">
      <div
        v-if="expanded"
        :id="optionsId"
        class="filter-options"
        :role="optionsRole"
        :aria-label="optionsAriaLabel"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { getIconClass } from '@/utils/icons';

interface Props {
  title: string;
  icon?: string;
  tone?: 'default' | 'danger';
  buttonAriaLabel?: string;
  optionsId?: string;
  optionsRole?: string;
  optionsAriaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  tone: 'default',
  buttonAriaLabel: undefined,
  optionsId: undefined,
  optionsRole: undefined,
  optionsAriaLabel: undefined,
});

const expanded = defineModel<boolean>('expanded', { required: true });
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.filter-section {
  margin-bottom: 0;
}

.filter-section-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  padding: 0.75rem;
  margin: 0;
  border-radius: 0.5rem;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-section-button:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .filter-section-button {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .filter-section-button:hover {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #64748b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.filter-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-section-title.danger {
  color: #dc2626;
}

.dark .filter-section-title {
  color: #f1f5f9;
}

.dark .filter-section-title.danger {
  color: #f87171;
}

.title-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 1rem;
}

.expand-icon {
  font-size: 0.75rem;
  color: #64748b;
  transition: all 200ms ease-out;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  background: rgba(100, 116, 139, 0.1);
  border: 1px solid rgba(100, 116, 139, 0.2);
}

.dark .expand-icon {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.2);
}

.filter-section-button:hover .expand-icon {
  color: #475569;
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.3);
  transform: translateY(-1px);
}

.dark .filter-section-button:hover .expand-icon {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .filter-options {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
  }
}

.filter-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.filter-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.filter-list-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  max-height: 0;
}

.filter-list-enter-to,
.filter-list-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
