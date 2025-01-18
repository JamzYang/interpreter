<template>
  <div class="device-test">
    <el-steps :active="currentStep" finish-status="success">
      <el-step title="设备检查" description="检查音频设备是否正确连接" />
      <el-step title="说话测试" description="测试麦克风输入" />
      <el-step title="回放测试" description="测试扬声器输出" />
    </el-steps>

    <div class="test-content">
      <!-- 步骤 1: 设备检查 -->
      <div v-if="currentStep === 0" class="step-content">
        <h3>设备检查</h3>
        <p>请确认以下设备已正确连接：</p>
        <el-checkbox v-model="deviceChecks.microphone">物理麦克风</el-checkbox>
        <el-checkbox v-model="deviceChecks.speaker">物理扬声器</el-checkbox>
        <el-checkbox v-model="deviceChecks.vbcable">VB-CABLE 虚拟设备</el-checkbox>
        
        <div class="step-actions">
          <el-button type="primary" @click="nextStep" :disabled="!canProceed">
            开始测试
          </el-button>
        </div>
      </div>

      <!-- 步骤 2: 说话测试 -->
      <div v-else-if="currentStep === 1" class="step-content">
        <h3>说话测试</h3>
        <p>请对着麦克风说话，观察音量指示器的变化：</p>
        
        <div class="volume-meter">
          <div class="meter-bar" :style="{ width: `${volumeLevel}%` }" />
        </div>

        <div class="step-hint" v-if="volumeLevel > 0">
          检测到声音输入 ✓
        </div>
        
        <div class="step-actions">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="nextStep" :disabled="!hasDetectedVoice">
            下一步
          </el-button>
        </div>
      </div>

      <!-- 步骤 3: 回放测试 -->
      <div v-else-if="currentStep === 2" class="step-content">
        <h3>回放测试</h3>
        <p>您应该能从扬声器中听到刚才的声音：</p>
        
        <div class="playback-status">
          <el-icon v-if="isPlayingBack"><Loading /></el-icon>
          正在通过 VB-CABLE 处理音频...
        </div>

        <el-radio-group v-model="hearSound" class="feedback-options">
          <el-radio :value="true">能听到声音</el-radio>
          <el-radio :value="false">听不到声音</el-radio>
        </el-radio-group>

        <div class="step-actions">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="finishTest" :disabled="hearSound === null">
            完成测试
          </el-button>
        </div>
      </div>

      <!-- 测试结果 -->
      <div v-else class="test-result">
        <el-result
          :icon="testPassed ? 'success' : 'error'"
          :title="testPassed ? '测试通过' : '测试失败'"
          :sub-title="resultMessage"
        >
          <template #extra>
            <el-button type="primary" @click="restartTest">重新测试</el-button>
          </template>
        </el-result>
      </div>
    </div>

    <!-- 添加按键控制区域 -->
    <div class="voice-control">
      <el-button 
        type="primary"
        @mousedown="startRecording"
        @mouseup="stopRecording"
        @mouseleave="stopRecording"
      >
        按住说话
      </el-button>
      <div class="status-text">{{ recordingStatus }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ElStep, ElSteps, ElButton, ElCheckbox, ElRadioGroup, ElRadio, ElResult, ElIcon } from 'element-plus'
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { AudioStreamTester } from '@/services/audio/AudioStreamTester'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { AudioProcessor } from '@/services/audio/AudioProcessor'

// 声明组件的 props 类型
declare module 'vue' {
  export interface GlobalComponents {
    ElStep: typeof ElStep
    ElSteps: typeof ElSteps
    ElButton: typeof ElButton
    ElCheckbox: typeof ElCheckbox
    ElRadioGroup: typeof ElRadioGroup
    ElRadio: typeof ElRadio
    ElResult: typeof ElResult
    ElIcon: typeof ElIcon
  }
}

const currentStep = ref(0)
const volumeLevel = ref(0)
const hearSound = ref<boolean | null>(null)
const isPlayingBack = ref(false)

const deviceChecks = ref({
  microphone: false,
  speaker: false,
  vbcable: false
})

const canProceed = computed(() => {
  return deviceChecks.value.microphone && 
         deviceChecks.value.speaker && 
         deviceChecks.value.vbcable
})

const hasDetectedVoice = ref(false)
const testPassed = ref(false)
const resultMessage = ref('')

const tester = new AudioStreamTester()
const audioProcessor = new AudioProcessor()
const recordingStatus = ref('未录音')
const isProcessorInitialized = ref(false)

// 初始化音频处理器
const initAudioProcessor = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const physicalMics = devices.filter(d => 
      d.kind === 'audioinput' && !d.label.includes('VB-Audio')
    );
    const physicalSpeakers = devices.filter(d => 
      d.kind === 'audiooutput' && !d.label.includes('VB-Audio')
    );

    if (physicalMics.length > 0 && physicalSpeakers.length > 0) {
      // 获取保存的设备选择或使用默认设备
      const savedSelection = audioProcessor.getSavedDeviceSelection();
      let inputId = physicalMics[0].deviceId;
      let outputId = physicalSpeakers[0].deviceId;

      if (savedSelection) {
        if (physicalMics.some(d => d.deviceId === savedSelection.inputId)) {
          inputId = savedSelection.inputId;
        }
        if (physicalSpeakers.some(d => d.deviceId === savedSelection.outputId)) {
          outputId = savedSelection.outputId;
        }
      }

      await audioProcessor.start(inputId, outputId);
      audioProcessor.saveDeviceSelection(inputId, outputId);
      isProcessorInitialized.value = true;
      console.log('音频处理器初始化成功');
    }
  } catch (error) {
    console.error('初始化音频处理器失败:', error);
  }
};

