<template>
  <div class="translation-status">
    <!-- 原文和译文显示 -->
    <div class="text-panels">
      <el-card class="text-panel">
        <template #header>
          <div class="panel-header">
            <span>原文</span>
            <el-tag size="small" :type="isListening ? 'success' : 'info'">
              {{ isListening ? '正在聆听...' : '等待开始' }}
            </el-tag>
          </div>
        </template>
        <div class="text-content" ref="sourceTextRef">
          <p :class="{ 'fade-in': sourceText }">{{ sourceText || '等待输入...' }}</p>
        </div>
      </el-card>

      <div class="arrow-container">
        <el-icon :class="{ 'rotating': isTranslating }"><Right /></el-icon>
      </div>

      <el-card class="text-panel">
        <template #header>
          <div class="panel-header">
            <span>译文</span>
            <el-tag size="small" :type="isTranslating ? 'warning' : 'info'">
              {{ isTranslating ? '正在翻译...' : '等待翻译' }}
            </el-tag>
          </div>
        </template>
        <div class="text-content" ref="translatedTextRef">
          <p :class="{ 'fade-in': translatedText }">{{ translatedText || '等待翻译...' }}</p>
        </div>
      </el-card>
    </div>

    <!-- 翻译历史记录 -->
    <el-collapse v-model="activeHistory" class="history-panel">
      <el-collapse-item title="翻译历史" name="1">
        <el-timeline>
          <el-timeline-item
            v-for="(record, index) in translationHistory"
            :key="index"
            :timestamp="record.timestamp"
            :type="record.success ? 'success' : 'danger'"
          >
            <div class="history-item">
              <div class="source-text">{{ record.sourceText }}</div>
              <el-icon><Right /></el-icon>
              <div class="translated-text">{{ record.translatedText }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Right } from '@element-plus/icons-vue';

interface TranslationRecord {
  sourceText: string;
  translatedText: string;
  timestamp: string;
  success: boolean;
}

// 状态
const isListening = ref(false);
const isTranslating = ref(false);
const sourceText = ref('');
const translatedText = ref('');
const activeHistory = ref(['1']);
const translationHistory = ref<TranslationRecord[]>([]);

// 自动滚动到最新文本
const sourceTextRef = ref<HTMLElement | null>(null);
const translatedTextRef = ref<HTMLElement | null>(null);

const scrollToBottom = (element: HTMLElement | null) => {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
};

// 更新翻译历史
const updateHistory = (source: string, translated: string, success: boolean) => {
  const timestamp = new Date().toLocaleTimeString();
  translationHistory.value.unshift({
    sourceText: source,
    translatedText: translated,
    timestamp,
    success
  });

  // 限制历史记录数量
  if (translationHistory.value.length > 10) {
    translationHistory.value.pop();
  }
};

// 监听翻译状态
const handleTranslationStatus = (status: { 
  type: 'listening' | 'translating' | 'result',
  text?: string,
  success?: boolean 
}) => {
  switch (status.type) {
    case 'listening':
      isListening.value = true;
      isTranslating.value = false;
      if (status.text) {
        sourceText.value = status.text;
        scrollToBottom(sourceTextRef.value);
      }
      break;
    case 'translating':
      isListening.value = false;
      isTranslating.value = true;
      break;
    case 'result':
      isTranslating.value = false;
      if (status.text) {
        translatedText.value = status.text;
        scrollToBottom(translatedTextRef.value);
        updateHistory(sourceText.value, status.text, status.success || false);
      }
      break;
  }
};

onMounted(() => {
  // 监听翻译状态事件
  window.audioAPI.onTranslationStatus(handleTranslationStatus);
});
</script>

<style scoped>
.translation-status {
  margin: 20px 0;
}

.text-panels {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.text-panel {
  flex: 1;
  min-height: 200px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-content {
  height: 150px;
  overflow-y: auto;
  padding: 10px;
  font-size: 14px;
  line-height: 1.6;
}

.arrow-container {
  display: flex;
  align-items: center;
  font-size: 24px;
  color: var(--el-color-primary);
}

.rotating {
  animation: rotate 1s linear infinite;
}

.history-panel {
  margin-top: 20px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.source-text, .translated-text {
  flex: 1;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style> 