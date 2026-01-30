<template>
  <div class="articles-page">
    <div class="container mx-auto px-4 py-4 flex-1 h-full overflow-hidden">
      <header class="articles-header" role="banner">
        <div class="header-title-section">
          <h1 class="articles-title">{{ $t('articles.title') }}</h1>
          <p class="articles-subtitle">{{ $t('articles.subtitle') }}</p>
        </div>
        <!-- 统一搜索栏 -->
        <div class="unified-search-bar" role="search" :aria-label="$t('articles.searchArticles')">
          <div class="search-input-container">
            <label for="article-search" class="sr-only">{{ $t('articles.searchPlaceholder') }}</label>
            <input
              id="article-search"
              type="text"
              v-model="searchQuery"
              :placeholder="$t('articles.searchPlaceholder')"
              class="search-input"
              :aria-describedby="searchQuery ? 'search-results-info' : undefined"
              autocomplete="off"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="search-clear"
              :aria-label="$t('articles.clearSearch')"
              type="button"
            >
              <i :class="getIconClass('times')" aria-hidden="true"></i>
            </button>
          </div>

          <div class="control-buttons-group" role="group" :aria-label="$t('articles.sortAndFilterControls')">
            <!-- 排序按钮 -->
            <button
              @click="toggleSortOrder"
              class="sort-order-button"
              :aria-label="$t(sortOrder === 'asc' ? 'articles.sortAsc' : 'articles.sortDesc')"
              :aria-pressed="sortOrder === 'asc'"
              type="button"
            >
              <i
                :class="getIconClass(sortOrder === 'asc' ? 'sort-alpha-down' : 'sort-alpha-up')"
                aria-hidden="true"
              ></i>
              <span class="sort-order-text">{{
                $t(sortOrder === 'asc' ? 'articles.sortAsc' : 'articles.sortDesc')
              }}</span>
            </button>

            <!-- 排序方式按钮 -->
            <button
              @click="toggleSortBy"
              class="sort-by-button"
              :aria-label="sortBy.includes('date') ? $t('articles.sortDate') : $t('articles.sortTitle')"
              :aria-pressed="sortBy.includes('date')"
              type="button"
            >
              <i :class="getIconClass(sortBy.includes('date') ? 'calendar' : 'font')" aria-hidden="true"></i>
              <span class="button-text">{{
                sortBy.includes('date') ? $t('articles.sortDate') : $t('articles.sortTitle')
              }}</span>
            </button>

            <!-- 每页显示数量 -->
            <div class="page-size-selector">
              <button
                @click="togglePageSizeMenu"
                class="page-size-button"
                :aria-expanded="isPageSizeMenuOpen"
                aria-haspopup="listbox"
                :aria-label="$t('articles.selectPageSize')"
                type="button"
              >
                <i :class="getIconClass('list-ol')" class="page-size-icon" aria-hidden="true"></i>
                <span class="page-size-text">{{ displayPageSize }}</span>
                <i
                  class="arrow-icon"
                  :class="[getIconClass('chevron-down'), { 'rotate-180': isPageSizeMenuOpen }]"
                  aria-hidden="true"
                ></i>
              </button>

              <div
                v-show="isPageSizeMenuOpen"
                class="page-size-menu"
                :class="{ 'menu-open': isPageSizeMenuOpen }"
                role="listbox"
                :aria-label="$t('articles.pageSizeOptions')"
              >
                <button
                  v-for="option in pageSizeOptions"
                  :key="option.value"
                  @click="changePageSize(option.value)"
                  class="page-size-option"
                  :class="{ 'active': pageSize === option.value }"
                  role="option"
                  :aria-selected="pageSize === option.value"
                  type="button"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="articles-content" ref="articlesMain" @scroll="handleScroll">
        <!-- 左侧边栏 -->
        <aside class="articles-sidebar" role="complementary" :aria-label="$t('articles.sidebar')">
          <!-- 个人信息框 - 始终显示 -->
          <section class="personal-info-card" :aria-label="$t('articles.authorInfo')">
            <div class="avatar-container">
              <img
                :src="personalInfo.avatar"
                :alt="getI18nText(personalInfo.name, currentLanguage)"
                class="avatar"
                role="img"
              />
            </div>
            <div class="social-links" role="list" :aria-label="$t('articles.socialLinks')">
              <a
                v-for="(link, index) in personalInfo.links"
                :key="link.url"
                :href="link.url"
                :title="getI18nText(link.name, currentLanguage)"
                :aria-label="getI18nText(link.name, currentLanguage)"
                class="social-link"
                :style="{
                  '--icon-color': link.color ?? '#333',
                  'animation-delay': `${(index + 1) * animationDelayInterval}s`
                }"
                target="_blank"
                rel="noopener noreferrer"
                role="listitem"
              >
                <i :class="getIconClass(link.icon)" aria-hidden="true"></i>
              </a>
            </div>
          </section>

          <!-- 桌面端分类筛选 - 可折叠样式 -->
          <section class="category-selector hidden md:block" :aria-label="$t('articles.categories')">
            <button
              class="section-title-button"
              @click="toggleCategoriesExpansion"
              :aria-expanded="isCategoriesExpanded"
              aria-controls="categories-list"
              :aria-label="$t('articles.toggleCategories')"
              type="button"
            >
              <h3 class="selector-title">{{ $t('articles.categories') }}</h3>
              <i
                class="fa expand-icon"
                :class="getIconClass(isCategoriesExpanded ? 'chevron-up' : 'chevron-down')"
                aria-hidden="true"
              ></i>
            </button>
            <Transition name="category-list">
              <div
                v-if="isCategoriesExpanded"
                class="categories-list"
                id="categories-list"
                role="listbox"
                :aria-label="$t('articles.selectCategory')"
              >
                <!-- All 选项 -->
                <button
                  class="category-button"
                  :class="{ 'active': selectedCategory === '' }"
                  @click="clearCategoryFilter"
                  role="option"
                  :aria-selected="selectedCategory === ''"
                  :aria-label="$t('articles.showAllCategories')"
                  type="button"
                >
                  <div class="category-left">
                    <i :class="getIconClass('th')" class="category-icon" aria-hidden="true"></i>
                    <span class="category-name">{{ $t('common.all') }}</span>
                  </div>
                  <span
                    class="category-count"
                    :aria-label="$t('articles.articleCount', {
                      count: searchQuery.trim() !== '' ? filteredArticles.length : totalArticlesCount
                    })"
                  >{{
                    searchQuery.trim() !== '' ? filteredArticles.length : totalArticlesCount
                  }}</span>
                </button>

                <!-- 分类选项 - 只显示可见的分类（过滤掉计数为0的） -->
                <button
                  v-for="(category, categoryId) in visibleCategories"
                  :key="categoryId"
                  class="category-button"
                  :class="{ 'active': selectedCategory === String(categoryId) }"
                  @click="selectCategory(String(categoryId))"
                  :style="{
                    '--category-color': category.color ?? '#8b5cf6',
                    '--category-hover-color': category.color ? `${category.color}20` : '#8b5cf620'
                  }"
                  role="option"
                  :aria-selected="selectedCategory === String(categoryId)"
                  :aria-label="`${getI18nText(category.name, currentLanguage)}, ${$t('articles.articleCount', {
                    count: categoryCounts[String(categoryId)] ?? 0
                  })}`"
                  type="button"
                >
                  <div class="category-left">
                    <span class="category-name">{{ getI18nText(category.name, currentLanguage) }}</span>
                  </div>
                  <span
                    class="category-count"
                    :aria-label="$t('articles.articleCount', { count: categoryCounts[String(categoryId)] ?? 0 })"
                  >{{ categoryCounts[String(categoryId)] ?? 0 }}</span>
                </button>
              </div>
            </Transition>
          </section>

          <!-- 额外的信息卡片列表 - 在分类下面 -->
          <div v-if="infoCards && infoCards.length > 0" class="info-cards-section">
          <div
            v-for="card in infoCards"
            :key="card.id"
            class="info-card"
          >
            <div class="info-card-image-container">
              <img
                :src="getCardImage(card.image)"
                :alt="getI18nText(card.title, currentLanguage)"
                class="info-card-image"
              />
            </div>
          </div>
          </div>

          <!-- Feed 链接 -->
          <FeedLinks class="hidden md:block" />

          <!-- 移动端分类筛选切换按钮 - 在卡片下面 -->
          <div class="sidebar-toggle md:hidden" @click="toggleMobileSidebar">
            <i :class="getIconClass('filter')" class="icon"></i>
            {{ $t('articles.categories') }}
          </div>

          <!-- 移动端可折叠的分类筛选内容 -->
          <div class="mobile-category-filter md:hidden" :class="{ 'active': isSidebarOpen }">
            <!-- 分类筛选框 -->
            <div class="category-filter">
              <h3 class="filter-title">{{ $t('articles.categories') }}</h3>
              <div class="category-list">
              <!-- All 选项 -->
              <button
                class="category-item"
                :class="{ 'active': selectedCategory === '' }"
                @click="clearCategoryFilter"
              >
                <span class="category-name">{{ $t('common.all') }}</span>
                <span class="category-count">{{
                  searchQuery.trim() !== '' ? filteredArticles.length : totalArticlesCount
                }}</span>
              </button>

              <!-- 分类选项 - 只显示可见的分类（过滤掉计数为0的） -->
              <button
                v-for="(category, categoryId) in visibleCategories"
                :key="categoryId"
                class="category-item"
                :class="{ 'active': selectedCategory === String(categoryId) }"
                @click="selectCategory(String(categoryId))"
              >
                <span
                  class="category-name"
                  :style="{ color: category.color }"
                >
                  {{ getI18nText(category.name, currentLanguage) }}
                </span>
                <span class="category-count">{{ categoryCounts[String(categoryId)] ?? 0 }}</span>
              </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- 主内容区域 -->
        <main class="articles-main" role="main" :aria-label="$t('articles.articlesList')">
          <!-- 搜索结果信息 -->
          <div v-if="searchQuery" id="search-results-info" class="sr-only" aria-live="polite">
            {{ $t('articles.searchResults', { count: filteredArticles.length, query: searchQuery }) }}
          </div>

          <!-- 文章列表 -->
          <div class="articles-list" role="list" :aria-label="$t('articles.articlesList')">
            <div v-if="paginatedArticles.length === 0" class="no-articles" role="status" aria-live="polite">
              <i :class="getIconClass('newspaper')" class="no-articles-icon" aria-hidden="true"></i>
              <p class="no-articles-text">
                {{ searchQuery ? $t('articles.noSearchResults') : $t('articles.noArticles') }}
              </p>
            </div>

            <article
              v-for="article in paginatedArticles"
              :key="article.id"
              class="article-card"
              @click="openArticle(article)"
              @keydown.enter="openArticle(article)"
              @keydown.space.prevent="openArticle(article)"
              role="listitem"
              :tabindex="0"
              :aria-label="$t('articles.readArticle', { title: getI18nText(article.title, currentLanguage) })"
            >
              <!-- 文章封面 -->
              <div v-if="getArticleCover(article.cover, currentLanguage)" class="article-cover">
                <img
                  :src="getArticleCover(article.cover, currentLanguage)"
                  :alt="getI18nText(article.title, currentLanguage)"
                  class="cover-image"
                  role="img"
                />
              </div>

              <!-- 文章信息 -->
              <div class="article-info">
                <h2 class="article-title">{{ getI18nText(article.title, currentLanguage) }}</h2>

                <div class="article-meta">
                  <time
                    class="article-date"
                    :datetime="article.date"
                    :aria-label="$t('articles.publishedDate', { date: formatDate(article.date) })"
                  >
                    <i :class="getIconClass('calendar')" class="meta-icon" aria-hidden="true"></i>
                    {{ formatDate(article.date) }}
                  </time>

                  <div class="article-categories" role="list" :aria-label="$t('articles.articleCategories')">
                    <span
                      v-for="categoryId in article.categories"
                      :key="categoryId"
                      class="category-tag"
                      :style="{
                        backgroundColor: (articleCategories as any)[categoryId]?.color + '20',
                        color: (articleCategories as any)[categoryId]?.color
                      }"
                      role="listitem"
                      :aria-label="$t('articles.category', {
                        name: getI18nText((articleCategories as any)[categoryId]?.name ?? categoryId, currentLanguage)
                      })"
                    >
                      {{
                        getI18nText(
                          (articleCategories as any)[categoryId]?.name ?? categoryId,
                          currentLanguage
                        )
                      }}
                    </span>
                  </div>
                </div>

                <p class="article-summary">{{ getArticleSummary(article, currentLanguage) }}</p>

                <div class="article-actions">
                  <button
                    class="read-more-btn"
                    @click.stop="openArticle(article)"
                    :aria-label="$t('articles.readMoreAbout', { title: getI18nText(article.title, currentLanguage) })"
                    type="button"
                  >
                    {{ $t('articles.readMore') }}
                    <i :class="getIconClass('arrow-right')" class="btn-icon" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </article>
          </div>

          <!-- 分页器 -->
          <nav
            v-if="pagination.totalPages > 1"
            class="pagination"
            role="navigation"
            :aria-label="$t('articles.pagination')"
          >
            <!-- 第一行：分页按钮 -->
            <div class="pagination-controls">
              <!-- 上一页按钮 -->
              <button
                class="pagination-btn prev-btn"
                :disabled="!pagination.hasPrev"
                @click="goToPage(pagination.currentPage - 1)"
                :aria-label="$t('articles.goToPreviousPage')"
                type="button"
              >
                <i :class="getIconClass('chevron-left')" aria-hidden="true"></i>
                {{ $t('articles.previousPage') }}
              </button>

              <!-- 页码按钮 -->
              <div class="pagination-numbers">
                <template v-for="(page, index) in paginationButtons" :key="index">
                  <button
                    v-if="typeof page === 'number'"
                    class="page-btn"
                    :class="{ 'active': page === pagination.currentPage }"
                    @click="goToPage(page)"
                    :aria-label="$t('articles.goToPageNumber', { page })"
                    :aria-current="page === pagination.currentPage ? 'page' : undefined"
                    type="button"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="page-ellipsis" aria-hidden="true">...</span>
                </template>
              </div>

              <!-- 下一页按钮 -->
              <button
                class="pagination-btn next-btn"
                :disabled="!pagination.hasNext"
                @click="goToPage(pagination.currentPage + 1)"
                :aria-label="$t('articles.goToNextPage')"
                type="button"
              >
                {{ $t('articles.nextPage') }}
                <i :class="getIconClass('chevron-right')" aria-hidden="true"></i>
              </button>
            </div>

            <!-- 第二行：页面信息和快速跳转 -->
            <div class="pagination-info">
              <span class="page-info" :aria-label="$t('articles.currentPageInfo', {
                current: pagination.currentPage,
                total: pagination.totalPages
              })">
                {{ $t('articles.page', { current: pagination.currentPage, total: pagination.totalPages }) }}
              </span>

              <div class="page-jump">
                <label for="page-jump-input" class="sr-only">{{ $t('articles.jumpToPage') }}</label>
                <input
                  id="page-jump-input"
                  type="number"
                  v-model.number="jumpToPageNumber"
                  :min="1"
                  :max="pagination.totalPages"
                  class="page-input"
                  :aria-label="$t('articles.pageNumberInput')"
                  @keyup.enter="jumpToPage"
                />
                <button
                  @click="jumpToPage"
                  class="jump-btn"
                  :aria-label="$t('articles.goToPageNumber', { page: jumpToPageNumber })"
                  type="button"
                >
                  {{ $t('articles.goToPage') }}
                </button>
              </div>
            </div>
          </nav>
        </main>
      </div>
    </div>

    <!-- 移动端全屏筛选弹窗 -->
    <div
      v-if="isMobileSidebarOpen"
      class="mobile-filter-overlay"
      @click="closeMobileSidebar"
      role="dialog"
      :aria-modal="true"
      aria-labelledby="mobile-filter-title"
    >
      <div class="mobile-filter-content" @click.stop>
        <div class="mobile-filter-header">
          <h3 id="mobile-filter-title">{{ $t('articles.categories') }}</h3>
          <button
            @click="closeMobileSidebar"
            class="close-button"
            :aria-label="$t('common.close')"
            type="button"
          >
            <i :class="getIconClass('times')" aria-hidden="true"></i>
          </button>
        </div>
        <div class="mobile-filter-body">
          <!-- 分类筛选 - 使用与桌面端完全相同的结构 -->
          <div class="category-selector">
            <button
              class="section-title-button"
              @click="toggleCategoriesExpansion"
            >
              <h3 class="selector-title">{{ $t('articles.categories') }}</h3>
              <i
                class="fa expand-icon"
                :class="getIconClass(isCategoriesExpanded ? 'chevron-up' : 'chevron-down')"
              ></i>
            </button>
            <Transition name="category-list">
              <div v-if="isCategoriesExpanded" class="categories-list">
                <!-- All 选项 -->
                <button
                  class="category-button"
                  :class="{ 'active': selectedCategory === '' }"
                  @click="clearCategoryFilter"
                >
                  <div class="category-left">
                    <i :class="getIconClass('th')" class="category-icon"></i>
                    <span class="category-name">{{ $t('common.all') }}</span>
                  </div>
                  <span class="category-count">{{
                    searchQuery.trim() !== '' ? filteredArticles.length : totalArticlesCount
                  }}</span>
                </button>

                <!-- 分类选项 - 只显示可见的分类（过滤掉计数为0的） -->
                <button
                  v-for="(category, categoryId) in visibleCategories"
                  :key="categoryId"
                  class="category-button"
                  :class="{ 'active': selectedCategory === String(categoryId) }"
                  @click="selectCategory(String(categoryId))"
                  :style="{
                    '--category-color': category.color ?? '#8b5cf6',
                    '--category-hover-color': category.color ? `${category.color}20` : '#8b5cf620'
                  }"
                >
                  <div class="category-left">
                    <span class="category-name">{{ getI18nText(category.name, currentLanguage) }}</span>
                  </div>
                  <span class="category-count">{{ categoryCounts[String(categoryId)] ?? 0 }}</span>
                </button>
              </div>
            </Transition>
          </div>

        </div>
      </div>

    </div>

    <!-- 返回顶部按钮 -->
    <button
      v-if="showScrollToTop"
      @click="scrollToTop"
      class="scroll-to-top-button"
      :style="{ bottom: scrollToTopBottom + 'px' }"
      :aria-label="$t('articles.scrollToTop')"
      type="button"
    >
      <i :class="getIconClass('chevron-up')" aria-hidden="true"></i>
    </button>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import FeedLinks from '@/components/FeedLinks.vue';
import ArticleViewerModal from '@/components/modals/ArticleViewerModal.vue';
import { useEventManager } from '@/composables/useEventManager';
import { useModalManager } from '@/composables/useModalManager';
import { useMobileDetection, type ScreenInfo } from '@/composables/useScreenManager';
import articleCategoriesConfig from '@/config/articles-categories.json5';
import articlesPageConfig from '@/config/articles-page.json5';
import articlesConfig from '@/config/articles.json5';
import { siteConfig } from '@/config/site';
import { useLanguageStore } from '@/stores/language';
import type { ModalConfig } from '@/stores/modal';
import { useThemeStore } from '@/stores/theme';
import type { Article, ArticleCategoriesConfig, ArticleFilterState, ArticlePagination } from '@/types';
import {
  calculatePagination,
  countArticlesByCategory,
  filterArticles,
  formatDate,
  getArticleCover,
  getArticleSummary,
  paginateArticles,
} from '@/utils/articles';
import { getI18nText } from '@/utils/i18nText';
import { getIconClass } from '@/utils/icons';

// Props for route parameters
interface Props {
  articleId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  articleId: undefined,
});

// 导入配置
const { t: $t } = useI18n();
const languageStore = useLanguageStore();
const themeStore = useThemeStore();
const { addEventListener, removeEventListener } = useEventManager();
const { onScreenChange } = useMobileDetection();
const route = useRoute();
const router = useRouter();
const modalManager = useModalManager();

// 响应式数据
const searchQuery = ref('');
const selectedCategory = ref<string>('');
const sortBy = ref<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc');
const sortOrder = ref<'asc' | 'desc'>('desc');
const pageSize = ref<number | 'all'>(10); // Set a fixed number of articles to display per page
const currentPage = ref(1);
const jumpToPageNumber = ref(1);
const selectedArticle = ref<Article | null>(null);
const isSidebarOpen = ref(false);
const isMobileSidebarOpen = ref(false);
const isPageSizeMenuOpen = ref(false);
const isCategoriesExpanded = ref(true);
const articlesMain = ref<HTMLElement | null>(null);
const showScrollToTop = ref(false);
const scrollToTopBottom = ref(80); // 默认距离底部80px

// 模态框ID
const articleViewerModalId = ref<string | null>(null);

const currentLanguage = computed(() => languageStore.currentLanguage);

// 获取卡片图片URL（支持亮色暗色）
const getCardImage = (image: string | { light: string; dark: string }): string => {
  if (typeof image === 'string') return image;
  return themeStore.isDarkMode ? image.dark : image.light;
};

// 配置数据
const articles = ref<Article[]>(articlesConfig);
const articleCategories = ref<ArticleCategoriesConfig>(articleCategoriesConfig);
const personalInfo = computed(() => siteConfig.personal);

// 动画延迟间隔（秒），默认 0.1
const animationDelayInterval = computed(() => personalInfo.value.animationDelayInterval ?? 0.1);
const infoCards = ref(articlesPageConfig.infoCards);

// 计算属性
const filterState = computed<ArticleFilterState>(() => ({
  selectedCategories: selectedCategory.value ? [selectedCategory.value] : [],
  sortBy: sortBy.value,
  searchQuery: searchQuery.value,
  pageSize: pageSize.value,
  currentPage: currentPage.value,
}));

const filteredArticles = computed(() => {
  return filterArticles(articles.value, filterState.value, currentLanguage.value);
});

const pagination = computed<ArticlePagination>(() => {
  return calculatePagination(
    filteredArticles.value.length,
    currentPage.value,
    pageSize.value,
  );
});

const paginatedArticles = computed(() => {
  return paginateArticles(
    filteredArticles.value,
    currentPage.value,
    pageSize.value,
  );
});

// 基于所有文章的分类计数（用于显示总数）
const allCategoryCounts = computed(() => {
  return countArticlesByCategory(articles.value);
});

// 基于当前筛选结果的分类计数（用于显示搜索结果中的计数）
const filteredCategoryCounts = computed(() => {
  return countArticlesByCategory(filteredArticles.value);
});

// 根据当前是否在搜索来决定显示哪种计数
const categoryCounts = computed(() => {
  const isSearching = searchQuery.value.trim() !== '';
  return isSearching ? filteredCategoryCounts.value : allCategoryCounts.value;
});

// 过滤掉计数为0的分类（任何情况下都不显示计数为0的分类）
const visibleCategories = computed(() => {
  const visibleCats: ArticleCategoriesConfig = {};
  Object.entries(articleCategories.value).forEach(([categoryId, category]) => {
    if (categoryCounts.value[categoryId] > 0) {
      visibleCats[categoryId] = category;
    }
  });
  return visibleCats;
});

const totalArticlesCount = computed(() => {
  return articles.value.length;
});

// 方法
const clearSearch = (): void => {
  searchQuery.value = '';
};

const toggleSortOrder = (): void => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  // 更新 sortBy 以反映新的排序顺序
  if (sortBy.value.includes('date')) {
    sortBy.value = sortOrder.value === 'asc' ? 'date-asc' : 'date-desc';
  } else {
    sortBy.value = sortOrder.value === 'asc' ? 'title-asc' : 'title-desc';
  }
};

const toggleSortBy = (): void => {
  if (sortBy.value.includes('date')) {
    sortBy.value = sortOrder.value === 'asc' ? 'title-asc' : 'title-desc';
  } else {
    sortBy.value = sortOrder.value === 'asc' ? 'date-asc' : 'date-desc';
  }
};

// 页数选择相关
const pageSizeOptions = computed(() => [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: $t('articles.showAll'), value: 'all' as const },
]);

const displayPageSize = computed(() => {
  if (pageSize.value === 'all') {
    return $t('articles.showAll');
  }
  return pageSize.value.toString();
});

const togglePageSizeMenu = (): void => {
  isPageSizeMenuOpen.value = !isPageSizeMenuOpen.value;
};

// 处理页数选择器外部点击
const handlePageSizeClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  const pageSizeSelector = document.querySelector('.page-size-selector');

  if (isPageSizeMenuOpen.value && pageSizeSelector && !pageSizeSelector.contains(target)) {
    isPageSizeMenuOpen.value = false;
  }
};

const changePageSize = (size: number | 'all'): void => {
  pageSize.value = size;
  currentPage.value = 1; // 重置到第一页
  isPageSizeMenuOpen.value = false;
};

const toggleCategoriesExpansion = (): void => {
  isCategoriesExpanded.value = !isCategoriesExpanded.value;
};

const toggleMobileSidebar = (): void => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
  // 阻止背景滚动
  if (isMobileSidebarOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const closeMobileSidebar = (): void => {
  isMobileSidebarOpen.value = false;
  // 恢复背景滚动
  document.body.style.overflow = '';
};

const selectCategory = (categoryId: string): void => {
  selectedCategory.value = categoryId === selectedCategory.value ? '' : categoryId;
  currentPage.value = 1; // 重置到第一页
};

const clearCategoryFilter = (): void => {
  selectedCategory.value = '';
  currentPage.value = 1;
};

/**
 * 滚动到文章列表顶部
 */
const scrollToArticlesList = (): void => {
  nextTick(() => {
    const articlesListElement = document.querySelector('.articles-list');
    if (articlesListElement) {
      articlesListElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
};

const goToPage = (page: number): void => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    currentPage.value = page;
    jumpToPageNumber.value = page;
    // 翻页后滚动到文章列表顶部
    scrollToArticlesList();
  }
};

const jumpToPage = (): void => {
  if (jumpToPageNumber.value >= 1 && jumpToPageNumber.value <= pagination.value.totalPages) {
    currentPage.value = jumpToPageNumber.value;
    // 跳转页面后滚动到文章列表顶部
    scrollToArticlesList();
  }
};

// 生成分页按钮数组
const paginationButtons = computed(() => {
  const current = pagination.value.currentPage;
  const total = pagination.value.totalPages;

  if (total <= 7) {
    // 如果总页数小于等于7页，显示所有页码
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const buttons: (number | string)[] = [];

  if (current <= 4) {
    // 当前页在前部分
    buttons.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    // 当前页在后部分
    buttons.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    // 当前页在中间
    buttons.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return buttons;
});

// 创建文章查看器模态框的辅助函数
const createArticleViewerModal = (article: Article): ModalConfig => {
  // 生成文章链接
  const articleLink = `${window.location.origin}${window.location.pathname}#/articles/${article.id}`;
  return {
    id: `article-viewer-${Date.now()}`,
    component: ArticleViewerModal,
    props: {
      article: article,
      articles: filteredArticles.value,
      customLink: articleLink, // 传递生成的文章链接
    },
    options: {
      fullscreen: true,
      closable: true,
      maskClosable: true,
      escClosable: true,
    },
    onClose: () => {
      closeArticle();
    },
    onNavigate: (articleId: string) => {
      navigateToArticle(articleId);
    },
  };
};

