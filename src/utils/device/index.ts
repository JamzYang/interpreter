/**
 * 设备工具函数
 * 
 * 主要功能:
 * 1. 设备检测
 * 2. 设备配置
 * 3. 错误处理
 */
import { MediaDevice } from "../../types/device";

 


/**
 * 设备相关工具函数
 */
export const deviceUtils = {
    // 检查设备名称是否为VB-CABLE设备
    isVBCableDevice(label: string): boolean {
      return label.toLowerCase().includes('vb-cable');
    },
  
    // 获取所有音频设备
    async getAudioDevices(): Promise<MediaDeviceInfo[]> {
      return navigator.mediaDevices.enumerateDevices();
    },
  
    // 测试设备可用性
    async testDevice(deviceId: string): Promise<boolean> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        });
        
        // 关闭测试流
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('设备测试失败:', error);
        return false;
      }
    },
  
    // 格式化设备信息
    formatDeviceInfo(device: MediaDeviceInfo): MediaDevice {
      return {
        id: device.deviceId,
        label: device.label,
        kind: device.kind as 'audioinput' | 'audiooutput',
        isVBCable: this.isVBCableDevice(device.label)
      };
    },
  };