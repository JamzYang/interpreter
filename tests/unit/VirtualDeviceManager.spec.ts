import { VirtualDeviceManager } from '@/services/audio/VirtualDeviceManager';
import { deviceUtils } from '@/utils/device';

// 模拟 DOM 错误类
class NotFoundError extends Error {}
class NotAllowedError extends Error {}
class NotReadableError extends Error {}

/**
 * VirtualDeviceManager 单元测试
 */
describe('VirtualDeviceManager', () => {
  beforeAll(() => {
    global.navigator = Object.create(null);
    const mockStream = {
      getTracks: () => [{
        stop: jest.fn()
      }]
    };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        enumerateDevices: jest.fn(),
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
        addEventListener: jest.fn()
      },
      writable: true
    });

    // 增强 AudioContext 模拟
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn()
      }),
      createMediaStreamDestination: jest.fn(),
      createAnalyser: jest.fn().mockReturnValue({
        connect: jest.fn(),
        frequencyBinCount: 1024,
        getByteTimeDomainData: jest.fn().mockImplementation(array => {
          array[0] = 130; // 模拟有音频信号
        })
      }),
      close: jest.fn().mockResolvedValue(undefined)
    }));

    // 模拟 MediaRecorder
    (global.MediaRecorder as unknown) = Object.assign(
      jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'recording',
        ondataavailable: null,
        onstart: null,
        onstop: null,
        onerror: null,
        mimeType: 'audio/webm'
      })),
      { isTypeSupported: jest.fn().mockReturnValue(true) }
    );
  });

  beforeEach(() => {
    // 模拟返回包含VB-CABLE设备的列表
    jest.spyOn(deviceUtils, 'getAudioDevices').mockResolvedValue([
      {
        deviceId: 'input-id',
        label: 'VB-CABLE Input',
        kind: 'audioinput',
        groupId: 'group1',
        toJSON: () => ({})
      } as MediaDeviceInfo,
      {
        deviceId: 'output-id',
        label: 'VB-CABLE Output',
        kind: 'audiooutput',
        groupId: 'group1',
        toJSON: () => ({})
      } as MediaDeviceInfo
    ]);
    
    // 模拟设备测试成功
    jest.spyOn(deviceUtils, 'testDevice').mockResolvedValue(true);
  });

  it('should detect VB-CABLE devices', async () => {
    const manager = VirtualDeviceManager.getInstance();
    await manager.detectVBCableDevices();
    const status = await manager.getStatus();
    expect(status.hasInput).toBeTruthy();
    expect(status.hasOutput).toBeTruthy();
  });

  it('should initialize correctly', async () => {
    const manager = VirtualDeviceManager.getInstance();
    await manager.init();
    expect(await manager.validateDevices()).toBeTruthy();
  });

  it('should handle device changes', async () => {
    const manager = VirtualDeviceManager.getInstance();
    const mockHandler = jest.fn();
    manager.on('deviceChange', mockHandler);
    
    // 手动触发事件
    await manager.detectVBCableDevices();
    manager.emit('deviceChange');
    
    expect(mockHandler).toHaveBeenCalled();
  });

  describe('VirtualDeviceManager Audio Stream', () => {
    let manager: VirtualDeviceManager;

    beforeEach(() => {
        manager = VirtualDeviceManager.getInstance();
        
        // 重置所有模拟
        jest.clearAllMocks();
        
        // 基础设备模拟
        jest.spyOn(deviceUtils, 'getAudioDevices').mockResolvedValue([
            {
                deviceId: 'input-id',
                label: 'VB-CABLE Input',
                kind: 'audioinput',
                groupId: 'group1',
                toJSON: () => ({})
            } as MediaDeviceInfo,
            {
                deviceId: 'output-id',
                label: 'VB-CABLE Output',
                kind: 'audiooutput',
                groupId: 'group1',
                toJSON: () => ({})
            } as MediaDeviceInfo
        ]);
        
        // 设备测试总是成功
        jest.spyOn(deviceUtils, 'testDevice').mockResolvedValue(true);
    });

    it('should detect audio signal during stream test', async () => {
        const signalDetectedMock = jest.fn();
        manager.on('audioSignalDetected', signalDetectedMock);

        await manager.testAudioStream(1000);
        expect(signalDetectedMock).toHaveBeenCalled();
    });

    it('should cleanup resources after stream test', async () => {
        const stopMock = jest.fn();
        const mockStream = {
            getTracks: () => [{
                stop: stopMock
            }]
        };

        // 模拟音频流
        jest.spyOn(navigator.mediaDevices, 'getUserMedia')
            .mockResolvedValue(mockStream as unknown as MediaStream);

        await manager.testAudioStream(100);
        // 验证资源是否被清理
        expect(stopMock).toHaveBeenCalled();
    });

    it('should handle different types of errors', async () => {
        const errorMock = jest.fn();
        const recoveryMock = jest.fn();
        
        manager.on('error', errorMock);
        manager.on('recovered', recoveryMock);

        // 测试设备未找到的情况
        await manager.handleError(new NotFoundError('设备未找到'));
        expect(errorMock).toHaveBeenCalled();

        // 测试权限被拒绝的情况
        await manager.handleError(new NotAllowedError('权限被拒绝'));
        expect(errorMock).toHaveBeenCalled();

        // 测试设备忙碌的情况
        await manager.handleError(new NotReadableError('设备忙碌'));
        expect(errorMock).toHaveBeenCalled();
    });

    it('should recover from device errors', async () => {
        const recoveredMock = jest.fn();
        manager.on('recovered', recoveredMock);

        // 确保音频流测试成功
        const mockStream = {
            getTracks: () => [{
                stop: jest.fn()
            }]
        };
        
        // 重新设置 getUserMedia 模拟
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            value: jest.fn().mockResolvedValue(mockStream),
            writable: true
        });

        const result = await manager.recover();
        expect(result).toBeTruthy();
        expect(recoveredMock).toHaveBeenCalled();
    });
  });

  describe('VirtualDeviceManager Recording', () => {
    let manager: VirtualDeviceManager;

    beforeEach(() => {
        manager = VirtualDeviceManager.getInstance();
        (manager as any).isRecording = false;
        (manager as any).mediaRecorder = null;
    });

    it('should start recording successfully', async () => {
        const startedMock = jest.fn();
        manager.on('recordingStarted', startedMock);

        await manager.startRecording();
        // 手动触发 onstart
        const mediaRecorder = (manager as any).mediaRecorder;
        mediaRecorder.onstart();
        
        expect(startedMock).toHaveBeenCalled();
        expect(manager.getRecordingState().isRecording).toBeTruthy();
    });

    it('should stop recording and return audio blob', async () => {
        const stoppedMock = jest.fn();
        manager.on('recordingStopped', stoppedMock);

        await manager.startRecording();
        const mediaRecorder = (manager as any).mediaRecorder;
        mediaRecorder.onstart();

        // 创建一个模拟的 Blob
        const mockBlob = new Blob(['test'], { type: 'audio/webm' });
        setTimeout(() => {
            mediaRecorder.onstop();
            mediaRecorder.ondataavailable({ data: mockBlob });
        }, 0);

        const audioBlob = await manager.stopRecording();
        expect(stoppedMock).toHaveBeenCalled();
        expect(audioBlob).toBeInstanceOf(Blob);
    });

    it('should handle recording pause and resume', async () => {
        const pausedMock = jest.fn();
        const resumedMock = jest.fn();
        manager.on('recordingPaused', pausedMock);
        manager.on('recordingResumed', resumedMock);

        await manager.startRecording();
        const mediaRecorder = (manager as any).mediaRecorder;
        mediaRecorder.onstart();
        mediaRecorder.state = 'recording';
        
        manager.pauseRecording();
        mediaRecorder.state = 'paused';
        mediaRecorder.onpause?.();
        expect(pausedMock).toHaveBeenCalled();
        
        manager.resumeRecording();
        mediaRecorder.state = 'recording';
        mediaRecorder.onresume?.();
        expect(resumedMock).toHaveBeenCalled();
    });

    it('should handle recording errors', async () => {
        const errorMock = jest.fn();
        manager.on('recordingError', errorMock);

        // 模拟录制错误
        jest.spyOn(navigator.mediaDevices, 'getUserMedia')
            .mockRejectedValue(new Error('录制错误'));

        await expect(manager.startRecording()).rejects.toThrow('录制错误');
        expect(errorMock).toHaveBeenCalled();
    });
  });

  // 更多测试用例...
});