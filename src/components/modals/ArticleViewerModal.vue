<template>
  <div class="article-viewer-modal">
    <!-- 头部控制栏 -->
    <div class="viewer-header">
      <div class="header-content">
        <!-- 文章标题和信息 -->
        <div class="article-header-info">
          <h1 class="article-title">{{ getI18nText(article.title, currentLanguage) }}</h1>
          <div class="article-meta">
            <span class="article-date">
              <i :class="getIconClass('calendar')" class="meta-icon"></i>
              {{ formatDate(article.date) }}
            </span>

            <div class="article-categories">
              <span
                v-for="categoryId in article.categories"
                :key="categoryId"
                class="category-tag"
                :style="{
                  backgroundColor: getCategoryColor(categoryId) + '20',
                  color: getCategoryColor(categoryId)
                }"
              >
                {{ getCategoryName(categoryId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="viewer-controls">
          <button
            v-if="showCopyButton"
            class="control-button copy-button"
            @click="copyArticleLink"
            :title="$t('articles.copyLink')"
          >
            <i :class="getIconClass('link')" class="icon"></i>
          </button>
          <button class="control-button close-button" @click="close" :title="$t('common.close')">
            <i :class="getIconClass('times')" class="icon"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="viewer-content" ref="viewerContent">
      <!-- 文章封面 -->
      <div v-if="articleCover" class="article-cover-section">
        <img
          :src="articleCover"
          :alt="getI18nText(article.title, currentLanguage)"
          class="article-cover-image"
        />
      </div>

      <!-- 文章内容 -->
      <div class="article-content-section">
        <div class="markdown-content" v-html="renderedContent"></div>
      </div>

      <!-- 上一篇、下一篇按钮 -->
      <div v-if="showNavigation && (prevArticle || nextArticle)" class="article-navigation">
        <button
          v-if="prevArticle"
          class="nav-button prev-button"
          @click="navigateTo(prevArticle.id)"
        >
          <i :class="getIconClass('chevron-left')" class="nav-icon"></i>
          <div class="nav-content">
            <span class="nav-label">{{ $t('articles.prevArticle') }}</span>
            <span class="nav-title">{{ getI18nText(prevArticle.title, currentLanguage) }}</span>
          </div>
        </button>

        <button
          v-if="nextArticle"
          class="nav-button next-button"
          @click="navigateTo(nextArticle.id)"
        >
          <div class="nav-content">
            <span class="nav-label">{{ $t('articles.nextArticle') }}</span>
            <span class="nav-title">{{ getI18nText(nextArticle.title, currentLanguage) }}</span>
          </div>
          <i :class="getIconClass('chevron-right')" class="nav-icon"></i>
        </button>
      </div>

      <!-- 评论区 -->
      <div v-if="showComments && shouldShowComments" class="comments-section">
        <div class="comments-header">
          <h3 class="comments-title">{{ $t('articles.comments') }}</h3>
        </div>
        <div class="comments-container">
          <GiscusComments :key="article.id" :unique-id="article.id" prefix="article" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { marked } from 'marked';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import GiscusComments from '@/components/GiscusComments.vue';
import { useNotificationManager } from '@/composables/useNotificationManager';
import articleCategoriesConfig from '@/config/articles-categories.json';
import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';
import type { Article, ArticleCategoriesConfig } from '@/types';
import { formatDate, getAdjacentArticles, getArticleCover } from '@/utils/articles';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';

interface Props {
  article: Article;
  articles?: Article[];

  // 功能控制
  showCopyButton?: boolean;
  showComments?: boolean;
  showNavigation?: boolean;

  // 自定义链接（用于外部文章）
  customLink?: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'navigate', articleId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  articles: undefined,
  showCopyButton: true,
  showComments: true,
  showNavigation: true,
  customLink: undefined,
});

const emit = defineEmits<Emits>();

const appStore = useAppStore();
const notificationManager = useNotificationManager();
const { t: $t } = useI18n();

// 响应式数据
const viewerContent = ref<HTMLElement>();

const currentLanguage = computed(() => appStore.currentLanguage);

// 计算属性
const articleCover = computed(() => {
  return getArticleCover(props.article.cover, currentLanguage.value);
});

const renderedContent = computed(() => {
  const content = getI18nText(props.article.content, currentLanguage.value);
  const html = renderMarkdown(content);
  return DOMPurify.sanitize(html);
});

const adjacentArticles = computed(() => {
  if (!props.articles) return { prev: null, next: null };
  return getAdjacentArticles(props.articles, props.article.id);
});

const prevArticle = computed(() => adjacentArticles.value.prev);
const nextArticle = computed(() => adjacentArticles.value.next);

const shouldShowComments = computed(() => {
  return props.article.allowComments && siteConfig.features.comments;
});

// 方法
const getCategoryName = (categoryId: string): string => {
  const category = (articleCategoriesConfig as ArticleCategoriesConfig)[categoryId];
  return category ? getI18nText(category.name, currentLanguage.value) : categoryId;
};

const getCategoryColor = (categoryId: string): string => {
  const category = (articleCategoriesConfig as ArticleCategoriesConfig)[categoryId];
  return category?.color || '#6b7280';
};

const renderMarkdown = (content: string): string => {
  try {
    // 配置 marked 选项
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // 设置代码高亮渲染器
    const renderer = new marked.Renderer();

    renderer.code = (token: { text: string; lang?: string; escaped?: boolean }) => {
      const { text: code, lang: language } = token;
      if (language && hljs.getLanguage(language)) {
        try {
          const highlighted = hljs.highlight(code, { language }).value;
          return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        } catch (err) {
          console.warn('Highlight.js error:', err);
        }
      }
      const highlighted = hljs.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    return marked.parse(content, { renderer }) as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return content.replace(/\n/g, '<br>');
  }
};

const close = (): void => {
  emit('close');
};

const navigateTo = (articleId: string): void => {
  emit('navigate', articleId);
};

const copyArticleLink = async (): Promise<void> => {
  try {
    // 使用自定义链接或生成默认链接
    const url = props.customLink || `${window.location.origin}${window.location.pathname}#/articles/${props.article.id}`;
    await navigator.clipboard.writeText(url);

    // 显示成功通知
    notificationManager.success($t('articles.linkCopied'));
  } catch (err) {
    console.error('Failed to copy article link:', err);

    // 降级方案：选择文本
    const url = props.customLink || `${window.location.origin}${window.location.pathname}#/articles/${props.article.id}`;
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // 显示成功通知
    notificationManager.success($t('articles.linkCopied'));
  }
};

// 监听器
watch(() => props.article, () => {
  if (viewerContent.value) {
    viewerContent.value.scrollTop = 0;
  }
});
</script>

<style scoped>
.article-viewer-modal {
  @apply w-full h-full flex flex-col;
  @apply bg-white dark:bg-gray-900;
}

.viewer-header {
  @apply flex-shrink-0;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply p-4;
}

.header-content {
  @apply flex items-start justify-between gap-4;
}

.article-header-info {
  @apply flex-1 min-w-0;
}

.article-title {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
  @apply mb-2;
  @apply line-clamp-2;
}

.article-meta {
  @apply flex flex-wrap items-center gap-4;
}

.article-date {
  @apply flex items-center gap-1;
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.meta-icon {
  @apply text-xs;
}

.article-categories {
  @apply flex flex-wrap gap-2;
}

.category-tag {
  @apply px-2 py-1 rounded-full;
  @apply text-xs font-medium;
  @apply border;
}

.viewer-controls {
  @apply flex items-center gap-2;
  @apply flex-shrink-0;
}

.control-button {
  @apply w-10 h-10;
  @apply flex items-center justify-center;
  @apply bg-gray-100 dark:bg-gray-800;
  @apply text-gray-600 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700;
  @apply hover:text-gray-900 dark:hover:text-white;
  @apply rounded-lg;
  @apply transition-all duration-200;
  @apply border-none;
  @apply cursor-pointer;
}

.copy-button {
  @apply bg-blue-100 dark:bg-blue-900/20;
  @apply text-blue-600 dark:text-blue-400;
  @apply hover:bg-blue-200 dark:hover:bg-blue-900/40;
}

.close-button {
  @apply bg-red-100 dark:bg-red-900/20;
  @apply text-red-600 dark:text-red-400;
  @apply hover:bg-red-200 dark:hover:bg-red-900/40;
}

.icon {
  @apply text-lg;
}

.viewer-content {
  @apply flex-1 overflow-y-auto;
  @apply p-6;
}

.article-cover-section {
  @apply mb-8;
}

.article-cover-image {
  @apply w-full h-auto object-contain;
  @apply rounded-lg;
  @apply max-h-[60vh];
}

.article-content-section {
  @apply mb-8;
}

.markdown-content {
  @apply max-w-none;
  @apply text-gray-900 dark:text-gray-100;
  @apply leading-relaxed;
}

/* Markdown 样式 */
.markdown-content :deep(h1) {
  @apply text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-8 first:mt-0;
  @apply border-b border-gray-200 dark:border-gray-700 pb-2;
}

.markdown-content :deep(h2) {
  @apply text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-8 first:mt-0;
  @apply border-b border-gray-200 dark:border-gray-700 pb-2;
}

.markdown-content :deep(h3) {
  @apply text-xl font-bold text-gray-900 dark:text-white mb-2 mt-6 first:mt-0;
}

.markdown-content :deep(h4) {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0;
}

.markdown-content :deep(h5) {
  @apply text-base font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0;
}

.markdown-content :deep(h6) {
  @apply text-sm font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0;
}

.markdown-content :deep(p) {
  @apply text-gray-700 dark:text-gray-300 mb-4 leading-relaxed;
}

.markdown-content :deep(ul) {
  @apply list-disc mb-4 space-y-1 pl-6;
}

.markdown-content :deep(ol) {
  @apply list-decimal mb-4 space-y-1 pl-6;
}

.markdown-content :deep(li) {
  @apply text-gray-700 dark:text-gray-300 leading-relaxed;
}

.markdown-content :deep(li > ul),
.markdown-content :deep(li > ol) {
  @apply mt-2 mb-0;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-primary-500 pl-4 py-2 mb-4;
  @apply bg-gray-50 dark:bg-gray-800 rounded-r-lg;
  @apply text-gray-700 dark:text-gray-300;
  @apply italic;
}

.markdown-content :deep(blockquote p) {
  @apply mb-2 last:mb-0;
}

.markdown-content :deep(code) {
  @apply bg-gray-100 dark:bg-gray-800;
  @apply text-primary-600 dark:text-primary-400;
  @apply px-2 py-1 rounded text-sm font-mono;
  @apply border border-gray-200 dark:border-gray-700;
}

.markdown-content :deep(pre) {
  @apply bg-gray-100 dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply p-4 rounded-lg mb-4 overflow-x-auto;
  @apply text-sm;
}

.markdown-content :deep(pre code) {
  @apply bg-transparent text-gray-900 dark:text-gray-100;
  @apply p-0 border-none;
  @apply text-sm font-mono;
}

.markdown-content :deep(a) {
  @apply text-primary-600 dark:text-primary-400;
  @apply hover:text-primary-700 dark:hover:text-primary-300;
  @apply underline underline-offset-2;
  @apply transition-colors duration-200;
}

.markdown-content :deep(img) {
  @apply max-w-full h-auto rounded-lg mb-4;
  @apply border border-gray-200 dark:border-gray-700;
  @apply shadow-sm;
}

.markdown-content :deep(table) {
  @apply w-full mb-4 border-collapse;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700 rounded-lg;
  @apply overflow-hidden;
}

.markdown-content :deep(th) {
  @apply bg-gray-50 dark:bg-gray-700;
  @apply px-4 py-2 text-left font-semibold;
  @apply text-gray-900 dark:text-white;
  @apply border-b border-gray-200 dark:border-gray-600;
}

.markdown-content :deep(td) {
  @apply px-4 py-2;
  @apply text-gray-700 dark:text-gray-300;
  @apply border-b border-gray-200 dark:border-gray-700 last:border-b-0;
}

.markdown-content :deep(hr) {
  @apply border-0 border-t border-gray-200 dark:border-gray-700;
  @apply my-8;
}

.markdown-content :deep(strong) {
  @apply font-bold text-gray-900 dark:text-white;
}

.markdown-content :deep(em) {
  @apply italic;
}

.markdown-content :deep(del) {
  @apply line-through text-gray-500 dark:text-gray-400;
}

.article-navigation {
  @apply flex flex-col sm:flex-row gap-4 mb-8;
  @apply border-t border-gray-200 dark:border-gray-700 pt-8;
}

.nav-button {
  @apply flex items-center gap-3 p-4;
  @apply bg-gray-50 dark:bg-gray-800;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply rounded-lg;
  @apply transition-all duration-200;
  @apply text-left;
  @apply flex-1;
  @apply border-none cursor-pointer;
}

.prev-button {
  @apply justify-start;
}

.next-button {
  @apply justify-end;
}

.nav-icon {
  @apply text-primary-600 dark:text-primary-400;
  @apply flex-shrink-0;
}

.nav-content {
  @apply flex flex-col;
  @apply min-w-0;
}

.nav-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
  @apply font-medium;
}

.nav-title {
  @apply text-gray-900 dark:text-white;
  @apply font-semibold;
  @apply line-clamp-2;
}

.comments-section {
  @apply border-t border-gray-200 dark:border-gray-700 pt-8;
}

.comments-header {
  @apply mb-6;
}

.comments-title {
  @apply text-xl font-bold text-gray-900 dark:text-white;
}

.comments-container {
  @apply min-h-[200px];
}

/* 移动端适配 */
@media (max-width: 767px) {
  .viewer-header {
    @apply p-3;
  }

  .header-content {
    @apply flex-row items-start justify-between gap-3;
  }

  .article-header-info {
    @apply flex-1 min-w-0 pr-2;
  }

  .article-title {
    @apply text-xl leading-tight;
  }

  .viewer-controls {
    @apply flex-shrink-0;
    @apply mt-1;
  }

  .control-button {
    @apply w-9 h-9;
  }

  .viewer-content {
    @apply p-4;
  }

  .article-navigation {
    @apply flex-col;
  }

  .nav-button {
    @apply p-3;
  }
}

/* 滚动条样式 */
.viewer-content::-webkit-scrollbar {
  @apply w-2;
}

.viewer-content::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

.viewer-content::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-600 rounded-full;
}

.viewer-content::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-500;
}
</style>
