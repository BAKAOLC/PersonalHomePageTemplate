<template>
  <section class="personal-section">
    <div class="container mx-auto px-4 py-4 sm:py-6 md:py-8 lg:py-12">
      <div class="text-center mb-8">
        <div class="avatar-container">
          <ProgressiveImage
            :src="personal.avatar"
            :alt="t(personal.name, currentLanguage)"
            class="avatar"
            image-class="avatar-img"
            object-fit="cover"
            :show-loader="false"
          />
        </div>

        <h1 class="name">
          {{ t(personal.name, currentLanguage) }}
        </h1>

        <div class="description">
          <p v-for="(line, index) in personal.description" :key="index" class="description-line">
            {{ t(line, currentLanguage) }}
          </p>
        </div>

        <div class="social-links">
          <template v-for="(link, index) in personal.links" :key="link.url || index">
            <a v-if="link.url && link.name"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              :style="{ '--link-color': link.color || '#333' }"
              :title="t(link.name, currentLanguage)">
              <i :class="`fa fa-${link.icon || 'link'}`" class="icon"></i>
              <span class="link-name">{{ t(link.name, currentLanguage) }}</span>
            </a>
          </template>
        </div>

        <div class="action-buttons">
          <router-link to="/gallery" class="gallery-button">
            <i class="fa fa-picture-o button-icon"></i>
            {{ translate('personal.viewGallery') }}
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ProgressiveImage from './ProgressiveImage.vue';

import type { I18nText } from '@/types';

import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';

const { t: translate } = useI18n();
const appStore = useAppStore();

const { personal } = siteConfig;
const currentLanguage = computed(() => appStore.currentLanguage);

// 本地化辅助函数
const t = (text: I18nText, lang: string): string => {
  return text[lang as keyof I18nText] || text.en || '';
};
</script>

<style scoped>
.personal-section {
  @apply min-h-full flex flex-col justify-center;
  @apply bg-gradient-to-b from-white to-gray-100;
  @apply dark:from-gray-900 dark:to-gray-800;
  @apply overflow-auto;
  @apply py-8;
}

.avatar-container {
  @apply flex justify-center mb-6;
}

.avatar {
  @apply w-32 h-32 rounded-full object-cover;
  @apply border-4 border-white dark:border-gray-800;
  @apply shadow-lg;
  @apply transition-transform duration-500;
  @apply hover:scale-110;
  animation: slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
}

.name {
  @apply text-4xl font-bold mb-4;
  @apply text-gray-900 dark:text-white;
  @apply animate-text;
  animation: slideInUp 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  animation-delay: 0.2s;
}

.description {
  @apply max-w-md mx-auto mb-8;
  @apply text-gray-600 dark:text-gray-300;
  @apply space-y-2;
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  animation-delay: 0.3s;
}

.description-line {
  @apply leading-relaxed;
}

.social-links {
  @apply flex flex-wrap justify-center gap-2 mb-8;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.social-link {
  @apply flex items-center gap-2 px-3 py-2 rounded-lg;
  @apply text-sm font-medium;
  @apply transition-all duration-300;
  @apply transform hover:-translate-y-1;
  background-color: var(--link-color);
  @apply text-white;
  @apply shadow-md hover:shadow-lg;
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  transform-origin: center;
}

/* 响应式变化时的特殊动画 */
@media (max-width: 640px) {
  .social-link {
    animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1), layoutTransition 0.3s ease-in-out 0.1s;
  }
}

.social-link:nth-child(1) { animation-delay: 0.1s; }
.social-link:nth-child(2) { animation-delay: 0.2s; }
.social-link:nth-child(3) { animation-delay: 0.3s; }
.social-link:nth-child(4) { animation-delay: 0.4s; }
.social-link:nth-child(5) { animation-delay: 0.5s; }
.social-link:nth-child(6) { animation-delay: 0.6s; }

/* 桌面端悬停效果 */
@media (min-width: 641px) {
  .social-link:hover {
    transform: scale(1.05) translateY(-3px);
  }
}

.icon {
  @apply w-4 h-4;
}

.action-buttons {
  @apply flex justify-center space-x-4;
}

.gallery-button {
  @apply inline-flex items-center gap-2 px-5 py-2.5;
  @apply bg-blue-600 hover:bg-blue-700 text-white;
  @apply rounded-lg shadow-md hover:shadow-lg;
  @apply transition-all duration-300;
  @apply font-medium;
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  animation-delay: 0.7s;
}

.button-icon {
  @apply w-5 h-5;
}

/* 高度不足时，无论屏幕宽度如何都从顶部开始布局 */
@media (max-height: 700px) {
  .personal-section {
    @apply justify-start py-4;
    min-height: auto;
  }

  .container {
    @apply py-2;
  }

  .avatar {
    @apply w-24 h-24;
  }

  .name {
    @apply text-3xl mb-3;
  }

  .description {
    @apply mb-4;
  }

  .social-links {
    @apply mb-4;
  }
}

/* 极小高度时进一步压缩 */
@media (max-height: 600px) {
  .personal-section {
    @apply py-2;
  }

  .container {
    @apply py-1;
  }

  .avatar {
    @apply w-20 h-20;
  }

  .name {
    @apply text-2xl mb-2;
  }

  .description {
    @apply mb-3 text-sm;
  }

  .social-links {
    @apply mb-3;
  }

  .social-link {
    @apply px-2 py-1 text-xs;
  }
}

/* 动画关键帧 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes layoutTransition {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 640px) {
  .personal-section {
    @apply justify-start py-4;
    min-height: auto;
  }

  .social-links {
    @apply flex-col items-center;
    gap: 0.75rem;
  }

  .social-link {
    @apply w-full justify-center;
    max-width: 280px;
    transform: scale(0.98);
  }

  .social-link:hover {
    transform: scale(1.02) translateY(-2px);
  }

  .avatar {
    @apply w-24 h-24;
  }

  .name {
    @apply text-3xl mb-3;
  }

  .description {
    @apply mb-6;
  }
}
</style>
