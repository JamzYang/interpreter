import { AudioIO } from 'naudiodon';
import { Transform } from 'stream';
import { EventEmitter } from 'events';

export class AudioCapture extends EventEmitter {
    private audioInput: AudioIO | null = null;
    private isCapturing: boolean = false;
    private deviceId: number;

    constructor(deviceId: number) {
        super();
        this.deviceId = deviceId;
    }

    async listDevices() {
        const devices = AudioIO.getDevices();
        return devices.filter(device => device.maxInputChannels > 0);
    }

    async start() {
        if (this.isCapturing) {
            return;
        }

        try {
            this.audioInput = AudioIO.createInput({
                deviceId: this.deviceId,
                channelCount: 1,
                sampleRate: 44100,
                sampleFormat: AudioIO.SampleFormat16Bit,
                framesPerBuffer: 1024
            });

            // 创建数据转换流
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    callback(null, chunk);
                }
            });

            // 设置音频数据流
            this.audioInput
                .pipe(transform)
                .on('data', (data: Buffer) => {
                    this.emit('data', data);
                })
                .on('error', (error: Error) => {
                    this.emit('error', error);
                });

            // 开始捕获
            this.audioInput.start();
            this.isCapturing = true;
            console.log('Started audio capture');
            this.emit('start');

        } catch (error) {
            console.error('Failed to start audio capture:', error);
            throw error;
        }
    }

    async stop() {
        if (!this.isCapturing || !this.audioInput) {
            return;
        }

        try {
            this.audioInput.quit();
            this.audioInput = null;
            this.isCapturing = false;
            console.log('Stopped audio capture');
            this.emit('stop');
        } catch (error) {
            console.error('Error stopping audio capture:', error);
            throw error;
        }
    }

    isActive(): boolean {
        return this.isCapturing;
    }
}