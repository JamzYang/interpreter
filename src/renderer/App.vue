<template>
  <el-container class="app-container">
    <el-header>
      <div class="header-content">
        <h1>音频翻译器</h1>
        <el-button 
          type="primary" 
          icon="Setting"
          circle
          @click="showSettings = true"
        />
      </div>
    </el-header>

    <el-main>
      <!-- 设备选择 -->
      <device-selector
        :is-running="isRunning"
        @device-selected="handleDeviceSelected"
      />

      <!-- 音频可视化 -->
      <audio-visualizer
        :width="600"
        :height="150"
      />

      <!-- 翻译状态 -->
      <translation-status />

      <!-- 音频控制 -->
      <audio-controls
        :is-device-selected="isDeviceSelected"
        @start="handleStart"
        @stop="handleStop"
      />

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        closable
        @close="error = ''"
      />

      <!-- 设置对话框 -->
      <settings-dialog
        v-model="showSettings"
        @save="handleSettingsSave"
      />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Setting } from '@element-plus/icons-vue';
import DeviceSelector from './components/DeviceSelector.vue';
import AudioControls from './components/AudioControls.vue';
import AudioVisualizer from './components/AudioVisualizer.vue';
import TranslationStatus from './components/TranslationStatus.vue';
import SettingsDialog from './components/SettingsDialog.vue';

const isRunning = ref(false);
const isDeviceSelected = ref(false);
const error = ref('');
const showSettings = ref(false);

// 处理设备选择
const handleDeviceSelected = async (devices: { 
  inputDeviceId: number; 
  outputDeviceId: number 
}) => {
  try {
    await window.audioAPI.initialize(devices);
    isDeviceSelected.value = true;
  } catch (err) {
    error.value = '设备初始化失败';
    console.error(err);
  }
};

// 处理开始
const handleStart = () => {
  isRunning.value = true;
};

// 处理停止
const handleStop = () => {
  isRunning.value = false;
};

// 监听错误
window.audioAPI.onError((event) => {
  error.value = event.error;
});

// 处理设置保存
const handleSettingsSave = async (settings: any) => {
  try {
    // 保存设置到本地存储
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // 通知主进程更新设置
    await window.audioAPI.updateSettings(settings);
    
    // 显示成功提示
    ElMessage.success('设置已保存');
  } catch (err) {
    console.error('Failed to save settings:', err);
    ElMessage.error('保存设置失败');
  }
};
</script>

<style>
.app-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.el-main {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 