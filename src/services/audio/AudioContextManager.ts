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
      const defaultDevice = devices.find(device => device.label.includes('CABLE Output') && device.kind === 'audioinput');
      if (!defaultDevice) {
        throw new Error('未找到默认录音设备');
      }
      console.log('找到的虚拟录制设备:', defaultDevice);
      
      // 不要在初始化时就连接麦克风
      // this.setupMicrophoneRoute(macfengDevice.id);
      
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
      // 先停止之前的流
      this.microphoneStream?.getTracks().forEach(track => track.stop());

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,  // 启用回声消除
          noiseSuppression: true,  // 启用噪声抑制
          autoGainControl: true    // 启用自动增益控制
        }
      });

      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      // 添加音量控制
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5; // 降低增益以减少反馈
      
      source.connect(gainNode);
      gainNode.connect(this.workletNode);
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

  getAudioContext(): AudioContext {
    return this.audioContext;
  }
} 