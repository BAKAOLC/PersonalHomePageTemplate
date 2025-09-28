<template>
  <div id="app" class="app">
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" @complete="onLoadingComplete" />

    <template v-else>
      <header class="header">
        <!-- 第一行：标题和功能菜单 -->
        <div class="header-top">
          <div class="header-content">
            <router-link to="/" class="logo-link">
              <img :src="siteConfig.personal.avatar" :alt="t('common.logo')" class="logo" />
              <h1 class="site-title">{{ appTitle }}</h1>
            </router-link>

            <div class="header-controls">
              <LanguageSwitcher class="language-control" />
              <ThemeToggle class="theme-control" />
            </div>
          </div>
        </div>

        <!-- 第二行：导航栏 -->
        <div class="header-nav">
          <NavigationBar />
        </div>
      </header>

      <main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <p>{{ appCopyright }}</p>
        </div>
      </footer>
    </template>

    <!-- 弹窗容器 -->
    <ModalContainer />

    <!-- 通知容器 -->
    <NotificationContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import LoadingScreen from '@/components/LoadingScreen.vue';
import NotificationContainer from '@/components/NotificationContainer.vue';
import ModalContainer from '@/components/modals/ModalContainer.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import NavigationBar from '@/components/ui/NavigationBar.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { useTimers } from '@/composables/useTimers';
import { siteConfig } from '@/config/site';
import { getEventManagerService } from '@/services/eventManagerService';
import { getImageCache } from '@/services/imageCache';
import { getScreenManagerService } from '@/services/screenManagerService';
import { getTimerService } from '@/services/timerService';
import { titleManager } from '@/services/titleManager';
import { useAppStore } from '@/stores/app';
import { getAppCopyright, getAppTitle } from '@/utils/appConfig';

const { locale, t } = useI18n();
const appStore = useAppStore();
const { setTimeout } = useTimers();

// 应用配置的计算属性
const appTitle = computed(() => getAppTitle(appStore.currentLanguage));
const appCopyright = computed(() => getAppCopyright(appStore.currentLanguage));

// 存储预加载的图片引用，用于清理
const preloadedImages = ref<HTMLImageElement[]>([]);

// 加载状态
const isLoading = computed(() => appStore.isLoading);
const loadingProgress = ref(0);
const totalAssets = ref(0);
const loadedAssets = ref(0);

// 预加载基本图像（不包括画廊图片）
const preloadImages = async (): Promise<void> => {
  // 获取基本图片URL
  const imageUrls = new Set<string>();

  // 添加基本图像（如头像）
  if (siteConfig.personal.avatar) {
    imageUrls.add(siteConfig.personal.avatar);
  }

  // 添加角色头像
  siteConfig.characters.forEach(character => {
    if (character.avatar) {
      imageUrls.add(character.avatar);
    }
  });

  // 注意：不再预加载画廊图片，因为已经有预览图处理
  // 画廊图片将在需要时按需加载

  totalAssets.value = imageUrls.size;

  // 开始预加载
  const promises = Array.from(imageUrls).map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();

      // 添加到预加载图片列表中，用于后续清理
      preloadedImages.value.push(img);

      img.onload = () => {
        loadedAssets.value++;
        loadingProgress.value = (loadedAssets.value / totalAssets.value) * 100;
        resolve();
      };
      img.onerror = () => {
        loadedAssets.value++;
        loadingProgress.value = (loadedAssets.value / totalAssets.value) * 100;
        resolve(); // 即使加载失败也继续
      };
      img.src = url;
    });
  });

  // 确保至少有2秒的加载时间，即使资源很快加载完
  await Promise.all([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 2000)),
  ]);

  // 确保进度为100%
  loadingProgress.value = 100;
};

// 加载完成
const onLoadingComplete = (): void => {
  appStore.isLoading = false;
};

// 更新浏览器标题（用于语言切换时）
const updateDocumentTitle = (): void => {
  titleManager.updateCurrentTitle();
};

// 系统主题监听器清理函数
let cleanupSystemThemeListener: (() => void) | null = null;

