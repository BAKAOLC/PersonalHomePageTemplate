<template>
  <Transition name="restricted-section">
    <div v-if="hasVisibleRestrictedTags" class="restricted-tag-selector">
      <button
        class="section-title-button"
        @click="toggleRestrictedTagsExpansion"
      >
        <h3 class="selector-title restricted-title">
          <i :class="getIconClass('exclamation-triangle')" class="warning-icon"></i>
          {{ $t('gallery.restrictedTags') }}
        </h3>
        <i
          class="fa expand-icon"
          :class="getIconClass(isRestrictedTagsExpanded ? 'chevron-up' : 'chevron-down')"
        ></i>
      </button>
      <Transition name="restricted-list">
        <div v-if="isRestrictedTagsExpanded" class="restricted-tags-list">
        <button
          v-for="tag in visibleRestrictedTags"
          :key="tag.id"
          class="restricted-tag-item"
          :class="{
            'active': getRestrictedTagState(tag.id)
          }"
          @click="handleTagClick(tag.id)"
          :style="{
            '--tag-color': tag.color ?? '#dc2626'
          }"
        >
          <div class="restricted-tag-left">
            <div class="restricted-tag-indicator">
              <i :class="getIconClass('check')" class="indicator-icon"></i>
            </div>
            <div class="restricted-tag-content">
              <i v-if="tag.icon" :class="getIconClass(tag.icon)" class="tag-icon"></i>
              <span class="tag-name">{{ getI18nText(tag.name, currentLanguage) ?? tag.id }}</span>
            </div>
          </div>
          <span
            class="tag-count"
            :class="{ 'invisible': !getRestrictedTagState(tag.id) }"
          >
          {{ galleryStore.restrictedTagCounts[tag.id] ?? 0 }}
        </span>
      </button>
        </div>
      </Transition>
   </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { siteConfig } from '@/config/site';
import { useGalleryStore } from '@/stores/gallery';
import { useLanguageStore } from '@/stores/language';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';

const { t: $t } = useI18n();
const galleryStore = useGalleryStore();
const languageStore = useLanguageStore();

// 检查标签是否可以显示（需要前置标签被选中）
const canTagBeVisible = (tagId: string, visited = new Set<string>()): boolean => {
  // 防止循环依赖
  if (visited.has(tagId)) {
    console.warn(`Circular dependency detected: ${tagId}`);
    return false;
  }

  visited.add(tagId);

  const tag = siteConfig.tags.find(t => t.id === tagId);
  if (!tag) {
    return false;
  }

  // 如果没有前置标签要求，可以显示
  if (!tag.prerequisiteTags || tag.prerequisiteTags.length === 0) {
    return true;
  }

  // 检查所有前置标签是否被选中
  return tag.prerequisiteTags.every(prerequisiteTagId => {
    const prerequisiteTag = siteConfig.tags.find(t => t.id === prerequisiteTagId);
    if (!prerequisiteTag) {
      return false; // 前置标签不存在
    }

    // 前置标签必须被选中
    const isSelected = galleryStore.getRestrictedTagState(prerequisiteTagId);
    if (!isSelected) {
      return false;
    }

    // 递归检查前置标签的可见性
    return canTagBeVisible(prerequisiteTagId, new Set(visited));
  });
};

const visibleRestrictedTags = computed(() => {
  let restrictedTags = [...siteConfig.tags].filter(tag => tag.isRestricted);

  // 首先根据前置标签关系过滤（只检查标签是否可以显示，不依赖选择状态）
  restrictedTags = restrictedTags.filter(tag => {
    const canBeVisible = canTagBeVisible(tag.id);
    return canBeVisible;
  });

  // 过滤掉在当前筛选条件下没有图像的特殊标签
  restrictedTags = restrictedTags.filter(tag => {
    const count = galleryStore.restrictedTagCounts[tag.id] ?? 0;
    return count > 0;
  });

  // 按当前语言的名称排序
  restrictedTags.sort((a, b) => {
    const aName = getI18nText(a.name, languageStore.currentLanguage) ?? a.id;
    const bName = getI18nText(b.name, languageStore.currentLanguage) ?? b.id;
    return aName.localeCompare(bName);
  });

  return restrictedTags;
});

// 是否有可见的特殊标签
const hasVisibleRestrictedTags = computed(() => {
  return visibleRestrictedTags.value.length > 0;
});

// 限制级标签列表的折叠状态（默认折叠）
const isRestrictedTagsExpanded = ref(false);

// 切换限制级标签列表的展开状态
const toggleRestrictedTagsExpansion = (): void => {
  isRestrictedTagsExpanded.value = !isRestrictedTagsExpanded.value;
};

const currentLanguage = computed(() => languageStore.currentLanguage);

const getRestrictedTagState = (tagId: string): boolean => {
  return galleryStore.getRestrictedTagState(tagId);
};

const toggleRestrictedTag = (tagId: string, enabled: boolean): void => {
  galleryStore.setRestrictedTagState(tagId, enabled);
};

// 处理标签点击
const handleTagClick = (tagId: string): void => {
  const currentState = getRestrictedTagState(tagId);
  // 切换标签状态（如果标签可见，就可以被选中或取消选中）
  toggleRestrictedTag(tagId, !currentState);
};
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.restricted-tag-selector {
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

.restricted-title {
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.restricted-title .fa-exclamation-triangle {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: baseline;
  line-height: 1;
  font-size: 1rem;
  margin-top: 0.2rem;
}

.dark .restricted-title {
  color: #f87171;
}

.restricted-tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .restricted-tags-list {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
  }
}

.restricted-tag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  cursor: pointer;
  transition: all 200ms;
  color: #7f1d1d;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .restricted-tag-item {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 0.75rem;
  }
}

.dark .restricted-tag-item {
  background-color: #1f1f1f;
  border-color: #374151;
  color: #dc2626;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.restricted-tag-item:hover {
  background-color: #fee2e2;
  border-color: #fca5a5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .restricted-tag-item:hover {
  background-color: #2d1b1b;
  border-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.restricted-tag-indicator {
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

.dark .restricted-tag-indicator {
  border-color: #7f1d1d;
}

.indicator-icon {
  font-size: 0.75rem;
  opacity: 0;
  transition: opacity 200ms;
  color: white;
}

.restricted-tag-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.restricted-tag-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.restricted-tag-content .tag-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.restricted-tag-item.active {
  background-color: rgba(220, 38, 38, 0.1);
  border-color: var(--tag-color, #dc2626);
  color: var(--tag-color, #dc2626);
  font-weight: 600;
}

.dark .restricted-tag-item.active {
  background-color: rgba(220, 38, 38, 0.2);
}

.restricted-tag-item.active .restricted-tag-indicator {
  background-color: var(--tag-color, #dc2626);
  border-color: var(--tag-color, #dc2626);
}

.restricted-tag-item.active .indicator-icon {
  opacity: 1;
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

.tag-count {
  font-size: 0.75rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  background-color: #e5e7eb;
  color: #4b5563;
  min-width: 1.5rem;
  text-align: center;
}

.dark .tag-count {
  background-color: #4b5563;
  color: #e5e7eb;
}

.tag-count.invisible {
  opacity: 0;
  visibility: hidden;
}

/* 特殊标签区域动画 */
.restricted-section-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.restricted-section-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.restricted-section-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.restricted-section-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  max-height: 0;
}

.restricted-section-enter-to,
.restricted-section-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 500px;
}

/* 标签列表折叠动画 */
.restricted-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.restricted-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.restricted-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.restricted-list-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  max-height: 0;
}

.restricted-list-enter-to,
.restricted-list-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
