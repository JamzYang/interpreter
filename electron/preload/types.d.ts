interface ElectronAPI {
  readTestAudioFile: () => Promise<ArrayBuffer>
}

interface Window {
  electronAPI: ElectronAPI
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => void
    off: (channel: string, func: (...args: any[]) => void) => void
    send: (channel: string, ...args: any[]) => void
    invoke: (channel: string, ...args: any[]) => Promise<any>
  }
} 