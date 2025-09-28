import * as monaco from 'monaco-editor';
import { getCurrentInstance, onBeforeUnmount, ref, type Ref } from 'vue';

import monacoConfig from '@/config/monaco-editor.json';
import { useAppStore } from '@/stores/app';

// 类型定义
type AbortControllerType = {
  signal: { aborted: boolean };
  abort(): void;
};

export interface MonacoEditorOptions {
  language?: keyof typeof monacoConfig.languageConfigs;
  theme?: keyof typeof monacoConfig.themes;
  value?: string;
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
  [key: string]: any;
}

export interface MonacoEditorInstance {
  editor: Ref<monaco.editor.IStandaloneCodeEditor | null>;
  container: Ref<HTMLElement | null>;
  abortController: AbortControllerType | null;
  isReady: Ref<boolean>;
  isDisposed: Ref<boolean>;
  initialize: (container: HTMLElement, options?: MonacoEditorOptions) => void;
  dispose: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  format: () => void;
  copyToClipboard: () => Promise<void>;
  focus: () => void;
  setReadOnly: (readOnly: boolean) => void;
  setTheme: (theme: keyof typeof monacoConfig.themes) => void;
  setLanguage: (language: keyof typeof monacoConfig.languageConfigs) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  find: () => void;
  replace: () => void;
  toggleMinimap: () => void;
  toggleWordWrap: () => void;
  toggleLineNumbers: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  getFontSize: () => number;
  setFontSize: (size: number) => void;
  getWordWrap: () => string;
  getMinimapEnabled: () => boolean;
  getLineNumbersEnabled: () => boolean;
}

