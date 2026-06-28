import { createRouter, createWebHashHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';

import { siteConfig } from '@/config/site';
import { titleManager } from '@/services/titleManager';
import { scrollWindowToTop } from '@/utils/browser';
import Articles from '@/views/Articles.vue';
import CharacterProfiles from '@/views/CharacterProfiles.vue';
import Gallery from '@/views/Gallery.vue';
import Home from '@/views/Home.vue';
import Links from '@/views/Links.vue';
import NotFound from '@/views/NotFound.vue';

const featureRouteGuards: Record<string, () => boolean> = {
  gallery: () => siteConfig.features.gallery,
  'image-viewer': () => siteConfig.features.gallery,
  'image-viewer-child': () => siteConfig.features.gallery,
  'external-image-viewer': () => siteConfig.features.gallery,
  articles: () => siteConfig.features.articles,
  'article-detail': () => siteConfig.features.articles,
  links: () => siteConfig.features.links,
  'character-profiles': () => siteConfig.features.characterProfiles,
};

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: {
        titleKey: null, // 首页只显示站点标题
      },
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: Gallery,
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/articles',
      name: 'articles',
      component: Articles,
      meta: {
        titleKey: 'articles.title',
      },
    },
    {
      path: '/articles/:articleId',
      name: 'article-detail',
      component: Articles,
      props: true,
      meta: {
        titleKey: 'articles.title',
      },
    },
    {
      path: '/links',
      name: 'links',
      component: Links,
      meta: {
        titleKey: 'links.title',
      },
    },
    {
      path: '/character-profiles/:character?/:variant?/:image?',
      name: 'character-profiles',
      component: CharacterProfiles,
      meta: {
        titleKey: 'characterProfiles.title',
      },
    },
    {
      path: '/gallery/:imageId',
      name: 'image-viewer',
      component: Gallery,
      props: true,
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/gallery/:imageId/:childImageId',
      name: 'image-viewer-child',
      component: Gallery,
      props: true,
      meta: {
        titleKey: 'gallery.title',
      },
    },
    {
      path: '/viewer-url',
      name: 'external-image-viewer',
      component: Gallery,
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
      component: NotFound,
      meta: {
        titleKey: 'app.notFound',
      },
    },
  ],
});

// 路由前置守卫：处理功能禁用重定向
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 检查功能是否被禁用，如果禁用则自动重定向到首页
  const featureGuard = typeof to.name === 'string' ? featureRouteGuards[to.name] : undefined;
  if (featureGuard && !featureGuard()) {
    return next({ name: 'home', replace: true });
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
    scrollWindowToTop();
  }

  // 更新页面标题
  titleManager.updateTitle(to);
});

export default router;
