import { createRequire } from 'module';
import { resolve } from 'path';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default;

const articlesConfigPlugin = require('./vite-plugins/articles-config-plugin.cjs');
const characterProfilesConfigPlugin = require('./vite-plugins/character-profiles-config-plugin.cjs');
const feedGeneratorPlugin = require('./vite-plugins/feed-generator-plugin.cjs');
const htmlConfigPlugin = require('./vite-plugins/html-config-plugin.cjs');
const idHashMapPlugin = require('./vite-plugins/id-hash-map-plugin.cjs');
const imagesConfigPlugin = require('./vite-plugins/images-config-plugin.cjs');
const json5Plugin = require('./vite-plugins/json5-plugin.cjs');
const { thumbnailPlugin } = require('./vite-plugins/thumbnail-plugin.cjs');
const utf8EncodingPlugin = require('./vite-plugins/utf8-encoding-plugin.cjs');

const normalizeModuleId = (id: string): string => id.replace(/\\/g, '/');

const getManualChunk = (id: string): string | undefined => {
  const normalizedId = normalizeModuleId(id);
  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/node_modules/monaco-editor/esm/vs/basic-languages/')) {
    return 'monaco-languages';
  }

  if (normalizedId.includes('/node_modules/monaco-editor/esm/vs/language/json/')) {
    return 'monaco-json';
  }

  if (normalizedId.includes('/node_modules/monaco-editor/')) {
    return 'monaco-core';
  }

  if (
    normalizedId.includes('/node_modules/pixi-live2d-display/')
    || normalizedId.includes('/node_modules/pixi.js/')
    || normalizedId.includes('/node_modules/@pixi/')
  ) {
    return 'live2d-runtime';
  }

  if (
    normalizedId.includes('/node_modules/vue/')
    || normalizedId.includes('/node_modules/vue-router/')
    || normalizedId.includes('/node_modules/vue-i18n/')
    || normalizedId.includes('/node_modules/pinia/')
    || normalizedId.includes('/node_modules/@vue/')
  ) {
    return 'vue-runtime';
  }

  if (
    normalizedId.includes('/node_modules/highlight.js/')
    || normalizedId.includes('/node_modules/marked/')
    || normalizedId.includes('/node_modules/dompurify/')
  ) {
    return 'content-rendering';
  }

  if (normalizedId.includes('/node_modules/@zumer/snapdom/')) {
    return 'image-export';
  }

  if (normalizedId.includes('/node_modules/@giscus/vue/')) {
    return 'comments';
  }

  return undefined;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    utf8EncodingPlugin({
      // 可以自定义配置选项
      verbose: false,
      autoConvert: true,
      extensions: ['.vue', '.js', '.ts', '.json', '.json5', '.css', '.scss', '.less', '.html', '.md', '.txt', '.cjs'],
      excludeDirs: ['node_modules', 'dist', '.git', '.vscode'],
      minConfidence: 0.8,
    }),
    json5Plugin(),
    htmlConfigPlugin(),
    imagesConfigPlugin(),
    idHashMapPlugin(),
    articlesConfigPlugin(),
    characterProfilesConfigPlugin(),
    feedGeneratorPlugin(),
    thumbnailPlugin(),
    vue(),
    tailwindcss(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'json'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
  server: {
    middlewareMode: false,
    fs: {
      allow: ['.'],
    },
  },
});
