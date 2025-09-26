import { createRouter, createWebHashHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';

import { siteConfig } from '@/config/site';
import { titleManager } from '@/services/titleManager';
import { useAppStore } from '@/stores/app';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: {
        titleKey: null, // 首页只显示站点标题
      },
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('@/views/Gallery.vue'),
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/articles',
      name: 'articles',
      component: () => import('@/views/Articles.vue'),
      meta: {
        titleKey: 'articles.title',
      },
    },
    {
      path: '/articles/:articleId',
      name: 'article-detail',
      component: () => import('@/views/Articles.vue'),
      props: true,
      meta: {
        titleKey: 'articles.title',
      },
    },
    {
      path: '/links',
      name: 'links',
      component: () => import('@/views/Links.vue'),
      meta: {
        titleKey: 'links.title',
      },
    },
    {
      path: '/viewer/:imageId',
      name: 'image-viewer',
      component: () => import('@/views/ImageViewer.vue'),
      props: true,
      meta: {
        titleKey: 'viewer.title',
      },
    },
    {
      path: '/viewer/:imageId/:childImageId',
      name: 'image-viewer-child',
      component: () => import('@/views/ImageViewer.vue'),
      props: true,
      meta: {
        titleKey: 'viewer.title',
      },
    },
    {
      path: '/viewer-url',
      name: 'external-image-viewer',
      component: () => import('@/views/ImageViewer.vue'),
      props: (route: RouteLocationNormalized) => ({
        externalImage: route.query.url
          ? {
            url: route.query.url as string,
            name: route.query.name ? route.query.name as string : undefined,
            description: route.query.description ? route.query.description as string : undefined,
            artist: route.query.artist ? route.query.artist as string : undefined,
            date: route.query.date as string,
            tags: route.query.tags
              ? (route.query.tags as string).split(',')
              : undefined,
          }
          : undefined,
      }),
      meta: {
        titleKey: 'viewer.title',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: {
        titleKey: 'app.notFound',
      },
    },
  ],
});

// 路由前置守卫：处理图像组重定向和功能禁用重定向
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 检查功能是否被禁用，如果禁用则自动重定向到首页
  if (to.name === 'gallery') {
    if (!siteConfig.features.gallery) {
      console.log('Gallery feature is disabled, redirecting to home');
      return next({ name: 'home', replace: true });
    }
  }

  if (to.name === 'articles') {
    if (!siteConfig.features.articles) {
      console.log('Articles feature is disabled, redirecting to home');
      return next({ name: 'home', replace: true });
    }
  }

  if (to.name === 'links') {
    if (!siteConfig.features.links) {
      console.log('Links feature is disabled, redirecting to home');
      return next({ name: 'home', replace: true });
    }
  }

  // 检查是否访问单个图像路由且imageId是图像组
  if (to.name === 'image-viewer' && to.params.imageId) {
    const imageId = to.params.imageId as string;
    const image = siteConfig.images.find(img => img.id === imageId);

    // 如果是图像组（有childImages），自动重定向到第一个可用子图像
    if (image?.childImages && image.childImages.length > 0) {
      // 获取第一个可用的子图像ID（考虑过滤）
      let firstChildId = image.childImages[0].id;

      // 尝试获取第一个通过过滤的子图像
      try {
        const appStore = useAppStore();
        const firstValidChildId = appStore.getFirstValidChildId(image);
        if (firstValidChildId) {
          firstChildId = firstValidChildId;
        }
      } catch (error) {
        // 如果store不可用，使用默认的第一个子图像
        console.warn('Cannot get filtered child images, using default first', error);
      }

      console.log(`Redirect image group to child image: ${imageId} -> ${firstChildId}`);

      return next({
        name: 'image-viewer-child',
        params: {
          imageId: imageId,
          childImageId: firstChildId,
        },
        replace: true, // 使用replace避免在历史记录中留下无效的路由
      });
    }
  }

  // 其他路由正常处理
  next();
});

// 设置路由实例到标题管理器
titleManager.setRouter(router);

// 路由后置守卫：确保页面状态正确
router.afterEach((to: RouteLocationNormalized) => {
  // 确保页面滚动到顶部（除非有hash）
  if (!to.hash) {
    window.scrollTo(0, 0);
  }

  // 更新页面标题
  titleManager.updateTitle(to);
});

export default router;
