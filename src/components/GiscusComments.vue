<template>
  <div class="giscus-comments">
    <Giscus
      :key="term"
      :repo="repo"
      :repo-id="repoId"
      :category="category"
      :category-id="categoryId"
      :mapping="mapping"
      :term="term"
      :strict="strict"
      :reactions-enabled="reactionsEnabled"
      :emit-metadata="emitMetadata"
      :input-position="inputPosition"
      :theme="theme"
      :lang="lang"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import Giscus from '@giscus/vue';
import { computed } from 'vue';

import { siteConfig } from '@/config/site';
import { useLanguageStore } from '@/stores/language';
import { useThemeStore } from '@/stores/theme';
import { getGiscusLanguage } from '@/utils/language';

const props = withDefaults(defineProps<Props>(), {
  uniqueId: 'default',
  prefix: undefined,
});

const languageStore = useLanguageStore();
const themeStore = useThemeStore();

// Props for dynamic configuration
interface Props {
  uniqueId?: string;
  prefix?: string;
}

// Giscus configuration from site config
const {
  giscus: {
    repo,
    repoId,
    category,
    categoryId,
    mapping,
    strict,
    reactionsEnabled,
    emitMetadata,
    inputPosition,
    loading,
  },
} = siteConfig;

const term = computed(() => `${props.prefix ?? 'comment'}-${props.uniqueId}`);

// Dynamic theme and language
const theme = computed(() => themeStore.isDarkMode ? 'dark' : 'light');
const lang = computed(() => getGiscusLanguage(languageStore.currentLanguage));
</script>

<style scoped>
.giscus-comments {
  width: 100%;
  height: 100%;
}
</style>
