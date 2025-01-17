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
import { ref, onMounted, watch } from 'vue';
import { AudioService } from '../services/AudioService';

const audioService = AudioService.getInstance();

const emit = defineEmits(['device-selected']);
const props = defineProps<{
  isRunning: boolean;
}>();

const devices = ref<{
  inputs: { id: string; name: string }[];
  outputs: { id: string; name: string }[];
}>({ inputs: [], outputs: [] });
const selectedInput = ref<string>();
const selectedOutput = ref<string>();

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
    const deviceList = await audioService.getDevices();
    devices.value = {
      inputs: deviceList.inputs.map(device => ({
        id: device.deviceId,
        name: device.label || `麦克风 ${device.deviceId}`
      })),
      outputs: deviceList.outputs.map(device => ({
        id: device.deviceId,
        name: device.label || `扬声器 ${device.deviceId}`
      }))
    };
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