import { Logger } from '@/utils/Logger';

export class AudioContextManager {
  private logger: Logger;
  private audioContext: AudioContext;
  private workletNode?: AudioWorkletNode;
  private microphoneStream?: MediaStream;
  private cableStream?: MediaStream;

  constructor() {
    this.logger = new Logger('AudioContextManager');
    this.audioContext = new AudioContext();
  }

  async initialize() {
    try {
      await this.audioContext.audioWorklet.addModule('/src/worklets/translator-worklet.ts');
      this.workletNode = new AudioWorkletNode(this.audioContext, 'translator-processor');
      this.logger.debug('AudioContextManager 初始化完成');
    } catch (error) {
      this.logger.error('AudioContextManager 初始化失败:', error);
      throw error;
    }
  }

  getWorkletNode(): AudioWorkletNode {
    if (!this.workletNode) {
      throw new Error('AudioWorkletNode 未初始化');
    }
    return this.workletNode;
  }

  async setupMicrophoneRoute(deviceId: string): Promise<MediaStream> {
    if (!this.workletNode) {
      throw new Error('AudioWorkletNode 未初始化');
    }

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false
        }
      });

      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      source.connect(this.workletNode);
      this.workletNode.connect(destination);
      
      return destination.stream;
    } catch (error) {
      this.logger.error('设置麦克风路由失败:', error);
      throw error;
    }
  }

  async setupSpeakerRoute(outputId: string): Promise<MediaStream> {
    if (!this.workletNode) {
      throw new Error('AudioWorkletNode 未初始化');
    }

    try {
      this.cableStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true  // 使用系统默认设备 (CABLE Input)
      });

      const source = this.audioContext.createMediaStreamSource(this.cableStream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      source.connect(this.workletNode);
      this.workletNode.connect(destination);
      
      return destination.stream;
    } catch (error) {
      this.logger.error('设置扬声器路由失败:', error);
      throw error;
    }
  }

  dispose() {
    try {
      this.microphoneStream?.getTracks().forEach(track => track.stop());
      this.cableStream?.getTracks().forEach(track => track.stop());
      this.workletNode?.disconnect();
      this.audioContext?.close();
      
      this.logger.debug('AudioContextManager 资源已清理');
    } catch (error) {
      this.logger.error('清理 AudioContextManager 资源失败:', error);
    }
  }
} 