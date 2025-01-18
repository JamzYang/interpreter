import { LLMService } from './LLMService';
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
export class GeminiService implements LLMService {
  private readonly apiEndpoint: string;
  
  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
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
        { text: "Generate a transcript of the speech." },
      ]);

// Print the response.
      console.log(result.response.text())
      return result.response.text();
  }
} 