import { defineStore } from 'pinia'
import { askAi, type AiShortcut, type AiSuggestion } from '../services/ai'

export interface AiMessage {
  id: number
  role: 'user' | 'ai'
  text: string
  action?: any
  intentLabel?: string
  related?: AiSuggestion[]
}

// 本地兜底快捷指令：后端未就绪/请求失败时也始终有内容可点（不再出现空白）
export const FALLBACK_SHORTCUTS: AiShortcut[] = [
  { id: 'sc-leave-how', label: '怎么申请请假' },
  { id: 'sc-approval', label: '审批怎么操作' },
  { id: 'sc-todo', label: '查我的待办' },
  { id: 'sc-export', label: '怎么导出资产台账' },
  { id: 'sc-monthly', label: '怎么写月报' },
  { id: 'sc-idle', label: '闲置资产预警在哪' },
  { id: 'sc-upload', label: '资料怎么上传' },
  { id: 'sc-password', label: '忘记密码怎么办' }
]

// 推荐卡片（欢迎页展示，icon 用 emoji 前缀，点击发送等价自然语言）
export const FEATURED: Array<{ icon: string; title: string; desc: string; text: string }> = [
  { icon: '📋', title: '查我的待办', desc: '看看有哪些事项等你处理', text: '查我的待办' },
  { icon: '✈️', title: '申请出差', desc: '打开出差申请并预填信息', text: '申请出差' },
  { icon: '📊', title: '查看月报', desc: '按人员与月份查看月报记录', text: '查看月报记录' },
  { icon: '🚨', title: '闲置资产预警', desc: '入库超180天的闲置资产', text: '闲置资产预警在哪' }
]

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
    init() {
      // 先给本地兜底快捷指令，保证面板打开立即可点；再异步用后端配置覆盖
      if (this.shortcuts.length === 0) this.shortcuts = FALLBACK_SHORTCUTS
      askAi({ text: '' })
        .then((r) => {
          if (r.success && r.shortcuts && r.shortcuts.length) this.shortcuts = r.shortcuts
        })
        .catch(() => {
          /* 保留本地兜底 */
        })
    },
    toggle() {
      this.open = !this.open
      if (this.open && this.shortcuts.length === 0) this.init()
    },
    async sendText() {
      const t = this.input.trim()
      if (!t || this.loading) return
      this.input = ''
      this.messages.push({ id: ++uid, role: 'user', text: t })
      await this.call({ text: t })
    },
    sendRaw(text: string) {
      // 直接发送一段自然语言（推荐卡片 / 相关推荐点击入口）
      if (!text || this.loading) return
      this.messages.push({ id: ++uid, role: 'user', text })
      return this.call({ text })
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
          this.messages.push({
            id: ++uid,
            role: 'ai',
            text: r.reply,
            action: r.action,
            intentLabel: r.intent ? r.intent.label : undefined,
            related: r.related && r.related.length ? r.related : undefined
          })
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
