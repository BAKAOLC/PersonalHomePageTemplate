<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLanguageStore } from '@/stores/language';

const { t } = useI18n();
const languageStore = useLanguageStore();

// 根据当前语言获取Feed URL
const feeds = computed(() => {
  const currentLang = languageStore.currentLanguage;
  // 假设英语是默认语言，其他语言添加后缀
  const langSuffix = currentLang === 'en' ? '' : `.${currentLang}`;

  return [
    {
      name: 'RSS',
      url: `/feeds/rss${langSuffix}.xml`,
      description: 'RSS 2.0 Feed',
    },
    {
      name: 'Atom',
      url: `/feeds/atom${langSuffix}.xml`,
      description: 'Atom 1.0 Feed',
    },
    {
      name: 'JSON',
      url: `/feeds/feed${langSuffix}.json`,
      description: 'JSON Feed',
    },
  ];
});
</script>

<template>
  <section class="feed-links">
    <h3 class="feed-title">{{ t('common.feeds', 'Feeds') }}</h3>
    <div class="feed-items">
      <a
        v-for="feed in feeds"
        :key="feed.name"
        :href="feed.url"
        :title="feed.description"
        class="feed-item"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ feed.name }}
      </a>
    </div>
  </section>
</template>

<style scoped>
@reference "@/assets/styles/main.css";

.feed-links {
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg;
  @apply shadow-sm;
  padding: 1rem;
}

.feed-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.feed-items {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.feed-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #3b82f6;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  min-width: 60px;
}

.feed-item:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.25);
}

.feed-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

@media (prefers-color-scheme: dark) {
  .feed-links {
    background: #1f2937;
    border-color: #374151;
  }

  .feed-title {
    color: #f3f4f6;
  }

  .feed-item {
    background: #111827;
    border-color: #374151;
    color: #60a5fa;
  }

  .feed-item:hover {
    background: #60a5fa;
    border-color: #60a5fa;
    color: white;
    box-shadow: 0 4px 8px rgba(96, 165, 250, 0.25);
  }

  .feed-item:active {
    box-shadow: 0 2px 4px rgba(96, 165, 250, 0.15);
  }
}

@media (max-width: 640px) {
  .feed-links {
    padding: 0.75rem;
  }

  .feed-title {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .feed-items {
    gap: 0.375rem;
  }

  .feed-item {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    min-width: auto;
  }
}
</style>
