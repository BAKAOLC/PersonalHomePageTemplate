<template>
  <AccessibleSelect
    v-model="currentSort"
    class="sort-selector"
    :options="sortOptions"
    :placeholder="t('gallery.sortDate')"
    :aria-label="t('gallery.sortBy')"
    icon="sort"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AccessibleSelect, { type AccessibleSelectOption } from '@/components/ui/AccessibleSelect.vue';
import { useGalleryStore } from '@/stores/gallery';

const { t } = useI18n();
const galleryStore = useGalleryStore();

const sortOptions = computed<AccessibleSelectOption[]>(() => [
  { label: t('gallery.sortName'), value: 'name' },
  { label: t('gallery.sortArtist'), value: 'artist' },
  { label: t('gallery.sortDate'), value: 'date' },
]);

const currentSort = computed({
  get: () => galleryStore.sortBy,
  set: (value: string) => {
    if (value === 'name' || value === 'artist' || value === 'date') {
      galleryStore.sortBy = value;
    }
  },
});
</script>
