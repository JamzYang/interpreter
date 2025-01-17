/**
 * 设备相关类型定义
 * 
 * 主要类型:
 * 1. 虚拟设备接口
 * 2. 设备状态枚举
 * 3. 设备配置接口
 */ 

export interface MediaDevice {
    id: string;
    label: string;
    kind: 'audioinput' | 'audiooutput';
    isVBCable: boolean;
  }
  
  export type DeviceStatus = {
    hasInput: boolean;
    hasOutput: boolean;
    inputReady: boolean;
    outputReady: boolean;
    error?: string;
  };
  
  export enum DeviceError {
    NOT_FOUND = 'VB-CABLE devices not found',
    PERMISSION_DENIED = 'Permission denied',
    NOT_READY = 'Devices not ready',
  }