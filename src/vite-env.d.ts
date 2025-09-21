/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 扩展 Vue Router 的类型定义
declare module 'vue-router' {
  interface RouteMeta {
    titleKey?: string | null; // 页面标题的国际化键
  }

  export function createRouter(options: any): any;
  export function createWebHashHistory(base?: string): any;
  export function useRouter(): any;
  export function useRoute(): any;

  export interface RouteLocationNormalized {
    name?: string | symbol | null | undefined;
    meta?: Record<string | number | symbol, any>;
    params?: Record<string, string | string[]>;
    query?: Record<string, string | string[]>;
    hash?: string;
    fullPath?: string;
    path?: string;
    matched?: any[];
    redirectedFrom?: any;
  }
}
