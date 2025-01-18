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

      // 2. 设置音频处理
      this.audioContext = new AudioContext();
      
      // 3. 加载并创建 AudioWorklet
      await this.audioContext.audioWorklet.addModule('/src/worklets/translator-worklet.ts');
      this.workletNode = new AudioWorkletNode(this.audioContext, 'translator-processor');

      // 4. 设置消息处理
      this.workletNode.port.onmessage = (event) => {
        // TODO: 处理来自 worklet 的消息
        console.log('Received message from worklet:', event.data);
      };
      
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
