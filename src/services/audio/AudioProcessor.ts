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
import { VirtualDeviceManager } from './VirtualDeviceManager';
import { GeminiService } from '../llm/GeminiService';

export class AudioProcessor extends EventEmitter {
  private logger: Logger;
  private deviceManager!: VirtualDeviceManager;
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private cableStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  constructor() {
    super();
    this.logger = new Logger('AudioProcessor');
    this.initDeviceManager();
  }

  private async initDeviceManager() {
    this.deviceManager = await VirtualDeviceManager.getInstance();
  }

  // 从物理麦克风到 CABLE Output
  async setupMicrophoneRoute(deviceId: string): Promise<void> {
    try {
      // 1. 获取物理麦克风输入
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false
        }
      });
      console.log('麦克风流:', this.microphoneStream);

      // 2. 设置音频处理
      this.audioContext = new AudioContext();
      
      // 3. 加载并创建 AudioWorklet
      console.log('开始加载 AudioWorklet...');
      await this.audioContext.audioWorklet.addModule('/src/worklets/translator-worklet.ts');
      console.log('AudioWorklet 加载完成');
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'translator-processor');
      console.log('AudioWorkletNode 创建完成');

      // 4. 启动音频收集和设置消息处理
      this.workletNode.port.onmessage = async (event) => {
        console.log('收到 worklet 消息:', event.data.type);
        
        if (event.data.type === 'audioData') {
          try {
            console.log('开始处理音频数据，数据长度:', event.data.data.length);
            const llmService = new GeminiService('YOUR_GEMINI_API_ENDPOINT');
            const result = await llmService.transcribeAudio(event.data.data);
            console.log('转录结果:', result);
            
          } catch (error) {
            console.error('音频转录失败:', error);
          }
        } else if (event.data.type === 'error') {
          console.error('Worklet 处理错误:', event.data.error);
        }
      };

      // 先发送开始收集的消息
      console.log('发送开始收集命令');
      this.workletNode.port.postMessage({ type: 'startCollecting' });

      // 10秒后停止收集
      setTimeout(() => {
        if (this.workletNode) {
          console.log('准备停止收集音频数据');
          this.workletNode.port.postMessage({ type: 'stopCollecting' });
          console.log('已发送停止收集命令');
        }
      }, 10000);

      // 5. 连接音频节点
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      source.connect(this.workletNode);
      this.workletNode.connect(destination);

      // 6. 输出到 CABLE Output
      const audio = new Audio();
      audio.srcObject = destination.stream;
      await audio.play();

    } catch (error) {
      console.error('设置麦克风路由失败:', error);
      this.emit('error', error);
    }
  }

  // 从 CABLE Input 到物理扬声器
  async setupSpeakerRoute(outputId: string): Promise<void> {
    try {
      // 1. 获取 CABLE Input
      this.cableStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true  // 使用系统默认设备 (CABLE Input)
      });

      // 2. 设置音频处理
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        await this.audioContext.audioWorklet.addModule('/audio-processors/translator-worklet.js');
      }

      const source = this.audioContext.createMediaStreamSource(this.cableStream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'translator-processor');
      
      // 3. 设置消息处理
      this.workletNode.port.onmessage = (event) => {
        // TODO: 处理来自 worklet 的消息
        console.log('Received message from worklet:', event.data);
      };

      source.connect(this.workletNode);
      this.workletNode.connect(destination);

      // 4. 输出到指定的物理扬声器
      const audio = new Audio();
      audio.setSinkId(outputId); // 设置输出设备
      audio.srcObject = destination.stream;
      await audio.play();

    } catch (error) {
      this.emit('error', error);
    }
  }

  // 清理资源
  dispose(): void {
    this.microphoneStream?.getTracks().forEach(track => track.stop());
    this.cableStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    this.workletNode?.disconnect();
    
    this.microphoneStream = null;
    this.cableStream = null;
    this.audioContext = null;
    this.workletNode = null;
  }

  // 重置处理器
  async reset(): Promise<void> {
    this.dispose();
    await this.initDeviceManager();
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
} 
