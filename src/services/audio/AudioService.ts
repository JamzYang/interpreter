/**
 * 音频服务（单例）
 * 
 * 核心职责:
 * 1. 协调整个音频处理流程
 * 2. 管理设备选择:
 *    - 输入设备: 物理麦克风
 *    - 输出设备: 物理扬声器
 * 3. 管理音频处理器生命周期
 */ 

import { EventEmitter } from '@/utils/EventEmitter';
import { VirtualDeviceManager } from './VirtualDeviceManager';
import { AudioProcessor } from '@/services/audio/AudioProcessor';
import { Logger } from '@/utils/Logger';
import { MediaDevice } from '@/types/device';
import { deviceUtils } from "@/utils/device";
export enum AudioServiceEvent {
  ERROR = 'error',
  STATUS_CHANGE = 'statusChange',
  DEVICE_CHANGE = 'deviceChange',
  RECORDING_START = 'recordingStart',
  RECORDING_STOP = 'recordingStop'
}

export enum AudioServiceStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  RECORDING = 'recording',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export class AudioService extends EventEmitter {
  private static instance: AudioService;
  private static initPromise: Promise<AudioService>;
  private deviceManager!: VirtualDeviceManager;
  private audioProcessor: AudioProcessor = new AudioProcessor();
  private status: AudioServiceStatus = AudioServiceStatus.INITIALIZING;
  private logger: Logger;
  private currentInputId: string = '';
  private currentOutputId: string = '';

  public static async getInstance(): Promise<AudioService> {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
      AudioService.initPromise = AudioService.instance.initializeService()
        .then(() => AudioService.instance);
    }
    return AudioService.initPromise;
  }

  private constructor() {
    super();
    this.logger = new Logger('AudioService');
  }

  private async initializeService() {
    try {
      this.deviceManager = await VirtualDeviceManager.getInstance();
      await this.audioProcessor.initialize();
      this.deviceManager.on('deviceChange', this.handleDeviceChange.bind(this));
      this.deviceManager.on('error', this.handleDeviceError.bind(this));
      
      this.setStatus(AudioServiceStatus.READY);
    } catch (error) {
      this.handleError('Failed to initialize AudioService', error);
    }
  }

  private setStatus(status: AudioServiceStatus) {
    if (this.status !== status) {
      this.status = status;
      this.emit(AudioServiceEvent.STATUS_CHANGE, status);
      this.logger.info(`Status changed to: ${status}`);
    }
  }

  private handleDeviceChange = (devices: MediaDeviceInfo[]) => {
    this.emit(AudioServiceEvent.DEVICE_CHANGE, devices);
    this.logger.info('Device configuration changed');
  }

  private handleDeviceError = (error: Error) => {
    this.handleError('Device error occurred', error);
  }

  private handleError(message: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`${message}: ${errorMessage}`);
    this.setStatus(AudioServiceStatus.ERROR);
    this.emit(AudioServiceEvent.ERROR, { message, error });
  }

  // 音频处理流程控制
  public async startRecording(): Promise<void> {
    try {
      // if (this.status !== AudioServiceStatus.READY) {
      //   throw new Error('AudioService is not ready');
      // }
      
      if (this.audioProcessor) {
        await this.audioProcessor.startCollecting();
        this.setStatus(AudioServiceStatus.RECORDING);
        this.emit(AudioServiceEvent.RECORDING_START);
      }
    } catch (error) {
      this.setStatus(AudioServiceStatus.READY);
      this.handleError('Failed to start recording', error);
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    try {
      if (this.status !== AudioServiceStatus.RECORDING) {
        return;
      }
      
      this.audioProcessor.stopCollecting();
      this.setStatus(AudioServiceStatus.READY);
      this.emit(AudioServiceEvent.RECORDING_STOP);
    } catch (error) {
      this.handleError('Failed to stop recording', error);
      throw error;
    }
  }

  // 生命周期管理
  public async destroy(): Promise<void> {
    try {
      await this.stopRecording();
      this.audioProcessor?.dispose();
      this.deviceManager.removeAllListeners();
      this.removeAllListeners();
      this.setStatus(AudioServiceStatus.STOPPED);
    } catch (error) {
      this.handleError('Failed to destroy AudioService', error);
    }
  }

  // 错误恢复机制
  public async recover(): Promise<void> {
    if (this.status !== AudioServiceStatus.ERROR) {
      return;
    }

    try {
      await this.audioProcessor?.reset();
      // await this.deviceManager.init();
      this.setStatus(AudioServiceStatus.READY);
      this.logger.info('Successfully recovered from error state');
    } catch (error) {
      this.handleError('Failed to recover from error state', error);
    }
  }

  // 设备管理接口
  public async switchInputDevice(inputDeviceId: string): Promise<void> {
    this.audioProcessor.getAudioContextManager().setupMicrophoneRoute(inputDeviceId)
  }

  public async getAvailableDevices(): Promise<MediaDevice[]> {
    return await deviceUtils.getAudioDevices();
  }

  // 设置应用程序的物理设备
  public async setDevices(inputId: string, outputId: string) {
    try {
      // 保存当前设备ID
      this.currentInputId = inputId;
      this.currentOutputId = outputId;

      // 如果正在录音，需要重启音频处理
      if (this.status === AudioServiceStatus.RECORDING) {
        await this.stopRecording();
        await this.startRecording();
      }
    } catch (error) {
      this.handleError('Failed to set devices', error);
    }
  }
}