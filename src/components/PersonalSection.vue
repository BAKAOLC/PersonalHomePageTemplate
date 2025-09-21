<template>
  <section class="personal-section" :style="backgroundStyle">
    <!-- 背景遮罩层 -->
    <div v-if="hasBackgroundImage" class="background-overlay"></div>

    <div class="container mx-auto px-4 py-8">
      <div class="content-card" :class="{ 'glass-effect': hasBackgroundImage }">
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
              <i :class="getIconClass(link.icon || 'link')" class="icon"></i>
              <span class="link-name">{{ t(link.name, currentLanguage) }}</span>
            </a>
          </template>
        </div>

        <div class="action-buttons">
          <router-link to="/gallery" class="gallery-button">
            <i :class="getIconClass('fa fa-picture-o')" class="button-icon"></i>
            {{ translate('personal.viewGallery') }}
          </router-link>
        </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import ProgressiveImage from './ProgressiveImage.vue';

import type { I18nText } from '@/types';

import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';
import { getIconClass } from '@/utils/icons';

const { t: translate } = useI18n();
const appStore = useAppStore();

const { personal } = siteConfig;
const currentLanguage = computed(() => appStore.currentLanguage);

// 随机背景图像
const currentBackgroundImage = ref<string | null>(null);

// 计算属性：是否有背景图像
const hasBackgroundImage = computed(() => !!currentBackgroundImage.value);

// 计算属性：背景样式
const backgroundStyle = computed(() => {
  if (!currentBackgroundImage.value) {
    return {};
  }

  return {
    backgroundImage: `url(${currentBackgroundImage.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
});

// 选择随机背景图像
const selectRandomBackground = (): void => {
  if (personal.backgroundImages && personal.backgroundImages.length > 0) {
    const randomIndex = Math.floor(Math.random() * personal.backgroundImages.length);
    currentBackgroundImage.value = personal.backgroundImages[randomIndex];
  }
};

// 组件挂载时选择随机背景
onMounted(() => {
  selectRandomBackground();
});

// 本地化辅助函数
const t = (text: I18nText, lang: string): string => {
  return text[lang as keyof I18nText] || text.en || '';
};
</script>

<style scoped>
.personal-section {
  @apply h-full flex flex-col justify-center;
  @apply bg-gradient-to-b from-white to-gray-100;
  @apply dark:from-gray-900 dark:to-gray-800;
  @apply overflow-auto;
  @apply py-8;
  @apply relative;
  transition: all 0.5s ease-in-out;
}

/* 背景遮罩层 */
.background-overlay {
  @apply absolute inset-0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(1px);
  z-index: 1;
}

/* 内容卡片 */
.content-card {
  @apply relative;
  @apply max-w-2xl mx-auto;
  z-index: 2;
  transition: all 0.5s ease-in-out;
}

/* 磨砂玻璃效果 */
.glass-effect {
  @apply backdrop-blur-md;
  @apply border border-white/30 dark:border-gray-700/30;
  @apply rounded-2xl;
  @apply shadow-2xl;
  @apply p-8;
  @apply max-w-2xl;
  margin: 0 auto;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);

  /* 亮色主题：偏白的混合色 - 增加不透明度 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.35) 100%
  );
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.3);
}

/* 暗色主题：偏黑的混合色 - 增加不透明度 */
.dark .glass-effect {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.4) 100%
  );
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.5),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
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

/* 有背景图像时的文字颜色优化 */
.glass-effect .name {
  @apply text-gray-900 dark:text-white;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.5),
    0 1px 2px rgba(0, 0, 0, 0.3);
  font-weight: 700;
}

.description {
  @apply max-w-md mx-auto mb-8;
  @apply text-gray-600 dark:text-gray-300;
  @apply space-y-2;
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  animation-delay: 0.3s;
}

.glass-effect .description {
  @apply text-gray-900 dark:text-gray-100;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.4),
    0 1px 1px rgba(0, 0, 0, 0.2);
  font-weight: 500;
}

.description-line {
  @apply leading-relaxed;
}

.social-links {
  @apply flex flex-wrap justify-center gap-2 mb-8;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.social-link {
  @apply flex items-center px-4 py-2 rounded-lg;
  @apply text-sm font-medium;
  @apply transition-all duration-300;
  @apply transform hover:-translate-y-1;
  background-color: var(--link-color);
  @apply text-white;
  @apply shadow-md hover:shadow-lg;
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  transform-origin: center;
  min-width: 120px;
  width: 120px;
  position: relative;
}

.social-link .icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.social-link .link-name {
  margin-left: 28px;
  text-align: center;
  flex: 1;
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

.glass-effect .gallery-button {
  backdrop-filter: blur(8px);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.95) 0%,
    rgba(37, 99, 235, 0.95) 100%
  ) !important;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.glass-effect .gallery-button:hover {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 1) 0%,
    rgba(29, 78, 216, 1) 100%
  ) !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

.glass-effect .social-link {
  backdrop-filter: blur(8px);
  /* 保持原有的颜色，只添加透明度和模糊效果 */
  background-color: var(--link-color) !important;
  opacity: 0.95;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-effect .social-link:hover {
  opacity: 1;
  transform: scale(1.05) translateY(-2px);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.3),
    0 3px 12px rgba(0, 0, 0, 0.15);
}

/* 暗色主题下的社交链接 */
.dark .glass-effect .social-link {
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
}

.button-icon {
  @apply w-5 h-5;
}

/* 高度不足时，无论屏幕宽度如何都从顶部开始布局 */
@media (max-height: 700px) {
  .personal-section {
    @apply justify-start py-4;
    @apply h-full;
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
    @apply h-full;
  }

  .glass-effect {
    @apply p-6;
    @apply max-w-full;
    margin: 0 0.5rem;
    /* 移动端保持与桌面端相同的模糊效果 */
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
  }

  .social-links {
    @apply flex-col items-center;
    gap: 0.75rem;
  }

  .social-link {
    min-width: 200px;
    width: 200px;
    max-width: 280px;
    transform: scale(0.98);
  }

  .social-link .icon {
    left: 16px;
  }

  .social-link .link-name {
    margin-left: 36px;
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
