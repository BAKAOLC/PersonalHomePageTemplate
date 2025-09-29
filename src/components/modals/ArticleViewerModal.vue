<template>
  <div class="article-viewer-modal" :class="{
    'mobile': isMobile,
  }" role="dialog" :aria-modal="true" aria-labelledby="article-title">
    <!-- 遮罩层 -->
    <div class="viewer-mask" @click="close" :aria-label="$t('common.closeModal')"></div>

    <!-- 主内容容器 -->
    <div class="viewer-container" ref="viewerContainer" @click.stop role="document">
      <!-- 头部控制栏 -->
      <div class="viewer-header">
        <div class="header-content">
        <!-- 文章标题和信息 -->
        <div class="article-header-info">
          <h1 id="article-title" class="article-title">{{ getI18nText(article.title, currentLanguage) }}</h1>
          <div class="article-meta">
            <time class="article-date" :datetime="article.date" :aria-label="$t('articles.publishedDate', { date: formatDate(article.date) })">
              <i :class="getIconClass('calendar')" class="meta-icon" aria-hidden="true"></i>
              {{ formatDate(article.date) }}
            </time>

            <div class="article-categories" role="list" :aria-label="$t('articles.articleCategories')">
              <span
                v-for="categoryId in article.categories"
                :key="categoryId"
                class="category-tag"
                :style="{
                  backgroundColor: getCategoryColor(categoryId) + '20',
                  color: getCategoryColor(categoryId)
                }"
                role="listitem"
                :aria-label="$t('articles.category', { name: getCategoryName(categoryId) })"
              >
                {{ getCategoryName(categoryId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="viewer-controls" role="toolbar" :aria-label="$t('articles.articleActions')">
          <button
            v-if="showCopyButton && customLink"
            class="control-button copy-button"
            @click="copyArticleLink"
            :aria-label="$t('articles.copyLink')"
            type="button"
          >
            <i :class="getIconClass('link')" class="icon" aria-hidden="true"></i>
          </button>
          <button
            class="control-button close-button"
            @click="close"
            :aria-label="$t('common.close')"
            type="button"
          >
            <i :class="getIconClass('times')" class="icon" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="viewer-content" ref="viewerContent" role="main" :aria-label="$t('articles.articleContent')">
      <!-- 文章封面 -->
      <div v-if="articleCover" class="article-cover-section">
        <img
          :src="articleCover"
          :alt="getI18nText(article.title, currentLanguage)"
          class="article-cover-image"
          role="img"
        />
      </div>

      <!-- 文章内容 -->
      <article class="article-content-section" :aria-label="$t('articles.articleContent')">
        <div class="markdown-content" v-html="renderedContent" role="article"></div>
      </article>

      <!-- 上一篇、下一篇按钮 -->
      <nav v-if="showNavigation && (prevArticle || nextArticle)" class="article-navigation" role="navigation" :aria-label="$t('articles.articleNavigation')">
        <button
          v-if="prevArticle"
          class="nav-button prev-button"
          @click="navigateTo(prevArticle.id)"
          :aria-label="$t('articles.goToPreviousArticle', { title: getI18nText(prevArticle.title, currentLanguage) })"
          type="button"
        >
          <i :class="getIconClass('chevron-left')" class="nav-icon" aria-hidden="true"></i>
          <div class="nav-content">
            <span class="nav-label">{{ $t('articles.prevArticle') }}</span>
            <span class="nav-title">{{ getI18nText(prevArticle.title, currentLanguage) }}</span>
          </div>
        </button>

        <button
          v-if="nextArticle"
          class="nav-button next-button"
          @click="navigateTo(nextArticle.id)"
          :aria-label="$t('articles.goToNextArticle', { title: getI18nText(nextArticle.title, currentLanguage) })"
          type="button"
        >
          <div class="nav-content">
            <span class="nav-label">{{ $t('articles.nextArticle') }}</span>
            <span class="nav-title">{{ getI18nText(nextArticle.title, currentLanguage) }}</span>
          </div>
          <i :class="getIconClass('chevron-right')" class="nav-icon" aria-hidden="true"></i>
        </button>
      </nav>

      <!-- 评论区 -->
      <section v-if="showComments && shouldShowComments" class="comments-section" :aria-label="$t('articles.comments')">
        <div class="comments-header">
          <h3 class="comments-title">{{ $t('articles.comments') }}</h3>
        </div>
        <div class="comments-container" role="region" :aria-label="$t('articles.commentsSection')">
          <GiscusComments :key="article.id" :unique-id="article.id" prefix="article" />
        </div>
      </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { marked } from 'marked';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import GiscusComments from '@/components/GiscusComments.vue';
import { useNotificationManager } from '@/composables/useNotificationManager';
import { useScreenManager } from '@/composables/useScreenManager';
import articleCategoriesConfig from '@/config/articles-categories.json';
import { siteConfig } from '@/config/site';
import { useLanguageStore } from '@/stores/language';
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

  // 导航回调
  onNavigate?: (articleId: string) => void;
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
  onNavigate: undefined,
});

const emit = defineEmits<Emits>();

const languageStore = useLanguageStore();
const notificationManager = useNotificationManager();
const { t: $t } = useI18n();
const { isMobile } = useScreenManager();

// 响应式数据
const viewerContainer = ref<HTMLElement>();
const viewerContent = ref<HTMLElement>();

const currentLanguage = computed(() => languageStore.currentLanguage);

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
  return category?.color ?? '#6b7280';
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
  console.log('ArticleViewerModal navigateTo called:', { articleId, hasOnNavigate: !!props.onNavigate });
  // 如果有onNavigate回调，使用它；否则emit事件
  if (props.onNavigate) {
    props.onNavigate(articleId);
  } else {
    emit('navigate', articleId);
  }
};

