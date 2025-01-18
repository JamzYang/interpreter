/**
 * 根组件
 * 
 * 核心功能:
 * 1. 应用布局
 * 2. 路由视图
 * 3. 全局状态
 */

<script setup lang="ts">
import DeviceSelector from './components/audio/DeviceSelector.vue'
import DeviceTest from './components/audio/DeviceTest.vue'
</script>

<template>
  <div class="container">
    <h2>音频设备设置</h2>
    
    <!-- 设备选择 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>设备选择</span>
        </div>
      </template>
      <DeviceSelector />
    </el-card>

    <!-- 设备测试 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备测试</span>
        </div>
      </template>
      <DeviceTest />
    </el-card>
  </div>

  <div class="flex-center">
    Place static files into the <code>/public</code> folder
    <img style="width: 2.4em; margin-left: .4em;" src="/logo.svg" alt="Logo">
  </div>
</template>

<style>
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo.electron:hover {
  filter: drop-shadow(0 0 2em #9FEAF9);
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
}

.mb-4 {
  margin-bottom: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
