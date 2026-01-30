<template>
  <div class="not-found">
    <div class="content">
      <h1 class="title">404</h1>
      <p class="message">{{ t('app.notFound') }}</p>
      <router-link to="/" class="home-link">{{ t('common.back') }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.not-found {
  @apply min-h-screen flex items-center justify-center;
  @apply bg-gray-50 dark:bg-gray-900;
  @apply p-4;
}

.content {
  @apply text-center max-w-md;
}

.title {
  @apply text-8xl font-bold text-gray-900 dark:text-white mb-4;
  @apply animate-text;
}

.message {
  @apply text-xl text-gray-600 dark:text-gray-400 mb-8;
}

.home-link {
  @apply inline-block py-2 px-6 rounded-lg;
  @apply bg-blue-600 text-white;
  @apply hover:bg-blue-700;
  @apply transition-colors duration-200;
}
</style>
