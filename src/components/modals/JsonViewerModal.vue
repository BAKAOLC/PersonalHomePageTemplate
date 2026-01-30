<template>
  <div class="json-viewer-modal">
    <!-- 头部 -->
    <div class="modal-header">
      <h3 class="modal-title">{{ title }}</h3>
      <div class="header-actions">
        <button class="modal-close" @click="close" :title="$t('common.close')">
          <i :class="getIconClass('times')"></i>
        </button>
      </div>
    </div>

    <!-- Monaco Editor 组件 -->
    <div class="modal-body">
      <MonacoEditor
        ref="monacoEditorRef"
        v-model="editorContent"
        language="json"
        :height="editorHeight"
        read-only
        :show-toolbar="false"
        :show-minimap="false"
        show-line-numbers
        word-wrap="on"
        :font-size="14"
        format-on-paste
        format-on-type
        :quick-suggestions="false"
        :suggest-on-trigger-characters="false"
        accept-suggestion-on-enter="off"
        automatic-layout
        @ready="onEditorReady"
        @change="onContentChange"
        @format="onFormat"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import MonacoEditor from '@/components/MonacoEditor.vue';
import { useNotificationManager } from '@/composables/useNotificationManager';
import { useScreenManager } from '@/composables/useScreenManager';
import { useTimers } from '@/composables/useTimers';
import { getIconClass } from '@/utils/icons';

interface Props {
  title: string;
  content: string;
  closable?: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
});

const emit = defineEmits<Emits>();

const { t: $t } = useI18n();
const notificationManager = useNotificationManager();
const screenManager = useScreenManager();
const { setTimeout, clearTimeout } = useTimers();

// 响应式数据
const monacoEditorRef = ref<InstanceType<typeof MonacoEditor> | null>(null);
const editorContent = ref(props.content);

// 编辑器高度
const editorHeight = ref('300px');

// 方法
const close = (): void => {
  emit('close');
};

// 动态调整编辑器高度
const adjustEditorHeight = (): void => {
  if (!monacoEditorRef.value || !monacoEditorRef.value.isReady) {
    return;
  }

  const { editor } = monacoEditorRef.value;
  if (!editor) {
    return;
  }

  const model = editor.getModel();
  if (!model) {
    return;
  }

  try {
    // 获取内容行数
    const lineCount = model.getLineCount();

    // 获取行高
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);

    // 计算内容高度
    const contentHeight = lineCount * lineHeight;

    // 根据屏幕尺寸设置编辑器的上下限
    const screenInfo = screenManager.screenInfo.value;

    let minHeight: number;
    let maxHeight: number;

    if (screenInfo.isTinyMobile) {
      // 小屏手机：最小200px，最大屏幕高度的70%
      minHeight = 200;
      maxHeight = screenInfo.height * 0.70;
    } else if (screenInfo.isMobile) {
      // 移动端：最小200px，最大屏幕高度的65%
      minHeight = 200;
      maxHeight = screenInfo.height * 0.65;
    } else if (screenInfo.isTablet) {
      // 平板：最小250px，最大屏幕高度的60%
      minHeight = 250;
      maxHeight = screenInfo.height * 0.60;
    } else if (!screenInfo.isLargeDesktop) {
      // 中等屏幕：最小300px，最大屏幕高度的55%
      minHeight = 300;
      maxHeight = screenInfo.height * 0.55;
    } else {
      // 桌面：最小300px，最大屏幕高度的50%
      minHeight = 300;
      maxHeight = screenInfo.height * 0.50;
    }

    // 编辑器高度：内容高度，但受上下限约束
    const finalHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));
    // 更新高度
    const newHeight = `${finalHeight}px`;
    if (editorHeight.value !== newHeight) {
      editorHeight.value = newHeight;
    }
  } catch (error) {
    console.warn('Height adjustment failed:', error);
  }
};

// 编辑器事件处理
const onEditorReady = (): void => {
  // 编辑器准备好后调整高度
  setTimeout(() => {
    adjustEditorHeight();
  }, 100);
};

// 内容变化防抖定时器
let contentChangeTimeout: number | null = null;
let isContentChanging = false;

