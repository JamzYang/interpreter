<template>
  <el-dialog
    v-model="dialogVisible"
    title="设置"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab">
      <!-- 基础设置 -->
      <el-tab-pane label="基础设置" name="basic">
        <el-form :model="basicSettings" label-width="120px">
          <el-form-item label="源语言">
            <el-select v-model="basicSettings.sourceLanguage">
              <el-option label="中文" value="zh" />
              <el-option label="英语" value="en" />
              <el-option label="日语" value="ja" />
              <el-option label="韩语" value="ko" />
            </el-select>
          </el-form-item>

          <el-form-item label="目标语言">
            <el-select v-model="basicSettings.targetLanguage">
              <el-option label="中文" value="zh" />
              <el-option label="英语" value="en" />
              <el-option label="日语" value="ja" />
              <el-option label="韩语" value="ko" />
            </el-select>
          </el-form-item>

          <el-form-item label="自动开始">
            <el-switch v-model="basicSettings.autoStart" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 音频设置 -->
      <el-tab-pane label="音频设置" name="audio">
        <el-form :model="audioSettings" label-width="120px">
          <el-form-item label="采样率">
            <el-select v-model="audioSettings.sampleRate">
              <el-option label="44.1 kHz" :value="44100" />
              <el-option label="48 kHz" :value="48000" />
              <el-option label="96 kHz" :value="96000" />
            </el-select>
          </el-form-item>

          <el-form-item label="音量阈值">
            <el-slider
              v-model="audioSettings.volumeThreshold"
              :min="-60"
              :max="0"
              :step="1"
              show-input
            />
          </el-form-item>

          <el-form-item label="降噪">
            <el-switch v-model="audioSettings.noiseReduction" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- AI设置 -->
      <el-tab-pane label="AI设置" name="ai">
        <el-form :model="aiSettings" label-width="120px">
          <el-form-item label="OpenAI API Key">
            <el-input
              v-model="aiSettings.openaiKey"
              type="password"
              show-password
              placeholder="请输入API密钥"
            />
          </el-form-item>

          <el-form-item label="Azure API Key">
            <el-input
              v-model="aiSettings.azureKey"
              type="password"
              show-password
              placeholder="请输入API密钥"
            />
          </el-form-item>

          <el-form-item label="模型选择">
            <el-select v-model="aiSettings.model">
              <el-option label="GPT-3.5" value="gpt-3.5-turbo" />
              <el-option label="GPT-4" value="gpt-4" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 高级设置 -->
      <el-tab-pane label="高级设置" name="advanced">
        <el-form :model="advancedSettings" label-width="120px">
          <el-form-item label="调试模式">
            <el-switch v-model="advancedSettings.debug" />
          </el-form-item>

          <el-form-item label="历史记录数">
            <el-input-number
              v-model="advancedSettings.historyLimit"
              :min="10"
              :max="100"
            />
          </el-form-item>

          <el-form-item label="自动更新">
            <el-switch v-model="advancedSettings.autoUpdate" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave">
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'save']);

// 对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 当前激活的标签页
const activeTab = ref('basic');

// 基础设置
const basicSettings = reactive({
  sourceLanguage: 'zh',
  targetLanguage: 'en',
  autoStart: false
});

// 音频设置
const audioSettings = reactive({
  sampleRate: 44100,
  volumeThreshold: -30,
  noiseReduction: true
});

// AI设置
const aiSettings = reactive({
  openaiKey: '',
  azureKey: '',
  model: 'gpt-3.5-turbo'
});

// 高级设置
const advancedSettings = reactive({
  debug: false,
  historyLimit: 50,
  autoUpdate: true
});

// 保存设置
const handleSave = () => {
  const settings = {
    basic: basicSettings,
    audio: audioSettings,
    ai: aiSettings,
    advanced: advancedSettings
  };
  
  emit('save', settings);
  dialogVisible.value = false;
};

// 取消
const handleCancel = () => {
  dialogVisible.value = false;
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}
</style> 