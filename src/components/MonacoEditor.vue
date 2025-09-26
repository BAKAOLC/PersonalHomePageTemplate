<template>
  <div class="monaco-editor-wrapper">
    <!-- 工具栏 -->
    <MonacoEditorToolbar
      v-if="showToolbar"
      :show-toolbar="showToolbar"
      :toolbar-options="toolbarOptions"
      :undo="monacoEditor.undo"
      :redo="monacoEditor.redo"
      :can-undo="monacoEditor.canUndo()"
      :can-redo="monacoEditor.canRedo()"
      :find="monacoEditor.find"
      :replace="monacoEditor.replace"
      :format="monacoEditor.format"
      :copy-to-clipboard="monacoEditor.copyToClipboard"
      :toggle-read-only="toggleReadOnly"
      :toggle-minimap="monacoEditor.toggleMinimap"
      :toggle-word-wrap="monacoEditor.toggleWordWrap"
      :toggle-line-numbers="monacoEditor.toggleLineNumbers"
      :increase-font-size="monacoEditor.increaseFontSize"
      :decrease-font-size="monacoEditor.decreaseFontSize"
      :reset-font-size="monacoEditor.resetFontSize"
      :get-font-size="monacoEditor.getFontSize"
      :get-word-wrap="monacoEditor.getWordWrap"
      :get-minimap-enabled="monacoEditor.getMinimapEnabled"
      :get-line-numbers-enabled="monacoEditor.getLineNumbersEnabled"
      :read-only="readOnly"
    />

    <!-- 编辑器容器 -->
    <div ref="editorContainer" class="monaco-editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import MonacoEditorToolbar from '@/components/MonacoEditorToolbar.vue';
import { useMonacoEditor, type MonacoEditorOptions } from '@/composables/useMonacoEditor';
import type monacoConfig from '@/config/monaco-editor.json';

interface Props {
  modelValue?: string;
  language?: keyof typeof monacoConfig.languageConfigs;
  theme?: keyof typeof monacoConfig.themes;
  readOnly?: boolean;
  showMinimap?: boolean;
  showLineNumbers?: boolean;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  fontSize?: number;
  formatOnPaste?: boolean;
  formatOnType?: boolean;
  quickSuggestions?: boolean;
  suggestOnTriggerCharacters?: boolean;
  acceptSuggestionOnEnter?: 'on' | 'off' | 'smart';
  height?: string;
  width?: string;
  placeholder?: string;
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
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:readOnly', readOnly: boolean): void;
  (e: 'ready'): void;
  (e: 'change', value: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'format'): void;
  (e: 'copy'): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'json',
  theme: 'vs-dark',
  readOnly: false,
  showMinimap: false,
  showLineNumbers: true,
  wordWrap: 'on',
  fontSize: 14,
  formatOnPaste: true,
  formatOnType: true,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  height: '300px',
  width: '100%',
  placeholder: '',
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
});

const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLElement | null>(null);
const monacoEditor = useMonacoEditor();

// 监听值变化
watch(() => props.modelValue, (newValue) => {
  if (monacoEditor.isReady.value && monacoEditor.getValue() !== newValue) {
    monacoEditor.setValue(newValue);
  }
});

// 监听语言变化
watch(() => props.language, (newLanguage) => {
  if (monacoEditor.isReady.value) {
    monacoEditor.setLanguage(newLanguage);
  }
});

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  if (monacoEditor.isReady.value) {
    monacoEditor.setTheme(newTheme);
  }
});

// 监听只读模式变化
watch(() => props.readOnly, (newReadOnly) => {
  if (monacoEditor.isReady.value) {
    monacoEditor.setReadOnly(newReadOnly);
  }
});

// 初始化编辑器
const initializeEditor = (): void => {
  if (!editorContainer.value) return;

  const options: MonacoEditorOptions = {
    language: props.language,
    theme: props.theme,
    value: props.modelValue,
    readOnly: props.readOnly,
    minimap: { enabled: props.showMinimap },
    lineNumbers: props.showLineNumbers ? 'on' : 'off',
    wordWrap: props.wordWrap,
    fontSize: props.fontSize,
    formatOnPaste: props.formatOnPaste,
    formatOnType: props.formatOnType,
    quickSuggestions: props.quickSuggestions,
    suggestOnTriggerCharacters: props.suggestOnTriggerCharacters,
    acceptSuggestionOnEnter: props.acceptSuggestionOnEnter,
  };

  monacoEditor.initialize(editorContainer.value, options);

  // 等待editor创建完成
  nextTick(() => {
    // 监听编辑器内容变化
    if (monacoEditor.editor.value) {
      monacoEditor.editor.value.onDidChangeModelContent(() => {
        const value = monacoEditor.getValue();
        emit('update:modelValue', value);
        emit('change', value);
      });

      monacoEditor.editor.value.onDidFocusEditorText(() => {
        emit('focus');
      });

      monacoEditor.editor.value.onDidBlurEditorText(() => {
        emit('blur');
      });
    }

    emit('ready');
  });
};

// 暴露方法给父组件
const format = (): void => {
  monacoEditor.format();
  emit('format');
};

const copyToClipboard = async (): Promise<void> => {
  await monacoEditor.copyToClipboard();
  emit('copy');
};

const focus = (): void => {
  monacoEditor.focus();
};

const getValue = (): string => {
  return monacoEditor.getValue();
};

const setValue = (value: string): void => {
  monacoEditor.setValue(value);
};

const toggleReadOnly = (): void => {
  const newReadOnly = !props.readOnly;
  monacoEditor.setReadOnly(newReadOnly);
  emit('update:readOnly', newReadOnly);
};

// 暴露方法
defineExpose({
  format,
  copyToClipboard,
  focus,
  getValue,
  setValue,
  setReadOnly: monacoEditor.setReadOnly,
  setTheme: monacoEditor.setTheme,
  setLanguage: monacoEditor.setLanguage,
  editor: monacoEditor.editor,
  isReady: monacoEditor.isReady,
});

onMounted(() => {
  nextTick(() => {
    initializeEditor();
  });
});

onBeforeUnmount(() => {
  monacoEditor.dispose();
});
</script>

<style scoped>
.monaco-editor-wrapper {
  @apply w-full;
  @apply border border-gray-200 dark:border-gray-600;
  @apply rounded-lg;
  @apply overflow-hidden;
}

.monaco-editor-container {
  @apply w-full;
  @apply min-h-[200px];
  @apply overflow-hidden;
}

/* 响应式高度 */
.monaco-editor-container {
  height: v-bind(height);
  width: v-bind(width);
}
</style>