// 初始化
onMounted(() => {
  // 初始化屏幕管理服务
  getScreenManagerService().initialize();

  // 设置初始主题
  appStore.applyTheme();

  // 设置系统主题监听器
  cleanupSystemThemeListener = appStore.setupSystemThemeListener();

  // 开始预加载图像
  preloadImages();
});

// 监听语言变化，更新浏览器标题
watch(locale, () => {
  updateDocumentTitle();
}, { immediate: false });

// 组件销毁时清理预加载的图片
onBeforeUnmount(() => {
  // 清理所有预加载的图片引用
  preloadedImages.value.forEach(img => {
    // 清理事件监听器
    img.onload = null;
    img.onerror = null;
    // 清空src以停止可能正在进行的加载
    img.src = '';
  });
  preloadedImages.value = [];

  // 清理系统主题监听器
  if (cleanupSystemThemeListener) {
    cleanupSystemThemeListener();
  }

  // 清理所有服务
  try {
    getTimerService().destroy();
    getEventManagerService().destroy();
    getScreenManagerService().destroy();
    getImageCache().clearAllCache();
  } catch (error) {
    console.error('Error cleaning up services:', error);
  }
});
</script>

<style scoped>
.app {
  @apply flex flex-col h-screen;
  @apply overflow-hidden;
  /* 防止整体滚动 */
}

.header {
  @apply bg-white dark:bg-gray-800;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply shadow-sm;
  @apply transition-all duration-500;
}

.header-top {
  @apply border-b border-gray-100 dark:border-gray-700;
  min-height: 48px;
}

.header-content {
  @apply container mx-auto px-4;
  @apply flex items-center justify-between;
  min-height: 48px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-nav {
  @apply bg-gray-50 dark:bg-gray-800/50;
  @apply transition-all duration-500;
  @apply flex items-center;
  min-height: 40px;
}

/* 优化 768-1024px 级别的容器宽度 */
@media (min-width: 768px) and (max-width: 1024px) {
  .header-content {
    @apply px-2;
    max-width: calc(100vw - 2rem);
  }
}

.logo-link {
  @apply flex items-center gap-3;
  @apply text-gray-900 dark:text-white;
  @apply no-underline;
  @apply justify-self-start;
  @apply flex-shrink-0;
  @apply min-w-0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo {
  @apply w-8 h-8 rounded-full;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.site-title {
  @apply text-xl font-bold;
  @apply whitespace-nowrap;
  @apply flex-shrink-0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-controls {
  @apply flex items-center gap-3;
  @apply justify-self-end;
  @apply flex-shrink-0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.main {
  @apply flex-1;
  @apply bg-gray-50 dark:bg-gray-900;
  @apply transition-colors duration-500;
  @apply overflow-hidden;
  /* 防止主体区域滚动，让内部组件自己控制滚动 */
}

.footer {
  @apply bg-white dark:bg-gray-800;
  @apply border-t border-gray-200 dark:border-gray-700;
  @apply transition-colors duration-500;
  height: 40px;
  /* 固定底部高度 */
}

.footer-content {
  @apply container mx-auto px-4;
  @apply flex items-center justify-center;
  @apply text-gray-500 dark:text-gray-400;
  @apply text-xs;
  height: 100%;
}

/* 优化 768-1024px 级别的容器宽度 */
@media (min-width: 768px) and (max-width: 1024px) {
  .footer-content {
    @apply px-2;
    max-width: calc(100vw - 2rem);
  }
}

/* Page Transitions */
.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-300;
}

.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}

@media (max-width: 640px) {
  .header-top {
    min-height: auto;
  }

  .header-content {
    @apply py-2;
    min-height: auto;
    gap: 0.5rem;
  }

  .logo-link {
    gap: 0.5rem;
  }

  .logo {
    @apply w-5 h-5;
  }

  .site-title {
    @apply text-base;
  }

  .header-controls {
    @apply gap-1;
  }

  .header-nav {
    min-height: 36px;
  }
}
</style>