// 步骤控制
const nextStep = async () => {
  if (currentStep.value < 3) {
    if (currentStep.value === 0) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const physicalMics = devices.filter(d => 
          d.kind === 'audioinput' && !d.label.includes('VB-Audio')
        );
        const physicalSpeakers = devices.filter(d => 
          d.kind === 'audiooutput' && !d.label.includes('VB-Audio')
        );

        if (physicalMics.length > 0 && physicalSpeakers.length > 0) {
          // 获取保存的设备选择
          const savedSelection = audioProcessor.getSavedDeviceSelection();
          let inputId = physicalMics[0].deviceId;
          let outputId = physicalSpeakers[0].deviceId;

          // 如果有保存的选择且设备仍然可用，使用保存的选择
          if (savedSelection) {
            if (physicalMics.some(d => d.deviceId === savedSelection.inputId)) {
              inputId = savedSelection.inputId;
            }
            if (physicalSpeakers.some(d => d.deviceId === savedSelection.outputId)) {
              outputId = savedSelection.outputId;
            }
          }

          await audioProcessor.start(inputId, outputId);
          // 保存新的选择
          audioProcessor.saveDeviceSelection(inputId, outputId);
          console.log('音频处理器初始化成功');
          currentStep.value++;
        } else {
          ElMessage.error('未找到可用的音频设备');
        }
      } catch (error) {
        console.error('初始化音频处理器失败:', error);
        ElMessage.error('初始化音频设备失败，请检查设备连接');
      }
    } else {
      currentStep.value++;
      if (currentStep.value === 1) {
        startVoiceTest();
      } else if (currentStep.value === 2) {
        startPlaybackTest();
      }
    }
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 语音测试
const startVoiceTest = async () => {
  try {
    const result = await tester.testMicrophoneToOutput()
    hasDetectedVoice.value = result.success
    if (result.success) {
      // 模拟音量变化
      const interval = setInterval(() => {
        volumeLevel.value = Math.random() * 100
      }, 100)
      setTimeout(() => clearInterval(interval), 5000)
    }
  } catch (error) {
    console.error('Voice test failed:', error)
  }
}

// 回放测试
const startPlaybackTest = async () => {
  isPlayingBack.value = true
  try {
    const result = await tester.testInputToSpeaker()
    isPlayingBack.value = false
    if (!result.success) {
      hearSound.value = false
    }
  } catch (error: any) {
    console.error('Playback test failed:', error)
    isPlayingBack.value = false
  }
}

// 完成测试
const finishTest = async () => {
  testPassed.value = Boolean(hearSound.value)
  resultMessage.value = testPassed.value 
    ? '音频设备工作正常，可以开始使用了'
    : '音频设备可能存在问题，请检查设置'
  currentStep.value = 3
  
  if (testPassed.value) {
    await initAudioProcessor();
  }
}

// 重新测试
const restartTest = () => {
  currentStep.value = 0;
  volumeLevel.value = 0;
  hearSound.value = null;
  hasDetectedVoice.value = false;
  testPassed.value = false;
  resultMessage.value = '';
  deviceChecks.value = {
    microphone: false,
    speaker: false,
    vbcable: false
  };
  localStorage.removeItem('audioDeviceSelection');
  audioProcessor.dispose();
  isProcessorInitialized.value = false;
}

const startRecording = async () => {
  if (!isProcessorInitialized.value) {
    await initAudioProcessor();
  }
  
  if (isProcessorInitialized.value) {
    recordingStatus.value = '正在录音...';
    audioProcessor.startCollecting();
  } else {
    ElMessage.error('音频设备未就绪，请先完成设备测试');
  }
};

const stopRecording = () => {
  if (isProcessorInitialized.value) {
    recordingStatus.value = '未录音';
    audioProcessor.stopCollecting();
  }
};

// 组件卸载时清理
onUnmounted(() => {
  audioProcessor.dispose();
  isProcessorInitialized.value = false;
});
</script>

<style scoped>
.device-test {
  padding: 20px;
}

.test-content {
  margin-top: 30px;
}

.step-content {
  margin: 20px 0;
}

.step-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.volume-meter {
  width: 100%;
  height: 20px;
  background: #eee;
  border-radius: 10px;
  overflow: hidden;
  margin: 20px 0;
}

.meter-bar {
  height: 100%;
  background: #409EFF;
  transition: width 0.1s ease;
}

.feedback-options {
  margin: 20px 0;
}

.playback-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0;
  color: #666;
}

.voice-control {
  margin-top: 20px;
  text-align: center;
}

.status-text {
  margin-top: 10px;
  color: #666;
}
</style> 