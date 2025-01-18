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

  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('AudioProcessor 已经初始化或正在使用中');
    }

    this.state = 'initializing';
    try {
      await this.audioContextManager.initialize();
      this.setupWorkletEventListeners();
      this.state = 'active';
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }

  private setupWorkletEventListeners() {
    const workletNode = this.audioContextManager.getWorkletNode();
    workletNode.port.onmessage = async (event) => {
      this.logger.debug('收到 worklet 消息:', event.data.type);
      
      if (event.data.type === 'audioData') {
        await this.processAudioData(event.data.data);
      } else if (event.data.type === 'error') {
        this.logger.error('Worklet 处理错误:', event.data.error);
        this.emit('error', event.data.error);
      }
    };
  }

  private async processAudioData(audioData: string) {
    try {
      this.logger.debug('开始处理音频数据，数据长度:', audioData.length);
      const llmService = new GeminiService('YOUR_GEMINI_API_ENDPOINT');
      const result = await llmService.transcribeAudio(audioData);
      this.logger.info('转录结果:', result);
      this.emit('transcription', result);
    } catch (error) {
      this.logger.error('音频转录失败:', error);
      this.emit('error', error);
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
      this.logger.error('设置麦克风路由失败:', error);
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

  // 开始音频处理
  async start(inputId: string, outputId: string): Promise<void> {
    try {
      // 1. 设置麦克风到 CABLE Output 的路由
      await this.setupMicrophoneRoute(inputId);
      
      // 2. 设置 CABLE Input 到扬声器的路由
      await this.setupSpeakerRoute(outputId);

      this.emit('started');
    } catch (error) {
      this.emit('error', error);
    }
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
    this.logger.info('开始收集音频');
    this.audioContextManager.getWorkletNode().port.postMessage({ type: 'startCollecting' });
  }

  stopCollecting() {
    if (this.state !== 'active') {
      throw new Error('AudioProcessor 未初始化');
    }
    this.logger.info('停止收集音频');
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
} 
