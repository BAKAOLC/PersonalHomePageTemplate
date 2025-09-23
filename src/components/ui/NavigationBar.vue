<template>
  <nav v-if="shouldShowNavigation" class="navigation-bar" :class="navigationClasses">
    <div class="nav-container">
      <!-- 桌面端和宽屏移动端：直接显示所有导航项 -->
      <transition name="nav-horizontal" mode="out-in">
        <div v-if="!isNarrowMobile" key="horizontal" class="nav-items">
          <router-link
            v-for="(item, index) in visibleNavItems"
            :key="item.name"
            :to="item.path"
            class="nav-item"
            :class="{ 'nav-item-active': isActiveRoute(item.path) }"
            :style="{ 'animation-delay': `${index * 50}ms` }"
            @click="handleNavClick(item)"
          >
            <i v-if="item.icon" :class="item.icon" class="nav-icon"></i>
            <span class="nav-text">{{ t(item.label) }}</span>
          </router-link>
        </div>

        <!-- 窄屏移动端：显示当前页面 + 下拉箭头 -->
        <div v-else key="mobile" class="mobile-nav">
          <button
            class="mobile-nav-current"
            :class="{ 'mobile-nav-current-active': isMobileMenuOpen }"
            @click="toggleMobileMenu"
            :aria-label="t('nav.toggleMenu')"
          >
            <i v-if="currentNavItem?.icon" :class="currentNavItem.icon" class="current-nav-icon"></i>
            <span class="current-nav-text">{{ currentNavItem ? t(currentNavItem.label) : t('nav.menu') }}</span>
            <i class="fas fa-chevron-down nav-arrow" :class="{ 'nav-arrow-up': isMobileMenuOpen }"></i>
          </button>

          <!-- 移动端下拉菜单 -->
          <transition name="mobile-dropdown">
            <div v-if="isMobileMenuOpen" class="mobile-dropdown">
              <router-link
                v-for="item in visibleNavItems"
                :key="item.name"
                :to="item.path"
                class="mobile-dropdown-item"
                :class="{ 'mobile-dropdown-item-active': isActiveRoute(item.path) }"
                @click="handleMobileNavClick(item)"
              >
                <i v-if="item.icon" :class="item.icon" class="mobile-dropdown-icon"></i>
                <span class="mobile-dropdown-text">{{ t(item.label) }}</span>
              </router-link>
            </div>
          </transition>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useScreenManager } from '@/composables/useScreenManager';
import { siteConfig } from '@/config/site';

const { t } = useI18n();
const route = useRoute();
const { isMobile, onScreenChange } = useScreenManager();

// 移动端菜单状态
const isMobileMenuOpen = ref(false);

// 窄屏移动端检测（使用屏幕管理器的移动端判断）
// 在移动端（< 768px）使用下拉菜单，平板端和桌面端显示完整导航
const isNarrowMobile = computed(() => {
  return isMobile.value;
});

// 导航项配置
interface NavItem {
  name: string;
  path: string;
  label: string;
  icon?: string;
  requiresFeature?: keyof typeof siteConfig.features;
}

const navItems: NavItem[] = [
  {
    name: 'home',
    path: '/',
    label: 'nav.home',
    icon: 'fas fa-home',
  },
  {
    name: 'gallery',
    path: '/gallery',
    label: 'nav.gallery',
    icon: 'fas fa-images',
    requiresFeature: 'gallery',
  },
  {
    name: 'articles',
    path: '/articles',
    label: 'nav.articles',
    icon: 'fas fa-newspaper',
    requiresFeature: 'articles',
  },
  {
    name: 'links',
    path: '/links',
    label: 'nav.links',
    icon: 'fas fa-link',
    requiresFeature: 'links',
  },
];

// 计算可见的导航项
const visibleNavItems = computed(() => {
  return navItems.filter(item => {
    if (!item.requiresFeature) return true;

    return siteConfig.features[item.requiresFeature];
  });
});

// 获取当前激活的导航项
const currentNavItem = computed(() => {
  return visibleNavItems.value.find(item => isActiveRoute(item.path));
});

// 判断是否应该显示导航栏
// 只有当有多个可导航的页面时才显示导航栏
const shouldShowNavigation = computed(() => {
  return visibleNavItems.value.length > 1;
});

// 导航栏样式类
const navigationClasses = computed(() => ({
  'navigation-mobile': isMobile.value,
  'navigation-desktop': !isMobile.value,
  'navigation-narrow': isNarrowMobile.value,
}));

// 判断路由是否激活
const isActiveRoute = (path: string): boolean => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

// 处理导航点击
const handleNavClick = (_item: NavItem): void => {
  // 导航点击不需要特殊处理，路由守卫会处理重定向
};

// 处理移动端导航点击
const handleMobileNavClick = (item: NavItem): void => {
  handleNavClick(item);
  closeMobileMenu();
};

