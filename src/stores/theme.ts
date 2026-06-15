import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getBrowserDocument, getLocalStorageItem, getMediaQuery, setLocalStorageItem } from '@/utils/browser';

type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'theme';
const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark'];
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const isThemeMode = (value: string | null): value is ThemeMode => {
  return value === 'light' || value === 'dark' || value === 'auto';
};

const getStoredThemeMode = (): ThemeMode => {
  const storedThemeMode = getLocalStorageItem(THEME_STORAGE_KEY);
  return isThemeMode(storedThemeMode) ? storedThemeMode : 'auto';
};

const getSystemDarkMode = (): boolean => {
  return getMediaQuery(SYSTEM_DARK_QUERY)?.matches ?? false;
};

const noop = (): void => {
  return undefined;
};

export const useThemeStore = defineStore('theme', () => {
  const themeMode = ref<ThemeMode>(getStoredThemeMode());
  const systemDarkMode = ref(getSystemDarkMode());

  // 计算实际的暗色模式状态
  const isDarkMode = computed(() => {
    if (themeMode.value === 'auto') {
      return systemDarkMode.value;
    }
    return themeMode.value === 'dark';
  });

  // 应用主题到 DOM
  const applyTheme = (): void => {
    const rootElement = getBrowserDocument()?.documentElement;
    if (!rootElement) return;

    if (isDarkMode.value) {
      rootElement.classList.add('dark');
    } else {
      rootElement.classList.remove('dark');
    }
  };

  // 设置主题模式
  const setThemeMode = (mode: ThemeMode): void => {
    themeMode.value = mode;
    setLocalStorageItem(THEME_STORAGE_KEY, mode);
    applyTheme();
  };

  // 切换主题模式（循环：auto -> light -> dark -> auto）
  const toggleThemeMode = (): void => {
    const currentIndex = THEME_MODES.indexOf(themeMode.value);
    const nextIndex = (currentIndex + 1) % THEME_MODES.length;
    setThemeMode(THEME_MODES[nextIndex]);
  };

  // 处理系统主题变化
  const handleSystemThemeChange = (e: { matches: boolean }): void => {
    systemDarkMode.value = e.matches;
    // 如果当前是自动模式，需要重新应用主题
    if (themeMode.value === 'auto') {
      applyTheme();
    }
  };

  // 监听系统主题变化
  const setupSystemThemeListener = (): (() => void) => {
    const mediaQuery = getMediaQuery(SYSTEM_DARK_QUERY);
    if (!mediaQuery) {
      return noop;
    }

    systemDarkMode.value = mediaQuery.matches;
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // 返回清理函数
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  };

  // 兼容旧版本的 toggleDarkMode 方法
  const toggleDarkMode = (): void => {
    toggleThemeMode();
  };

  return {
    // 主题相关
    themeMode,
    isDarkMode,
    systemDarkMode,
    setThemeMode,
    toggleThemeMode,
    toggleDarkMode, // 兼容旧版本
    applyTheme,
    setupSystemThemeListener,
  };
});
