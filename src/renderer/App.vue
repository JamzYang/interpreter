<template>
  <div class="app-container">
    <DeviceSelector @device-selected="handleDeviceSelected" />
    
    <AudioControls 
      :is-running="isRunning"
      @start="handleStart"
      @stop="handleStop"
    />
    
    <AudioVisualizer v-if="isRunning" />
    <TranslationStatus />

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      @close="error = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AudioService } from './services/AudioService'
import DeviceSelector from './components/DeviceSelector.vue'
import AudioControls from './components/AudioControls.vue'
import AudioVisualizer from './components/AudioVisualizer.vue'
import TranslationStatus from './components/TranslationStatus.vue'

const audioService = AudioService.getInstance()
const isRunning = ref(false)
const error = ref('')

// 处理设备选择
const handleDeviceSelected = async (devices: { 
  inputDeviceId: string; 
  outputDeviceId: string 
}) => {
  try {
    await audioService.initialize(devices.inputDeviceId, devices.outputDeviceId)
  } catch (err) {
    error.value = '设备初始化失败'
    console.error(err)
  }
}

// 处理开始录音
const handleStart = async () => {
  try {
    audioService.start()
    isRunning.value = true
  } catch (err) {
    error.value = '启动失败'
    console.error(err)
  }
}

// 处理停止录音
const handleStop = async () => {
  try {
    audioService.stop()
    isRunning.value = false
  } catch (err) {
    error.value = '停止失败'
    console.error(err)
  }
}

// 监听音频数据
onMounted(() => {
  window.addEventListener('audio-data', (event: any) => {
    // 处理音频数据
    console.log('Audio data:', event.detail)
  })
})
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