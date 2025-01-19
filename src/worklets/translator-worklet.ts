/// <reference path="./types.d.ts" />

enum AudioProcessingState {
  IDLE = 'idle',           // 空闲状态
  COLLECTING = 'collecting', // 正在收集音频
  PENDING = 'pending',      // 待处理(已收集完,等待处理)
  PROCESSING = 'processing', // 正在处理中
  PROCESSED = 'processed'   // 处理完成
}

class TranslatorProcessor extends AudioWorkletProcessor {
  private collectedBuffer: Float32Array[] = []; // 用于收集录音数据
  private outputBuffer: Float32Array[] = [];    // 用于输出到扬声器
  private sampleRate: number;
  private state: AudioProcessingState = AudioProcessingState.IDLE;

  constructor() {
    super();
    this.sampleRate = 44100;
    console.log('TranslatorProcessor 已创建');
    this.port.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    console.log('收到消息:', event.data);
    if (event.data.type === 'startCollecting') {
      if (this.state === AudioProcessingState.IDLE) {
        this.state = AudioProcessingState.COLLECTING;
        this.collectedBuffer = [];
        console.log('开始收集音频数据');
      }
    } else if (event.data.type === 'stopCollecting') {
      this.state = AudioProcessingState.PENDING;
    } else if (event.data.type === 'processedAudio') {
      // 处理返回的音频数据放入输出缓冲区
      this.outputBuffer.push(new Float32Array(event.data.data));
      this.state = AudioProcessingState.PROCESSED;      
    }
  }

  private processCollectedAudio() {
    try {
      this.state = AudioProcessingState.PROCESSING; // 设置为处理中状态
      
      const mergedBuffer = this.mergeBuffers(this.collectedBuffer);
      const wavBuffer = this.float32ToWav(mergedBuffer);
      const base64Audio = this.arrayBufferToBase64(wavBuffer);
      
      this.port.postMessage({
        type: 'audioData',
        data: base64Audio
      });
    } catch (error) {
      console.error('处理音频数据时出错:', error);
      this.port.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : '处理音频数据失败'
      });
      this.state = AudioProcessingState.IDLE;
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

    if (input && input[0] && AudioProcessingState.COLLECTING === this.state) {
      // 收集音频数据
      const inputData = new Float32Array(input[0]);
      this.collectedBuffer.push(inputData);
    }

    // 只有在 PENDING 状态且不在处理中时才开始处理
    if (this.collectedBuffer.length > 0 && 
        AudioProcessingState.PENDING === this.state) {
      console.log('准备处理收集的音频数据', new Date().toISOString());
      this.processCollectedAudio();
      this.collectedBuffer = [];
    }

    // 处理输出
    if (this.outputBuffer.length > 0 && output && AudioProcessingState.PROCESSED === this.state) {
      let outputOffset = 0;
      const BLOCK_SIZE = output[0].length; // 通常是 128
      // 遍历所有声道
      for (let channel = 0; channel < output.length; channel++) {
        const outputChannel = output[channel];
        
        // 从当前缓冲区帧填充输出，直到填满或没有更多数据
        while (outputOffset < BLOCK_SIZE && this.outputBuffer.length > 0) {
          const currentFrame = this.outputBuffer[0];
          const remainingInBlock = BLOCK_SIZE - outputOffset;
          const availableInFrame = currentFrame.length;
          const copyLength = Math.min(remainingInBlock, availableInFrame);

          outputChannel.set(
            currentFrame.subarray(0, copyLength), 
            outputOffset
          );

          if (copyLength === availableInFrame) {
            // 当前帧已用完，移除
            this.outputBuffer.shift();
          } else {
            // 当前帧还有剩余，保留剩余部分
            this.outputBuffer[0] = currentFrame.subarray(copyLength);
          }

          outputOffset += copyLength;
        }
      }
      // 如果所有数据都已输出，回到空闲状态
      if (this.outputBuffer.length === 0 && this.state === AudioProcessingState.PROCESSED) {
        this.state = AudioProcessingState.IDLE;
        console.log('处理输出完成， 回到空闲状态', new Date().toISOString());
      }
    } 
    // else if (input && output && AudioProcessingState.IDLE === this.state) {
    //   // 直接传递输入到输出
    //   for (let channel = 0; channel < input.length; channel++) {
    //     const inputChannel = input[channel];
    //     const outputChannel = output[channel];
    //     outputChannel.set(inputChannel);
    //   }
    // }

    return true;
  }
}

registerProcessor('translator-processor', TranslatorProcessor); 