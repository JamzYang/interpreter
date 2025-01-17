import { AudioStreamTester } from '@/services/audio/AudioStreamTester';
import { VirtualDeviceManager } from '@/services/audio/VirtualDeviceManager';

// Mock MediaStream
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: () => []
}));

// Mock VirtualDeviceManager
jest.mock('@/services/audio/VirtualDeviceManager', () => {
  return {
    VirtualDeviceManager: {
      getInstance: jest.fn().mockImplementation(() => ({
        getInputDevice: jest.fn().mockResolvedValue({ id: 'mock-input-id', kind: 'audioinput' }),
        getOutputDevice: jest.fn().mockResolvedValue({ id: 'mock-output-id', kind: 'audiooutput' }),
        getInputStream: jest.fn().mockResolvedValue(new MediaStream())
      }))
    }
  };
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(new MediaStream())
  }
});

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatTimeDomainData: jest.fn().mockImplementation((array) => {
      array.set(new Float32Array(array.length).fill(0.5)); // 模拟有效的音频信号
    })
  }),
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn() }
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  }),
  destination: {},
  baseLatency: 0.01,
  outputLatency: 0.02,
  sampleRate: 48000,
  close: jest.fn()
}));

describe('AudioStreamTester', () => {
  // let tester: AudioStreamTester;

  // beforeEach(() => {
  //   tester = new AudioStreamTester();
  //   jest.useFakeTimers();
  // });

  // afterEach(() => {
  //   tester.dispose();
  //   jest.clearAllMocks();
  //   jest.useRealTimers();
  // });

  // it('should test input device successfully', async () => {
  //   const result = await tester.testInputDevice();
  //   jest.runAllTimers();
  //   expect(result.success).toBeTruthy();
  // });

  // it('should test output device successfully', async () => {
  //   const result = await tester.testOutputDevice();
  //   jest.runAllTimers();
  //   expect(result.success).toBeTruthy();
  // });

  // it('should test audio route with acceptable latency', async () => {
  //   const result = await tester.testAudioRoute();
  //   expect(result.success).toBeTruthy();
  //   expect(result.latency).toBeLessThan(200); // 延迟应小于200ms
  // });

  // it('should collect valid performance metrics', async () => {
  //   const metrics = await tester.collectPerformanceMetrics();
  //   expect(metrics.inputLatency).toBeGreaterThan(0);
  //   expect(metrics.outputLatency).toBeGreaterThan(0);
  //   expect(metrics.sampleRate).toBe(48000);
  // });
}); 