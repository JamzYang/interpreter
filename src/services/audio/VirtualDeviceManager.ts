/**
 * 虚拟设备管理器
 * 
 * 核心功能:
 * 1. 检测VB-CABLE设备
 * 2. 管理设备状态
 * 3. 处理设备连接/断开
 * 4. 设备配置管理
 */
import { DeviceStatus } from "@/types/device";
import { MediaDevice } from "@/types/device";
import { deviceUtils } from "@/utils/device";
import { EventEmitter } from 'events';

// 添加 DOM 错误类型
type DOMError = NotFoundError | NotAllowedError | NotReadableError;
declare class NotFoundError extends Error {}
declare class NotAllowedError extends Error {}
declare class NotReadableError extends Error {}

/**
 * VB-CABLE设备管理器
 * 负责管理和监控虚拟音频设备
 */
export class VirtualDeviceManager extends EventEmitter {
    private static instance: VirtualDeviceManager;
    private devices: Map<string, MediaDevice> = new Map();
    private status: DeviceStatus = {
        hasInput: false, 
        hasOutput: false , 
        inputReady: false, 
        outputReady: false
    };
    private audioContext: AudioContext | null = null;
    private currentStream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isRecording: boolean = false;
    private recordingStartTime: number = 0;
  
    private constructor() {
        super(); // 调用 EventEmitter 构造函数
      // 初始化设备管理器
    }
  
    // 获取单例
    public static getInstance(): VirtualDeviceManager {
      if (!VirtualDeviceManager.instance) {
        VirtualDeviceManager.instance = new VirtualDeviceManager();
      }
      return VirtualDeviceManager.instance;
    }
  
    // 核心方法实现
    async init(): Promise<void> {
      await this.detectVBCableDevices();
      await this.monitorDeviceChanges();
    }
    
    async detectVBCableDevices(): Promise<void> {
      const devices = await deviceUtils.getAudioDevices();
      
      // 重置状态
      this.devices.clear();
      this.status.hasInput = false;
      this.status.hasOutput = false;
      
      // 检查每个设备
      for (const device of devices) {
        const formattedDevice = deviceUtils.formatDeviceInfo(device);
        
        if (formattedDevice.isVBCable) {
          this.devices.set(formattedDevice.id, formattedDevice);
          
          if (formattedDevice.kind === 'audioinput') {
            this.status.hasInput = true;
          } else if (formattedDevice.kind === 'audiooutput') {
            this.status.hasOutput = true;
          }
        }
      }
    }
    
    async getInputDevice(): Promise<MediaDevice> {
      const device = Array.from(this.devices.values())
        .find(d => d.kind === 'audioinput' && d.isVBCable);
      if (!device) {
        throw new Error('VB-CABLE 输入设备未找到');
      }
      return device;
    }
    
    async getOutputDevice(): Promise<MediaDevice> {
      const device = Array.from(this.devices.values())
        .find(d => d.kind === 'audiooutput' && d.isVBCable);
      if (!device) {
        throw new Error('VB-CABLE 输出设备未找到');
      }
      return device;
    }
    
