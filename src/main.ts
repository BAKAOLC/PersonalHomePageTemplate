import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import i18n from './i18n';
import router from './router';

import '@/assets/styles/main.css';

// 创建应用实例
const app = createApp(App);

// 安装插件
app.use(createPinia());
app.use(router);
app.use(i18n);

// 挂载应用
app.mount('#app');