export function useMonacoEditor(): MonacoEditorInstance {
  // 必须在组件上下文中使用
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useMonacoEditor must be called within Vue component setup function');
  }

  const container = ref<HTMLElement | null>(null);
  const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
  const abortController = ref<AbortControllerType | null>(null);
  const isReady = ref(false);
  const isDisposed = ref(false);

  // 使用现有的主题系统
  const appStore = useAppStore();

  // 获取语言配置
  const getLanguageConfig = (language: keyof typeof monacoConfig.languageConfigs): any => {
    return monacoConfig.languageConfigs[language] ?? monacoConfig.languageConfigs.json;
  };

  // 计算Monaco主题
  const getMonacoTheme = (options: MonacoEditorOptions = {}): string => {
    if (options.theme) {
      return monacoConfig.themes[options.theme] ?? options.theme;
    }

    // 使用应用的主题
    const appTheme = appStore.themeMode;
    if (appTheme === 'auto') {
      return appStore.isDarkMode ? 'vs-dark' : 'vs-light';
    }
    return monacoConfig.themeMapping[appTheme] ?? 'vs-dark';
  };

  // 合并配置选项
  const mergeOptions = (options: MonacoEditorOptions = {}): monaco.editor.IStandaloneEditorConstructionOptions => {
    const languageConfig = getLanguageConfig(options.language ?? 'json');
    const monacoTheme = getMonacoTheme(options);

    return {
      ...monacoConfig.defaultOptions,
      ...languageConfig,
      ...options,
      theme: monacoTheme,
      lineNumbers: options.showLineNumbers ? 'on' : 'off',
    } as monaco.editor.IStandaloneEditorConstructionOptions;
  };

  // 初始化编辑器
  const initialize = (containerElement: HTMLElement, options: MonacoEditorOptions = {}): void => {
    if (!containerElement || isDisposed.value) return;

    try {
      // 创建AbortController
      abortController.value = new window.AbortController() as AbortControllerType;

      // 合并配置
      const editorOptions = mergeOptions(options);

      // 创建编辑器
      editor.value = monaco.editor.create(containerElement, editorOptions);

      // 设置容器引用
      container.value = containerElement;
      isReady.value = true;
      isDisposed.value = false;
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      editor.value = null;
      isReady.value = false;
    }
  };

  // 销毁编辑器
  const dispose = (): void => {
    if (abortController.value) {
      abortController.value.abort();
      abortController.value = null;
    }

    if (editor.value && !isDisposed.value) {
      try {
        const model = editor.value.getModel();
        if (model) {
          model.dispose();
        }
        editor.value.dispose();
        editor.value = null;
        isReady.value = false;
        isDisposed.value = true;
      } catch (error) {
        console.warn('Monaco Editor dispose warning:', error);
        editor.value = null;
        isReady.value = false;
        isDisposed.value = true;
      }
    }
  };

  // 获取编辑器值
  const getValue = (): string => {
    return editor.value?.getValue() ?? '';
  };

  // 设置编辑器值
  const setValue = (value: string): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.setValue(value);
    }
  };

  // 格式化代码
  const format = (): void => {
    if (!editor.value || isDisposed.value || abortController.value?.signal.aborted) return;

    try {
      const content = editor.value.getValue();
      const language = editor.value.getModel()?.getLanguageId();

      if (language === 'json') {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        editor.value.setValue(formatted);
      } else {
        // 使用Monaco Editor的格式化功能
        editor.value.getAction('editor.action.formatDocument')?.run();
      }
    } catch (error) {
      console.error('Failed to format code:', error);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (): Promise<void> => {
    if (!editor.value || isDisposed.value || abortController.value?.signal.aborted) return;

    const content = editor.value.getValue();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        if (editor.value && !abortController.value?.signal.aborted) {
          editor.value.focus();
          editor.value.setSelection(
            editor.value.getModel()?.getFullModelRange()
            ?? new monaco.Range(1, 1, 1, 1),
          );
          document.execCommand('copy');
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // 聚焦编辑器
  const focus = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.focus();
    }
  };

  // 设置只读模式
  const setReadOnly = (readOnly: boolean): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.updateOptions({ readOnly });
    }
  };

  // 设置主题
  const setTheme = (theme: keyof typeof monacoConfig.themes): void => {
    if (editor.value && !isDisposed.value) {
      const themeValue = monacoConfig.themes[theme] ?? theme;
      editor.value.updateOptions({ theme: themeValue });
    }
  };

  // 设置语言
  const setLanguage = (language: keyof typeof monacoConfig.languageConfigs): void => {
    if (editor.value && !isDisposed.value) {
      const languageConfig = getLanguageConfig(language);
      const model = editor.value.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, languageConfig.language);
      }
    }
  };

  // 撤销操作
  const undo = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.trigger('keyboard', 'undo', null);
    }
  };

  // 重做操作
  const redo = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.trigger('keyboard', 'redo', null);
    }
  };

  // 检查是否可以撤销
  const canUndo = (): boolean => {
    return editor.value?.getAction('undo')?.isSupported() ?? false;
  };

  // 检查是否可以重做
  const canRedo = (): boolean => {
    return editor.value?.getAction('redo')?.isSupported() ?? false;
  };

  // 查找
  const find = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.getAction('actions.find')?.run();
    }
  };

  // 替换
  const replace = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.getAction('editor.action.startFindReplaceAction')?.run();
    }
  };

  // 切换小地图
  const toggleMinimap = (): void => {
    if (editor.value && !isDisposed.value) {
      const current = editor.value.getOption(monaco.editor.EditorOption.minimap);
      editor.value.updateOptions({ minimap: { enabled: !current.enabled } });
    }
  };

  // 切换自动换行
  const toggleWordWrap = (): void => {
    if (editor.value && !isDisposed.value) {
      const current = editor.value.getOption(monaco.editor.EditorOption.wordWrap);
      const newValue = current === 'on' ? 'off' : 'on';
      editor.value.updateOptions({ wordWrap: newValue });
    }
  };

  // 切换行号
  const toggleLineNumbers = (): void => {
    if (editor.value && !isDisposed.value) {
      const current = editor.value.getOption(monaco.editor.EditorOption.lineNumbers);
      const isEnabled = current?.renderType === monaco.editor.RenderLineNumbersType.On || false;
      const newValue: monaco.editor.LineNumbersType = isEnabled ? 'off' : 'on';
      editor.value.updateOptions({ lineNumbers: newValue });
    }
  };

  // 增加字体大小
  const increaseFontSize = (): void => {
    if (editor.value && !isDisposed.value) {
      const current = editor.value.getOption(monaco.editor.EditorOption.fontSize);
      editor.value.updateOptions({ fontSize: Math.min(current + 2, 24) });
    }
  };

  // 减少字体大小
  const decreaseFontSize = (): void => {
    if (editor.value && !isDisposed.value) {
      const current = editor.value.getOption(monaco.editor.EditorOption.fontSize);
      editor.value.updateOptions({ fontSize: Math.max(current - 2, 8) });
    }
  };

  // 重置字体大小
  const resetFontSize = (): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.updateOptions({ fontSize: 14 });
    }
  };

  // 获取字体大小
  const getFontSize = (): number => {
    return editor.value?.getOption(monaco.editor.EditorOption.fontSize) ?? 14;
  };

  // 设置字体大小
  const setFontSize = (size: number): void => {
    if (editor.value && !isDisposed.value) {
      editor.value.updateOptions({ fontSize: Math.max(8, Math.min(24, size)) });
    }
  };

  // 获取自动换行状态
  const getWordWrap = (): string => {
    return editor.value?.getOption(monaco.editor.EditorOption.wordWrap) ?? 'on';
  };

  // 获取小地图状态
  const getMinimapEnabled = (): boolean => {
    return editor.value?.getOption(monaco.editor.EditorOption.minimap).enabled ?? false;
  };

  // 获取行号状态
  const getLineNumbersEnabled = (): boolean => {
    const lineNumbers = editor.value?.getOption(monaco.editor.EditorOption.lineNumbers);
    return lineNumbers?.renderType === monaco.editor.RenderLineNumbersType.On || false;
  };

  // 组件销毁时自动清理
  onBeforeUnmount(() => {
    dispose();
  });

  return {
    editor,
    container,
    abortController: abortController.value,
    isReady,
    isDisposed,
    initialize,
    dispose,
    getValue,
    setValue,
    format,
    copyToClipboard,
    focus,
    setReadOnly,
    setTheme,
    setLanguage,
    undo,
    redo,
    canUndo,
    canRedo,
    find,
    replace,
    toggleMinimap,
    toggleWordWrap,
    toggleLineNumbers,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    getFontSize,
    setFontSize,
    getWordWrap,
    getMinimapEnabled,
    getLineNumbersEnabled,
  };
}
