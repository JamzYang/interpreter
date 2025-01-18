/**
 * 设备工具函数
 * 
 * 主要功能:
 * 1. 设备检测
 * 2. 设备配置
 * 3. 错误处理
 */
import { MediaDevice } from "@/types/device";

/**
 * 设备相关工具函数
 */
export const deviceUtils = {
  // 请求音频权限
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('获取音频权限失败:', error);
      return false;
    }
  },

  /**
   * VB-CABLE设备特征匹配规则
   */
  VB_CABLE_PATTERNS: {
    // VB-CABLE设备的标识
    BRAND: 'VB-Audio Virtual Cable',
    
    // 输入/输出设备标识
    INPUT: 'CABLE Input',
    OUTPUT: 'CABLE Output'
  },

  /**
   * 检查是否为VB-CABLE设备
   */
  isVBCableDevice(label: string): boolean {
    return label.includes(this.VB_CABLE_PATTERNS.BRAND);
  },

  /**
   * 检查设备是否为VB-CABLE输入设备
   */
  isVBCableInput(label: string): boolean {
    return label.includes(this.VB_CABLE_PATTERNS.INPUT);
  },

  /**
   * 检查设备是否为VB-CABLE输出设备
   */
  isVBCableOutput(label: string): boolean {
    return label.includes(this.VB_CABLE_PATTERNS.OUTPUT);
  },

  // 获取所有音频设备
  async getAudioDevices(): Promise<MediaDevice[]> {
    // 先请求权限
    await this.requestPermission();
    // 然后枚举设备
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // 调试日志
    console.log('所有音频设备:', devices.map(d => ({
      kind: d.kind,
      label: d.label
    })));
    return devices.map(device => this.formatDeviceInfo(device));
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

  /**
   * 格式化设备信息
   */
  formatDeviceInfo(device: MediaDeviceInfo): MediaDevice {
    const label = device.label || '未知设备';
    const isInput = device.kind === 'audioinput';
    
    // 先检查是否为VB-CABLE设备
    const isVBCable = this.isVBCableDevice(label);

    return {
      id: device.deviceId,
      label: label,
      kind: device.kind as 'audioinput' | 'audiooutput',
      isVBCable
    };
  },

  // 过滤输入设备列表
  filterInputDevices(devices: MediaDeviceInfo[]): MediaDevice[] {
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(device => this.formatDeviceInfo(device));
      // .filter(device => !this.isVBCableOutput(device.label)); // 排除 CABLE Output
  },

  // 过滤输出设备列表
  filterOutputDevices(devices: MediaDeviceInfo[]): MediaDevice[] {
    return devices
      .filter(d => d.kind === 'audiooutput')
      .map(device => this.formatDeviceInfo(device));
      // .filter(device => !this.isVBCableInput(device.label)); // 排除 CABLE Input
  }
};