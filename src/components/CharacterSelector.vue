<template>
  <FilterSection v-model:expanded="isCharactersExpanded" :title="$t('gallery.characters')">
    <FilterOptionButton
      v-if="isSearching"
      :label="$t('common.all')"
      :active="selectedCharacterId === 'all'"
      :count="galleryStore.getCharacterMatchCount('all')"
      color="#667eea"
      hover-color="#667eea80"
      @click="selectCharacter('all')"
    />

    <FilterOptionButton
      v-for="character in filteredCharacters"
      :key="character.id"
      :label="getI18nText(character.name, currentLanguage) ?? character.id"
      :active="selectedCharacterId === character.id"
      :count="isSearching ? galleryStore.getCharacterMatchCount(character.id) : undefined"
      :color="character.color ?? '#667eea'"
      :hover-color="character.color ? `${character.color}80` : '#667eea80'"
      @click="selectCharacter(character.id)"
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

const isSearching = computed(() => galleryStore.isSearching);

const filteredCharacters = computed(() => {
  if (!isSearching.value) {
    return galleryStore.characters;
  }

  return galleryStore.characters.filter(char => galleryStore.getCharacterMatchCount(char.id) > 0);
});

const selectedCharacterId = computed({
  get: () => galleryStore.selectedCharacterId,
  set: (value) => galleryStore.selectedCharacterId = value,
});

const currentLanguage = computed(() => languageStore.currentLanguage);
const isCharactersExpanded = ref(true);

const selectCharacter = (id: string): void => {
  selectedCharacterId.value = id;
};
</script>
