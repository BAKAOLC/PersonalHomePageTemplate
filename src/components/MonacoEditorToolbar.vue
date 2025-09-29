<template>
  <div v-if="showToolbar" class="monaco-editor-toolbar">
    <div class="toolbar-group">
      <!-- 撤销重做 -->
      <template v-if="toolbarOptions.showUndoRedo">
        <button
          class="toolbar-button"
          :disabled="!canUndo"
          @click="undo"
          :title="$t('common.undo')"
        >
          <i :class="getIconClass('undo')" class="button-icon"></i>
        </button>
        <button
          class="toolbar-button"
          :disabled="!canRedo"
          @click="redo"
          :title="$t('common.redo')"
        >
          <i :class="getIconClass('redo')" class="button-icon"></i>
        </button>
      </template>

      <div class="toolbar-separator"></div>

      <!-- 查找替换 -->
      <template v-if="toolbarOptions.showFindReplace">
        <button
          class="toolbar-button"
          @click="find"
          :title="$t('common.find')"
        >
          <i :class="getIconClass('search')" class="button-icon"></i>
        </button>
        <button
          class="toolbar-button"
          @click="replace"
          :title="$t('common.replace')"
        >
          <i :class="getIconClass('search-plus')" class="button-icon"></i>
        </button>
      </template>

      <div class="toolbar-separator"></div>

      <!-- 格式化 -->
      <template v-if="toolbarOptions.showFormat">
        <button
          class="toolbar-button"
          @click="format"
          :title="$t('common.format')"
        >
          <i :class="getIconClass('code')" class="button-icon"></i>
        </button>
      </template>

      <!-- 复制 -->
      <template v-if="toolbarOptions.showCopy">
        <button
          class="toolbar-button"
          @click="copyToClipboard"
          :disabled="copying"
          :title="copying ? $t('links.copied') : $t('common.copy')"
        >
          <i :class="getIconClass(copying ? 'check' : 'copy')" class="button-icon"></i>
        </button>
      </template>

      <div class="toolbar-separator"></div>

      <!-- 只读切换 -->
      <template v-if="toolbarOptions.showReadOnlyToggle">
        <button
          class="toolbar-button"
          @click="toggleReadOnly"
          :title="readOnly ? $t('common.unlock') : $t('common.lock')"
        >
          <i :class="getIconClass(readOnly ? 'unlock' : 'lock')" class="button-icon"></i>
        </button>
      </template>

      <!-- 小地图切换 -->
      <template v-if="toolbarOptions.showMinimapToggle">
        <button
          class="toolbar-button"
          @click="toggleMinimap"
          :title="minimapEnabled ? $t('common.hideMinimap') : $t('common.showMinimap')"
        >
          <i :class="getIconClass('map')" class="button-icon"></i>
        </button>
      </template>

      <!-- 自动换行切换 -->
      <template v-if="toolbarOptions.showWordWrapToggle">
        <button
          class="toolbar-button"
          @click="toggleWordWrap"
          :title="wordWrap === 'on' ? $t('common.disableWordWrap') : $t('common.enableWordWrap')"
        >
          <i :class="getIconClass('text-width')" class="button-icon"></i>
        </button>
      </template>

      <!-- 行号切换 -->
      <template v-if="toolbarOptions.showLineNumbersToggle">
        <button
          class="toolbar-button"
          @click="toggleLineNumbers"
          :title="lineNumbersEnabled ? $t('common.hideLineNumbers') : $t('common.showLineNumbers')"
        >
          <i :class="getIconClass('list-ol')" class="button-icon"></i>
        </button>
      </template>

      <div class="toolbar-separator"></div>

      <!-- 字体大小控制 -->
      <template v-if="toolbarOptions.showFontSizeControls">
        <button
          class="toolbar-button"
          @click="decreaseFontSize"
          :title="$t('common.decreaseFontSize')"
        >
          <i :class="getIconClass('minus')" class="button-icon"></i>
        </button>
        <span class="font-size-display">{{ fontSize }}px</span>
        <button
          class="toolbar-button"
          @click="increaseFontSize"
          :title="$t('common.increaseFontSize')"
        >
          <i :class="getIconClass('plus')" class="button-icon"></i>
        </button>
        <button
          class="toolbar-button"
          @click="resetFontSize"
          :title="$t('common.resetFontSize')"
        >
          <i :class="getIconClass('refresh')" class="button-icon"></i>
        </button>
      </template>

      <div class="toolbar-separator"></div>

      <!-- 主题切换 -->
      <template v-if="toolbarOptions.showThemeToggle">
        <button
          class="toolbar-button"
          @click="toggleTheme"
          :title="$t('common.toggleTheme')"
        >
          <i :class="getIconClass(isDarkMode ? 'sun' : 'moon')" class="button-icon"></i>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useTimers } from '@/composables/useTimers';
import { useThemeStore } from '@/stores/theme';
import { getIconClass } from '@/utils/icons';