const copyArticleLink = async (): Promise<void> => {
  if (!props.customLink) {
    console.warn('No custom link provided for copying');
    return;
  }

  try {
    await navigator.clipboard.writeText(props.customLink);

    // 显示成功通知
    notificationManager.success($t('articles.linkCopied'));
  } catch (err) {
    console.error('Failed to copy article link:', err);

    // 降级方案：选择文本
    const textArea = document.createElement('textarea');
    textArea.value = props.customLink;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // 显示成功通知
    notificationManager.success($t('articles.linkCopied'));
  }
};

// 方法
const show = (): void => {
  nextTick(() => {
    if (viewerContainer.value) {
      viewerContainer.value.focus();
    }
    if (viewerContent.value) {
      viewerContent.value.scrollTop = 0;
    }
  });
};

// 监听器
watch(() => props.article, () => {
  if (viewerContent.value) {
    viewerContent.value.scrollTop = 0;
  }
});

// 键盘导航支持
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    close();
  }
};

// 生命周期
onMounted(() => {
  show();
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown);
  // 设置焦点到模态框
  if (viewerContainer.value) {
    viewerContainer.value.focus();
  }
});

onBeforeUnmount(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown);
  // 恢复背景滚动
  document.body.style.overflow = '';
});
</script>

<style scoped>
.article-viewer-modal {
  @apply relative;
  @apply w-full h-full;
  @apply flex items-center justify-center;
  /* 覆盖 ModalContainer 的样式 */
  @apply transform-none !important;
  @apply p-0 !important;
}

.viewer-mask {
  @apply absolute inset-0;
  @apply bg-transparent;
  @apply cursor-pointer;
}

.viewer-container {
  @apply relative;
  @apply bg-white dark:bg-gray-900;
  @apply rounded-lg shadow-2xl;
  @apply max-w-4xl w-full mx-4;
  @apply max-h-[90vh];
  @apply flex flex-col;
  @apply z-10;
}

/* 移动端全屏显示 */
.article-viewer-modal.mobile .viewer-container {
  @apply max-w-none w-full h-full mx-0 my-0 max-h-none rounded-none;
}

@media (max-width: 767px) {
  .article-viewer-modal .viewer-container {
    @apply max-w-none w-full h-full mx-0 my-0 max-h-none rounded-none;
  }
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

/* 屏幕阅读器专用样式 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 焦点样式优化 */
.viewer-container:focus,
.viewer-container:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.control-button:focus,
.control-button:focus-visible,
.nav-button:focus,
.nav-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .viewer-container,
  .control-button,
  .nav-button {
    border: 2px solid;
  }

  .viewer-container:focus,
  .control-button:focus,
  .nav-button:focus {
    outline: 3px solid;
    outline-offset: 1px;
  }
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .viewer-container,
  .control-button,
  .nav-button {
    transition: none !important;
    transform: none !important;
  }

  .control-button:hover,
  .nav-button:hover {
    transform: none !important;
  }
}
</style>
