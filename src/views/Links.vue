<template>
  <div class="links-page">
    <div class="container mx-auto px-4 py-4 flex-1 h-full overflow-hidden">
      <div class="links-header">
        <div class="header-title-section">
          <h1 class="links-title">{{ $t('links.title') }}</h1>
          <p class="links-subtitle">{{ $t('links.subtitle') }}</p>
        </div>
        <!-- 统一搜索栏 -->
        <div class="unified-search-bar">
          <div class="search-input-container">
            <input
              type="text"
              :value="searchQuery"
              @input="e => updateSearchQuery((e.target as HTMLInputElement).value)"
              :placeholder="$t('links.searchPlaceholder')"
              class="search-input"
            />
            <button v-if="searchQuery" @click="clearSearch" class="search-clear">
              <i :class="getIconClass('times')" aria-hidden="true"></i>
            </button>
          </div>

          <div class="control-buttons-group">
            <!-- 生成友链信息按钮 -->
            <button
              @click="generateFriendLinkInfo"
              class="generate-button group"
              :title="$t('links.generateFriendLinkDesc')"
            >
              <i :class="getIconClass('code')" class="icon"></i>
              <span class="button-text">{{ $t('links.generateFriendLink') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="links-content">
        <!-- 分类筛选 -->
        <aside class="links-sidebar">
          <div class="sidebar-toggle md:hidden" @click="toggleMobileSidebar">
            <i :class="getIconClass('filter')" class="icon"></i>
            {{ $t('links.categories') }}
          </div>
          <div class="sidebar-content" :class="{ 'active': isSidebarOpen }">
            <div class="category-selector">
              <div class="category-list">
                <button
                  @click="selectCategory('')"
                  class="category-button"
                  :class="{ 'active': selectedCategory === '' }"
                >
                  <span class="category-name">{{ $t('links.allCategories') }}</span>
                  <span class="category-count">{{ categoryCounts[''] }}</span>
                </button>
                <button
                  v-for="category in linksConfig.categories"
                  :key="category.id"
                  @click="selectCategory(category.id)"
                  class="category-button"
                  :class="{ 'active': selectedCategory === category.id }"
                >
                  <span class="category-name">{{ t(category.name, currentLanguage) }}</span>
                  <span class="category-count">{{ categoryCounts[category.id] }}</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- 友链列表 -->
        <div class="links-main" ref="linksMain" @scroll="handleScroll">
          <div v-if="filteredLinks.length === 0" class="no-links">
            <i :class="getIconClass('link')" class="no-links-icon"></i>
            <p class="no-links-text">
              {{ searchQuery ? $t('links.noSearchResults') : $t('links.noLinks') }}
            </p>
          </div>

          <div v-else class="links-grid">
            <div
              v-for="category in filteredCategories"
              :key="category.id"
              class="category-section"
            >
              <h2 class="category-section-title">
                {{ t(category.name, currentLanguage) }}
                <span class="category-count">({{ category.links.length }})</span>
              </h2>
              <p class="category-section-description">
                {{ t(category.description, currentLanguage) }}
              </p>

              <div class="links-cards">
                <div
                  v-for="link in category.links"
                  :key="link.id"
                  class="link-card"
                  @click="visitLink(link.url)"
                >
                  <div class="link-avatar" v-if="linksConfig.settings.showAvatar">
                    <ProgressiveImage
                      :src="link.avatar || linksConfig.settings.defaultAvatar"
                      :alt="link.name"
                      class="avatar-img"
                      object-fit="cover"
                      :show-loader="false"
                    />
                  </div>

                  <div class="link-content">
                    <div class="link-info">
                      <h3 class="link-name">{{ link.name }}</h3>
                      <p v-if="linksConfig.settings.showDescription" class="link-description">
                        {{ t(link.description, currentLanguage) }}
                      </p>
                    </div>

                    <div v-if="linksConfig.settings.showTags && link.tags && link.tags.length > 0" class="link-tags">
                      <span v-for="tag in link.tags" :key="tag" class="link-tag">
                        {{ getTagText(tag, currentLanguage) }}
                      </span>
                    </div>
                  </div>

                  <div class="link-action">
                    <i :class="getIconClass('external-link-alt')" class="external-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端分类筛选弹窗 -->
    <div v-if="isMobileSidebarOpen" class="mobile-filter-overlay" @click="closeMobileSidebar">
      <div class="mobile-filter-content" @click.stop>
        <div class="mobile-filter-header">
          <h3>{{ $t('links.categories') }}</h3>
          <button @click="closeMobileSidebar" class="close-button">
            <i :class="getIconClass('times')"></i>
          </button>
        </div>
        <div class="mobile-filter-body">
          <div class="category-selector">
            <div class="category-list">
              <button
                @click="selectCategory(''); closeMobileSidebar()"
                class="category-button"
                :class="{ 'active': selectedCategory === '' }"
              >
                <span class="category-name">{{ $t('links.allCategories') }}</span>
                <span class="category-count">{{ categoryCounts[''] }}</span>
              </button>
              <button
                v-for="category in linksConfig.categories"
                :key="category.id"
                @click="selectCategory(category.id); closeMobileSidebar()"
                class="category-button"
                :class="{ 'active': selectedCategory === category.id }"
              >
                <span class="category-name">{{ t(category.name, currentLanguage) }}</span>
                <span class="category-count">{{ categoryCounts[category.id] }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 返回顶部按钮 -->
    <button v-if="showScrollToTop" @click="scrollToTop" class="scroll-to-top-button"
      :style="{ bottom: scrollToTopBottom + 'px' }">
      <i :class="getIconClass('chevron-up')"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

import type { I18nText, LinksConfig } from '@/types';

import ProgressiveImage from '@/components/ProgressiveImage.vue';
import { useMobileDetection } from '@/composables/useScreenManager';
import { useTimers } from '@/composables/useTimers';
import htmlConfig from '@/config/html.json';
import linksConfigData from '@/config/links.json';
import personalConfig from '@/config/personal.json';
import { useAppStore } from '@/stores/app';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';
import { toAbsoluteUrl } from '@/utils/url';

// 导入友链配置

const { t: $t } = useI18n();
const appStore = useAppStore();
const timers = useTimers();
const { onScreenChange } = useMobileDetection();

// 友链配置
const linksConfig = linksConfigData as LinksConfig;

// 响应式状态
const searchQuery = ref('');
const selectedCategory = ref('');
const isSidebarOpen = ref(false);
const isMobileSidebarOpen = ref(false);
const searchDebounceTimeout = ref<number | null>(null);
const linksMain = ref<HTMLElement | null>(null);
const showScrollToTop = ref(false);
const scrollToTopBottom = ref(80);

// 当前语言
const currentLanguage = computed(() => appStore.currentLanguage);

// 本地化辅助函数
const t = (text: I18nText, lang: string): string => {
  return getI18nText(text, lang);
};

// 标签本地化辅助函数
const getTagText = (tagId: string, lang: string): string => {
  const tagConfig = linksConfig.tags?.[tagId];
  if (tagConfig) {
    return getI18nText(tagConfig, lang);
  }
  return tagId;
};

// 过滤后的友链
const filteredLinks = computed(() => {
  let links = linksConfig.categories.flatMap(
    category => category.links.map(link => ({ ...link, categoryId: category.id })),
  );

  // 分类筛选
  if (selectedCategory.value) {
    links = links.filter(link => link.categoryId === selectedCategory.value);
  }

  // 搜索筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    links = links.filter(link => {
      const name = link.name.toLowerCase();
      const description = t(link.description, currentLanguage.value).toLowerCase();
      const tags = link.tags?.map(tagId => getTagText(tagId, currentLanguage.value)).join(' ').toLowerCase() || '';

      return name.includes(query) || description.includes(query) || tags.includes(query);
    });
  }

  return links;
});

