/**
 * VB-CABLE设备管理器
 * 
 * 核心职责:
 * 1. 检测和管理VB-CABLE设备
 * 2. 确保系统设置正确:
 *    - CABLE Input 为系统默认播放设备
 *    - CABLE Output 为系统默认录制设备
 * 3. 监控VB-CABLE设备状态变化
 */
import { DeviceStatus } from "@/types/device";
import { MediaDevice } from "@/types/device";
import { deviceUtils } from "@/utils/device";
import { EventEmitter } from '@/utils/EventEmitter';

// 添加 DOM 错误类型
type DOMError = NotFoundError | NotAllowedError | NotReadableError;
declare class NotFoundError extends Error {}
declare class NotAllowedError extends Error {}
declare class NotReadableError extends Error {}

/**
 * VB-CABLE设备管理器
 * 负责管理和监控虚拟音频设备
 */
export class VirtualDeviceManager extends EventEmitter {
    private static instance: VirtualDeviceManager;
    private devices: Map<string, MediaDevice> = new Map();
    private status: DeviceStatus = {
        hasInput: false,
        hasOutput: false,
        inputReady: false,
        outputReady: false
    };

    // 单例获取
    public static async getInstance(): Promise<VirtualDeviceManager> {
        if (!VirtualDeviceManager.instance) {
            VirtualDeviceManager.instance = new VirtualDeviceManager();
            await VirtualDeviceManager.instance.init();
        }
        return VirtualDeviceManager.instance;
    }

    // 初始化
    private async init(): Promise<void> {
        await this.detectVBCableDevices();
        this.monitorDeviceChanges();
    }

    // 检测 VB-CABLE 设备
    async detectVBCableDevices(): Promise<void> {
        const devices = await deviceUtils.getAudioDevices();
        
        // 重置状态
        this.devices.clear();
        this.status = {
            hasInput: false,
            hasOutput: false,
            inputReady: false,
            outputReady: false
        };

        // 只检测和保存 VB-CABLE 设备
        for (const device of devices) {
            if (device.isVBCable) {
                this.devices.set(device.id, device);
                
                if (device.kind === 'audioinput') {
                    this.status.hasInput = true;
                } else if (device.kind === 'audiooutput') {
                    this.status.hasOutput = true;
                }
            }
        }

        // 检查系统默认设备设置
        await this.checkDefaultDevices();
    }

    // 检查系统默认设备设置
    private async checkDefaultDevices(): Promise<void> {
        try {
            // 检查默认播放设备 (CABLE Input)
            const playbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const playbackTrack = playbackStream.getAudioTracks()[0];
            const playbackSettings = playbackTrack.getSettings();
            
            if (!playbackSettings.deviceId?.includes('CABLE Input')) {
                this.emit('wrongDefaultPlayback', {
                    message: '请将 CABLE Input 设置为系统默认播放设备'
                });
            }
            playbackStream.getTracks().forEach(track => track.stop());

            // 检查默认录制设备 (CABLE Output)
            const recordingStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { deviceId: { ideal: 'default' } } 
            });
            const recordingTrack = recordingStream.getAudioTracks()[0];
            const recordingSettings = recordingTrack.getSettings();

            if (!recordingSettings.deviceId?.includes('CABLE Output')) {
                this.emit('wrongDefaultRecording', {
                    message: '请将 CABLE Output 设置为系统默认录制设备'
                });
            }
            recordingStream.getTracks().forEach(track => track.stop());

        } catch (error) {
            this.emit('error', error);
        }
    }

    // 监控设备变化
    private monitorDeviceChanges(): void {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            await this.detectVBCableDevices();
            this.emit('deviceChange', Array.from(this.devices.values()));
        });
    }

    // 获取 VB-CABLE 设备
    async getVBCableDevices(): Promise<MediaDevice[]> {
        return Array.from(this.devices.values());
    }

    // 获取设备状态
    getStatus(): DeviceStatus {
        return { ...this.status };
    }
}
