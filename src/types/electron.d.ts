// 扩展 Window 接口
export interface AudioAPI {
    // 设备管理
    getDevices: () => Promise<AudioDevices>;
    initialize: (config: { 
        inputDeviceId: number; 
        outputDeviceId: number 
    }) => Promise<{ success: boolean }>;

    // 控制方法
    start: () => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<AudioStatus>;

    // 事件监听
    onStatus: (callback: (event: AudioStatusEvent) => void) => void;
    onError: (callback: (event: AudioErrorEvent) => void) => void;
    onAudioData: (callback: (event: AudioDataEvent) => void) => void;

    // 翻译状态监听
    onTranslationStatus: (callback: (status: TranslationStatus) => void) => void;
}

export interface TranslationStatus {
  type: 'listening' | 'translating' | 'result';
  text?: string;
  success?: boolean;
}

declare global {
    interface Window {
        audioAPI: AudioAPI;
        audio: {
            getDevices: () => Promise<any[]>;
            startRecording: () => Promise<void>;
            stopRecording: () => Promise<void>;
        }
    }
} 