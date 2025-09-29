import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // 主题相关
  type ThemeMode = 'light' | 'dark' | 'auto';

  const themeMode = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) ?? 'auto');
  const systemDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // 计算实际的暗色模式状态
  const isDarkMode = computed(() => {
    if (themeMode.value === 'auto') {
      return systemDarkMode.value;
    }
    return themeMode.value === 'dark';
  });

  // 应用主题到 DOM
  const applyTheme = (): void => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 设置主题模式
  const setThemeMode = (mode: ThemeMode): void => {
    themeMode.value = mode;
    localStorage.setItem('theme', mode);
    applyTheme();
  };

  // 切换主题模式（循环：auto -> light -> dark -> auto）
  const toggleThemeMode = (): void => {
    const modes: ThemeMode[] = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

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
