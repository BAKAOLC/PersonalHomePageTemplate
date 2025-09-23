<template>
  <div class="tag-selector">
    <!-- 普通标签区域 -->
    <button
      class="section-title-button"
      @click="toggleNormalTagsExpansion"
    >
      <h3 class="selector-title">{{ $t('gallery.tags') }}</h3>
      <i
        class="fa expand-icon"
        :class="getIconClass(isNormalTagsExpanded ? 'chevron-up' : 'chevron-down')"
      ></i>
    </button>
    <Transition name="tag-list">
      <div v-if="isNormalTagsExpanded" class="tags-list">
      <button class="tag-button" :class="{ 'active': selectedTag === 'all' }" @click="selectTag('all')">
        <div class="tag-left">
          <i :class="getIconClass('th')" class="tag-icon"></i>
          <span class="tag-name">{{ $t('common.all') }}</span>
        </div>
        <span class="tag-count">{{ tagCounts.all }}</span>
      </button>

      <button v-for="tag in sortedNormalTags" :key="tag.id" class="tag-button"
        :class="{ 'active': selectedTag === tag.id }" @click="selectTag(tag.id)" :style="{
          '--tag-color': tag.color || '#8b5cf6',
          '--tag-hover-color': tag.color ? `${tag.color}20` : '#8b5cf620'
        }">
        <div class="tag-left">
          <i v-if="tag.icon" :class="getIconClass(tag.icon)" class="tag-icon"></i>
          <span class="tag-name">{{ getI18nText(tag.name, currentLanguage) || tag.id }}</span>
        </div>
        <span class="tag-count">{{ tagCounts[tag.id] || 0 }}</span>
      </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';
import { getIconClass } from '@/utils/icons';
import { getI18nText } from '@/utils/language';

const { t: $t } = useI18n();
const appStore = useAppStore();

// 按名称排序的普通标签列表（排除特殊标签）
const sortedNormalTags = computed(() => {
  let tags = [...siteConfig.tags].filter(tag => !tag.isRestricted);

  // 过滤掉数量为0的标签
  tags = tags.filter(tag => {
    const tagCount = appStore.tagCounts[tag.id];
    return tagCount > 0;
  });

  // 按当前语言的名称排序
  tags.sort((a, b) => {
    const aName = getI18nText(a.name, appStore.currentLanguage) || a.id;
    const bName = getI18nText(b.name, appStore.currentLanguage) || b.id;
    return aName.localeCompare(bName);
  });

  return tags;
});

// 标签列表的折叠状态
const isNormalTagsExpanded = ref(true); // 默认展开

// 切换普通标签列表的展开状态
const toggleNormalTagsExpansion = (): void => {
  isNormalTagsExpanded.value = !isNormalTagsExpanded.value;
};

const selectedTag = computed({
  get: () => appStore.selectedTag,
  set: (value) => appStore.selectedTag = value,
});

const currentLanguage = computed(() => appStore.currentLanguage);
const tagCounts = computed(() => appStore.tagCounts);

const selectTag = (id: string): void => {
  selectedTag.value = id;
};
</script>

<style scoped>
.tag-selector {
  margin-bottom: 0;
}

.section-title-button {
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

.section-title-button:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .section-title-button {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .section-title-button:hover {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #64748b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.selector-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark .selector-title {
  color: #f1f5f9;
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

.section-title-button:hover .expand-icon {
  color: #475569;
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.3);
  transform: translateY(-1px);
}

.dark .section-title-button:hover .expand-icon {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
  }
}

.tag-button {
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
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .tag-button {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 1rem;
  }
}

.dark .tag-button {
  background-color: #1f2937;
  color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.tag-button:hover {
  background-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .tag-button:hover {
  background-color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.tag-button.active {
  background-color: var(--tag-color, #8b5cf6);
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.tag-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  line-height: 1;
  font-size: 1rem;
}

.tag-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.tag-name {
  margin-right: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-count {
  font-size: 0.75rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  background-color: #e5e7eb;
  color: #4b5563;
}

.dark .tag-count {
  background-color: #4b5563;
  color: #e5e7eb;
}

.tag-button.active .tag-count {
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
}

/* 标签列表折叠动画 */
.tag-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.tag-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.tag-list-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  max-height: 0;
}

.tag-list-enter-to,
.tag-list-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