// 分类计数（包括搜索后的计数）
const categoryCounts = computed(() => {
  const counts: Record<string, number> = {};

  // 计算总数
  let totalCount = 0;

  linksConfig.categories.forEach(category => {
    const filteredLinks = category.links.filter(link => {
      if (!searchQuery.value.trim()) return true;

      const query = searchQuery.value.toLowerCase().trim();
      const name = link.name.toLowerCase();
      const description = t(link.description, currentLanguage.value).toLowerCase();
      const tags = link.tags?.map(tagId => getTagText(tagId, currentLanguage.value)).join(' ').toLowerCase() || '';

      return name.includes(query) || description.includes(query) || tags.includes(query);
    });

    counts[category.id] = filteredLinks.length;
    totalCount += filteredLinks.length;
  });

  counts[''] = totalCount; // 全部分类的计数

  return counts;
});

// 过滤后的分类（用于显示）
const filteredCategories = computed(() => {
  const categories = selectedCategory.value
    ? linksConfig.categories.filter(cat => cat.id === selectedCategory.value)
    : linksConfig.categories;

  return categories.map(category => ({
    ...category,
    links: category.links.filter(link => {
      if (!searchQuery.value.trim()) return true;

      const query = searchQuery.value.toLowerCase().trim();
      const name = link.name.toLowerCase();
      const description = t(link.description, currentLanguage.value).toLowerCase();
      const tags = link.tags?.map(tagId => getTagText(tagId, currentLanguage.value)).join(' ').toLowerCase() || '';

      return name.includes(query) || description.includes(query) || tags.includes(query);
    }),
  })).filter(category => category.links.length > 0);
});

