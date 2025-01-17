import { contextBridge, ipcRenderer } from 'electron'

// 暴露音频API到渲染进程
contextBridge.exposeInMainWorld('audioAPI', {
  // 获取设备列表
  getDevices: async () => {
    return await ipcRenderer.invoke('get-devices')
  },

  // 初始化音频
  initialize: async (config: { inputDeviceId: string; outputDeviceId: string }) => {
    return await ipcRenderer.invoke('init-audio', config)
  },

  // 开始录音
  start: async () => {
    return await ipcRenderer.invoke('start-audio')
  },

  // 停止录音
  stop: async () => {
    return await ipcRenderer.invoke('stop-audio')
  },

  // 监听音频数据
  onAudioData: (callback: (data: any) => void) => {
    ipcRenderer.on('audio-data', (_, data) => callback(data))
  },

  // 监听错误
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('audio-error', (_, error) => callback(error))
  }
})