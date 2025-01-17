"use strict";
const electron = require("electron");
const path = require("path");
class MainProcess {
  mainWindow = null;
  constructor() {
    this.init();
    this.setupIPC();
  }
  init() {
    electron.app.on("ready", this.createWindow.bind(this));
    electron.app.on("window-all-closed", this.handleWindowsClosed.bind(this));
    electron.app.on("activate", this.handleActivate.bind(this));
  }
  setupIPC() {
    electron.ipcMain.handle("get-devices", async () => {
      return this.mainWindow?.webContents.executeJavaScript("navigator.mediaDevices.enumerateDevices()");
    });
    electron.ipcMain.handle("init-audio", async (_, config) => {
      return { success: true };
    });
    electron.ipcMain.handle("start-audio", async () => {
      return { success: true };
    });
    electron.ipcMain.handle("stop-audio", async () => {
      return { success: true };
    });
  }
  async createWindow() {
    this.mainWindow = new electron.BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/index.js")
      }
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      await this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  }
  handleWindowsClosed() {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  }
  handleActivate() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }
}
new MainProcess();