interface Props {
  showToolbar?: boolean;
  toolbarOptions?: {
    showUndoRedo?: boolean;
    showFormat?: boolean;
    showCopy?: boolean;
    showFindReplace?: boolean;
    showThemeToggle?: boolean;
    showReadOnlyToggle?: boolean;
    showMinimapToggle?: boolean;
    showWordWrapToggle?: boolean;
    showLineNumbersToggle?: boolean;
    showFontSizeControls?: boolean;
  };
  // 编辑器实例方法
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  find?: () => void;
  replace?: () => void;
  format?: () => void;
  copyToClipboard?: () => Promise<void>;
  toggleReadOnly?: () => void;
  toggleMinimap?: () => void;
  toggleWordWrap?: () => void;
  toggleLineNumbers?: () => void;
  increaseFontSize?: () => void;
  decreaseFontSize?: () => void;
  resetFontSize?: () => void;
  getFontSize?: () => number;
  getWordWrap?: () => string;
  getMinimapEnabled?: () => boolean;
  getLineNumbersEnabled?: () => boolean;
  readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showToolbar: true,
  toolbarOptions: () => ({
    showUndoRedo: true,
    showFormat: true,
    showCopy: true,
    showFindReplace: true,
    showThemeToggle: true,
    showReadOnlyToggle: true,
    showMinimapToggle: true,
    showWordWrapToggle: true,
    showLineNumbersToggle: true,
    showFontSizeControls: true,
  }),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  undo: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  redo: () => {},
  canUndo: false,
  canRedo: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  find: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  replace: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  format: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  copyToClipboard: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleReadOnly: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleMinimap: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleWordWrap: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleLineNumbers: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  increaseFontSize: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  decreaseFontSize: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resetFontSize: () => {},
  getFontSize: () => 14,
  getWordWrap: () => 'on',
  getMinimapEnabled: () => false,
  getLineNumbersEnabled: () => true,
  readOnly: false,
});

const { t: $t } = useI18n();
const themeStore = useThemeStore();
const { setTimeout } = useTimers();

// 响应式状态
const copying = ref(false);
const fontSize = ref(props.getFontSize());
const wordWrap = ref(props.getWordWrap());
const minimapEnabled = ref(props.getMinimapEnabled());
const lineNumbersEnabled = ref(props.getLineNumbersEnabled());

// 计算属性
const isDarkMode = computed(() => themeStore.isDarkMode);

// 监听状态变化
watch(() => props.getFontSize(), (newSize) => {
  fontSize.value = newSize;
});

watch(() => props.getWordWrap(), (newWrap) => {
  wordWrap.value = newWrap;
});

watch(() => props.getMinimapEnabled(), (newEnabled) => {
  minimapEnabled.value = newEnabled;
});

watch(() => props.getLineNumbersEnabled(), (newEnabled) => {
  lineNumbersEnabled.value = newEnabled;
});

// 方法
const toggleTheme = (): void => {
  themeStore.toggleThemeMode();
};

// 实现工具栏方法
const undo = (): void => {
  if (props.undo) {
    props.undo();
  }
};

const redo = (): void => {
  if (props.redo) {
    props.redo();
  }
};

const find = (): void => {
  if (props.find) {
    props.find();
  }
};

const replace = (): void => {
  if (props.replace) {
    props.replace();
  }
};

const format = (): void => {
  if (props.format) {
    props.format();
  }
};

const copyToClipboard = async (): Promise<void> => {
  if (props.copyToClipboard) {
    copying.value = true;
    await props.copyToClipboard();
    setTimeout(() => {
      copying.value = false;
    }, 2000);
  }
};

const toggleReadOnly = (): void => {
  if (props.toggleReadOnly) {
    props.toggleReadOnly();
  }
};

const toggleMinimap = (): void => {
  if (props.toggleMinimap) {
    props.toggleMinimap();
    minimapEnabled.value = props.getMinimapEnabled();
  }
};

const toggleWordWrap = (): void => {
  if (props.toggleWordWrap) {
    props.toggleWordWrap();
    wordWrap.value = props.getWordWrap();
  }
};

const toggleLineNumbers = (): void => {
  if (props.toggleLineNumbers) {
    props.toggleLineNumbers();
    lineNumbersEnabled.value = props.getLineNumbersEnabled();
  }
};

const increaseFontSize = (): void => {
  if (props.increaseFontSize) {
    props.increaseFontSize();
    fontSize.value = props.getFontSize();
  }
};

const decreaseFontSize = (): void => {
  if (props.decreaseFontSize) {
    props.decreaseFontSize();
    fontSize.value = props.getFontSize();
  }
};

const resetFontSize = (): void => {
  if (props.resetFontSize) {
    props.resetFontSize();
    fontSize.value = props.getFontSize();
  }
};
</script>

<style scoped>
.monaco-editor-toolbar {
  @apply flex items-center justify-between;
  @apply px-3 py-2;
  @apply bg-gray-50 dark:bg-gray-800;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply text-sm;
}

.toolbar-group {
  @apply flex items-center gap-1;
}

.toolbar-button {
  @apply w-8 h-8;
  @apply flex items-center justify-center;
  @apply bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700;
  @apply text-gray-600 dark:text-gray-300;
  @apply hover:text-gray-800 dark:hover:text-gray-100;
  @apply rounded-md;
  @apply transition-all duration-200;
  @apply border-none cursor-pointer;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.toolbar-separator {
  @apply w-px h-6;
  @apply bg-gray-300 dark:bg-gray-600;
  @apply mx-1;
}

.font-size-display {
  @apply px-2 py-1;
  @apply text-xs;
  @apply text-gray-600 dark:text-gray-300;
  @apply min-w-[3rem];
  @apply text-center;
}

.button-icon {
  @apply text-sm;
}
</style>
