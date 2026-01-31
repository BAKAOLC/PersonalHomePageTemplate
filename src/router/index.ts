import { createRouter, createWebHashHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';

import { siteConfig } from '@/config/site';
import { titleManager } from '@/services/titleManager';
import { useGalleryStore } from '@/stores/gallery';
import { parseParam } from '@/utils/idHashMap';

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
      path: '/character-profiles/:character?/:variant?/:image?',
      name: 'character-profiles',
      component: () => import('@/views/CharacterProfiles.vue'),
      meta: {
        titleKey: 'characterProfiles.title',
      },
    },
    {
      path: '/gallery/:imageId',
      name: 'image-viewer',
      component: () => import('@/views/Gallery.vue'),
      props: true,
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/gallery/:imageId/:childImageId',
      name: 'image-viewer-child',
      component: () => import('@/views/Gallery.vue'),
      props: true,
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/viewer-url',
      name: 'external-image-viewer',
      component: () => import('@/views/Gallery.vue'),
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
        titleKey: 'gallery.title',
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

  if (to.name === 'character-profiles') {
    if (!siteConfig.features.characterProfiles) {
      console.log('Character profiles feature is disabled, redirecting to home');
      return next({ name: 'home', replace: true });
    }
  }

  // 检查是否访问单个图像路由且imageId是图像组
  if (to.name === 'image-viewer' && to.params.imageId) {
    const rawParam = to.params.imageId as string;

    // 统一解析路由参数（支持哈希或原始 id）
    const parsed = parseParam(rawParam);

    // 如果参数是哈希，保持当前路由（不要将哈希替换为原始 id 的重定向），由视图组件解码并处理
    if (parsed.isHash) {
      return next();
    }

    const lookupImageId = parsed.parts[0];
    const lookupChildId: string | undefined = parsed.parts[1];
    const image = siteConfig.images.find(img => img.id === lookupImageId);

    // 如果是图像组（有childImages），自动重定向到第一个可用子图像
    if (image?.childImages) {
      const galleryStore = useGalleryStore();
      const firstValidChildId = galleryStore.getFirstValidChildId(image);

      const targetChild = lookupChildId ?? firstValidChildId;

      if (targetChild && targetChild !== lookupImageId) {
        return next({
          name: 'image-viewer-child',
          params: {
            imageId: lookupImageId,
            childImageId: targetChild,
          },
          replace: true,
        });
      }
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
