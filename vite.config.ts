import { createRequire } from 'module';
import { resolve } from 'path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const htmlConfigPlugin = require('./vite-plugins/html-config-plugin.cjs');
const imagesConfigPlugin = require('./vite-plugins/images-config-plugin.cjs');
const { thumbnailPlugin } = require('./vite-plugins/thumbnail-plugin.cjs');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    htmlConfigPlugin(),
    imagesConfigPlugin(),
    thumbnailPlugin(),
    vue(),
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
