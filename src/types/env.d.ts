/// <reference types="vite/client" />

// Vue 组件类型声明
declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

// 环境变量类型声明
interface ImportMetaEnv {
    readonly VITE_DEV_SERVER_URL: string;
    // 可以添加其他环境变量
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
} 