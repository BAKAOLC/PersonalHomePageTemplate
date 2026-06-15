/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent;
  export default component;
}

declare module '*.json5' {
  const value: unknown;
  export default value;
}
