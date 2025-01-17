# 音频翻译APP技术栈 (Electron版本)

## 一、核心技术
### 1. 基础环境
- Node.js
- Electron
- TypeScript
- Vue 3 (UI框架)

### 2. 音频处理
- `node-audio-capture` (音频捕获)
- `node-speaker` (音频输出)
- VB-CABLE (虚拟音频设备)

### 3. AI服务
- Whisper API (语音转文字)
- OpenAI GPT API (翻译)
- Azure TTS API (文字转语音)

### 4. UI框架
- Element Plus (UI组件库)
- Pinia (状态管理)
- Vue Router (路由)

## 二、项目结构
```
interpreter/
├── src/
│   ├── main/                    # 主进程
│   │   ├── audio/              # 音频处理模块
│   │   │   ├── capture.ts      # 音频捕获
│   │   │   └── output.ts       # 音频输出
│   │   ├── services/           # AI服务
│   │   │   ├── stt.ts         # 语音转文字
│   │   │   ├── translation.ts  # 翻译服务
│   │   │   └── tts.ts         # 文字转语音
│   │   └── index.ts           # 主进程入口
│   │
│   └── renderer/               # 渲染进程
│       ├── components/         # UI组件
│       ├── views/             # 页面
│       ├── store/             # 状态管理
│       └── App.vue            # 主界面
│
├── electron-builder.json      # 打包配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 三、核心功能实现

### 1. 音频处理流程
```typescript
// audio/capture.ts
import { AudioCapture } from 'node-audio-capture';

export class AudioHandler {
    private capture: AudioCapture;
    
    async startCapture() {
        // 从VB-CABLE Input捕获音频
        this.capture = new AudioCapture({
            device: 'CABLE Output',
            sampleRate: 44100,
            channels: 1
        });
        
        this.capture.on('data', async (data) => {
            // 1. 音频数据转文字
            const text = await this.speechToText(data);
            // 2. 文字翻译
            const translated = await this.translate(text);
            // 3. 生成语音
            const audio = await this.textToSpeech(translated);
            // 4. 输出到VB-CABLE Input
            await this.outputAudio(audio);
        });
    }
}
```

### 2. UI界面设计
```vue
<!-- renderer/App.vue -->
<template>
  <div class="app-container">
    <el-card class="control-panel">
      <div class="status">
        <el-tag>{{ status }}</el-tag>
      </div>
      
      <div class="controls">
        <el-button @click="startTranslation">
          开始翻译
        </el-button>
        <el-select v-model="sourceLanguage">
          <el-option label="中文" value="zh" />
          <el-option label="英语" value="en" />
        </el-select>
      </div>
      
      <div class="monitor">
        <!-- 实时显示识别和翻译结果 -->
      </div>
    </el-card>
  </div>
</template>
``` 