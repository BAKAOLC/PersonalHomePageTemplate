import { createRequire } from 'module';
import { resolve } from 'path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default;

const articlesConfigPlugin = require('./vite-plugins/articles-config-plugin.cjs');
const characterProfilesConfigPlugin = require('./vite-plugins/character-profiles-config-plugin.cjs');
const htmlConfigPlugin = require('./vite-plugins/html-config-plugin.cjs');
const imagesConfigPlugin = require('./vite-plugins/images-config-plugin.cjs');
const { thumbnailPlugin } = require('./vite-plugins/thumbnail-plugin.cjs');
const utf8EncodingPlugin = require('./vite-plugins/utf8-encoding-plugin.cjs');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    utf8EncodingPlugin({
      // 可以自定义配置选项
      verbose: true,
      autoConvert: true,
      extensions: ['.vue', '.js', '.ts', '.json', '.css', '.scss', '.less', '.html', '.md', '.txt', '.cjs'],
      excludeDirs: ['node_modules', 'dist', '.git', '.vscode'],
      minConfidence: 0.8,
    }),
    htmlConfigPlugin(),
    imagesConfigPlugin(),
    articlesConfigPlugin(),
    characterProfilesConfigPlugin(),
    thumbnailPlugin(),
    vue(),
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
    },
  },
});