// 动态高度计算
const updateDynamicHeights = (): void => {
  const headerEl = document.querySelector('.header') as HTMLElement;
  const footerEl = document.querySelector('.footer') as HTMLElement;
  const linksHeaderEl = document.querySelector('.links-header') as HTMLElement;

  if (headerEl) {
    document.documentElement.style.setProperty('--app-header-height', `${headerEl.offsetHeight}px`);
  }

  if (footerEl) {
    document.documentElement.style.setProperty('--app-footer-height', `${footerEl.offsetHeight}px`);
  }

  if (linksHeaderEl) {
    document.documentElement.style.setProperty('--links-header-height', `${linksHeaderEl.offsetHeight}px`);
  }
};

// 选择分类
const selectCategory = (categoryId: string): void => {
  selectedCategory.value = categoryId;
};

// 移动端侧边栏控制
const toggleMobileSidebar = (): void => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
  if (isMobileSidebarOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const closeMobileSidebar = (): void => {
  isMobileSidebarOpen.value = false;
  document.body.style.overflow = '';
};

// 搜索功能
const updateSearchQuery = (value: string): void => {
  if (searchDebounceTimeout.value) {
    timers.clearTimeout(searchDebounceTimeout.value);
  }

  searchDebounceTimeout.value = timers.setTimeout(() => {
    searchQuery.value = value;
    searchDebounceTimeout.value = null;
  }, 300) as unknown as number;
};

const clearSearch = (): void => {
  searchQuery.value = '';
};

// 访问链接
const visitLink = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

// 生成友链信息
const generateFriendLinkInfo = (): void => {
  const currentUrl = window.location.origin;
  const name = getI18nText(personalConfig.name, currentLanguage.value);
  const blogName = htmlConfig.title;
  const avatarUrl = toAbsoluteUrl(personalConfig.avatar);

  const friendLinkInfo = {
    name: name,
    blogName: blogName,
    url: currentUrl,
    logo: avatarUrl,
  };

  const jsonString = JSON.stringify(friendLinkInfo, null, 2);
  // 复制到剪贴板
  navigator.clipboard.writeText(jsonString).then(() => {
    // 显示成功提示
    showNotification($t('links.copied'));
  }).catch(() => {
    // 如果剪贴板API不可用，则显示弹窗
    showJsonModal(jsonString);
  });
};

// 显示通知
const showNotification = (message: string): void => {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = 'friend-link-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;

  // 添加动画样式
  if (!document.querySelector('#friend-link-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'friend-link-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // 3秒后移除通知
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

// 显示JSON弹窗（备用方案）
const showJsonModal = (jsonString: string): void => {
  const modal = document.createElement('div');
  modal.className = 'friend-link-modal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${$t('links.friendLinkGenerated')}</h3>
          <button class="modal-close" onclick="this.closest('.friend-link-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <textarea readonly class="json-textarea">${jsonString}</textarea>
        </div>
        <div class="modal-footer">
          <button class="copy-button" onclick="
            const textarea = this.closest('.modal-content').querySelector('.json-textarea');
            textarea.select();
            document.execCommand('copy');
            this.textContent = '${$t('links.copied')}';
            setTimeout(() => this.textContent = '${$t('links.copyToClipboard')}', 2000);
          ">${$t('links.copyToClipboard')}</button>
        </div>
      </div>
    </div>
  `;

  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
  `;

  // 添加模态框样式
  if (!document.querySelector('#friend-link-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'friend-link-modal-styles';
    style.textContent = `
      .friend-link-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .friend-link-modal .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }
      .dark .friend-link-modal .modal-content {
        background: #1f2937;
      }
      .friend-link-modal .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      .dark .friend-link-modal .modal-header {
        border-bottom-color: #374151;
      }
      .friend-link-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      .dark .friend-link-modal .modal-header h3 {
        color: #f9fafb;
      }
      .friend-link-modal .modal-close {
        background: none;
        border: none;
        font-size: 16px;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      .friend-link-modal .modal-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      .dark .friend-link-modal .modal-close:hover {
        background: #374151;
        color: #d1d5db;
      }
      .friend-link-modal .modal-body {
        padding: 20px;
      }
      .friend-link-modal .json-textarea {
        width: 100%;
        height: 200px;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        background: #f9fafb;
        color: #111827;
      }
      .dark .friend-link-modal .json-textarea {
        background: #111827;
        color: #f9fafb;
        border-color: #4b5563;
      }
      .friend-link-modal .modal-footer {
        padding: 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
      }
      .dark .friend-link-modal .modal-footer {
        border-top-color: #374151;
      }
      .friend-link-modal .copy-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .friend-link-modal .copy-button:hover {
        background: #2563eb;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(modal);

  // 点击遮罩层关闭
  modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      modal.remove();
    }
  });
};

// 滚动处理
const handleScroll = (): void => {
  if (!linksMain.value) return;

  const { scrollTop } = linksMain.value;
  showScrollToTop.value = scrollTop > 200;
  updateScrollToTopPosition();
};

const updateScrollToTopPosition = (): void => {
  const footer = document.querySelector('.footer') as HTMLElement;
  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (footerRect.top < viewportHeight) {
      const distanceFromBottom = viewportHeight - footerRect.top + 20;
      scrollToTopBottom.value = Math.max(distanceFromBottom, 80);
    } else {
      scrollToTopBottom.value = 80;
    }
  }
};

const scrollToTop = (): void => {
  if (linksMain.value) {
    linksMain.value.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
};

// 屏幕变化处理
const handleScreenChange = (currentIsMobile: boolean): void => {
  if (!currentIsMobile) {
    isMobileSidebarOpen.value = false;
    isSidebarOpen.value = false;
    document.body.style.overflow = '';
  }

  updateScrollToTopPosition();

  nextTick(() => {
    updateDynamicHeights();
  });
};

// 屏幕变化监听器取消函数
let unsubscribeScreenChange: (() => void) | null = null;

onMounted(() => {
  // 注册屏幕变化监听器
  unsubscribeScreenChange = onScreenChange(handleScreenChange);

  // 初始化返回顶部按钮位置
  updateScrollToTopPosition();

  // 使用nextTick确保DOM完全渲染后更新动态高度
  nextTick(() => {
    updateDynamicHeights();
  });
});

onBeforeUnmount(() => {
  // 取消屏幕变化监听器
  if (unsubscribeScreenChange) {
    unsubscribeScreenChange();
    unsubscribeScreenChange = null;
  }

  // 清理body样式
  document.body.style.overflow = '';
});
</script>

<style scoped>
.links-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.links-header {
  @apply flex flex-wrap items-center justify-between mb-4;
  @apply border-b border-gray-200 dark:border-gray-700 pb-3;
  transition: transform 0.3s ease, opacity 0.3s ease, margin-bottom 0.3s ease;
}

.header-title-section {
  @apply flex flex-col;
}

.links-title {
  @apply text-2xl font-bold;
  @apply text-gray-900 dark:text-white;
  transition: font-size 0.3s ease, margin-bottom 0.3s ease;
}

.links-subtitle {
  @apply text-gray-600 dark:text-gray-400;
  @apply text-sm;
}

/* 统一搜索栏样式 */
.unified-search-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: rgb(249, 250, 251);
  border: 1px solid rgb(229, 231, 235);
  border-radius: 0.75rem;
  padding: 0.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .unified-search-bar {
  background-color: rgb(31, 41, 55);
  border-color: rgb(75, 85, 99);
}

.unified-search-bar .search-input-container {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  position: relative;
}

.unified-search-bar .control-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.unified-search-bar .search-input {
  width: 100%;
  padding: 0.5rem;
  padding-right: 2.5rem;
  border: 1px solid rgb(209, 213, 219);
  border-radius: 0.375rem;
  background-color: rgb(255, 255, 255);
  color: rgb(17, 24, 39);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.dark .unified-search-bar .search-input {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(243, 244, 246);
}

.unified-search-bar .search-input:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.dark .unified-search-bar .search-input:focus {
  border-color: rgb(96, 165, 250);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.unified-search-bar .search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgb(156, 163, 175);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.unified-search-bar .search-clear:hover {
  color: rgb(107, 114, 128);
  background-color: rgb(243, 244, 246);
}

.dark .unified-search-bar .search-clear:hover {
  color: rgb(209, 213, 219);
  background-color: rgb(55, 65, 81);
}

.generate-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(209, 213, 219);
  border-radius: 0.375rem;
  background-color: white;
  color: rgb(107, 114, 128);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.dark .generate-button {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(156, 163, 175);
}

.generate-button:hover {
  background-color: rgb(243, 244, 246);
  color: rgb(55, 65, 81);
}

.dark .generate-button:hover {
  background-color: rgb(75, 85, 99);
  color: rgb(209, 213, 219);
}

.generate-button:active {
  transform: scale(0.98);
}

.generate-button .icon {
  @apply w-4 h-4;
}

.generate-button .button-text {
  font-size: 0.875rem;
}

.links-content {
  display: flex;
  gap: 1.5rem;
  flex-direction: row;
  height: calc(
    100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) -
    var(--links-header-height, 0px) - 3rem
  );
  transition: height 0.3s ease, flex-direction 0.3s ease, gap 0.3s ease;
}

@media (max-width: 767px) {
  .links-header {
    @apply flex-col items-center text-center gap-2 mb-3;
    padding-bottom: 0.75rem;
  }

  .header-title-section {
    @apply text-center mb-2;
  }

  .links-title {
    @apply text-xl;
    margin-bottom: 0.5rem;
    transition: font-size 0.3s ease, margin-bottom 0.3s ease;
  }

  .links-subtitle {
    @apply text-xs;
  }

  .links-content {
    flex-direction: column;
    gap: 1rem;
  }

  .unified-search-bar {
    gap: 0.375rem;
    padding: 0.375rem;
    margin-bottom: 0.5rem;
    transition: gap 0.3s ease, padding 0.3s ease, margin-bottom 0.3s ease;
  }

  .unified-search-bar .control-buttons-group {
    gap: 0.375rem;
  }

  .generate-button .button-text {
    display: none;
  }

  .generate-button {
    min-width: 44px;
    padding: 0.375rem;
    height: 2rem;
  }

  .unified-search-bar .search-input {
    height: 2rem;
    padding: 0.375rem;
    padding-right: 2rem;
  }
}

@media (min-width: 768px) {
  .generate-button .button-text {
    display: inline;
  }
}

.links-sidebar {
  width: 100%;
  flex-shrink: 0;
  transition: width 0.3s ease;
}

@media (min-width: 768px) {
  .links-sidebar {
    width: 16rem;
    position: sticky;
    top: 1rem;
  }
}

.sidebar-toggle {
  @apply flex items-center justify-between gap-2 py-3 px-4 mb-3 rounded-lg;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-gray-700 dark:text-gray-300;
  @apply font-medium shadow-sm cursor-pointer;
}

.sidebar-content {
  @apply flex flex-col gap-3;
  @apply overflow-hidden max-h-0 transition-all duration-300;
  @apply bg-white dark:bg-gray-800 rounded-lg p-0;
  @apply border border-transparent;
}

.sidebar-content.active {
  @apply max-h-[500px] p-4 mb-4;
  @apply border-gray-200 dark:border-gray-700;
  @apply overflow-y-auto;
  scrollbar-gutter: stable;
}

/* 移动端滚动条样式 */
.sidebar-content.active::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content.active::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content.active::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.sidebar-content.active::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .sidebar-content.active::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .sidebar-content.active::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}

@media (min-width: 768px) {
  .sidebar-toggle {
    display: none;
  }

  .sidebar-content {
    @apply max-h-[calc(100vh-16rem)];
    @apply flex flex-col gap-3;
    padding: 1rem;
    @apply bg-white dark:bg-gray-800 rounded-lg;
    @apply border border-gray-200 dark:border-gray-700;
    @apply shadow-sm overflow-y-auto;
    @apply sticky top-4;
    scrollbar-gutter: stable;
  }

  /* 细滚动条样式 */
  .sidebar-content::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .sidebar-content::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }

  .dark .sidebar-content::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.5);
  }

  .dark .sidebar-content::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.7);
  }
}

.category-selector {
  margin-bottom: 0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

@media (max-width: 767px) {
  .category-list {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
  }
}

.category-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #ffffff;
  color: #374151;
  border: 1px solid #e5e7eb;
  transition: all 200ms;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .category-button {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 1rem;
  }
}

.dark .category-button {
  background-color: #111827;
  color: #f3f4f6;
  border-color: #374151;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.category-button:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .category-button:hover {
  background-color: #1f2937;
  border-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.category-button.active {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

.dark .category-button.active {
  background-color: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.category-name {
  flex: 1;
  text-align: left;
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.25rem;
  padding: 0 0.375rem;
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* 激活状态的计数徽章 */
.category-button.active .category-count {
  background-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* 非激活状态的计数徽章 */
.category-button:not(.active) .category-count {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.dark .category-button:not(.active) .category-count {
  background-color: #374151;
  color: #d1d5db;
  border: 1px solid #4b5563;
}

/* 悬停状态的计数徽章 */
.category-button:not(.active):hover .category-count {
  background-color: #e5e7eb;
  color: #374151;
  border-color: #d1d5db;
}

.dark .category-button:not(.active):hover .category-count {
  background-color: #4b5563;
  color: #f3f4f6;
  border-color: #6b7280;
}

.links-main {
  flex: 1;
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding-left: 16px;
  padding-right: 16px;
  padding-top: 2rem;
  padding-bottom: 1rem;
  transition: padding 0.3s ease;
  scrollbar-gutter: stable;
}

/* 细滚动条样式 */
.links-main::-webkit-scrollbar {
  width: 8px;
}

.links-main::-webkit-scrollbar-track {
  background: transparent;
}

.links-main::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.links-main::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .links-main::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .links-main::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}

.no-links {
  @apply flex flex-col items-center justify-center;
  @apply text-center py-16;
  @apply text-gray-500 dark:text-gray-400;
}

.no-links-icon {
  @apply text-4xl mb-4;
}

.no-links-text {
  @apply text-lg;
}

.links-grid {
  @apply space-y-8;
}

.category-section {
  @apply space-y-4;
}

.category-section-title {
  @apply text-2xl font-bold;
  @apply text-gray-900 dark:text-white;
  @apply flex items-center gap-2;
}

.category-count {
  @apply text-sm font-normal;
  @apply text-gray-500 dark:text-gray-400;
}

.category-section-description {
  @apply text-gray-600 dark:text-gray-400;
  @apply -mt-2;
}

.links-cards {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

@media (max-width: 767px) {
  .links-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .links-main {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .links-cards {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (min-width: 1024px) {
  .links-cards {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

.link-card {
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-xl shadow-sm hover:shadow-md;
  @apply p-4 cursor-pointer;
  @apply transition-all duration-300;
  @apply transform hover:-translate-y-1;
  @apply flex items-start gap-4;
  @apply h-full;
}

.link-card:hover {
  @apply border-blue-300 dark:border-blue-600;
}

.link-avatar {
  @apply flex-shrink-0;
}

.avatar-img {
  @apply w-12 h-12 rounded-full object-cover;
  @apply border-2 border-gray-200 dark:border-gray-600;
}

.link-content {
  @apply flex-1 min-w-0;
  @apply flex flex-col;
  @apply h-full;
  @apply justify-between;
}

.link-info {
  @apply flex-1;
}

.link-name {
  @apply text-lg font-semibold;
  @apply text-gray-900 dark:text-white;
  @apply mb-2 truncate;
}

.link-description {
  @apply text-gray-600 dark:text-gray-400;
  @apply text-sm leading-relaxed;
  @apply line-clamp-2;
}

.link-tags {
  @apply flex flex-wrap gap-1;
  @apply mt-3;
}

.link-tag {
  @apply px-2 py-1 text-xs;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply text-gray-600 dark:text-gray-400;
  @apply rounded-full;
}

.link-action {
  @apply flex-shrink-0 self-center;
  @apply text-gray-400 dark:text-gray-500;
  @apply transition-colors duration-200;
}

.link-card:hover .link-action {
  @apply text-blue-500 dark:text-blue-400;
}

.external-icon {
  @apply w-5 h-5;
}

/* 移动端筛选弹窗 */
.mobile-filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  touch-action: none;
}

.mobile-filter-content {
  width: 100%;
  max-height: 80vh;
  background: white;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dark .mobile-filter-content {
  background: rgb(31, 41, 55);
}

.mobile-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgb(229, 231, 235);
}

.dark .mobile-filter-header {
  border-bottom-color: rgb(75, 85, 99);
}

.mobile-filter-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(17, 24, 39);
}

.dark .mobile-filter-header h3 {
  color: rgb(243, 244, 246);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgb(243, 244, 246);
  color: rgb(75, 85, 99);
  transition: background-color 0.2s;
}

.dark .close-button {
  background: rgb(55, 65, 81);
  color: rgb(209, 213, 219);
}

.close-button:hover {
  background: rgb(229, 231, 235);
}

.dark .close-button:hover {
  background: rgb(75, 85, 99);
}

.mobile-filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 返回顶部按钮 */
.scroll-to-top-button {
  position: fixed;
  right: 1.5rem;
  width: 3rem;
  height: 3rem;
  background: rgb(59, 130, 246);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 40;
  cursor: pointer;
}

.scroll-to-top-button:hover {
  background: rgb(37, 99, 235);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

@media (max-width: 767px) {
  .scroll-to-top-button {
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 0.875rem;
  }
}

.icon {
  @apply w-4 h-4;
}

/* 响应式布局过渡动画 */
@media (prefers-reduced-motion: no-preference) {
  .links-page {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .links-header,
  .links-content,
  .links-sidebar,
  .links-main {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* 为减少动画偏好的用户禁用过渡 */
@media (prefers-reduced-motion: reduce) {
  .links-page,
  .links-header,
  .links-content,
  .links-sidebar,
  .links-main {
    transition: none !important;
  }
}

/* 文本截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
