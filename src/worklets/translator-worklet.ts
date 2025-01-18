/// <reference path="./types.d.ts" />

class TranslatorProcessor extends AudioWorkletProcessor {
  private audioBuffer: Float32Array[] = [];
  private sampleRate: number;
  private isCollecting: boolean = false;
  private readonly BUFFER_SIZE = 44100; // 1秒的音频数据

  constructor() {
    super();
    this.sampleRate = 44100;
    console.log('TranslatorProcessor 已创建');
    this.port.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    console.log('收到消息:', event.data);
    if (event.data.type === 'startCollecting') {
      this.isCollecting = true;
      this.audioBuffer = [];
      console.log('开始收集音频数据');
    } else if (event.data.type === 'stopCollecting') {
      this.isCollecting = false;
      console.log('停止收集音频数据，开始处理');
      this.processCollectedAudio();
    }
  }

  private async processCollectedAudio() {
    try {
      console.log('开始处理收集的音频数据');
      
      // 1. 合并收集的音频数据
      const mergedBuffer = this.mergeBuffers(this.audioBuffer);
      console.log('音频数据已合并, 长度:', mergedBuffer.length);
      
      // 2. 将 Float32Array 转换为 WAV 格式
      const wavBuffer = this.float32ToWav(mergedBuffer);
      console.log('已转换为WAV格式, 大小:', wavBuffer.byteLength);
      
      // 3. 转换为 Base64
      const base64Audio = this.arrayBufferToBase64(wavBuffer);
      console.log('已转换为Base64, 长度:', base64Audio.length);

      // 4. 发送到主线程处理
      try {
        this.port.postMessage({
          type: 'audioData',
          data: base64Audio
        });
        console.log('音频数据已成功发送到主线程');
      } catch (postError) {
        console.error('发送消息到主线程失败:', postError);
      }
    } catch (error) {
      console.error('处理音频数据时出错:', error);
      this.port.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : '处理音频数据失败'
      });
    }
  }

  private mergeBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }

  private float32ToWav(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');  // ChunkID
    view.setUint32(4, 36 + samples.length * 2, true);  // ChunkSize
    writeString(8, 'WAVE');  // Format
    writeString(12, 'fmt ');  // Subchunk1ID
    view.setUint32(16, 16, true);  // Subchunk1Size
    view.setUint16(20, 1, true);   // AudioFormat (PCM)
    view.setUint16(22, 1, true);   // NumChannels (Mono)
    view.setUint32(24, this.sampleRate, true);  // SampleRate
    view.setUint32(28, this.sampleRate * 2, true);  // ByteRate
    view.setUint16(32, 2, true);   // BlockAlign
    view.setUint16(34, 16, true);  // BitsPerSample
    writeString(36, 'data');  // Subchunk2ID
    view.setUint32(40, samples.length * 2, true);  // Subchunk2Size

    // 将 Float32 转换为 16-bit PCM
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    // 创建一个字符数组来存储转换后的数据
    const chars: string[] = [];
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    
    // Base64 字符表
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    
    // 每3个字节转换为4个Base64字符
    for (let i = 0; i < len; i += 3) {
      const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      
      chars.push(
        base64Chars[(chunk >> 18) & 63],
        base64Chars[(chunk >> 12) & 63],
        i + 1 < len ? base64Chars[(chunk >> 6) & 63] : '=',
        i + 2 < len ? base64Chars[chunk & 63] : '='
      );
    }
    
    return chars.join('');
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (input && input[0] && this.isCollecting) {
      // 收集音频数据
      const inputData = new Float32Array(input[0]);
      this.audioBuffer.push(inputData);
      
      // 每50帧打印一次，避免日志太多
      if (this.audioBuffer.length % 50 === 0) {
        console.log('正在收集音频数据，当前帧数:', this.audioBuffer.length);
        console.log('当前缓冲区大小:', this.audioBuffer.length * input[0].length);
      }
      
      // 如果缓冲区达到指定大小，开始处理
      if (this.audioBuffer.length * input[0].length >= this.BUFFER_SIZE) {
        console.log('缓冲区已满，当前大小:', this.audioBuffer.length * input[0].length);
        console.log('开始处理收集的音频数据');
        this.processCollectedAudio();
        this.audioBuffer = [];
      }
    }

    // 直接传递音频数据
    if (input && output) {
      for (let channel = 0; channel < input.length; channel++) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];
        outputChannel.set(inputChannel);
      }
    }

    return true;
  }
}

registerProcessor('translator-processor', TranslatorProcessor); 