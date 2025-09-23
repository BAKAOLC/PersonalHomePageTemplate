<template>
  <div class="giscus-comments">
    <Giscus
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
import { useAppStore } from '@/stores/app';
import { getGiscusLanguage } from '@/utils/language';

const appStore = useAppStore();

// Props for dynamic configuration
interface Props {
  uniqueId?: string;
  prefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  uniqueId: 'default',
});

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

const term = computed(() => `${props.prefix || 'comment'}-${props.uniqueId}`);

// Dynamic theme and language
const theme = computed(() => appStore.isDarkMode ? 'dark' : 'light');
const lang = computed(() => getGiscusLanguage(appStore.currentLanguage));
</script>

<style scoped>
.giscus-comments {
  width: 100%;
  height: 100%;
}
</style>
