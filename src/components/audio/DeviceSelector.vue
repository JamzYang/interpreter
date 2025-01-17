/**
 * 音频设备选择组件
 * 
 * 核心功能:
 * 1. 列出所有可用的VB-CABLE设备
 * 2. 允许用户选择输入/输出设备
 * 3. 显示设备连接状态
 * 4. 提供设备测试功能
 */ 

 <template>
  <div class="device-selector">
    <el-form>
      <!-- 输入设备选择 -->
      <el-form-item label="输入设备">
        <el-select v-model="selectedInput" @change="(val: string) => handleInputChange(val)">
          <el-option
            v-for="device in inputDevices"
            :key="device.id"
            :label="device.label"
            :value="device.id"
          >
            <span :class="{ 'vb-cable': device.isVBCable }">{{ device.label }}</span>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 输出设备选择 -->
      <el-form-item label="输出设备">
        <el-select v-model="selectedOutput" @change="(val: string) => handleOutputChange(val)">
          <el-option
            v-for="device in outputDevices"
            :key="device.id"
            :label="device.label"
            :value="device.id"
          >
            <span :class="{ 'vb-cable': device.isVBCable }">{{ device.label }}</span>
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AudioService } from '@/services/audio/AudioService'
import { MediaDevice } from '@/types/device'

const audioService = ref<AudioService>()
const inputDevices = ref<MediaDevice[]>([])
const outputDevices = ref<MediaDevice[]>([])
const selectedInput = ref('')
const selectedOutput = ref('')

const loadDevices = async () => {
  try {
    // 确保服务已初始化
    audioService.value = await AudioService.getInstance();
    const devices = await audioService.value.getAvailableDevices();
    console.log('AvailableDevices:',devices)
    inputDevices.value = devices.filter(d => d.kind === 'audioinput');
    outputDevices.value = devices.filter(d => d.kind === 'audiooutput');

    const defaultInput = inputDevices.value.find(d => !d.isVBCable);
    const defaultOutput = outputDevices.value.find(d => !d.isVBCable);
    
    if (defaultInput) selectedInput.value = defaultInput.id;
    if (defaultOutput) selectedOutput.value = defaultOutput.id;
  } catch (error) {
    console.error('Failed to load devices:', error);
  }
}

const handleInputChange = async (deviceId: string) => {
  const service = await AudioService.getInstance();
  await service.setDevices(deviceId, selectedOutput.value);
}

const handleOutputChange = async (deviceId: string) => {
  const service = await AudioService.getInstance();
  await service.setDevices(selectedInput.value, deviceId);
}

onMounted(loadDevices)
</script>

<style scoped>
.vb-cable {
  color: #409EFF;
}
</style>