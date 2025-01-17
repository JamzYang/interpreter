<template>
  <div class="audio-controls">
    <!-- 状态显示 -->
    <div class="status-display">
      <el-tag :type="status.isRunning ? 'success' : 'info'">
        {{ status.isRunning ? '运行中' : '已停止' }}
      </el-tag>
    </div>

    <!-- 控制按钮 -->
    <div class="control-buttons">
      <el-button
        type="primary"
        :disabled="!isDeviceSelected"
        @click="handleStart"
        v-if="!status.isRunning"
      >
        开始
      </el-button>
      <el-button
        type="danger"
        @click="handleStop"
        v-else
      >
        停止
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { AudioStatus } from '@/types/audio';

const props = defineProps<{
  isDeviceSelected: boolean;
}>();

const emit = defineEmits(['start', 'stop']);

const status = ref<AudioStatus>({
  isRunning: false,
  captureActive: false,
  outputActive: false
});

// 开始音频处理
const handleStart = async () => {
  try {
    await window.audioAPI.start();
    emit('start');
  } catch (error) {
    console.error('Failed to start audio:', error);
  }
};

// 停止音频处理
const handleStop = async () => {
  try {
    await window.audioAPI.stop();
    emit('stop');
  } catch (error) {
    console.error('Failed to stop audio:', error);
  }
};

// 更新状态
const updateStatus = async () => {
  try {
    status.value = await window.audioAPI.getStatus();
  } catch (error) {
    console.error('Failed to get status:', error);
  }
};

// 监听状态变化
window.audioAPI.onStatus((event) => {
  updateStatus();
});
</script>

<style scoped>
.audio-controls {
  padding: 20px;
  text-align: center;
}

.status-display {
  margin-bottom: 20px;
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style> 