import { LLMService } from './LLMService';
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
export class GeminiService implements LLMService {
  private readonly apiEndpoint: string;
  private readonly ttsEndpoint: string;
  
  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
    this.ttsEndpoint = 'http://localhost:8880/v1/audio/speech';
  }

  async transcribeAudio(audioBase64: string): Promise<string> {
    const genAI = new GoogleGenerativeAI("AIzaSyB8-fJRn3WYRpoesMhogiZ1Gz2oxdB0al0");
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: audioBase64
          }
        },
        { text: "为音频生成一个文本转录，并翻译成英文，如果是英文，则直接生成英文。文本不要有换行，生成结果严格按照格式：<chinese>中文文本转录</chinese><english>english transcript</english>" },
      ]);

// Print the response.
      console.log(result.response.text())
      return result.response.text();
  }

  async textToAudio(text: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(this.ttsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'kokoro',
          input: text,
          voice: 'af',
          response_format: 'wav',
          speed: 1,
          stream: true
        })
      });
      console.log('TTS API 调用结束');
      if (!response.ok) {
        throw new Error(`TTS API 调用失败: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('文本转语音失败:', error);
      throw error;
    }
  }
} 