import { AudioProcessor } from './AudioProcessor';

export class AudioService {
  private processor: AudioProcessor;
  private static instance: AudioService;

  private constructor() {
    this.processor = new AudioProcessor();
  }

  static getInstance() {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async initialize(inputDeviceId: string, outputDeviceId: string) {
    return await this.processor.initialize(inputDeviceId, outputDeviceId);
  }

  async getDevices() {
    return await this.processor.getDevices();
  }

  start() {
    this.processor.start();
  }

  stop() {
    this.processor.stop();
  }
} 