    async monitorDeviceChanges(): Promise<void> {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        await this.detectVBCableDevices();
        this.emit('deviceChange'); // 触发事件
      });
    }
    
    async validateDevices(): Promise<boolean> {
      const input = await this.getInputDevice();
      const output = await this.getOutputDevice();
      
      this.status.inputReady = await deviceUtils.testDevice(input.id);
      this.status.outputReady = await deviceUtils.testDevice(output.id);
      
      return this.status.inputReady && this.status.outputReady;
    }
    
    async getStatus(): Promise<DeviceStatus> {
      return this.status;
    }
    
    // 增强版音频流测试
    async testAudioStream(testDuration: number = 3000): Promise<boolean> {
        try {
            const inputDevice = await this.getInputDevice();
            
            // 获取音频流
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                audio: { 
                    deviceId: { exact: inputDevice.id },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // 创建音频上下文
            this.audioContext = new AudioContext({
                latencyHint: 'interactive',
                sampleRate: 48000
            });

            // 创建音频节点
            const source = this.audioContext.createMediaStreamSource(this.currentStream);
            const analyser = this.audioContext.createAnalyser();
            const destination = this.audioContext.createMediaStreamDestination();

            // 连接音频节点
            source.connect(analyser);
            analyser.connect(destination);

            // 检测音频信号
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            return new Promise((resolve) => {
                const checkAudio = () => {
                    analyser.getByteTimeDomainData(dataArray);
                    
                    // 检查是否有音频信号
                    const hasSignal = dataArray.some(value => value !== 128);
                    if (hasSignal) {
                        this.emit('audioSignalDetected');
                    }
                };

                // 定期检查音频信号
                const interval = setInterval(checkAudio, 100);

                // 设置测试超时
                setTimeout(() => {
                    clearInterval(interval);
                    this.cleanupAudioTest();
                    resolve(true);
                }, testDuration);
            });

        } catch (error) {
            console.error('音频流测试失败:', error);
            this.emit('streamError', error);
            return false;
        }
    }

    // 清理音频测试资源
    private async cleanupAudioTest(): Promise<void> {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }
            
            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }
        } catch (error) {
            console.error('清理音频测试资源失败:', error);
            this.emit('cleanupError', error);
        }
    }

    // 错误处理和恢复机制增强
    async handleError(error: Error): Promise<void> {
        try {
            console.error('设备错误:', error);
            this.emit('error', error);

            // 错误分类处理
            if (error instanceof NotFoundError) {
                this.emit('deviceNotFound');
                await this.detectVBCableDevices();
            } else if (error instanceof NotAllowedError) {
                this.emit('permissionDenied');
            } else if (error instanceof NotReadableError) {
                this.emit('deviceBusy');
                await this.cleanupAudioTest();
                await this.recover();
            }

            // 尝试自动恢复
            const recoveryResult = await this.recover();
            if (!recoveryResult) {
                this.emit('recoveryFailed');
            }
        } catch (recoveryError) {
            console.error('错误恢复失败:', recoveryError);
            this.emit('criticalError', recoveryError);
        }
    }

    // 增强的恢复机制
    async recover(): Promise<boolean> {
        try {
            // 清理现有资源
            await this.cleanupAudioTest();
            
            // 重新检测设备
            await this.detectVBCableDevices();
            
            // 验证设备状态
            const devicesValid = await this.validateDevices();
            if (!devicesValid) {
                throw new Error('设备验证失败');
            }

            // 测试音频流
            const streamValid = await this.testAudioStream(1000);
            if (!streamValid) {
                throw new Error('音频流测试失败');
            }

            this.emit('recovered');
            return true;
        } catch (error) {
            this.emit('recoverFailed', error);
            return false;
        }
    }
    
    // 详细的设备状态事件
    public async handleDeviceChange(): Promise<void> {
        const previousStatus = { ...this.status };
        await this.detectVBCableDevices();
        const currentStatus = this.status;
        
        if (previousStatus.hasInput && !currentStatus.hasInput) {
            this.emit('inputDisconnected');
        }
        if (!previousStatus.hasInput && currentStatus.hasInput) {
            this.emit('inputConnected');
        }
        if (previousStatus.hasOutput && !currentStatus.hasOutput) {
            this.emit('outputDisconnected');
        }
        if (!previousStatus.hasOutput && currentStatus.hasOutput) {
            this.emit('outputConnected');
        }
        
        this.emit('deviceChange', currentStatus);
    }

    /**
     * 开始录制音频
     * @param options 录制选项
     */
    async startRecording(options: {
        mimeType?: string;
        audioBitsPerSecond?: number;
    } = {}): Promise<void> {
        try {
            if (this.isRecording) {
                throw new Error('已经在录制中');
            }

            const inputDevice = await this.getInputDevice();
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: inputDevice.id },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // 设置默认录制选项
            const recorderOptions = {
                mimeType: options.mimeType || 'audio/webm',
                audioBitsPerSecond: options.audioBitsPerSecond || 128000
            };

            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.currentStream, recorderOptions);

            // 处理录制数据
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    this.emit('recordingData', event.data);
                }
            };

            // 处理录制状态变化
            this.mediaRecorder.onstart = () => {
                this.isRecording = true;
                this.recordingStartTime = Date.now();
                this.emit('recordingStarted');
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                this.emit('recordingStopped');
            };

            this.mediaRecorder.onerror = (error) => {
                this.emit('recordingError', error);
            };

            // 开始录制
            this.mediaRecorder.start(1000); // 每秒生成一个数据块

        } catch (error) {
            console.error('开始录制失败:', error);
            this.emit('recordingError', error);
            throw error;
        }
    }

    /**
     * 停止录制音频
     * @returns 录制的音频数据
     */
    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('没有正在进行的录制'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                try {
                    const finalBlob = new Blob(this.recordedChunks, {
                        type: this.mediaRecorder?.mimeType || 'audio/webm'
                    });
                    this.isRecording = false;
                    this.cleanupRecording();
                    this.emit('recordingStopped', finalBlob);
                    resolve(finalBlob);
                } catch (error) {
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * 暂停录制
     */
    pauseRecording(): void {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.pause();
            this.emit('recordingPaused');
        }
    }

    /**
     * 恢复录制
     */
    resumeRecording(): void {
        if (this.mediaRecorder?.state === 'paused') {
            this.mediaRecorder.resume();
            this.emit('recordingResumed');
        }
    }

    /**
     * 获取录制状态
     */
    getRecordingState(): {
        isRecording: boolean;
        state: RecordingState;
        duration: number;
    } {
        return {
            isRecording: this.isRecording,
            state: this.mediaRecorder?.state || 'inactive',
            duration: this.getRecordingDuration()
        };
    }

    /**
     * 清理录制资源
     */
    private cleanupRecording(): void {
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.recordedChunks = [];
    }

    /**
     * 获取录制时长（毫秒）
     */
    private getRecordingDuration(): number {
        if (!this.isRecording) return 0;
        return Date.now() - this.recordingStartTime;
    }
}

// 录制状态类型
type RecordingState = 'inactive' | 'recording' | 'paused';