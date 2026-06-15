<template>
  <FilterSection
    v-model:expanded="expanded"
    :title="$t('links.categories')"
    :button-aria-label="$t('links.categories')"
    :options-id="optionsId"
    options-role="listbox"
    :options-aria-label="$t('links.categories')"
  >
    <FilterOptionButton
      @click="selectCategory('')"
      :label="$t('links.allCategories')"
      :active="selectedCategory === ''"
      :count="categoryCounts['']"
      color="#2563eb"
      role="option"
      :aria-selected="selectedCategory === ''"
      :aria-label="`${$t('links.allCategories')}, ${$t('links.linkCount', {
        count: categoryCounts['']
      })}`"
    />

    <FilterOptionButton
      v-for="category in categories"
      :key="category.id"
      @click="selectCategory(category.id)"
      :label="getI18nText(category.name, currentLanguage)"
      :active="selectedCategory === category.id"
      :count="categoryCounts[category.id]"
      color="#2563eb"
      role="option"
      :aria-selected="selectedCategory === category.id"
      :aria-label="`${getI18nText(category.name, currentLanguage)}, ${$t('links.linkCount', {
        count: categoryCounts[category.id]
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
import type { LinkCategory } from '@/types';
import { getI18nText } from '@/utils/i18nText';

interface Props {
  categories: LinkCategory[];
  categoryCounts: Record<string, number>;
  optionsId?: string;
}

withDefaults(defineProps<Props>(), {
  optionsId: undefined,
});

const emit = defineEmits<{
  (e: 'select', categoryId: string): void;
}>();

const { t: $t } = useI18n();
const languageStore = useLanguageStore();

const selectedCategory = defineModel<string>('selectedCategory', { required: true });
const expanded = defineModel<boolean>('expanded', { required: true });
const currentLanguage = computed(() => languageStore.currentLanguage);

const selectCategory = (categoryId: string): void => {
  selectedCategory.value = categoryId;
  emit('select', categoryId);
};
</script>
