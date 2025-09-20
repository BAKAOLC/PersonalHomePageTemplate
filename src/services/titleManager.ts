import type { RouteLocationNormalized } from 'vue-router';

import i18n from '@/i18n';

/**
 * 页面标题管理服务
 * 统一处理所有页面标题的更新逻辑
 */
export class TitleManager {
  private static instance: TitleManager;

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
   * 根据路由信息更新页面标题
   */
  public updateTitle(route: RouteLocationNormalized): void {
    const { t } = i18n.global;
    const siteTitle = t('app.title');

    if (route.name === 'home') {
      document.title = siteTitle;
    } else if (route.name === 'gallery') {
      document.title = `${t('gallery.title')} - ${siteTitle}`;
    } else if (route.name === 'image-viewer' || route.name === 'image-viewer-child') {
      document.title = `${t('viewer.title')} - ${siteTitle}`;
    } else if (route.name === 'not-found') {
      document.title = `${t('app.notFound')} - ${siteTitle}`;
    } else {
      document.title = siteTitle;
    }
  }

  /**
   * 更新当前页面标题（用于语言切换时）
   */
  public updateCurrentTitle(): void {
    // 获取当前路由信息
    const currentRoute = window.location.hash;

    // 简单的路由匹配逻辑
    let routeName = 'home';
    if (currentRoute.includes('/gallery')) {
      routeName = 'gallery';
    } else if (currentRoute.includes('/viewer/')) {
      routeName = 'image-viewer';
    } else if (currentRoute.includes('/not-found') || currentRoute.includes('pathMatch')) {
      routeName = 'not-found';
    }

    // 创建模拟的路由对象
    const mockRoute = {
      name: routeName,
    } as RouteLocationNormalized;

    this.updateTitle(mockRoute);
  }
}

// 导出单例实例
export const titleManager = TitleManager.getInstance();
