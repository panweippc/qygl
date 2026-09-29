import { defineStore } from 'pinia'
import { askAi, type AiShortcut } from '../services/ai'

export interface AiMessage {
  id: number
  role: 'user' | 'ai'
  text: string
  action?: any
}

let uid = 0

export const useAiStore = defineStore('ai', {
  state: () => ({
    messages: [] as AiMessage[],
    shortcuts: [] as AiShortcut[],
    input: '',
    open: false,
    loading: false,
    // 跨组件代填指令：AI 助手写入，目标页面（如资产新增）读取后预填并清空
    pendingPrefill: null as null | { target: string; data: Record<string, any> }
  }),
  actions: {
    async init() {
      // 拉取快捷指令（不显示消息）
      try {
        const r = await askAi({ text: '' })
        if (r.success && r.shortcuts) this.shortcuts = r.shortcuts
      } catch (e) {
        /* ignore */
      }
    },
    toggle() {
      this.open = !this.open
    },
    async sendText() {
      const t = this.input.trim()
      if (!t || this.loading) return
      this.input = ''
      this.messages.push({ id: ++uid, role: 'user', text: t })
      await this.call({ text: t })
    },
    async sendShortcut(id: string, label: string) {
      if (this.loading) return
      this.messages.push({ id: ++uid, role: 'user', text: label })
      await this.call({ action: id })
    },
    async call(payload: { text?: string; action?: string }) {
      this.loading = true
      try {
        const r = await askAi(payload)
        if (r.success) {
          if (r.shortcuts && r.shortcuts.length) this.shortcuts = r.shortcuts
          this.messages.push({ id: ++uid, role: 'ai', text: r.reply, action: r.action })
        } else {
          this.messages.push({ id: ++uid, role: 'ai', text: '服务暂时不可用，请稍后再试。' })
        }
      } catch (e) {
        this.messages.push({ id: ++uid, role: 'ai', text: '网络异常，请稍后再试。' })
      } finally {
        this.loading = false
      }
    },
    setPrefill(target: string, data: Record<string, any>) {
      this.pendingPrefill = { target, data }
    },
    clearPrefill() {
      this.pendingPrefill = null
    }
  }
})
