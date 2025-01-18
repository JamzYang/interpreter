import { Logger } from '@/utils/Logger';
import { deviceUtils } from "@/utils/device";
import { VirtualDeviceManager } from "./VirtualDeviceManager";
export class AudioContextManager {
  private logger: Logger;
  private audioContext: AudioContext;
  private workletNode?: AudioWorkletNode;
  private microphoneStream?: MediaStream;
  private cableStream?: MediaStream;
  private cableOutputDestination?: MediaStreamAudioDestinationNode;
  // private virtualDeviceManager: VirtualDeviceManager;

  constructor() {
    this.logger = new Logger('AudioContextManager');
    this.audioContext = new AudioContext();
  }

  async initialize() {
    try {
      // 1. 初始化 AudioWorklet
      await this.audioContext.audioWorklet.addModule('/src/worklets/translator-worklet.ts');
      this.workletNode = new AudioWorkletNode(this.audioContext, 'translator-processor');
      
      // 2. 设置 CABLE Output
      const devices = await deviceUtils.getAudioDevices();
      //label 包含 Default 的设备,且kind为audioinput
      const defaultDevice = devices.find(device => device.label.includes('Default') && device.kind === 'audioinput');
      if (!defaultDevice) {
        throw new Error('未找到默认录音设备');
      }
      
      await this.setupCableOutput(defaultDevice.id);
      
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

  async setupCableOutput(cableOutputId: string) {
    try {
      // 创建目标节点
      this.cableOutputDestination = this.audioContext.createMediaStreamDestination();
      
      // 创建音频元素并连接到 CABLE Output
      const audio = new Audio();
      audio.srcObject = this.cableOutputDestination.stream;
      
      // 使用传入的 CABLE Output 设备 ID
      if ('setSinkId' in audio) {
        await audio.setSinkId(cableOutputId);
      }
      
      await audio.play();
      return this.cableOutputDestination;
    } catch (error) {
      this.logger.error('设置 CABLE Output 失败:', error);
      throw error;
    }
  }

  getCableOutputDestination(): AudioNode {
    if (!this.cableOutputDestination) {
      throw new Error('CABLE Output 未初始化');
    }
    return this.cableOutputDestination;
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

  async decodeAudioData(audioBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return await this.audioContext.decodeAudioData(audioBuffer);
  }

  createBufferSource(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    return source;
  }
} 