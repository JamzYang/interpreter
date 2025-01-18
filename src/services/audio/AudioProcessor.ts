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

export enum AudioProcessorEvent {
  ERROR = 'error',
  DATA_AVAILABLE = 'dataAvailable',
  BUFFER_FULL = 'bufferFull',
  BUFFER_EMPTY = 'bufferEmpty'
}

export class AudioProcessor extends EventEmitter {
  private logger: Logger;
  private deviceManager!: VirtualDeviceManager;
  private inputStream: MediaStream | null = null;
  private outputStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private outputNode: MediaStreamAudioDestinationNode | null = null;
  
  // 音频缓冲区管理
  private readonly BUFFER_SIZE = 16384; // 缓冲区大小
  private audioBuffer: Float32Array[]; // 音频数据缓冲区
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.logger = new Logger('AudioProcessor');
    this.audioBuffer = [];
    this.initDeviceManager();
  }

  private async initDeviceManager() {
    this.deviceManager = await VirtualDeviceManager.getInstance();
  }

  /**
   * 开始音频处理
   */
  public async startProcessing(): Promise<void> {
    try {
      // 1. 从物理麦克风获取音频
      const devices = await navigator.mediaDevices.enumerateDevices();
      const physicalMic = devices.find(d => 
        d.kind === 'audioinput' && !d.label.includes('VB-Audio')
      );

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: physicalMic.deviceId }
        }
      });

      // 2. 设置音频处理上下文
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(micStream);
      const destination = this.audioContext.createMediaStreamDestination();

      // 3. 处理音频...

      // 4. 输出到 CABLE Output (系统默认录制设备)
      const audio = new Audio();
      audio.srcObject = destination.stream;
      await audio.play();
    } catch (error) {
      this.handleError('Failed to start audio processing', error);
    }
  }

  /**
   * 处理音频数据
   */
  private handleAudioProcess(event: AudioProcessingEvent) {
    // 1. 从VB-CABLE Input读取音频数据
    const inputData = event.inputBuffer.getChannelData(0);
    
    // 2. 将数据添加到缓冲区
    this.addToBuffer(inputData);
    
    // 3. 处理缓冲区数据
    this.processBuffer();
    
    // 4. 输出到VB-CABLE Output
    this.outputToDevice(event.outputBuffer);
  }

  /**
   * 添加数据到缓冲区
   */
  private addToBuffer(data: Float32Array) {
    this.audioBuffer.push(new Float32Array(data));
    
    if (this.audioBuffer.length >= 10) { // 缓冲区达到阈值
      this.emit(AudioProcessorEvent.BUFFER_FULL);
    }
  }

  /**
   * 处理缓冲区数据
   */
  private processBuffer() {
    while (this.audioBuffer.length > 0) {
      const data = this.audioBuffer.shift();
      if (data) {
        this.emit(AudioProcessorEvent.DATA_AVAILABLE, data);
      }
    }

    if (this.audioBuffer.length === 0) {
      this.emit(AudioProcessorEvent.BUFFER_EMPTY);
    }
  }

  /**
   * 输出音频数据到VB-CABLE Output设备
   */
  private outputToDevice(outputBuffer: AudioBuffer) {
    const outputData = outputBuffer.getChannelData(0);
    
    // 如果有缓冲区数据，写入输出
    if (this.audioBuffer.length > 0) {
      const nextData = this.audioBuffer[0];
      outputData.set(nextData);
    }
  }

  /**
   * 停止音频处理
   */
  public async stopProcessing(): Promise<void> {
    try {
      this.isProcessing = false;
      this.audioBuffer = [];
      
      // 清理资源
      this.inputStream?.getTracks().forEach(track => track.stop());
      await this.audioContext?.close();
      
      this.inputStream = null;
      this.audioContext = null;
      
      this.logger.info('Audio processing stopped');
    } catch (error) {
      this.handleError('Failed to stop audio processing', error);
    }
  }

  private handleError(message: string, error: any) {
    this.logger.error(message, error);
    this.emit(AudioProcessorEvent.ERROR, { message, error });
  }

  /**
   * 获取缓冲区状态
   */
  public getBufferStatus() {
    return {
      size: this.audioBuffer.length,
      capacity: this.BUFFER_SIZE
    };
  }

  public async startRecording(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Already processing audio');
    }
    await this.startProcessing();
  }

  public async stopRecording(): Promise<void> {
    if (!this.isProcessing) {
      throw new Error('No active recording');
    }
    await this.stopProcessing();
  }

  public async reset(): Promise<void> {
    await this.stopProcessing();
    this.audioBuffer = [];
  }

  public dispose(): void {
    this.stopProcessing();
    this.removeAllListeners();
  }

  public async updateInputDevice(deviceId: string): Promise<void> {
    await this.stopProcessing();
    await this.startProcessing();
  }

  private async setupAudioRouting() {
    try {
      // 1. 从 CABLE Input (系统默认播放设备) 获取音频
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true  // 使用系统默认录制设备
      });

      // 2. 处理音频...

      // 3. 输出到物理扬声器
      const audio = new Audio();
      audio.srcObject = this.outputNode.stream;
      await audio.play();
    } catch (error) {
      this.handleError('Failed to setup audio routing', error);
    }
  }
} 
