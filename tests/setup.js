// 模拟 Electron 环境
class MockBrowserWindow {
  constructor() {
    this.webContents = {
      send: jest.fn()
    };
  }
}

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: MockBrowserWindow,
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn()
  }
}));

// 模拟 AudioContext
global.AudioContext = class MockAudioContext {
  constructor() {
    this.destination = {};
    this.sampleRate = 44100;
  }

  createBufferSource() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null
    };
  }

  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1 }
    };
  }

  decodeAudioData(buffer) {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100
    });
  }

  close() {
    return Promise.resolve();
  }
}; 