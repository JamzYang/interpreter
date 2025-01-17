import { EventEmitter } from 'events';
import { AudioCapture } from './capture';
import { AudioOutput } from './output';
import { AudioIO } from 'naudiodon';

export interface AudioDevice {
    id: number;
    name: string;
    maxInputChannels: number;
    maxOutputChannels: number;
}

export class AudioManager extends EventEmitter {
    private capture: AudioCapture | null = null;
    private output: AudioOutput | null = null;
    private isRunning: boolean = false;

    constructor() {
        super();
    }

    // 获取所有音频设备
    async getDevices(): Promise<{inputs: AudioDevice[], outputs: AudioDevice[]}> {
        const devices = AudioIO.getDevices();
        return {
            inputs: devices.filter(d => d.maxInputChannels > 0).map(d => ({
                id: d.id,
                name: d.name,
                maxInputChannels: d.maxInputChannels,
                maxOutputChannels: d.maxOutputChannels
            })),
            outputs: devices.filter(d => d.maxOutputChannels > 0).map(d => ({
                id: d.id,
                name: d.name,
                maxInputChannels: d.maxInputChannels,
                maxOutputChannels: d.maxOutputChannels
            }))
        };
    }

    // 初始化音频设备
    async initialize(inputDeviceId: number, outputDeviceId: number) {
        try {
            // 创建捕获实例
            this.capture = new AudioCapture(inputDeviceId);
            this.capture.on('data', this.handleAudioData.bind(this));
            this.capture.on('error', this.handleError.bind(this));

            // 创建输出实例
            this.output = new AudioOutput(outputDeviceId);
            this.output.on('error', this.handleError.bind(this));

            console.log('Audio manager initialized');
        } catch (error) {
            console.error('Failed to initialize audio manager:', error);
            throw error;
        }
    }

    // 开始音频处理
    async start() {
        if (this.isRunning) {
            return;
        }

        try {
            if (!this.capture || !this.output) {
                throw new Error('Audio devices not initialized');
            }

            await this.capture.start();
            await this.output.start();
            this.isRunning = true;
            this.emit('start');
            console.log('Audio processing started');
        } catch (error) {
            console.error('Failed to start audio processing:', error);
            throw error;
        }
    }

    // 停止音频处理
    async stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            await this.capture?.stop();
            await this.output?.stop();
            this.isRunning = false;
            this.emit('stop');
            console.log('Audio processing stopped');
        } catch (error) {
            console.error('Failed to stop audio processing:', error);
            throw error;
        }
    }

    // 处理音频数据
    private async handleAudioData(data: Buffer) {
        try {
            if (this.isRunning && this.output) {
                // 这里可以添加音频处理逻辑
                // 例如：音频格式转换、AI处理等
                this.emit('audioData', data);
                await this.output.write(data);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    // 错误处理
    private handleError(error: Error) {
        console.error('Audio processing error:', error);
        this.emit('error', error);
    }

    // 获取当前状态
    getStatus() {
        return {
            isRunning: this.isRunning,
            captureActive: this.capture?.isActive() || false,
            outputActive: this.output?.isActive() || false
        };
    }

    // 清理资源
    async dispose() {
        await this.stop();
        this.capture = null;
        this.output = null;
        this.removeAllListeners();
    }
} 