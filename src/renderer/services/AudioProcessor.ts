export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private inputStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.handleAudioProcess = this.handleAudioProcess.bind(this);
  }

  async initialize(inputDeviceId: string, outputDeviceId: string): Promise<boolean> {
    try {
      // 创建音频上下文
      this.audioContext = new AudioContext();

      // 获取麦克风输入
      this.inputStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: inputDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 设置输出设备
      if ('setSinkId' in this.audioContext.destination) {
        await (this.audioContext.destination as any).setSinkId(outputDeviceId);
      }

      // 创建处理节点
      const source = this.audioContext.createMediaStreamSource(this.inputStream);
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      this.processor.onaudioprocess = this.handleAudioProcess;

      // 连接节点
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent) {
    if (!this.isProcessing) return;

    const inputData = event.inputBuffer.getChannelData(0);
    // 计算音量级别
    const volume = this.calculateVolume(inputData);
    
    // 发送音频数据事件
    window.dispatchEvent(new CustomEvent('audio-data', {
      detail: {
        data: inputData,
        volume,
        timestamp: Date.now()
      }
    }));
  }

  private calculateVolume(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return 20 * Math.log10(rms);
  }

  start() {
    this.isProcessing = true;
  }

  stop() {
    this.isProcessing = false;
    if (this.inputStream) {
      this.inputStream.getTracks().forEach(track => track.stop());
    }
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  async getDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: devices.filter(device => device.kind === 'audioinput'),
      outputs: devices.filter(device => device.kind === 'audiooutput')
    };
  }
} 