const openArticle = (article: Article): void => {
  selectedArticle.value = article;

  // 使用模态管理器打开文章查看器
  articleViewerModalId.value = modalManager.open(createArticleViewerModal(article));

  // 更新URL但不刷新页面
  router.push({ name: 'article-detail', params: { articleId: article.id } });
};

const closeArticle = (): void => {
  selectedArticle.value = null;

  // 关闭模态框
  if (articleViewerModalId.value) {
    modalManager.close(articleViewerModalId.value);
    articleViewerModalId.value = null;
  }

  // 返回到文章列表页面
  router.push({ name: 'articles' });
};

const navigateToArticle = (articleId: string): void => {
  const article = articles.value.find(a => a.id === articleId);
  if (article) {
    selectedArticle.value = article;

    // 关闭当前模态框
    if (articleViewerModalId.value) {
      modalManager.close(articleViewerModalId.value);
    }

    // 打开新文章模态框
    articleViewerModalId.value = modalManager.open(createArticleViewerModal(article));

    // 更新URL
    router.push({ name: 'article-detail', params: { articleId: article.id } });
  }
};

// 从URL参数打开文章
const openArticleFromRoute = (): void => {
  const articleId = props.articleId ?? route.params.articleId as string;
  if (articleId) {
    const article = articles.value.find(a => a.id === articleId);
    if (article) {
      selectedArticle.value = article;

      // 使用模态管理器打开文章查看器
      articleViewerModalId.value = modalManager.open(createArticleViewerModal(article));
    } else {
      // 如果文章不存在，重定向到文章列表
      router.replace({ name: 'articles' });
    }
  }
};

