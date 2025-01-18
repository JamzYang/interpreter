import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AudioProcessor } from '../src/services/audio/AudioProcessor';
import { readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;

  beforeEach(async () => {
    audioProcessor = new AudioProcessor();
    await audioProcessor.initialize();
  });

  afterEach(async () => {
    if (audioProcessor) {
      await audioProcessor.dispose();
    }
  });

  it('should play local audio file to CABLE Output', async () => {
    try {
      // 1. 读取本地音频文件
      const audioFilePath = join(process.cwd(), 'public', 'test-voice.wav');
      const audioBuffer = readFileSync(audioFilePath);
      
      // 2. 解码音频数据
      const decodedAudio = await audioProcessor['audioContextManager'].decodeAudioData(
        audioBuffer.buffer as ArrayBuffer
      );
      
      // 3. 创建音频源并连接到 CABLE Output
      const source = audioProcessor['audioContextManager'].createBufferSource(decodedAudio);
      const cableOutput = audioProcessor['audioContextManager'].getCableOutputDestination();
      
      // 4. 播放音频
      source.connect(cableOutput);
      source.start();
      
      // 等待一小段时间模拟播放
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 验证音频处理器是否正确初始化
      expect(audioProcessor['audioContextManager']).toBeDefined();
      expect(source).toBeDefined();
      expect(cableOutput).toBeDefined();
      
    } catch (error) {
      console.error('测试失败:', error);
      throw error;
    }
  });
}); 