// 切换移动端菜单
const toggleMobileMenu = (): void => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// 关闭移动端菜单
const closeMobileMenu = (): void => {
  isMobileMenuOpen.value = false;
};

// 监听路由变化，关闭移动端菜单
watch(route, () => {
  closeMobileMenu();
});

// 监听屏幕尺寸变化，在切换到非窄屏时关闭移动端菜单
watch(isNarrowMobile, (newIsNarrowMobile) => {
  if (!newIsNarrowMobile) {
    closeMobileMenu();
  }
});

// 监听点击外部区域关闭菜单
const handleClickOutside = (event: Event): void => {
  const target = event.target as Element;
  if (!target.closest('.mobile-nav') && isMobileMenuOpen.value) {
    closeMobileMenu();
  }
};

// 监听ESC键关闭菜单
const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu();
  }
};

// 屏幕变化监听器清理函数
let cleanupScreenListener: (() => void) | null = null;

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);

  // 注册屏幕变化监听器，确保响应式更新
  cleanupScreenListener = onScreenChange((screenInfo) => {
    // 在屏幕切换到非移动端时关闭移动端菜单
    if (!screenInfo.isMobile && isMobileMenuOpen.value) {
      closeMobileMenu();
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);

  // 清理屏幕变化监听器
  if (cleanupScreenListener) {
    cleanupScreenListener();
  }
});
</script>

<style scoped>
.navigation-bar {
  @apply relative z-40;
  @apply flex justify-center;
  @apply justify-self-center;
}

.nav-container {
  @apply relative;
  min-height: 48px;
  @apply flex items-center justify-center;
}

/* 通用导航项样式 */
.nav-items {
  @apply flex items-center justify-center;
  @apply gap-1;
}

.nav-item {
  @apply flex items-center gap-2;
  @apply px-4 py-2 rounded-lg;
  @apply text-gray-600 dark:text-gray-300;
  @apply hover:text-primary-600 dark:hover:text-primary-400;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  @apply no-underline;
  @apply font-medium;
  animation: navItemFadeIn 0.3s ease-out;
}

.nav-item-active {
  @apply text-primary-600 dark:text-primary-400;
  @apply bg-primary-50 dark:bg-primary-900/20;
}

.nav-icon {
  @apply text-sm;
}

.nav-text {
  @apply text-sm;
}

/* 窄屏移动端导航样式 */
.mobile-nav {
  @apply relative;
  @apply flex items-center justify-center;
}

.mobile-nav-current {
  @apply flex items-center gap-2;
  @apply px-4 py-2 rounded-lg;
  @apply text-gray-700 dark:text-gray-200;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  @apply font-medium;
  @apply border-none bg-transparent;
  @apply cursor-pointer;
}

.mobile-nav-current-active {
  @apply text-primary-600 dark:text-primary-400;
  @apply bg-primary-50 dark:bg-primary-900/20;
}

.current-nav-icon {
  @apply text-sm;
}

.current-nav-text {
  @apply text-sm;
}

.nav-arrow {
  @apply text-xs;
  @apply transition-transform duration-200;
  @apply ml-1;
}

.nav-arrow-up {
  @apply transform rotate-180;
}

.mobile-dropdown {
  @apply absolute top-full left-0 right-0 z-50;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-xl;
  @apply mt-1;
  @apply overflow-hidden;
}

.mobile-dropdown-item {
  @apply flex items-center gap-3;
  @apply px-4 py-3;
  @apply text-gray-700 dark:text-gray-200;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  @apply no-underline;
  @apply font-medium;
  @apply border-b border-gray-100 dark:border-gray-700 last:border-b-0;
}

.mobile-dropdown-item-active {
  @apply text-primary-600 dark:text-primary-400;
  @apply bg-primary-50 dark:bg-primary-900/20;
}

.mobile-dropdown-icon {
  @apply text-sm;
  @apply w-4 text-center;
}

.mobile-dropdown-text {
  @apply text-sm;
}

/* 导航项淡入动画 */
@keyframes navItemFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 水平导航和移动端导航切换动画 */
.nav-horizontal-enter-active,
.nav-horizontal-leave-active {
  @apply transition-all duration-300 ease-in-out;
}

.nav-horizontal-enter-from {
  @apply transform translate-y-2 opacity-0;
}

.nav-horizontal-leave-to {
  @apply transform -translate-y-2 opacity-0;
}

/* 下拉菜单动画 */
.mobile-dropdown-enter-active,
.mobile-dropdown-leave-active {
  @apply transition-all duration-200;
}

.mobile-dropdown-enter-from,
.mobile-dropdown-leave-to {
  @apply transform -translate-y-2 opacity-0;
}

/* 平板端适配 */
@media (min-width: 768px) and (max-width: 1023px) {
  .nav-items {
    @apply gap-2;
  }

  .nav-item {
    @apply px-3 py-2;
  }
}
</style>