// 处理文章列表滚动事件
const handleScroll = (): void => {
  if (!articlesMain.value) return;

  const { scrollTop } = articlesMain.value;

  // 显示/隐藏返回顶部按钮
  showScrollToTop.value = scrollTop > 200;

  // 更新返回顶部按钮位置
  updateScrollToTopPosition();
};

// 更新返回顶部按钮位置
const updateScrollToTopPosition = (): void => {
  const footer = document.querySelector('.footer') as HTMLElement;
  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (footerRect.top < viewportHeight) {
      // Footer在视口内，按钮应该在footer上方
      const distanceFromBottom = viewportHeight - footerRect.top + 20;
      scrollToTopBottom.value = Math.max(distanceFromBottom, 80);
    } else {
      // Footer不在视口内，使用默认位置
      scrollToTopBottom.value = 80;
    }
  }
};

// 滚动到文章列表顶部
const scrollToTop = (): void => {
  if (articlesMain.value) {
    articlesMain.value.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
};

// 处理屏幕变化
const handleScreenChange = ({ isMobile }: ScreenInfo): void => {
  if (!isMobile) {
    // 切换到桌面端时关闭移动端功能
    isMobileSidebarOpen.value = false;
    isSidebarOpen.value = false;
    // 恢复背景滚动
    document.body.style.overflow = '';
  }
};

// 监听器
watch([searchQuery, selectedCategory, sortBy], () => {
  currentPage.value = 1; // 筛选条件变化时重置到第一页
});

watch(pagination, (newPagination) => {
  jumpToPageNumber.value = newPagination.currentPage;
});

// 屏幕变化监听器取消函数
let unsubscribeScreenChange: (() => void) | null = null;

onMounted(() => {
  jumpToPageNumber.value = currentPage.value;

  // 注册屏幕变化监听器
  unsubscribeScreenChange = onScreenChange(handleScreenChange);

  // 添加页数选择器外部点击监听器
  addEventListener('click', handlePageSizeClickOutside, undefined, document);

  // 检查是否需要从URL参数打开文章
  openArticleFromRoute();
});

onBeforeUnmount(() => {
  // 取消屏幕变化监听器
  if (unsubscribeScreenChange) {
    unsubscribeScreenChange();
    unsubscribeScreenChange = null;
  }

  // 移除页数选择器外部点击监听器
  removeEventListener('click', handlePageSizeClickOutside, undefined, document);

  // 清理body样式
  document.body.style.overflow = '';
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.articles-page {
  @apply h-screen flex flex-col;
  @apply bg-gray-50 dark:bg-gray-900;
}

.articles-header {
  @apply flex flex-wrap items-center justify-between mb-4;
  @apply border-b border-gray-200 dark:border-gray-700 pb-3;
  transition: transform 0.3s ease, opacity 0.3s ease, margin-bottom 0.3s ease;
}

.header-title-section {
  @apply flex flex-col;
}

.articles-title {
  @apply text-2xl font-bold;
  @apply text-gray-900 dark:text-white;
  transition: font-size 0.3s ease, margin-bottom 0.3s ease;
}

.articles-subtitle {
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
  flex-wrap: wrap;
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
  padding: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unified-search-bar .search-clear:hover {
  color: rgb(107, 114, 128);
  background-color: rgb(243, 244, 246);
}

.dark .unified-search-bar .search-clear:hover {
  color: rgb(209, 213, 219);
  background-color: rgb(55, 65, 81);
}

.unified-search-bar .sort-select,
.unified-search-bar .page-size-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(209, 213, 219);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  color: rgb(17, 24, 39);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  height: 2.25rem;
  box-sizing: border-box;
}

.dark .unified-search-bar .sort-select,
.dark .unified-search-bar .page-size-select {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(243, 244, 246);
}

.unified-search-bar .sort-select:focus,
.unified-search-bar .page-size-select:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.dark .unified-search-bar .sort-select:focus,
.dark .unified-search-bar .page-size-select:focus {
  border-color: rgb(96, 165, 250);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.unified-search-bar .sort-order-button,
.unified-search-bar .sort-by-button {
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
  transition: all 0.2s;
  white-space: nowrap;
  height: 2.25rem;
  box-sizing: border-box;
}

.dark .unified-search-bar .sort-order-button,
.dark .unified-search-bar .sort-by-button {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(156, 163, 175);
}

.unified-search-bar .sort-order-button:hover,
.unified-search-bar .sort-by-button:hover {
  background-color: rgb(243, 244, 246);
  color: rgb(55, 65, 81);
}

.dark .unified-search-bar .sort-order-button:hover,
.dark .unified-search-bar .sort-by-button:hover {
  background-color: rgb(75, 85, 99);
  color: rgb(209, 213, 219);
}

.articles-content {
  @apply flex gap-6;
  flex-direction: row;
  position: relative;
  height: calc(
    100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) -
    var(--articles-header-height, 120px) - 3rem
  );
  overflow-y: auto;
}

.articles-sidebar {
  width: 360px;
  flex-shrink: 0;
  transition: width 0.3s ease, position 0.3s ease, top 0.3s ease;
}

.sidebar-toggle {
  @apply flex items-center justify-between gap-2 py-3 px-4 mb-3 rounded-lg;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-gray-700 dark:text-gray-300;
  @apply font-medium;
  @apply shadow-sm;
  @apply cursor-pointer;
}

.articles-sidebar {
  @apply flex flex-col gap-3;
  padding: 1rem;
}

.desktop-category-filter {
  @apply block;
}

.mobile-category-filter {
  @apply flex flex-col gap-3;
  @apply overflow-hidden max-h-0 transition-all duration-300;
  @apply bg-white dark:bg-gray-800 rounded-lg p-0;
  @apply border border-transparent;
}

.mobile-category-filter.active {
  @apply max-h-[500px] p-4 mb-4;
  @apply border-gray-200 dark:border-gray-700;
  @apply overflow-y-auto;
  scrollbar-gutter: stable;
}

@media (min-width: 768px) {
  .articles-sidebar {
    width: 360px;
  }

  .sidebar-toggle {
    display: none;
  }

  .category-selector {
    @apply bg-white dark:bg-gray-800 rounded-lg;
    @apply border border-gray-200 dark:border-gray-700;
    @apply shadow-sm;
    padding: 1rem;
  }

  .unified-search-bar .sort-order-text,
  .unified-search-bar .button-text {
    display: inline;
  }
}

/* 优化 768-1024px 级别的侧边栏宽度 */
@media (min-width: 768px) and (max-width: 1024px) {
  .articles-sidebar {
    width: 320px;
  }
}

/* 移动端滚动条样式 */
.mobile-category-filter.active::-webkit-scrollbar {
  width: 6px;
}

.mobile-category-filter.active::-webkit-scrollbar-track {
  background: transparent;
}

.mobile-category-filter.active::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.mobile-category-filter.active::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .mobile-category-filter.active::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .mobile-category-filter.active::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}

.personal-info-card {
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg p-4;
  @apply text-center;
}

.avatar-container {
  @apply mb-3;
}

.avatar {
  @apply w-16 h-16 rounded-full mx-auto;
  @apply border-2 border-gray-200 dark:border-gray-700;
}

.social-links {
  @apply flex flex-wrap justify-center gap-3;
}

.social-link {
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-lg;
  @apply text-sm font-medium;
  @apply transition-all duration-300;
  @apply transform hover:-translate-y-1;
  @apply text-white;
  @apply shadow-md hover:shadow-lg;
  /* 使用与PersonalSection相同的渐变背景和边框样式 */
  background: linear-gradient(135deg, var(--icon-color, #333),
    color-mix(in srgb, var(--icon-color, #333) 85%, black 15%));
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
  transform-origin: center;
  position: relative;
}

.social-link:hover {
  transform: scale(1.05) translateY(-3px);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 25px -5px rgba(0, 0, 0, 0.2),
    0 4px 6px -2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.social-link i {
  @apply w-4 h-4;
}


.category-filter {
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg p-4;
}

.filter-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-3;
}

.category-list {
  @apply space-y-2;
}

.category-item {
  @apply w-full flex items-center justify-between;
  @apply px-3 py-2 rounded-lg;
  @apply text-left;
  @apply text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
}

.category-item.active {
  @apply bg-primary-100 dark:bg-primary-900/20;
  @apply text-primary-700 dark:text-primary-300;
}

.category-name {
  @apply font-medium;
}

.category-count {
  @apply text-sm text-gray-500 dark:text-gray-400;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply px-2 py-1 rounded-full;
}

.articles-main {
  flex: 1;
  padding-left: 16px;
  padding-right: 16px;
  padding-top: 1rem;
  padding-bottom: 1rem;
  transition: padding-left 0.3s ease, padding-right 0.3s ease;
}

/* 优化 768-1024px 级别的内边距 */
@media (min-width: 768px) and (max-width: 1024px) {
  .articles-main {
    padding-left: 8px;
    padding-right: 8px;
  }
}

.articles-list {
  @apply space-y-6 mb-8;
}

.no-articles {
  @apply text-center py-12;
}

.no-articles-icon {
  @apply text-4xl text-gray-400 dark:text-gray-600 mb-4;
}

.no-articles-text {
  @apply text-gray-600 dark:text-gray-400;
}

.article-card {
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg overflow-hidden;
  @apply hover:shadow-lg dark:hover:shadow-gray-900/20;
  @apply transition-all duration-200;
  @apply cursor-pointer;
  @apply flex flex-col lg:flex-row;
}

.article-cover {
  @apply w-full lg:w-48 h-48 lg:h-auto flex-shrink-0;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply overflow-hidden;
  @apply flex items-center justify-center;
}

.cover-image {
  @apply w-full h-full object-contain;
}

.article-info {
  @apply p-6 flex-1;
}

.article-title {
  @apply text-xl font-bold text-gray-900 dark:text-white mb-3;
  @apply hover:text-primary-600 dark:hover:text-primary-400;
  @apply transition-colors duration-200;
}

.article-meta {
  @apply flex flex-wrap items-center gap-4 mb-3;
}

.article-date {
  @apply flex items-center gap-1;
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.meta-icon {
  @apply text-xs;
}

.article-categories {
  @apply flex flex-wrap gap-2;
}

.category-tag {
  @apply px-2 py-1 rounded-full;
  @apply text-xs font-medium;
  border: 1px solid currentColor;
}

.article-summary {
  @apply text-gray-700 dark:text-gray-300 mb-4;
  @apply line-clamp-3;
}

.article-actions {
  @apply flex justify-end;
}

.read-more-btn {
  @apply flex items-center gap-2;
  @apply px-4 py-2;
  @apply bg-primary-600 hover:bg-primary-700;
  @apply text-white;
  @apply rounded-lg;
  @apply transition-all duration-200;
  @apply font-medium;
}

.btn-icon {
  @apply text-sm;
}

.pagination {
  @apply flex flex-col gap-3;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg p-3;
}

.pagination-controls {
  @apply flex items-center justify-between;
  @apply w-full;
}

.pagination-btn {
  @apply flex items-center gap-2;
  @apply px-4 py-2;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply text-gray-700 dark:text-gray-300;
  @apply rounded-lg;
  @apply hover:bg-gray-200 dark:hover:bg-gray-600;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-all duration-200;
}

.pagination-info {
  @apply flex items-center justify-center gap-4;
  @apply w-full;
  @apply text-sm;
}

.page-jump {
  @apply flex items-center gap-2;
}

.page-input {
  @apply w-12 px-1 py-0.5;
  @apply border border-gray-300 dark:border-gray-600;
  @apply rounded;
  @apply bg-white dark:bg-gray-800;
  @apply text-gray-900 dark:text-white;
  @apply text-center;
  @apply text-xs;
  @apply h-7;
}

.jump-btn {
  @apply px-2 py-0.5;
  @apply bg-primary-600 hover:bg-primary-700;
  @apply text-white;
  @apply rounded;
  @apply text-xs;
  @apply transition-all duration-200;
  @apply h-7;
}

/* 新分页器样式 */
.pagination-numbers {
  @apply flex items-center justify-center;
  @apply flex-1 gap-0.5;
}

.page-btn {
  @apply flex items-center justify-center;
  @apply min-w-[32px] h-8 px-2;
  @apply border border-gray-300 dark:border-gray-600;
  @apply bg-white dark:bg-gray-800;
  @apply text-gray-700 dark:text-gray-300;
  @apply rounded;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  @apply font-medium;
  @apply cursor-pointer;
  @apply text-xs;
}

.page-btn.active {
  @apply bg-primary-600;
  @apply text-white;
  @apply border-primary-600;
}

.page-btn.active:hover {
  @apply bg-primary-700;
  @apply border-primary-700;
}

.page-ellipsis {
  @apply flex items-center justify-center;
  @apply min-w-[32px] h-8;
  @apply text-gray-500 dark:text-gray-400;
  @apply cursor-default;
  @apply text-xs;
}

.prev-btn,
.next-btn {
  @apply flex items-center gap-1;
  @apply px-3 py-1.5;
  @apply bg-gray-100 dark:bg-gray-700;
  @apply text-gray-700 dark:text-gray-300;
  @apply rounded;
  @apply hover:bg-gray-200 dark:hover:bg-gray-600;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700;
  @apply transition-all duration-200;
  @apply font-medium;
  @apply text-sm;
}

.info-cards-section {
  @apply flex flex-col gap-3;
}

.info-card {
  @apply pointer-events-none; /* 禁止点击 */
}

.info-card-image-container {
  @apply w-full;
}

.info-card-image {
  @apply w-full h-auto;
  @apply object-cover; /* 保持图片比例 */
}

/* 移动端全屏筛选弹窗 */
.mobile-filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 60;
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
  @apply flex flex-col gap-3;
}

/* 桌面端分类选择器样式 - 完全复制自Gallery组件 */
.category-selector {
  margin-bottom: 0;
}

.section-title-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  padding: 0.75rem;
  margin: 0;
  border-radius: 0.5rem;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title-button:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .section-title-button {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .section-title-button:hover {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #64748b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.selector-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark .selector-title {
  color: #f1f5f9;
}

.expand-icon {
  font-size: 0.75rem;
  color: #64748b;
  transition: all 200ms ease-out;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  background: rgba(100, 116, 139, 0.1);
  border: 1px solid rgba(100, 116, 139, 0.2);
}

.dark .expand-icon {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.2);
}

.section-title-button:hover .expand-icon {
  color: #475569;
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.3);
  transform: translateY(-1px);
}

.dark .section-title-button:hover .expand-icon {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .categories-list {
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
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  transition: all 200ms;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  text-align: left;
}

@media (max-width: 767px) {
  .category-button {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 1rem;
  }
}

.dark .category-button {
  background-color: #374151;
  color: #d1d5db;
}

.category-button:hover {
  background-color: var(--category-hover-color, #e5e7eb);
  border-color: var(--category-color, #8b5cf6);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .category-button:hover {
  background-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.category-button.active {
  background-color: var(--category-hover-color, #8b5cf620);
  border-color: var(--category-color, #8b5cf6);
  color: var(--category-color, #8b5cf6);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .category-button.active {
  background-color: var(--category-hover-color, #8b5cf630);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.category-button .category-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-button .category-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.category-button .category-name {
  font-weight: inherit;
}

.category-button .category-count {
  background-color: #e5e7eb;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
}

.dark .category-button .category-count {
  background-color: #4b5563;
  color: #9ca3af;
}

.category-button.active .category-count {
  background-color: var(--category-color, #8b5cf6);
  color: white;
}

/* 过渡动画 */
.category-list-enter-active,
.category-list-leave-active {
  transition: all 0.3s ease;
}

.category-list-enter-from,
.category-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 移动端分类选择器样式 */
.mobile-category-selector {
  width: 100%;
}

.mobile-category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

.mobile-category-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  transition: all 200ms;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  text-align: left;
}

.dark .mobile-category-button {
  background-color: #374151;
  color: #d1d5db;
}

.mobile-category-button:hover {
  background-color: var(--category-hover-color, #e5e7eb);
  border-color: var(--category-color, #8b5cf6);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .mobile-category-button:hover {
  background-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.mobile-category-button.active {
  background-color: var(--category-hover-color, #8b5cf620);
  border-color: var(--category-color, #8b5cf6);
  color: var(--category-color, #8b5cf6);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .mobile-category-button.active {
  background-color: var(--category-hover-color, #8b5cf630);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.category-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.category-name {
  font-weight: inherit;
}

.category-count {
  background-color: #e5e7eb;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
}

.dark .category-count {
  background-color: #4b5563;
  color: #9ca3af;
}

.mobile-category-button.active .category-count {
  background-color: var(--category-color, #8b5cf6);
  color: white;
}

@media (max-width: 767px) {
  .articles-header {
    @apply flex-col items-center text-center gap-2 mb-3;
    padding-bottom: 0.75rem;
  }

  .articles-title {
    @apply text-xl;
    margin-bottom: 0.5rem;
  }

  .unified-search-bar {
    gap: 0.375rem;
    padding: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .unified-search-bar .control-buttons-group {
    gap: 0.375rem;
  }

  .unified-search-bar .sort-order-button .sort-order-text,
  .unified-search-bar .sort-by-button .button-text {
    display: none;
  }

  .unified-search-bar .sort-order-button,
  .unified-search-bar .sort-by-button,
  .unified-search-bar .page-size-button {
    min-width: 44px;
    padding: 0.375rem;
    height: 2rem;
  }

  .unified-search-bar .search-input {
    height: 2rem;
    padding: 0.375rem;
    padding-right: 2rem;
  }

  .articles-content {
    flex-direction: column;
    height: calc(
      100vh - var(--app-header-height, 60px) - var(--app-footer-height, 60px) -
      var(--articles-header-height, 120px) - 3rem
    );
  }

  .articles-sidebar {
    width: 360px;
    max-width: 100%;
    flex-shrink: 0;
    margin: 0 auto;
  }

  .articles-main {
    flex: 1;
    padding-top: 0;
  }

  .article-card {
    @apply flex-col;
  }

  .article-cover {
    @apply w-full h-48;
  }

  .pagination {
    @apply flex-col gap-2;
    @apply p-2;
  }

  .pagination-controls {
    @apply flex-row;
  }

  .pagination-numbers {
    @apply gap-0.5;
    @apply flex-wrap;
    @apply justify-center;
  }

  .page-btn {
    @apply min-w-[28px] h-7;
    @apply px-1;
    @apply text-xs;
  }

  .prev-btn,
  .next-btn {
    @apply px-2 py-1;
    @apply text-xs;
    @apply min-w-[32px];
  }

  .pagination-info {
    @apply gap-3;
    @apply text-xs;
  }

  .page-ellipsis {
    @apply min-w-[36px] h-9;
  }

  .pagination-info {
    @apply flex-col gap-2;
    @apply text-center;
  }
}

/* 页数选择器样式 */
.page-size-selector {
  @apply relative;
}

.page-size-button {
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
  transition: all 0.2s;
  white-space: nowrap;
  height: 2.25rem;
  box-sizing: border-box;
  transform-origin: center;
  min-width: 80px;
}

.dark .page-size-button {
  background-color: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: rgb(156, 163, 175);
}

.page-size-button:hover {
  background-color: rgb(243, 244, 246);
  color: rgb(55, 65, 81);
}

.dark .page-size-button:hover {
  background-color: rgb(75, 85, 99);
  color: rgb(209, 213, 219);
}

.page-size-icon {
  @apply w-4 h-4;
  flex-shrink: 0;
}

.page-size-menu {
  @apply absolute right-0 mt-2 py-1;
  @apply bg-white dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg;
  @apply w-32 z-10;
  @apply opacity-0 scale-95 origin-top-right;
  @apply transition-all duration-300;
  transform: translateY(-10px) scale(0.95);
}

.menu-open {
  @apply opacity-100 scale-100;
  transform: translateY(0) scale(1);
}

.page-size-option {
  @apply flex items-center w-full px-4 py-2;
  @apply text-left text-sm text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
  transform-origin: left center;
}

.page-size-option.active {
  @apply bg-primary-50 dark:bg-primary-900/20;
  @apply text-primary-700 dark:text-primary-400;
  @apply font-medium;
}

.page-size-text {
  transition: all 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
}

.arrow-icon {
  @apply w-4 h-4 ml-1 transition-all duration-300 ease-in-out;
  overflow: hidden;
  flex-shrink: 0;
}

.arrow-icon.rotate-180 {
  transform: rotate(180deg);
}

.info-card-image-container.no-border {
  border: none;
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

/* 屏幕阅读器专用样式 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 焦点样式优化 */
.article-card:focus,
.article-card:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.category-button:focus,
.category-button:focus-visible,
.sort-order-button:focus,
.sort-by-button:focus,
.page-size-button:focus,
.page-size-button:focus-visible,
.pagination-btn:focus,
.pagination-btn:focus-visible,
.read-more-btn:focus,
.read-more-btn:focus-visible,
.scroll-to-top-button:focus,
.scroll-to-top-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .article-card,
  .category-button,
  .sort-order-button,
  .sort-by-button,
  .page-size-button,
  .pagination-btn,
  .read-more-btn {
    border: 2px solid;
  }

  .article-card:focus,
  .category-button:focus,
  .sort-order-button:focus,
  .sort-by-button:focus,
  .page-size-button:focus,
  .pagination-btn:focus,
  .read-more-btn:focus {
    outline: 3px solid;
    outline-offset: 1px;
  }
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .article-card,
  .category-button,
  .sort-order-button,
  .sort-by-button,
  .page-size-button,
  .pagination-btn,
  .read-more-btn,
  .scroll-to-top-button {
    transition: none !important;
    transform: none !important;
  }

  .article-card:hover,
  .category-button:hover,
  .sort-order-button:hover,
  .sort-by-button:hover,
  .page-size-button:hover,
  .pagination-btn:hover,
  .read-more-btn:hover,
  .scroll-to-top-button:hover {
    transform: none !important;
  }
}

/* 中小屏幕（平板和小桌面）- 隐藏分页按钮文本 */
@media (max-width: 1023px) {
  .prev-btn,
  .next-btn {
    @apply px-2;
    @apply min-w-[32px];
    @apply py-1;
    font-size: 0; /* 隐藏文本 */
  }

  .prev-btn i,
  .next-btn i {
    font-size: 0.875rem; /* 恢复图标尺寸 */
  }

  .pagination-controls {
    @apply flex-row;
  }

  .pagination-numbers {
    @apply justify-center;
    @apply gap-0.5;
  }

  .page-btn {
    @apply min-w-[28px] h-7 px-1;
    @apply text-xs;
  }

  .page-ellipsis {
    @apply min-w-[28px] h-7;
  }
}

/* 动画关键帧 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
