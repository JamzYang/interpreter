export class STTService {
    async convert(audioData: Buffer): Promise<string> {
        try {
            // TODO: 实现Whisper API调用
            return 'Sample text';
        } catch (error) {
            console.error('STT conversion failed:', error);
            throw error;
        }
    }
} 