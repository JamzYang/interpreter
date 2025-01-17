import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { AudioManager } from './audio/manager'

class MainProcess {
  private mainWindow: BrowserWindow | null = null
  private audioManager: AudioManager | null = null

  constructor() {
    this.init()
  }

  private init() {
    // 监听应用程序事件
    app.on('ready', this.createWindow.bind(this))
    app.on('window-all-closed', this.handleWindowsClosed.bind(this))
    app.on('activate', this.handleActivate.bind(this))

    // 初始化音频管理器
    this.initAudioManager()
    // 设置IPC监听器
    this.setupIpcHandlers()
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      await this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }
  }

  private initAudioManager() {
    this.audioManager = new AudioManager()
    
    // 监听音频管理器事件
    this.audioManager.on('start', () => {
      this.mainWindow?.webContents.send('audio-status', { status: 'started' })
    })

    this.audioManager.on('stop', () => {
      this.mainWindow?.webContents.send('audio-status', { status: 'stopped' })
    })

    this.audioManager.on('error', (error) => {
      this.mainWindow?.webContents.send('audio-error', { error: error.message })
    })

    this.audioManager.on('audioData', (data) => {
      // 可以在这里处理音频数据，例如显示音量等
      this.mainWindow?.webContents.send('audio-data', { 
        timestamp: Date.now(),
        size: data.length 
      })
    })
  }

  private setupIpcHandlers() {
    // 获取音频设备列表
    ipcMain.handle('get-audio-devices', async () => {
      try {
        return await this.audioManager?.getDevices()
      } catch (error) {
        console.error('Failed to get audio devices:', error)
        throw error
      }
    })

    // 初始化音频设备
    ipcMain.handle('init-audio', async (event, { inputDeviceId, outputDeviceId }) => {
      try {
        await this.audioManager?.initialize(inputDeviceId, outputDeviceId)
        return { success: true }
      } catch (error) {
        console.error('Failed to initialize audio:', error)
        throw error
      }
    })

    // 开始音频处理
    ipcMain.handle('start-audio', async () => {
      try {
        await this.audioManager?.start()
        return { success: true }
      } catch (error) {
        console.error('Failed to start audio:', error)
        throw error
      }
    })

    // 停止音频处理
    ipcMain.handle('stop-audio', async () => {
      try {
        await this.audioManager?.stop()
        return { success: true }
      } catch (error) {
        console.error('Failed to stop audio:', error)
        throw error
      }
    })

    // 获取音频状态
    ipcMain.handle('get-audio-status', () => {
      return this.audioManager?.getStatus()
    })
  }

  private handleWindowsClosed() {
    if (process.platform !== 'darwin') {
      this.audioManager?.dispose()
      app.quit()
    }
  }

  private handleActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow()
    }
  }
}

// 启动应用
new MainProcess()