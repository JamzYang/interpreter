<template>
  <div class="device-test">
    <el-button 
      :loading="testing" 
      type="primary" 
      @click="testAudioRoute"
    >
      测试音频链路
    </el-button>
    
    <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
      {{ testResult.message }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { AudioStreamTester, TestResult } from '@/services/audio/AudioStreamTester'
import { ElMessage } from 'element-plus'

export default defineComponent({
  name: 'DeviceTest',
  setup() {
    const testing = ref(false)
    const testResult = ref<TestResult | null>(null)
    const tester = new AudioStreamTester()

    const testAudioRoute = async () => {
      testing.value = true
      testResult.value = null
      
      try {
        ElMessage.info('正在测试音频链路，请对着麦克风说话...')
        const result = await tester.testAudioRoute()
        console.log('测试结果:', result)
        testResult.value = result
        
        if (!result.success) {
          ElMessage.warning({
            message: '请检查:\n1. 系统音频设置\n2. 麦克风和扬声器\n3. 设备连接状态',
            duration: 5000
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        ElMessage.error('测试失败: ' + message)
        testResult.value = {
          success: false,
          message: '测试失败: ' + message
        }
      } finally {
        testing.value = false
        tester.dispose()
      }
    }

    return {
      testing,
      testResult,
      testAudioRoute
    }
  }
})
</script>

<style scoped>
.device-test {
  margin: 16px 0;
}

.test-result {
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
}

.test-result.success {
  color: #67C23A;
  background-color: #F0F9EB;
}

.test-result.error {
  color: #F56C6C;
  background-color: #FEF0F0;
}
</style> 