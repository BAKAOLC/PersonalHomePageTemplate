<template>
  <div class="json-viewer-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="close" :title="$t('common.close')">
            <i :class="getIconClass('times')"></i>
          </button>
        </div>

        <!-- 内容 -->
        <div class="modal-body">
          <textarea
            ref="textareaRef"
            v-model="editableContent"
            class="json-textarea"
            :placeholder="$t('common.loading')"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- 底部按钮 -->
        <div class="modal-footer">
          <button class="copy-button" @click="copyToClipboard" :disabled="copying">
            <i :class="getIconClass(copying ? 'check' : 'copy')" class="button-icon"></i>
            {{ copying ? $t('links.copied') : $t('links.copyToClipboard') }}
          </button>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useNotificationManager } from '@/composables/useNotificationManager';
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

// 响应式数据
const textareaRef = ref<HTMLElement | null>(null);
const copying = ref(false);
const editableContent = ref('');

// 方法
const close = (): void => {
  emit('close');
};

const copyToClipboard = async (): Promise<void> => {
  if (!editableContent.value || copying.value) return;

  try {
    copying.value = true;

    // 尝试使用现代剪贴板API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(editableContent.value);
    } else {
      // 降级方案：使用传统方法
      const textarea = textareaRef.value as any;
      if (textarea && textarea.select) {
        textarea.select();
        textarea.setSelectionRange?.(0, 99999); // 移动端兼容
        document.execCommand('copy');
      }
    }

    // 显示成功通知
    notificationManager.success($t('links.copied'));

    // 重置按钮状态
    setTimeout(() => {
      copying.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    copying.value = false;

    // 显示错误通知
    notificationManager.error($t('common.error'));
  }
};

// 生命周期
onMounted(() => {
  // 初始化编辑内容
  editableContent.value = props.content;

  // 自动选中文本内容，方便用户复制
  nextTick(() => {
    const textarea = textareaRef.value as any;
    if (textarea && textarea.select) {
      textarea.focus();
      textarea.select();
    }
  });
});
</script>

<style scoped>
.json-viewer-modal {
  @apply w-full max-w-2xl;
  @apply max-h-[80vh];
  @apply flex flex-col;
  @apply bg-white dark:bg-gray-900;
  @apply rounded-xl shadow-2xl;
  @apply overflow-hidden;
  @apply border border-gray-200 dark:border-gray-700;
}

.modal-header {
  @apply flex items-center justify-between;
  @apply p-6 pb-4;
  @apply border-b border-gray-200 dark:border-gray-700;
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
  @apply p-6 py-4;
}

.json-textarea {
  @apply w-full h-64;
  @apply p-4;
  @apply bg-gray-50 dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-600;
  @apply rounded-lg;
  @apply font-mono text-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply resize-none;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply transition-all duration-200;
}

.json-textarea::-webkit-scrollbar {
  @apply w-2;
}

.json-textarea::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700;
  @apply rounded;
}

.json-textarea::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-500;
  @apply rounded;
}

.json-textarea::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-400;
}

.modal-footer {
  @apply p-6 pt-4;
  @apply border-t border-gray-200 dark:border-gray-700;
  @apply flex justify-end;
}

.copy-button {
  @apply flex items-center gap-2;
  @apply px-4 py-2;
  @apply bg-primary-600 hover:bg-primary-700;
  @apply disabled:bg-green-600 disabled:hover:bg-green-600;
  @apply text-white;
  @apply rounded-lg;
  @apply font-medium text-sm;
  @apply transition-all duration-200;
  @apply border-none cursor-pointer;
  @apply disabled:cursor-not-allowed;
}

.button-icon {
  @apply text-sm;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .modal-overlay {
    @apply p-2;
  }

  .modal-content {
    @apply max-h-[90vh];
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

  .json-textarea {
    @apply h-48 text-xs;
  }

  .modal-footer {
    @apply p-4 pt-3;
  }

  .copy-button {
    @apply px-3 py-2 text-xs;
  }
}

/* 动画效果 */
.json-viewer-modal {
  animation: modal-fade-in 0.2s ease-out;
}

.modal-content {
  animation: modal-slide-in 0.3s ease-out;
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
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
