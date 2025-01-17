// 音频设备接口
export interface AudioDevice {
    id: number;
    name: string;
    maxInputChannels: number;
    maxOutputChannels: number;
}

// 音频设备列表
export interface AudioDevices {
    inputs: AudioDevice[];
    outputs: AudioDevice[];
}

// 音频状态
export interface AudioStatus {
    isRunning: boolean;
    captureActive: boolean;
    outputActive: boolean;
}

// 音频数据事件
export interface AudioDataEvent {
    timestamp: number;
    size: number;
}

// 音频错误事件
export interface AudioErrorEvent {
    error: string;
}

// 音频状态事件
export interface AudioStatusEvent {
    status: 'started' | 'stopped';
} 