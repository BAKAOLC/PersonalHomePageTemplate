<template>
  <div id="app" class="app">
    <loading-screen v-if="isLoading" :progress="loadingProgress" @complete="onLoadingComplete" />

    <template v-else>
      <header class="header">
        <div class="header-content">
          <router-link to="/" class="logo-link">
            <img :src="siteConfig.personal.avatar" alt="Logo" class="logo" />
            <h1 class="site-title">{{ appTitle }}</h1>
          </router-link>

          <!-- 导航栏 -->
          <navigation-bar />

          <div class="header-controls">
            <language-switcher class="language-control" />
            <theme-toggle class="theme-control" />
          </div>
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import LoadingScreen from '@/components/LoadingScreen.vue';
import NotificationContainer from '@/components/NotificationContainer.vue';
import ModalContainer from '@/components/modals/ModalContainer.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import NavigationBar from '@/components/ui/NavigationBar.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { useTimers } from '@/composables/useTimers';
import { siteConfig } from '@/config/site';
import { titleManager } from '@/services/titleManager';
import { useAppStore } from '@/stores/app';
import { getAppTitle, getAppCopyright } from '@/utils/appConfig';

const { locale } = useI18n();
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
  min-height: 60px;
  /* 最小头部高度，允许在移动端扩展 */
}

.header-content {
  @apply container mx-auto px-4;
  @apply flex items-center;
  min-height: 60px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
}

.logo-link {
  @apply flex items-center gap-3;
  @apply text-gray-900 dark:text-white;
  @apply no-underline;
  @apply justify-self-start;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo {
  @apply w-8 h-8 rounded-full;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.site-title {
  @apply text-xl font-bold;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-controls {
  @apply flex items-center gap-3;
  @apply justify-self-end;
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
  height: 60px;
  /* 固定底部高度 */
}

.footer-content {
  @apply container mx-auto px-4;
  @apply flex items-center justify-center;
  @apply text-gray-500 dark:text-gray-400;
  @apply text-sm;
  height: 100%;
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
  .header {
    min-height: auto;
  }

  .header-content {
    @apply flex items-center justify-between;
    @apply py-3;
    min-height: auto;
    display: flex;
    grid-template-columns: none;
    gap: 0.5rem;
  }

  .logo-link {
    gap: 0.5rem;
    @apply justify-self-auto;
  }

  .logo {
    @apply w-6 h-6;
  }

  .site-title {
    @apply text-lg;
  }

  .header-controls {
    @apply gap-2;
    @apply justify-self-auto;
  }
}
</style>
