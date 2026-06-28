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
            <time
              class="article-date"
              :datetime="article.date"
              :aria-label="$t('articles.publishedDate', { date: formatDate(article.date) })"
            >
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
            class="control-button screenshot-button"
            @click="captureArticleScreenshot"
            :aria-label="$t('articles.shareAsImage')"
            type="button"
            :disabled="isCapturingScreenshot"
          >
            <i
              class="icon"
              :class="[
                getIconClass(isCapturingScreenshot ? 'spinner' : 'camera'),
                { 'animate-spin': isCapturingScreenshot }
              ]"
              aria-hidden="true"
            ></i>
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
          @click="openImageViewer(articleCover, getI18nText(article.title, currentLanguage))"
        />
      </div>

      <!-- 文章内容 -->
      <article class="article-content-section" :aria-label="$t('articles.articleContent')">
        <!-- 加载状态 -->
        <div v-if="isLoadingContent" class="content-loading" role="status" :aria-label="$t('articles.loadingContent')">
          <div class="loading-spinner"></div>
          <p class="loading-text">{{ $t('articles.loadingContent') }}</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="contentLoadError" class="content-error" role="alert">
          <i :class="getIconClass('exclamation-triangle')" class="error-icon" aria-hidden="true"></i>
          <p class="error-text">{{ contentLoadError }}</p>
        </div>

        <!-- 文章内容 -->
        <div
          v-else
          class="markdown-content"
          v-html="renderedContent"
          role="article"
          @click="handleMarkdownClick"
        ></div>
      </article>

      <!-- 上一篇、下一篇按钮 -->
      <nav
        v-if="showNavigation && (prevArticle || nextArticle)"
        class="article-navigation"
        role="navigation"
        :aria-label="$t('articles.articleNavigation')"
      >
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
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { renderArticleMarkdown } from '@/composables/useArticleMarkdownRenderer';
import { useEventManager } from '@/composables/useEventManager';
import { useModalManager } from '@/composables/useModalManager';
import { useNotificationManager } from '@/composables/useNotificationManager';
import { useScreenManager } from '@/composables/useScreenManager';
import { useTimers } from '@/composables/useTimers';
import articleCategoriesConfig from '@/config/articles-categories.json5';
import personalConfig from '@/config/personal.json5';
import { siteConfig } from '@/config/site';
import { useLanguageStore } from '@/stores/language';
import { useThemeStore } from '@/stores/theme';
import type { Article, ArticleCategoriesConfig, ExternalImageInfo, PersonalInfo } from '@/types';
import { formatDate, getAdjacentArticles, getArticleContent, getArticleCover } from '@/utils/articles';
import { getBrowserDocument, getCurrentSiteBaseUrl, writeClipboardTextWithFallback } from '@/utils/browser';
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
const themeStore = useThemeStore();
const notificationManager = useNotificationManager();
const eventManager = useEventManager();
const modalManager = useModalManager();
const { t: $t } = useI18n();
const { isMobile } = useScreenManager();
const { setTimeout, requestAnimationFrame } = useTimers();

const GiscusComments = defineAsyncComponent(() => import('@/components/GiscusComments.vue'));
const ImageViewerModal = defineAsyncComponent(() => import('@/components/modals/ImageViewerModal.vue'));

// 响应式数据
const viewerContainer = ref<HTMLElement>();
const viewerContent = ref<HTMLElement>();
const isLoadingContent = ref(false);
const contentLoadError = ref<string | null>(null);
const articleContent = ref<string>('');
const renderedContent = ref<string>('');
const imageViewerModalId = ref<string | null>(null);
const isCapturingScreenshot = ref(false);
let contentLoadSequence = 0;

const currentLanguage = computed(() => languageStore.currentLanguage);

