import JSON5 from 'json5';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import 'monaco-editor/esm/vs/editor/browser/coreCommands';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController';
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import { getCurrentInstance, onBeforeUnmount, ref, type Ref } from 'vue';

import rawMonacoConfig from '@/config/monaco-editor.json5';
import { useThemeStore } from '@/stores/theme';
import { getAbortControllerConstructor, writeClipboardTextWithFallback } from '@/utils/browser';

// 类型定义
type AbortControllerType = {
  signal: { aborted: boolean };
  abort(): void;
};

export type MonacoLanguage
  = | 'json'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'markdown'
  | 'yaml'
  | 'xml';

export type MonacoTheme = 'vs-dark' | 'vs-light' | 'hc-black';

export interface MonacoToolbarOptions {
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
}

interface MonacoLanguageConfig {
  language: MonacoLanguage;
  formatOptions?: {
    indentSize: number;
    insertSpaces: boolean;
  };
}

interface MonacoConfig {
  defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions;
  toolbarOptions: MonacoToolbarOptions & {
    showToolbar?: boolean;
  };
  languageConfigs: Record<MonacoLanguage, MonacoLanguageConfig>;
  themes: Record<MonacoTheme, string>;
  themeMapping: Record<'light' | 'dark' | 'auto', string | Record<'light' | 'dark', string>>;
}

const monacoConfig = rawMonacoConfig as MonacoConfig;

export interface MonacoEditorOptions
  extends Omit<monaco.editor.IStandaloneEditorConstructionOptions, 'language' | 'theme'> {
  language?: MonacoLanguage;
  theme?: MonacoTheme;
  showMinimap?: boolean;
  showLineNumbers?: boolean;
  showToolbar?: boolean;
  toolbarOptions?: MonacoToolbarOptions;
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
  setTheme: (theme: MonacoTheme) => void;
  setLanguage: (language: MonacoLanguage) => void;
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
  getLineHeight: () => number;
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

  // 获取语言配置
  const getLanguageConfig = (language: MonacoLanguage): MonacoLanguageConfig => {
    return monacoConfig.languageConfigs[language] ?? monacoConfig.languageConfigs.json;
  };

  // 计算Monaco主题
  const getMonacoTheme = (options: MonacoEditorOptions = {}): string => {
    if (options.theme) {
      return monacoConfig.themes[options.theme] ?? options.theme;
    }

    // 使用应用的主题
    const themeStore = useThemeStore();
    const appTheme = themeStore.themeMode;
    if (appTheme === 'auto') {
      return themeStore.isDarkMode ? 'vs-dark' : 'vs-light';
    }
    const mappedTheme = monacoConfig.themeMapping[appTheme];
    return typeof mappedTheme === 'string' ? mappedTheme : 'vs-dark';
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
    };
  };

  // 初始化编辑器
  const initialize = (containerElement: HTMLElement, options: MonacoEditorOptions = {}): void => {
    if (!containerElement || isDisposed.value) return;

    try {
      // 创建AbortController
      const BrowserAbortController = getAbortControllerConstructor();
      abortController.value = BrowserAbortController
        ? new BrowserAbortController()
        : null;

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
        const parsed = JSON5.parse(content);
        const formatted = JSON5.stringify(parsed, null, 2);
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
      const copied = await writeClipboardTextWithFallback(content);
      if (!copied) {
        throw new Error('Clipboard copy is unavailable');
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
  const setTheme = (theme: MonacoTheme): void => {
    if (editor.value && !isDisposed.value) {
      const themeValue = monacoConfig.themes[theme] ?? theme;
      editor.value.updateOptions({ theme: themeValue });
    }
  };

  // 设置语言
  const setLanguage = (language: MonacoLanguage): void => {
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
      const isEnabled = current?.renderType === monaco.editor.RenderLineNumbersType.On;
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

  // 获取行高
  const getLineHeight = (): number => {
    return editor.value?.getOption(monaco.editor.EditorOption.lineHeight) ?? 18;
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
    return lineNumbers?.renderType === monaco.editor.RenderLineNumbersType.On;
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
    getLineHeight,
    setFontSize,
    getWordWrap,
    getMinimapEnabled,
    getLineNumbersEnabled,
  };
}
