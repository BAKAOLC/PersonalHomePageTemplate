<template>
  <div v-if="effectiveAuthorLinks && effectiveAuthorLinks.length > 0" class="author-links">
    <a
      v-for="(link, index) in effectiveAuthorLinks"
      :key="index"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="author-link-button"
      :title="getLinkTitle(link)"
    >
      <img
        v-if="getFaviconUrl(link)"
        :src="getFaviconUrl(link)"
        :alt="getLinkName(link)"
        class="link-favicon"
        @error="handleFaviconError"
      />
      <ExternalLinkIcon v-else class="link-icon" />
      <span class="link-name">{{ getLinkName(link) }}</span>
    </a>
  </div>
</template>

<script setup lang="ts">
import { ExternalLinkIcon } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import siteNames from '@/config/sites.json5';
import { useLanguageStore } from '@/stores/language';
import type { AuthorLink, SitesConfig } from '@/types';
import { getI18nText } from '@/utils/i18nText';

const props = defineProps<{
  authorLinks?: AuthorLink[]; // 作者链接
}>();

const { t: $t } = useI18n();
const languageStore = useLanguageStore();

const currentLanguage = computed(() => languageStore.currentLanguage);

// 智能匹配域名，支持子域名和多种变体
const isMatchingDomain = (hostname: string, configDomain: string): boolean => {
  // 精确匹配
  if (hostname === configDomain) {
    return true;
  }

  // 匹配 www 子域名
  if (hostname === `www.${configDomain}` || configDomain === `www.${hostname}`) {
    return true;
  }

  // 匹配其他子域名（如 mobile.twitter.com, m.youtube.com 等）
  if (hostname.endsWith(`.${configDomain}`)) {
    return true;
  }

  // 特殊处理一些已知的域名变体
  const domainVariants: Record<string, string[]> = {
    'twitter.com': ['x.com', 't.co'],
    'x.com': ['twitter.com', 't.co'],
    'youtube.com': ['youtu.be', 'm.youtube.com'],
    'instagram.com': ['instagr.am'],
    'reddit.com': ['redd.it'],
    'github.com': ['github.io'],
    'tiktok.com': ['tiktok.com', 'vm.tiktok.com'],
  };

  for (const [mainDomain, variants] of Object.entries(domainVariants)) {
    if (configDomain === mainDomain && variants.some(variant => hostname === variant || hostname.endsWith(`.${variant}`))) {
      return true;
    }
    if (variants.includes(configDomain) && (
      hostname === mainDomain || hostname.endsWith(`.${mainDomain}`)
    )) {
      return true;
    }
  }

  return false;
};

// 提取主域名（去除子域名）
const extractMainDomain = (hostname: string): string => {
  // 移除 www 前缀
  const withoutWww = hostname.replace(/^www\./, '');

  // 对于常见的二级域名，保留完整域名
  const keepFullDomain = [
    'github.io',
    'gitlab.io',
    'netlify.app',
    'vercel.app',
    'herokuapp.com',
    'blogspot.com',
    'wordpress.com',
    'co.uk',
    'co.jp',
    'com.au',
    'com.cn',
  ];

  for (const suffix of keepFullDomain) {
    if (withoutWww.endsWith(`.${suffix}`)) {
      return withoutWww;
    }
  }

  // 提取主域名部分
  const parts = withoutWww.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return withoutWww;
};

// 有效的作者链接
const effectiveAuthorLinks = computed(() => {
  return props.authorLinks ?? [];
});

// 获取链接名称
const getLinkName = (link: AuthorLink): string => {
  if (link.name) {
    return getI18nText(link.name, currentLanguage.value);
  }

  // 尝试从 URL 提取域名作为名称
  try {
    const url = new URL(link.url);
    const hostname = url.hostname.toLowerCase();

    // 使用配置文件中的网站名称映射
    const siteConfig = siteNames as SitesConfig;

    // 智能匹配域名，支持子域名和多种变体
    for (const [configDomain, siteInfo] of Object.entries(siteConfig)) {
      if (isMatchingDomain(hostname, configDomain)) {
        // 过滤掉 undefined 值和特殊属性，创建有效的 I18nText 对象
        const validSiteInfo = Object.fromEntries(
          Object.entries(siteInfo).filter(([key, value]) => value !== undefined && key !== 'iconUrl'),
        ) as Record<string, string>;
        return getI18nText(validSiteInfo, currentLanguage.value);
      }
    }

    // 如果没有匹配到配置，提取主域名并首字母大写
    const mainDomain = extractMainDomain(hostname);
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return link.url;
  }
};

// 获取 favicon URL
const getFaviconUrl = (link: AuthorLink): string | undefined => {
  if (link.favicon) {
    return link.favicon;
  }

  // 尝试从 sites 配置中获取 iconUrl
  try {
    const url = new URL(link.url);
    const hostname = url.hostname.toLowerCase();

    // 使用配置文件中的网站图标映射
    const siteConfig = siteNames as SitesConfig;

    // 智能匹配域名，支持子域名和多种变体
    for (const [configDomain, siteInfo] of Object.entries(siteConfig)) {
      if (isMatchingDomain(hostname, configDomain)) {
        if (siteInfo.iconUrl) {
          return siteInfo.iconUrl;
        }
        break;
      }
    }

    // 如果没有在配置中找到，回退到默认 favicon
    return `${url.protocol}//${url.hostname}/favicon.ico`;
  } catch {
    return undefined;
  }
};

// 获取链接标题（用于 tooltip）
const getLinkTitle = (link: AuthorLink): string => {
  const name = getLinkName(link);
  return $t('viewer.visitAuthorPage', { name });
};

// 处理 favicon 加载错误
const handleFaviconError = (event: Event): void => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.author-links {
  @apply flex flex-wrap gap-2;
}

.author-link-button {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1.5
         bg-gray-100 dark:bg-gray-800
         hover:bg-gray-200 dark:hover:bg-gray-700
         text-gray-700 dark:text-gray-300
         hover:text-gray-900 dark:hover:text-gray-100
         rounded-md text-sm font-medium
         transition-colors duration-200
         no-underline;
}

.author-link-button:hover {
  @apply no-underline;
}

.link-favicon {
  @apply w-4 h-4 object-contain;
}

.link-icon {
  @apply w-4 h-4;
}

.link-name {
  @apply text-sm;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .author-links {
    @apply gap-1.5;
  }

  .author-link-button {
    @apply px-2 py-1 text-xs;
  }

  .link-favicon,
  .link-icon {
    @apply w-3.5 h-3.5;
  }

  .link-name {
    @apply text-xs;
  }
}
</style>
