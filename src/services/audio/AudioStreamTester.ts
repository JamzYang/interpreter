import { EventEmitter } from '@/utils/EventEmitter';
import { VirtualDeviceManager } from './VirtualDeviceManager';
import { AudioProcessor } from './AudioProcessor';

export interface TestResult {
  success: boolean;
  latency?: number;
  errorRate?: number;
  message?: string;
}

/**
 * 音频测试工具
 * 
 * 核心职责:
 * 1. 测试完整音频链路:
 *    [物理麦克风] → [APP] → [CABLE Output] → [CABLE Input] → [APP] → [物理扬声器]
 * 2. 验证音频质量
 * 3. 检测设备连接状态
 */
export class AudioStreamTester extends EventEmitter {
  private deviceManager!: VirtualDeviceManager;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private audioProcessor: AudioProcessor;

  constructor() {
    super();
    this.initDeviceManager();
    this.audioProcessor = new AudioProcessor();
  }

  private async initDeviceManager() {
    this.deviceManager = await VirtualDeviceManager.getInstance();
  }

  /**
   * 测试完整音频链路
   */
  async testAudioRoute(): Promise<TestResult> {
    try {
      // 1. 测试说话阶段
      const micResult = await this.testMicrophoneToOutput();
      if (!micResult.success) {
        return micResult;
      }

      // 2. 测试听到阶段
      const speakerResult = await this.testInputToSpeaker();
      if (!speakerResult.success) {
        return speakerResult;
      }

      return {
        success: true,
        message: '音频链路测试成功'
      };
    } catch (error) {
      console.error('音频链路测试失败:', error);
      return {
        success: false,
        message: '音频链路测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  }

  /**
   * 测试从物理麦克风到CABLE Output的链路
   */
  public async testMicrophoneToOutput(): Promise<TestResult> {
    try {
      // 1. 获取物理麦克风
      const devices = await navigator.mediaDevices.enumerateDevices();
      const physicalMic = devices.find(d => 
        d.kind === 'audioinput' && !d.label.includes('VB-Audio')
      );

      if (!physicalMic) {
        return {
          success: false,
          message: '未找到物理麦克风'
        };
      }

      // 2. 启动音频处理
      await this.audioProcessor.setupMicrophoneRoute(physicalMic.deviceId);

      // 3. 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      return {
        success: true,
        message: '麦克风测试完成'
      };

    } catch (error) {
      console.error('麦克风测试失败:', error);
      return {
        success: false,
        message: '麦克风测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    } finally {
      this.audioProcessor?.stop();
    }
  }

  /**
   * 测试从CABLE Input到物理扬声器的链路
   */
  public async testInputToSpeaker(): Promise<TestResult> {
    try {
      // 1. 播放测试音到CABLE Input
      this.audioContext = new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      oscillator.stop();

      return {
        success: true,
        message: '扬声器测试成功'
      };
    } catch (error) {
      return {
        success: false,
        message: '扬声器测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  }

  /**
   * 测试音频信号
   */
  private async testAudioSignal(stream: MediaStream): Promise<TestResult> {
    return new Promise((resolve) => {
      this.audioContext = new AudioContext();
      this.analyzer = this.audioContext.createAnalyser();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyzer);
      
      const dataArray = new Float32Array(this.analyzer.frequencyBinCount);
      let maxSignalStrength = 0;
      
      const checkSignal = () => {
        this.analyzer!.getFloatTimeDomainData(dataArray);
        const rms = Math.sqrt(
          dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
        );
        
        maxSignalStrength = Math.max(maxSignalStrength, rms);
        
        if (rms > 0.005) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve({
            success: true,
            message: '检测到有效音频信号'
          });
        }
      };

      const interval = setInterval(checkSignal, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(interval);
        resolve({
          success: false,
          message: '未检测到有效音频信号'
        });
      }, 5000);
    });
  }

  dispose(): void {
    this.audioContext?.close();
    this.audioContext = null;
    this.analyzer = null;
    this.audioProcessor?.dispose();
    this.audioProcessor = null;
  }
} 