// 计算属性
const articleCover = computed(() => {
  return getArticleCover(props.article.cover, currentLanguage.value);
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

// 打开图像查看器
const openImageViewer = (imageUrl: string, altText: string): void => {
  const externalImage: ExternalImageInfo = {
    url: imageUrl,
    name: altText ?? $t('common.image'),
  };

  imageViewerModalId.value = modalManager.open({
    id: `article-image-viewer-${Date.now()}`,
    component: ImageViewerModal,
    props: {
      externalImage: externalImage,
      imageList: [],
      viewerUIConfig: {
        imageList: false,
        imageGroupList: false,
        viewerTitle: false,
        infoPanel: {
          title: false,
          description: false,
          artist: false,
          date: false,
          tags: false,
        },
        commentsButton: false,
      },
    },
    options: {
      fullscreen: true,
      closable: true,
      maskClosable: true,
      escClosable: true,
      destroyOnClose: true,
    },
    onClose: () => {
      imageViewerModalId.value = null;
    },
  });
};

const handleMarkdownClick = (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return;

  const image = event.target.closest('img.clickable-image');
  if (!(image instanceof HTMLImageElement)) return;

  const imageUrl = image.getAttribute('data-image-url') ?? image.src;
  const altText = image.alt ?? '';
  openImageViewer(imageUrl, altText);
};

const close = (): void => {
  emit('close');
};

const navigateTo = (articleId: string): void => {
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
    const copied = await writeClipboardTextWithFallback(props.customLink);
    if (!copied) {
      throw new Error('Clipboard copy is unavailable');
    }

    // 显示成功通知
    notificationManager.success($t('articles.linkCopied'));
  } catch (err) {
    console.error('Failed to copy article link:', err);
  }
};

// 截图文章
const captureArticleScreenshot = async (): Promise<void> => {
  if (!viewerContainer.value || isCapturingScreenshot.value) {
    return;
  }

  isCapturingScreenshot.value = true;
  let clone: HTMLElement | null = null;
  let isCloneAppended = false;

  try {
    const browserDocument = getBrowserDocument();
    if (!browserDocument?.body) {
      throw new Error('Article screenshot requires a browser document');
    }

    const element = viewerContainer.value;
    clone = element.cloneNode(true) as HTMLElement;

    // 添加截图标识,用于CSS优先级控制
    clone.setAttribute('data-screenshot', 'true');

    // 设置完整的固定样式，确保所有设备输出一致
    clone.style.cssText = `
      position: fixed !important;
      left: -9999px !important;
      top: 0 !important;
      width: 895px !important;
      height: auto !important;
      max-height: none !important;
      min-height: 0 !important;
      max-width: none !important;
      min-width: 0 !important;
      overflow: visible !important;
      transform: none !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      line-height: 1.5 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    `;

    // 移除遮罩层
    const mask = clone.querySelector('.viewer-mask');
    if (mask) {
      mask.remove();
    }

    // 隐藏控制按钮
    const controls = clone.querySelector('.viewer-controls');
    if (controls) {
      (controls as HTMLElement).style.display = 'none';
    }

    // 隐藏导航按钮
    const navigation = clone.querySelector('.article-navigation');
    if (navigation) {
      (navigation as HTMLElement).style.display = 'none';
    }

    // 隐藏评论区
    const comments = clone.querySelector('.comments-section');
    if (comments) {
      (comments as HTMLElement).style.display = 'none';
    }

    // 设置内容区域样式 - 使用固定padding
    const viewerContent = clone.querySelector('.viewer-content');
    if (viewerContent) {
      const contentEl = viewerContent as HTMLElement;
      contentEl.style.cssText = `
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        max-width: none !important;
        overflow: visible !important;
        flex: none !important;
        display: block !important;
        box-sizing: border-box !important;
        padding: 24px !important;
        margin: 0 !important;
      `;
    }

    // 设置头部样式 - 使用固定padding
    const viewerHeader = clone.querySelector('.viewer-header');
    if (viewerHeader) {
      const headerEl = viewerHeader as HTMLElement;
      headerEl.style.cssText = `
        width: 100% !important;
        position: relative !important;
        flex: none !important;
        box-sizing: border-box !important;
        padding: 16px 24px !important;
        margin: 0 !important;
        display: block !important;
      `;
    }

    // 设置头部内容容器样式
    const headerContent = clone.querySelector('.header-content');
    if (headerContent) {
      const contentEl = headerContent as HTMLElement;
      contentEl.style.cssText = `
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        width: 100% !important;
      `;
    }

    // 设置文章头部信息容器样式
    const articleHeaderInfo = clone.querySelector('.article-header-info');
    if (articleHeaderInfo) {
      const infoEl = articleHeaderInfo as HTMLElement;
      infoEl.style.cssText = `
        flex: 1 !important;
        min-width: 0 !important;
      `;
    }

    // 设置文章标题固定样式
    const articleTitle = clone.querySelector('.article-title');
    if (articleTitle) {
      const titleEl = articleTitle as HTMLElement;
      titleEl.style.cssText = `
        font-size: 24px !important;
        line-height: 1.4 !important;
        margin: 0 0 8px 0 !important;
        max-width: 100% !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
      `;
    }

    // 设置文章元数据样式
    const articleMeta = clone.querySelector('.article-meta');
    if (articleMeta) {
      const metaEl = articleMeta as HTMLElement;
      metaEl.style.cssText = `
        font-size: 14px !important;
        line-height: 1.5 !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 16px !important;
      `;
    }

    // 确保所有图片使用固定样式
    const images = clone.querySelectorAll('img');
    images.forEach((img) => {
      const imgEl = img as HTMLElement;
      imgEl.style.cssText = `
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto !important;
      `;
    });

    // 特别处理文章封面图片
    const coverImage = clone.querySelector('.article-cover-image');
    if (coverImage) {
      const coverEl = coverImage as HTMLElement;
      coverEl.style.cssText = `
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto !important;
      `;
    }

    // 设置封面区域容器样式
    const coverSection = clone.querySelector('.article-cover-section');
    if (coverSection) {
      const sectionEl = coverSection as HTMLElement;
      sectionEl.style.cssText = `
        width: 100% !important;
        margin-bottom: 32px !important;
      `;
    }

    // 设置markdown内容区域固定样式
    const markdownContent = clone.querySelector('.markdown-content');
    if (markdownContent) {
      const contentEl = markdownContent as HTMLElement;
      contentEl.style.cssText = `
        font-size: 16px !important;
        line-height: 1.75 !important;
        max-width: 100% !important;
        width: 100% !important;
      `;
    }

    // 在内容区域底部添加作者信息
    const viewerContentEl = clone.querySelector('.viewer-content');
    if (viewerContentEl) {
      const personalInfo = personalConfig as PersonalInfo;
      const authorName = getI18nText(personalInfo.name, currentLanguage.value);

      // 生成文章链接
      const articleLink = props.customLink || `${getCurrentSiteBaseUrl() ?? ''}#/articles/${props.article.id}`;

      // 根据主题设置颜色
      const isDark = themeStore.isDarkMode;
      const borderColor = isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      const textColor = isDark ? 'rgba(209, 213, 219, 1)' : 'rgba(75, 85, 99, 1)';
      const labelColor = isDark ? 'rgba(156, 163, 175, 1)' : 'rgba(107, 114, 128, 1)';
      const nameColor = isDark ? 'rgba(243, 244, 246, 1)' : 'rgba(31, 41, 55, 1)';
      const bgColor = isDark ? 'rgba(31, 41, 55, 1)' : 'rgba(243, 244, 246, 1)';

      // 创建作者信息栏
      const authorInfoSection = browserDocument.createElement('div');
      authorInfoSection.style.cssText = `
        border-top: 2px solid ${borderColor} !important;
        margin-top: 40px !important;
        padding-top: 24px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        font-size: 14px !important;
        color: ${textColor} !important;
      `;

      // 第一行：头像、作者信息和网站名称
      const authorMainInfo = browserDocument.createElement('div');
      authorMainInfo.style.cssText = `
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
      `;

      // 添加头像
      const avatar = browserDocument.createElement('img');
      avatar.src = personalInfo.avatar;
      avatar.alt = authorName;
      avatar.style.cssText = `
        width: 48px !important;
        height: 48px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
        flex-shrink: 0 !important;
      `;
      authorMainInfo.appendChild(avatar);

      // 添加作者信息文本
      const authorText = browserDocument.createElement('div');
      authorText.style.cssText = `
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      `;

      const authorLabel = browserDocument.createElement('div');
      authorLabel.textContent = $t('articles.author');
      authorLabel.style.cssText = `
        font-size: 12px !important;
        color: ${labelColor} !important;
      `;
      authorText.appendChild(authorLabel);

      const authorNameEl = browserDocument.createElement('div');
      authorNameEl.textContent = authorName;
      authorNameEl.style.cssText = `
        font-size: 16px !important;
        font-weight: 600 !important;
        color: ${nameColor} !important;
      `;
      authorText.appendChild(authorNameEl);

      authorMainInfo.appendChild(authorText);

      // 添加网站标识
      const siteInfo = browserDocument.createElement('div');
      siteInfo.textContent = getI18nText(siteConfig.app.title, currentLanguage.value);
      siteInfo.style.cssText = `
        font-size: 14px !important;
        color: ${labelColor} !important;
        font-weight: 500 !important;
      `;
      authorMainInfo.appendChild(siteInfo);

      authorInfoSection.appendChild(authorMainInfo);

      // 第二行：文章链接
      const linkContainer = browserDocument.createElement('div');
      linkContainer.style.cssText = `
        font-size: 12px !important;
        color: ${labelColor} !important;
        word-break: break-all !important;
        background: ${bgColor} !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        font-family: monospace !important;
      `;
      linkContainer.textContent = articleLink;

      authorInfoSection.appendChild(linkContainer);

      viewerContentEl.appendChild(authorInfoSection);
    }

    // 添加到DOM
    browserDocument.body.appendChild(clone);
    isCloneAppended = true;

    await nextTick();

    // 等待所有图片加载完成
    const imageElements = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      imageElements.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // 即使加载失败也继续
          setTimeout(() => resolve(), 3000); // 设置超时，避免无限等待
        });
      }),
    );

    // 重排布局
    void clone.offsetHeight;
    void clone.offsetWidth;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const actualHeight = clone.scrollHeight;

    // 使用snapdom截图，固定参数确保输出一致
    const { snapdom } = await import('@zumer/snapdom');
    const result = await snapdom(clone, {
      scale: 2,
      width: 895,
      height: actualHeight,
      embedFonts: true,
      fast: false,
    });

    // 清理克隆元素
    if (isCloneAppended) {
      browserDocument.body.removeChild(clone);
      isCloneAppended = false;
    }

    // 下载截图
    const fileName = `${getI18nText(props.article.title, currentLanguage.value).replace(/[/\\?%*:|"<>]/g, '-')}-${Date.now()}`;
    await result.download({
      format: 'png',
      filename: fileName,
      quality: 1.0,
    });

    // 显示成功通知
    notificationManager.success($t('articles.imageSaved'));
  } catch (err) {
    console.error('Failed to capture screenshot:', err);
    notificationManager.error($t('articles.imageCaptureFailed'));
  } finally {
    if (isCloneAppended && clone?.parentNode) {
      clone.parentNode.removeChild(clone);
    }
    isCapturingScreenshot.value = false;
  }
};

