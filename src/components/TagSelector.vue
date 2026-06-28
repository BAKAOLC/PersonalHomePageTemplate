<template>
  <FilterSection v-model:expanded="isNormalTagsExpanded" :title="$t('gallery.tags')">
    <FilterOptionButton
      :label="$t('common.all')"
      :active="selectedTag === 'all'"
      :count="tagCounts.all"
      icon="th"
      @click="selectTag('all')"
    />

    <FilterOptionButton
      v-for="tag in sortedNormalTags"
      :key="tag.id"
      :label="getI18nText(tag.name, currentLanguage) ?? tag.id"
      :active="selectedTag === tag.id"
      :count="tagCounts[tag.id] ?? 0"
      :icon="tag.icon"
      :color="tag.color ?? '#8b5cf6'"
      :hover-color="tag.color ? `${tag.color}20` : '#8b5cf620'"
      @click="selectTag(tag.id)"
    />
  </FilterSection>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import FilterOptionButton from '@/components/ui/FilterOptionButton.vue';
import FilterSection from '@/components/ui/FilterSection.vue';
import { useGalleryStore } from '@/stores/gallery';
import { useLanguageStore } from '@/stores/language';
import { getI18nText } from '@/utils/i18nText';

const { t: $t } = useI18n();
const galleryStore = useGalleryStore();
const languageStore = useLanguageStore();

const sortedNormalTags = computed(() => {
  const tags = galleryStore.tags.filter(tag => !tag.isRestricted && (galleryStore.tagCounts[tag.id] ?? 0) > 0);

  return [...tags].sort((a, b) => {
    const aName = getI18nText(a.name, languageStore.currentLanguage) ?? a.id;
    const bName = getI18nText(b.name, languageStore.currentLanguage) ?? b.id;
    return aName.localeCompare(bName);
  });
});

const isNormalTagsExpanded = ref(true);

const selectedTag = computed({
  get: () => galleryStore.selectedTag,
  set: (value) => galleryStore.selectedTag = value,
});

const currentLanguage = computed(() => languageStore.currentLanguage);
const tagCounts = computed(() => galleryStore.tagCounts);

const selectTag = (id: string): void => {
  selectedTag.value = id;
};
</script>
