import type { RouteLocationNormalized } from 'vue-router';

import i18n from '@/i18n';

/**
 * 页面标题管理服务
 * 统一处理所有页面标题的更新逻辑
 */
export class TitleManager {
  private static instance: TitleManager;
  private router: any | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): TitleManager {
    if (!TitleManager.instance) {
      TitleManager.instance = new TitleManager();
    }
    return TitleManager.instance;
  }

  /**
   * 设置路由实例
   */
  public setRouter(router: any): void {
    this.router = router;
  }

  /**
   * 根据路由信息更新页面标题
   */
  public updateTitle(route: RouteLocationNormalized): void {
    const { t } = i18n.global as any;
    const siteTitle = t('app.title');

    // 从路由元数据获取标题键
    const titleKey = route.meta?.titleKey as string | null;

    if (titleKey) {
      // 如果有标题键，使用格式：页面标题 - 站点标题
      const pageTitle = t(titleKey);
      document.title = `${pageTitle} - ${siteTitle}`;
    } else {
      // 如果没有标题键（如首页），只显示站点标题
      document.title = siteTitle;
    }
  }

  /**
   * 更新当前页面标题（用于语言切换时）
   * 使用路由实例获取当前路由信息
   */
  public updateCurrentTitle(): void {
    if (!this.router) {
      console.warn('Router instance not set in TitleManager');
      return;
    }

    // 使用路由实例获取当前路由
    const currentRoute = this.router.currentRoute.value;
    this.updateTitle(currentRoute);
  }
}

// 导出单例实例
export const titleManager = TitleManager.getInstance();