// 方法
const loadArticleContent = async (): Promise<void> => {
  const sequence = ++contentLoadSequence;
  isLoadingContent.value = true;
  contentLoadError.value = null;
  renderedContent.value = '';

  try {
    const content = await getArticleContent(props.article, currentLanguage.value);
    if (sequence !== contentLoadSequence) return;
    const html = await renderArticleMarkdown(content, props.article, currentLanguage.value);
    if (sequence !== contentLoadSequence) return;
    articleContent.value = content;
    renderedContent.value = html;
  } catch (error) {
    if (sequence !== contentLoadSequence) return;
    console.error('Failed to load article content:', error);
    contentLoadError.value = $t('articles.contentLoadError');
    // 回退到默认内容或错误消息
    articleContent.value = `# ${$t('articles.contentLoadError')}\n\n${$t('articles.contentLoadErrorDescription')}`;
    renderedContent.value = '';
  } finally {
    if (sequence === contentLoadSequence) {
      isLoadingContent.value = false;
    }
  }
};

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
  loadArticleContent();
  if (viewerContent.value) {
    viewerContent.value.scrollTop = 0;
  }
});

watch(currentLanguage, () => {
  loadArticleContent();
});

// 键盘导航支持
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    close();
  }
};

// 生命周期
onMounted(() => {
  loadArticleContent();
  show();
  // 添加键盘事件监听
  const browserDocument = getBrowserDocument();
  if (browserDocument) {
    eventManager.addEventListener('keydown', handleKeydown, undefined, browserDocument);
  }
  // 设置焦点到模态框
  if (viewerContainer.value) {
    viewerContainer.value.focus();
  }
});

