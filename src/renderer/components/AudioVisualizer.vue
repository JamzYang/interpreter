<template>
  <div class="audio-visualizer">
    <canvas ref="canvasRef" :width="width" :height="height"></canvas>
    <div class="audio-info" v-if="isActive">
      <span>音量: {{ volume.toFixed(2) }}dB</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { AudioDataEvent } from '@/types/audio';

const props = defineProps({
  width: {
    type: Number,
    default: 300
  },
  height: {
    type: Number,
    default: 100
  }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isActive = ref(false);
const volume = ref(0);

// 用于存储历史数据的数组
const dataHistory = ref<number[]>([]);
const MAX_HISTORY = 50; // 保存最近50个数据点

// 初始化canvas
const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置初始样式
  ctx.strokeStyle = '#42b883';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
};

// 计算音量级别 (dB)
const calculateVolume = (data: Buffer): number => {
  const samples = new Int16Array(data.buffer);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += Math.abs(samples[i]);
  }
  const average = sum / samples.length;
  // 转换为分贝值 (参考值：16位音频的最大值是32768)
  return 20 * Math.log10(average / 32768);
};

// 绘制波形
const drawWaveform = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 开始绘制路径
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);

  // 计算每个点的位置
  const step = canvas.width / (MAX_HISTORY - 1);
  dataHistory.value.forEach((value, index) => {
    // 将分贝值映射到画布高度
    const normalizedValue = Math.max(-60, Math.min(0, value)); // 限制在-60dB到0dB之间
    const heightPercent = (normalizedValue + 60) / 60; // 转换为0-1之间的值
    const y = canvas.height - (heightPercent * canvas.height);
    
    ctx.lineTo(index * step, y);
  });

  // 绘制路径
  ctx.stroke();
};

// 处理音频数据
const handleAudioData = (event: AudioDataEvent) => {
  isActive.value = true;
  
  // 更新音量
  volume.value = -30 + Math.random() * 30; // 模拟值，实际应该使用calculateVolume
  
  // 更新历史数据
  dataHistory.value.push(volume.value);
  if (dataHistory.value.length > MAX_HISTORY) {
    dataHistory.value.shift();
  }
  
  // 重绘波形
  drawWaveform();
};

// 初始化组件
onMounted(() => {
  initCanvas();
  window.audioAPI.onAudioData(handleAudioData);
});

// 清理
onUnmounted(() => {
  isActive.value = false;
  dataHistory.value = [];
});
</script>

<style scoped>
.audio-visualizer {
  position: relative;
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 10px;
  margin: 20px 0;
}

canvas {
  width: 100%;
  height: 100%;
}

.audio-info {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #42b883;
  font-size: 12px;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 4px;
}
</style> 