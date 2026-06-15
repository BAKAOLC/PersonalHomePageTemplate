import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // 加载状态
  const isLoading = ref(true);

  return {
    // 加载状态
    isLoading,
  };
});
