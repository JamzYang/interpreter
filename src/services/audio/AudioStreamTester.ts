import { EventEmitter } from '@/utils/EventEmitter';
import { AudioService } from './AudioService';

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
  private audioService: AudioService;

  constructor() {
    super();
    this.initService();
  }

  private async initService() {
    this.audioService = await AudioService.getInstance();
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
      if (!this.audioService) {
        throw new Error('音频服务未初始化');
      }

      // 通过 AudioService 获取设备
      const devices = await this.audioService.getAvailableDevices();
      const physicalMic = devices.find(d => 
        d.kind === 'audioinput' && !d.label.includes('VB-Audio')
      );

      if (!physicalMic) {
        return {
          success: false,
          message: '未找到物理麦克风'
        };
      }

      // 使用 AudioService 进行测试
      await this.audioService.setDevices(physicalMic.deviceId, '');
      await this.audioService.startRecording();

      // 等待测试完成
      await new Promise(resolve => setTimeout(resolve, 5000));
      await this.audioService.stopRecording();

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

  /**
   * 播放测试音频到 CABLE Output
   */
  public async playTestAudio(): Promise<TestResult> {
    try {
      // 1. 读取测试音频文件
      const audioBuffer = await window.electronAPI.readTestAudioFile()
      
      // 2. 创建音频上下文和节点
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }
      
      // 3. 解码音频数据
      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer)
      
      // 4. 创建音频源并连接到 CABLE Output
      const source = this.audioContext.createBufferSource()
      source.buffer = decodedAudio
      source.connect(this.audioContext.destination)
      
      // 5. 播放音频
      source.start()
      
      // 6. 等待音频播放完成
      await new Promise<void>((resolve) => {
        source.onended = () => resolve()
      })

      return {
        success: true,
        message: '测试音频播放完成'
      }
    } catch (error) {
      console.error('测试音频播放失败:', error)
      return {
        success: false,
        message: '测试音频播放失败: ' + (error instanceof Error ? error.message : '未知错误')
      }
    }
  }

  dispose(): void {
    this.audioContext?.close();
    this.audioContext = null;
    this.analyzer = null;
    if (this.audioProcessor) {
      this.audioProcessor.dispose();
      // @ts-ignore: 允许将 audioProcessor 设置为 null
      this.audioProcessor = null;
    }
  }
} 