export interface LLMService {
  transcribeAudio(audioBase64: string): Promise<string>;
} 