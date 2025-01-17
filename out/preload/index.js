"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("audioAPI", {
  // 获取设备列表
  getDevices: async () => {
    return await electron.ipcRenderer.invoke("get-devices");
  },
  // 初始化音频
  initialize: async (config) => {
    return await electron.ipcRenderer.invoke("init-audio", config);
  },
  // 开始录音
  start: async () => {
    return await electron.ipcRenderer.invoke("start-audio");
  },
  // 停止录音
  stop: async () => {
    return await electron.ipcRenderer.invoke("stop-audio");
  },
  // 监听音频数据
  onAudioData: (callback) => {
    electron.ipcRenderer.on("audio-data", (_, data) => callback(data));
  },
  // 监听错误
  onError: (callback) => {
    electron.ipcRenderer.on("audio-error", (_, error) => callback(error));
  }
});
