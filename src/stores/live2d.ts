import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'live2d-widget-visible';

export const useLive2DStore = defineStore('live2d', () => {
  /**
   * 挂件是否对用户可见（持久化到 localStorage）
   * true = 显示, false = 用户主动关闭过
   */
  const isWidgetVisible = ref<boolean>(
    localStorage.getItem(STORAGE_KEY) !== 'false',
  );

  /** 模型是否已成功初始化（用于显示加载状态） */
  const isModelReady = ref(false);

  /** 模型加载是否失败 */
  const hasError = ref(false);

  /** 显示挂件，并持久化 */
  const showWidget = (): void => {
    isWidgetVisible.value = true;
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  /** 隐藏挂件，并持久化（用户主动关闭） */
  const hideWidget = (): void => {
    isWidgetVisible.value = false;
    localStorage.setItem(STORAGE_KEY, 'false');
  };

  /** 模型加载完成回调 */
  const onModelReady = (): void => {
    isModelReady.value = true;
    hasError.value = false;
  };

  /** 模型加载失败回调 */
  const onModelError = (): void => {
    isModelReady.value = false;
    hasError.value = true;
  };

  return {
    isWidgetVisible,
    isModelReady,
    hasError,
    showWidget,
    hideWidget,
    onModelReady,
    onModelError,
  };
});
