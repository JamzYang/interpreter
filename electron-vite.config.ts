import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: [
          'electron',
          'naudiodon',
          'node:stream',
          'node:events'
        ]
      }
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
        '@types': resolve(__dirname, 'src/types')
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload'
    },
    input: {
      index: resolve(__dirname, 'src/preload/index.ts')
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@types': resolve(__dirname, 'src/types')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'dist/renderer'
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@types': resolve(__dirname, 'src/types')
      }
    },
    optimizeDeps: {
      exclude: ['electron']
    }
  }
}) 