</script>

<style scoped>
@reference "@/assets/styles/main.css";

.article-viewer-modal {
  @apply relative;
  @apply w-full h-full;
  @apply flex items-center justify-center;
  /* 覆盖 ModalContainer 的样式 */
  @apply !transform-none;
  @apply !p-0;
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

.screenshot-button {
  @apply bg-green-100 dark:bg-green-900/20;
  @apply text-green-600 dark:text-green-400;
  @apply hover:bg-green-200 dark:hover:bg-green-900/40;
}

.screenshot-button:disabled {
  @apply opacity-50 cursor-not-allowed;
  @apply hover:bg-green-100 dark:hover:bg-green-900/20;
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
  @apply cursor-pointer;
  @apply transition-all duration-300;
  @apply border border-gray-200 dark:border-gray-700;
}

.article-cover-image:hover {
  @apply shadow-lg scale-[1.02];
  @apply border-primary-400 dark:border-primary-600;
}

.article-content-section {
  @apply mb-8;
}

/* 内容加载状态 */
.content-loading {
  @apply flex flex-col items-center justify-center;
  @apply py-16 px-4;
  @apply text-gray-600 dark:text-gray-400;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-gray-200 dark:border-gray-700;
  @apply border-t-primary-600;
  @apply rounded-full;
  @apply animate-spin;
  @apply mb-4;
}

.loading-text {
  @apply text-sm;
  @apply font-medium;
}

/* 内容错误状态 */
.content-error {
  @apply flex flex-col items-center justify-center;
  @apply py-16 px-4;
  @apply text-red-600 dark:text-red-400;
  @apply text-center;
}

.error-icon {
  @apply text-2xl mb-4;
}

.error-text {
  @apply text-sm;
  @apply font-medium;
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

/* 可点击图片的悬停效果 */
.markdown-content :deep(img.clickable-image) {
  @apply transition-all duration-300;
}

.markdown-content :deep(img.clickable-image:hover) {
  @apply shadow-lg scale-[1.02];
  @apply border-primary-400 dark:border-primary-600;
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