const onContentChange = (value: string): void => {
  editorContent.value = value;

  if (isContentChanging) return;

  isContentChanging = true;

  // 清除之前的定时器
  if (contentChangeTimeout) {
    clearTimeout(contentChangeTimeout);
  }

  // 设置新的防抖定时器
  contentChangeTimeout = setTimeout(() => {
    adjustEditorHeight();
    contentChangeTimeout = null;
    isContentChanging = false;
  }, 150); // 150ms 防抖延迟
};

const onFormat = (): void => {
  notificationManager.success($t('common.success'));
};

// 屏幕变化回调
const handleScreenChange = (): void => {
  adjustEditorHeight();
};

// 屏幕变化取消注册函数
let unregisterScreenChange: (() => void) | null = null;

// 生命周期
onMounted(() => {
  editorContent.value = props.content;

  // 注册屏幕变化监听器
  unregisterScreenChange = screenManager.onScreenChange(handleScreenChange);
});

onBeforeUnmount(() => {
  // 取消注册屏幕变化监听器
  if (unregisterScreenChange) {
    unregisterScreenChange();
    unregisterScreenChange = null;
  }

  // 清理内容变化定时器
  if (contentChangeTimeout) {
    clearTimeout(contentChangeTimeout);
    contentChangeTimeout = null;
  }

  isContentChanging = false;
});
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.json-viewer-modal {
  @apply w-[calc(100vw-1rem)] max-w-6xl;
  @apply min-h-[200px];
  @apply max-h-[90vh];
  @apply flex flex-col;
  @apply bg-white dark:bg-gray-900;
  @apply rounded-xl shadow-2xl;
  @apply overflow-hidden;
  @apply border border-gray-200 dark:border-gray-700;
}

.modal-header {
  @apply flex items-center justify-between;
  @apply p-5 pb-4;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply flex-shrink-0;
}

.header-actions {
  @apply flex items-center gap-2;
}

.action-button {
  @apply w-8 h-8;
  @apply flex items-center justify-center;
  @apply bg-gray-100 dark:bg-gray-800;
  @apply text-gray-500 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700;
  @apply hover:text-gray-700 dark:hover:text-gray-200;
  @apply rounded-lg;
  @apply transition-all duration-200;
  @apply border-none cursor-pointer;
}

.action-icon {
  @apply text-sm;
}

.modal-title {
  @apply text-lg font-semibold;
  @apply text-gray-900 dark:text-white;
  @apply m-0;
}

.modal-close {
  @apply w-8 h-8;
  @apply flex items-center justify-center;
  @apply bg-gray-100 dark:bg-gray-800;
  @apply text-gray-500 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700;
  @apply hover:text-gray-700 dark:hover:text-gray-200;
  @apply rounded-lg;
  @apply transition-all duration-200;
  @apply border-none cursor-pointer;
}

.modal-body {
  @apply flex-1;
  @apply p-5 py-4;
  @apply overflow-auto;
  @apply min-h-0;
}

.editor-container {
  @apply w-full h-full;
  @apply border border-gray-200 dark:border-gray-600;
  @apply rounded-lg;
  @apply overflow-hidden;
}

.modal-footer {
  @apply p-5 pt-4;
  @apply border-t border-gray-200 dark:border-gray-700;
  @apply flex justify-end;
  @apply flex-shrink-0;
}

/* 中等屏幕适配 */
@media (max-width: 1279px) {
  .json-viewer-modal {
    @apply w-[calc(100vw-2rem)] max-w-5xl;
    @apply max-h-[85vh];
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .json-viewer-modal {
    @apply w-[calc(100vw-2rem)] max-w-4xl;
    @apply max-h-[80vh];
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .json-viewer-modal {
    @apply w-[calc(100vw-1rem)] max-w-none;
    @apply max-h-[85vh];
  }

  .modal-header {
    @apply p-4 pb-3;
  }

  .modal-title {
    @apply text-base;
  }

  .modal-body {
    @apply p-4 py-3;
  }

  .modal-footer {
    @apply p-4 pt-3;
  }

}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .json-viewer-modal {
    @apply w-[calc(100vw-0.5rem)];
    @apply max-h-[90vh];
  }

  .modal-header {
    @apply p-3 pb-2;
  }

  .modal-body {
    @apply p-3 py-2;
  }

  .modal-footer {
    @apply p-3 pt-2;
  }
}

/* 动画效果 */
.json-viewer-modal {
  animation: modal-fade-in 0.15s ease-out;
}

.modal-content {
  animation: modal-slide-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
