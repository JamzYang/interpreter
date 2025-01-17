import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isRunning: false,
    sourceLanguage: 'zh',
    targetLanguage: 'en',
    currentText: '',
    translatedText: ''
  }),
  actions: {
    setRunning(status: boolean) {
      this.isRunning = status
    },
    updateText(text: string) {
      this.currentText = text
    },
    updateTranslation(text: string) {
      this.translatedText = text
    }
  }
}) 