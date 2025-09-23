import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { createI18nInstance } from './i18n';
import router from './router';

import '@/assets/styles/main.css';

// 异步初始化应用
const initApp = async (): Promise<void> => {
  const app = createApp(App);

  // 异步创建 i18n 实例
  const i18n = await createI18nInstance();

  app.use(createPinia());
  app.use(router);
  app.use(i18n);

  app.mount('#app');
};

// 启动应用
initApp().catch(error => {
  console.error('Failed to initialize app:', error);
});
