<template>
  <div class="device-selector">
    <el-form label-position="top">
      <!-- 输入设备选择 -->
      <el-form-item label="输入设备">
        <el-select 
          v-model="selectedInput" 
          placeholder="选择输入设备"
          :disabled="isRunning"
        >
          <el-option
            v-for="device in devices.inputs"
            :key="device.id"
            :label="device.name"
            :value="device.id"
          />
        </el-select>
      </el-form-item>

      <!-- 输出设备选择 -->
      <el-form-item label="输出设备">
        <el-select 
          v-model="selectedOutput" 
          placeholder="选择输出设备"
          :disabled="isRunning"
        >
          <el-option
            v-for="device in devices.outputs"
            :key="device.id"
            :label="device.name"
            :value="device.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { AudioDevices } from '@/types/audio';

const emit = defineEmits(['device-selected']);
const props = defineProps<{
  isRunning: boolean;
}>();

const devices = ref<AudioDevices>({ inputs: [], outputs: [] });
const selectedInput = ref<number>();
const selectedOutput = ref<number>();

// 监听设备选择变化
watch([selectedInput, selectedOutput], () => {
  if (selectedInput.value && selectedOutput.value) {
    emit('device-selected', {
      inputDeviceId: selectedInput.value,
      outputDeviceId: selectedOutput.value
    });
  }
});

// 加载设备列表
const loadDevices = async () => {
  try {
    devices.value = await window.audioAPI.getDevices();
  } catch (error) {
    console.error('Failed to load devices:', error);
  }
};

onMounted(loadDevices);
</script>

<style scoped>
.device-selector {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}
</style> 