import { deviceUtils } from '@/utils/device';

beforeAll(() => {
  // 初始化全局navigator对象
  global.navigator = Object.create(null);
});

describe('deviceUtils', () => {
  describe('isVBCableDevice', () => {
    it('应该正确识别VB-CABLE设备', () => {
      expect(deviceUtils.isVBCableDevice('VB-CABLE Virtual Audio Device')).toBe(true);
      expect(deviceUtils.isVBCableDevice('VB-Cable Input')).toBe(true);
      expect(deviceUtils.isVBCableDevice('普通麦克风')).toBe(false);
    });
  });

  describe('formatDeviceInfo', () => {
    it('应该正确格式化设备信息', () => {
      const mockDevice: MediaDeviceInfo = {
        deviceId: 'test-id',
        label: 'VB-CABLE Virtual Audio',
        kind: 'audioinput',
        groupId: 'test-group',
        toJSON: () => ({
          deviceId: 'test-id',
          label: 'VB-CABLE Virtual Audio',
          kind: 'audioinput',
          groupId: 'test-group'
        })
      };

      const formatted = deviceUtils.formatDeviceInfo(mockDevice);
      
      expect(formatted).toEqual({
        id: 'test-id',
        label: 'VB-CABLE Virtual Audio',
        kind: 'audioinput',
        isVBCable: true
      });
    });
  });

  describe('testDevice', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn()
        },
        writable: true
      });
    });

    it('设备可用时应该返回true', async () => {
      const mockStream = {
        getTracks: () => [{
          stop: jest.fn()
        }]
      };
      
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream);
      
      const result = await deviceUtils.testDevice('test-device-id');
      expect(result).toBe(true);
    });

    it('设备不可用时应该返回false', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error('设备不可用'));
      
      const result = await deviceUtils.testDevice('invalid-device-id');
      expect(result).toBe(false);
    });
  });

  describe('getAudioDevices', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          enumerateDevices: jest.fn()
        },
        writable: true
      });
    });

    it('应该返回设备列表', async () => {
      const mockDevices = [
        { deviceId: '1', label: '麦克风', kind: 'audioinput' },
        { deviceId: '2', label: 'VB-CABLE', kind: 'audioinput' }
      ];

      (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValue(mockDevices);

      const devices = await deviceUtils.getAudioDevices();
      expect(devices).toEqual(mockDevices);
    });
  });
}); 