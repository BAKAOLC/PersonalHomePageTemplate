<template>
  <FilterSection
    v-model:expanded="expanded"
    :title="$t('articles.categories')"
    :button-aria-label="$t('articles.toggleCategories')"
    :options-id="optionsId"
    options-role="listbox"
    :options-aria-label="$t('articles.selectCategory')"
  >
    <FilterOptionButton
      @click="selectCategory('')"
      :label="$t('common.all')"
      :active="selectedCategory === ''"
      :count="allCount"
      icon="th"
      color="#8b5cf6"
      role="option"
      :aria-selected="selectedCategory === ''"
      :aria-label="$t('articles.showAllCategories')"
    />

    <FilterOptionButton
      v-for="[categoryId, category] in categoryEntries"
      :key="categoryId"
      @click="selectCategory(categoryId)"
      :label="getI18nText(category.name, currentLanguage)"
      :active="selectedCategory === categoryId"
      :count="categoryCounts[categoryId] ?? 0"
      :color="category.color ?? '#8b5cf6'"
      :hover-color="category.color ? `${category.color}20` : '#8b5cf620'"
      role="option"
      :aria-selected="selectedCategory === categoryId"
      :aria-label="`${getI18nText(category.name, currentLanguage)}, ${$t('articles.articleCount', {
        count: categoryCounts[categoryId] ?? 0
      })}`"
    />
  </FilterSection>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import FilterOptionButton from '@/components/ui/FilterOptionButton.vue';
import FilterSection from '@/components/ui/FilterSection.vue';
import { useLanguageStore } from '@/stores/language';
import type { ArticleCategoriesConfig } from '@/types';
import { getI18nText } from '@/utils/i18nText';

interface Props {
  categories: ArticleCategoriesConfig;
  categoryCounts: Record<string, number>;
  totalCount: number;
  searchResultCount: number;
  isSearching?: boolean;
  optionsId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isSearching: false,
  optionsId: undefined,
});

const { t: $t } = useI18n();
const languageStore = useLanguageStore();

const selectedCategory = defineModel<string>('selectedCategory', { required: true });
const expanded = defineModel<boolean>('expanded', { required: true });

const currentLanguage = computed(() => languageStore.currentLanguage);
const categoryEntries = computed(() => Object.entries(props.categories));
const allCount = computed(() => props.isSearching ? props.searchResultCount : props.totalCount);

const selectCategory = (categoryId: string): void => {
  selectedCategory.value = categoryId;
};
</script>
