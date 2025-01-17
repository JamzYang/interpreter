import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

class MainProcess {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.init()
    this.setupIPC()
  }

  private init() {
    app.on('ready', this.createWindow.bind(this))
    app.on('window-all-closed', this.handleWindowsClosed.bind(this))
    app.on('activate', this.handleActivate.bind(this))
  }

  private setupIPC() {
    // 这些 IPC 处理器现在只是传递到渲染进程
    ipcMain.handle('get-devices', async () => {
      return this.mainWindow?.webContents.executeJavaScript('navigator.mediaDevices.enumerateDevices()')
    })

    ipcMain.handle('init-audio', async (_, config) => {
      return { success: true }
    })

    ipcMain.handle('start-audio', async () => {
      return { success: true }
    })

    ipcMain.handle('stop-audio', async () => {
      return { success: true }
    })
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js')
      }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      await this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  private handleWindowsClosed() {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }

  private handleActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow()
    }
  }
}

new MainProcess()