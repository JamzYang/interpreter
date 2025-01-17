import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { join } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: join(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: join(__dirname, 'dist'),
    emptyOutDir: true
  }
}) 