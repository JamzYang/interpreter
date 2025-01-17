import { AudioIO } from 'naudiodon';
import { Writable } from 'stream';
import { EventEmitter } from 'events';

export class AudioOutput extends EventEmitter {
    private audioOutput: AudioIO | null = null;
    private isPlaying: boolean = false;
    private deviceId: number;
    private buffer: Buffer[] = [];
    private bufferSize: number = 0;
    private readonly MAX_BUFFER_SIZE = 1024 * 1024; // 1MB buffer

    constructor(deviceId: number) {
        super();
        this.deviceId = deviceId;
    }

    async listDevices() {
        const devices = AudioIO.getDevices();
        return devices.filter(device => device.maxOutputChannels > 0);
    }

    async start() {
        if (this.isPlaying) {
            return;
        }

        try {
            this.audioOutput = AudioIO.createOutput({
                deviceId: this.deviceId,
                channelCount: 1,
                sampleRate: 44100,
                sampleFormat: AudioIO.SampleFormat16Bit,
                framesPerBuffer: 1024
            });

            // 创建可写流处理音频输出
            const writable = new Writable({
                write: (chunk: Buffer, encoding, callback) => {
                    if (this.bufferSize < this.MAX_BUFFER_SIZE) {
                        this.buffer.push(chunk);
                        this.bufferSize += chunk.length;
                    }
                    callback();
                }
            });

            // 处理缓冲区数据
            const processBuffer = () => {
                if (this.buffer.length > 0 && this.audioOutput) {
                    const chunk = this.buffer.shift();
                    if (chunk) {
                        this.audioOutput.write(chunk);
                        this.bufferSize -= chunk.length;
                    }
                }
            };

            // 设置定时器处理缓冲区
            const bufferInterval = setInterval(processBuffer, 10);

            this.audioOutput
                .on('error', (error: Error) => {
                    this.emit('error', error);
                })
                .on('end', () => {
                    clearInterval(bufferInterval);
                    this.emit('end');
                });

            // 开始输出
            this.audioOutput.start();
            this.isPlaying = true;
            console.log('Started audio output');
            this.emit('start');

        } catch (error) {
            console.error('Failed to start audio output:', error);
            throw error;
        }
    }

    async stop() {
        if (!this.isPlaying || !this.audioOutput) {
            return;
        }

        try {
            this.audioOutput.quit();
            this.audioOutput = null;
            this.isPlaying = false;
            this.buffer = [];
            this.bufferSize = 0;
            console.log('Stopped audio output');
            this.emit('stop');
        } catch (error) {
            console.error('Error stopping audio output:', error);
            throw error;
        }
    }

    async write(data: Buffer) {
        if (!this.isPlaying || !this.audioOutput) {
            throw new Error('Audio output is not active');
        }

        try {
            this.audioOutput.write(data);
        } catch (error) {
            console.error('Error writing audio data:', error);
            throw error;
        }
    }

    isActive(): boolean {
        return this.isPlaying;
    }

    clearBuffer() {
        this.buffer = [];
        this.bufferSize = 0;
    }
}