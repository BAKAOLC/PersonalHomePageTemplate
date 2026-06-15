<template>
  <Transition name="restricted-section">
    <FilterSection
      v-if="hasVisibleRestrictedTags"
      v-model:expanded="isRestrictedTagsExpanded"
      :title="$t('gallery.restrictedTags')"
      icon="exclamation-triangle"
      tone="danger"
    >
      <FilterOptionButton
        v-for="tag in visibleRestrictedTags"
        :key="tag.id"
        :label="getI18nText(tag.name, currentLanguage) ?? tag.id"
        :active="getRestrictedTagState(tag.id)"
        :count="galleryStore.restrictedTagCounts[tag.id] ?? 0"
        :count-visible="getRestrictedTagState(tag.id)"
        :icon="tag.icon"
        :color="tag.color ?? '#dc2626'"
        variant="restricted"
        @click="handleTagClick(tag.id)"
      />
    </FilterSection>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import FilterOptionButton from '@/components/ui/FilterOptionButton.vue';
import FilterSection from '@/components/ui/FilterSection.vue';
import { siteConfig } from '@/config/site';
import { useGalleryStore } from '@/stores/gallery';
import { useLanguageStore } from '@/stores/language';
import { getI18nText } from '@/utils/i18nText';

const { t: $t } = useI18n();
const galleryStore = useGalleryStore();
const languageStore = useLanguageStore();

const canTagBeVisible = (tagId: string, visited = new Set<string>()): boolean => {
  if (visited.has(tagId)) {
    console.warn(`Circular dependency detected: ${tagId}`);
    return false;
  }

  visited.add(tagId);

  const tag = siteConfig.tags.find(t => t.id === tagId);
  if (!tag) {
    return false;
  }

  if (!tag.prerequisiteTags || tag.prerequisiteTags.length === 0) {
    return true;
  }

  return tag.prerequisiteTags.every(prerequisiteTagId => {
    const prerequisiteTag = siteConfig.tags.find(t => t.id === prerequisiteTagId);
    if (!prerequisiteTag || !galleryStore.getRestrictedTagState(prerequisiteTagId)) {
      return false;
    }

    return canTagBeVisible(prerequisiteTagId, new Set(visited));
  });
};

const visibleRestrictedTags = computed(() => {
  const restrictedTags = siteConfig.tags.filter(tag => (
    tag.isRestricted
    && canTagBeVisible(tag.id)
    && (galleryStore.restrictedTagCounts[tag.id] ?? 0) > 0
  ));

  return [...restrictedTags].sort((a, b) => {
    const aName = getI18nText(a.name, languageStore.currentLanguage) ?? a.id;
    const bName = getI18nText(b.name, languageStore.currentLanguage) ?? b.id;
    return aName.localeCompare(bName);
  });
});

const hasVisibleRestrictedTags = computed(() => visibleRestrictedTags.value.length > 0);
const isRestrictedTagsExpanded = ref(false);
const currentLanguage = computed(() => languageStore.currentLanguage);

const getRestrictedTagState = (tagId: string): boolean => {
  return galleryStore.getRestrictedTagState(tagId);
};

const handleTagClick = (tagId: string): void => {
  galleryStore.setRestrictedTagState(tagId, !getRestrictedTagState(tagId));
};
</script>

<style scoped>
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
</style>
