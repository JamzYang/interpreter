/**
 * 音频处理器
 * 
 * 核心职责:
 * 1. 从物理麦克风读取 → 处理 → 输出到 CABLE Output
 * 2. 从 CABLE Input 读取 → 处理 → 输出到物理扬声器
 * 3. 音频数据处理和转换（未来用于LLM翻译）
 */
import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';
import { AudioContextManager } from './AudioContextManager';
import { GeminiService } from '../llm/GeminiService';

// 添加设备信息接口
interface DeviceInfo {
  inputId: string;
  outputId: string;
}

export class AudioProcessor extends EventEmitter {
  private logger: Logger;
  private state: 'idle' | 'initializing' | 'active' | 'disposed' = 'idle';
  private audioContextManager: AudioContextManager;

  constructor() {
    super();
    this.logger = new Logger('AudioProcessor');
    this.audioContextManager = new AudioContextManager();
  }

  private setupWorkletMessageHandler() {
    const workletNode = this.audioContextManager.getWorkletNode();
    if (workletNode) {
      workletNode.port.onmessage = async (event) => {
        if (event.data.type === 'audioData') {
          try {
            const llmService = new GeminiService('YOUR_GEMINI_API_ENDPOINT');
            
            // 处理音频数据
            const transcribedText = await llmService.transcribeAudio(event.data.data);
            console.log('转录结果:', transcribedText, new Date().toISOString());
            // 获取TTS音频数据并解码
            const ttsBuffer = await llmService.textToAudio(transcribedText);
            console.log('text转音频完成', new Date().toISOString());
            const audioBuffer = await this.audioContextManager.getAudioContext().decodeAudioData(ttsBuffer);
            console.log('音频数据解码完成', new Date().toISOString());
            
            // 转换为 Float32Array
            const outputBuffer = new Float32Array(audioBuffer.length);
            audioBuffer.copyFromChannel(outputBuffer, 0, 0);
            
            // 将解码后的音频数据发送回 worklet
            workletNode.port.postMessage({
              type: 'processedAudio',
              data: outputBuffer
            });
            
          } catch (error) {
            console.error('音频处理失败:', error);
            workletNode.port.postMessage({
              type: 'error',
              error: error instanceof Error ? error.message : '音频处理失败'
            });
          }
        }
      };
    }
  }

  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('AudioProcessor 已经初始化或正在使用中');
    }

    this.state = 'initializing';
    try {
      await this.audioContextManager.initialize();
      // 添加 worklet 消息处理
      this.setupWorkletMessageHandler();
      this.state = 'active';
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }



  

  // 从物理麦克风到 CABLE Output
  async setupMicrophoneRoute(deviceId: string): Promise<void> {
    try {
      if (this.state !== 'active') {
        await this.initialize();
      }
      
      const stream = await this.audioContextManager.setupMicrophoneRoute(deviceId);
      
      const audio = new Audio();
      audio.srcObject = stream;
      await audio.play();
      
    } catch (error) {
      // this.logger.error('设置麦克风路由失败:', error);
      console.error('设置麦克风路由失败:', error);
      this.emit('error', error);
    }
  }

  // 从 CABLE Input 到物理扬声器
  async setupSpeakerRoute(outputId: string): Promise<void> {
    try {
      const stream = await this.audioContextManager.setupSpeakerRoute(outputId);
      
      const audio = new Audio();
      audio.setSinkId(outputId);
      audio.srcObject = stream;
      await audio.play();
      
    } catch (error) {
      this.logger.error('设置扬声器路由失败:', error);
      this.emit('error', error);
    }
  }

  // 清理资源
  dispose(): void {
    this.audioContextManager.dispose();
    this.state = 'disposed';
  }

  // 重置处理器
  async reset(): Promise<void> {
    this.dispose();
    await this.initialize();
  }


  // 停止音频处理
  stop(): void {
    // 清理所有音频流和连接
    this.dispose();
    this.emit('stopped');
  }

  // 添加控制方法
  startCollecting() {
    if (this.state !== 'active') {
      throw new Error('AudioProcessor 未初始化');
    }
    console.info('开始收集音频');
    this.audioContextManager.getWorkletNode().port.postMessage({ type: 'startCollecting' });
  }

  stopCollecting() {
    if (this.state !== 'active') {
      throw new Error('AudioProcessor 未初始化');
    }
    console.info('停止收集音频');
    this.audioContextManager.getWorkletNode().port.postMessage({ type: 'stopCollecting' });
  }

  // 保存设备选择
  saveDeviceSelection(inputId: string, outputId: string): void {
    const deviceInfo: DeviceInfo = { inputId, outputId };
    localStorage.setItem('audioDeviceSelection', JSON.stringify(deviceInfo));
  }

  // 获取保存的设备选择
  getSavedDeviceSelection(): DeviceInfo | null {
    const saved = localStorage.getItem('audioDeviceSelection');
    return saved ? JSON.parse(saved) : null;
  }

  getAudioContextManager(): AudioContextManager {
    return this.audioContextManager;
  }
} 
