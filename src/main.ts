import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

import './style.css'


/**
 * 应用入口
 * 
 * 核心功能:
 * 1. 初始化Vue应用
 * 2. 配置插件
 * 3. 启动应用
 */

const app = createApp(App)

app.use(ElementPlus)
app.mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
