import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // 加载状态
  const isLoading = ref(true);
  const loadingProgress = ref(0);
  const loadingMessage = ref('');
  const loadingTip = ref('');

  return {
    // 加载状态
    isLoading,
    loadingProgress,
    loadingMessage,
    loadingTip,
  };
});
