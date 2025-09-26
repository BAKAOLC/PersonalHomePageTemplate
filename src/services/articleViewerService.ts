import { useRouter } from 'vue-router';

import ArticleViewerModal from '@/components/modals/ArticleViewerModal.vue';
import { useModalManager } from '@/composables/useModalManager';
import type { Article } from '@/types';

export interface ArticleViewerOptions {
  // 文章数据
  article: Article;
  articles?: Article[];

  // 功能控制
  showCopyButton?: boolean;
  showComments?: boolean;
  showNavigation?: boolean;

  // 自定义链接（用于外部文章）
  customLink?: string;

  // 路由控制
  updateRoute?: boolean; // 是否更新路由
  returnRoute?: string; // 关闭时返回的路由
}

class ArticleViewerService {
  private currentModalId?: string;

  /**
   * 打开文章查看器
   */
  open(options: ArticleViewerOptions): string {
    const modalManager = useModalManager();

    // 如果已经有打开的文章查看器，先关闭它
    if (this.currentModalId) {
      this.close();
    }

    const modalId = `article-viewer-${Date.now()}`;

    // 创建弹窗
    this.currentModalId = modalManager.open({
      id: modalId,
      component: ArticleViewerModal,
      props: {
        article: options.article,
        articles: options.articles,
        showCopyButton: options.showCopyButton ?? true,
        showComments: options.showComments ?? true,
        showNavigation: options.showNavigation ?? true,
        customLink: options.customLink,
      },
      options: {
        width: '90vw',
        height: '90vh',
        maskClosable: true,
        escClosable: true,
        className: 'article-viewer-modal-wrapper',
      },
      onClose: () => {
        this.handleClose(options);
      },
    });

    // 更新路由（如果需要）
    if (options.updateRoute && options.article.id) {
      this.updateRoute(options.article.id);
    }

    return modalId;
  }

  /**
   * 关闭文章查看器
   */
  close(): void {
    if (this.currentModalId) {
      const modalManager = useModalManager();
      modalManager.close(this.currentModalId);
      this.currentModalId = undefined;
    }
  }

  /**
   * 导航到指定文章
   */
  navigate(article: Article, updateRoute = true): void {
    if (!this.currentModalId) return;

    const modalManager = useModalManager();
    const modal = modalManager.getModal(this.currentModalId);
    if (!modal) return;

    // 更新弹窗属性
    if (modal.props) {
      modal.props.article = article;
    }

    // 更新路由（如果需要）
    if (updateRoute) {
      this.updateRoute(article.id);
    }
  }

  /**
   * 检查是否有打开的文章查看器
   */
  isOpen(): boolean {
    if (!this.currentModalId) return false;
    const modalManager = useModalManager();
    return modalManager.isModalOpen(this.currentModalId);
  }

  /**
   * 获取当前文章查看器的模态框ID
   */
  getCurrentModalId(): string | undefined {
    return this.currentModalId;
  }

  /**
   * 打开外部文章（不更新路由）
   */
  openExternal(options: Omit<ArticleViewerOptions, 'updateRoute'>): string {
    return this.open({
      ...options,
      updateRoute: false,
      showCopyButton: options.showCopyButton ?? false, // 外部文章默认不显示复制按钮
      showComments: options.showComments ?? false, // 外部文章默认不显示评论
      showNavigation: options.showNavigation ?? false, // 外部文章默认不显示导航
    });
  }

  private handleClose(options: ArticleViewerOptions): void {
    this.currentModalId = undefined;

    // 返回指定路由或默认路由
    if (options.updateRoute) {
      const returnRoute = options.returnRoute ?? '/articles';
      const router = useRouter();
      router.push(returnRoute);
    }
  }

  private updateRoute(articleId: string): void {
    const router = useRouter();
    router.push({
      name: 'article-detail',
      params: { id: articleId },
    });
  }
}

// 单例实例
let articleViewerService: ArticleViewerService | null = null;

export function useArticleViewerService(): ArticleViewerService {
  articleViewerService ??= new ArticleViewerService();

  return articleViewerService;
}

// 便捷方法
export function openArticleViewer(options: ArticleViewerOptions): string {
  const service = useArticleViewerService();
  return service.open(options);
}

export function openExternalArticle(options: Omit<ArticleViewerOptions, 'updateRoute'>): string {
  const service = useArticleViewerService();
  return service.openExternal(options);
}

export function closeArticleViewer(): void {
  const service = useArticleViewerService();
  service.close();
}

export function navigateArticleViewer(article: Article, updateRoute = true): void {
  const service = useArticleViewerService();
  service.navigate(article, updateRoute);
}
