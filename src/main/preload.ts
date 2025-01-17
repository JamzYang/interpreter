import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('audioAPI', {
    // ... 之前的代码 ...

    // 翻译状态监听
    onTranslationStatus: (callback: (status: any) => void) => 
        ipcRenderer.on('translation-status', (_, status) => callback(status))
}); 

contextBridge.exposeInMainWorld('audio', {
  // 定义你需要的音频相关方法
  getDevices: () => ipcRenderer.invoke('audio:getDevices'),
  startRecording: () => ipcRenderer.invoke('audio:startRecording'),
  stopRecording: () => ipcRenderer.invoke('audio:stopRecording'),
  // ... 其他方法
}); 