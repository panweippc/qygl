import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 全局共享通知 store：弹窗助手与消息中心共用同一份数据，保证两端未读状态/列表始终一致
export const useNotificationStore = defineStore('notifications', () => {
  const list = ref<any[]>([])          // 全部通知（消息中心使用，支持前端分页）
  const unreadCount = ref(0)
  const loading = ref(false)
  let timer = null
  let started = false

  function getUserId() {
    return localStorage.getItem('username') || ''
  }

  // 当前已加载的账号：用于检测登出/切换账号，立即清空上一账号的残留数据
  let loadedUserId = ''
  // 请求序号：防止旧账号的迟到响应覆盖新账号数据（切号竞态）
  let loadSeq = 0

  // 立即清空列表与角标（登出/切换账号时调用）
  function clearAll() {
    loadSeq++ // 使在途的旧请求响应全部作废
    list.value = []
    unreadCount.value = 0
    loading.value = false
    loadedUserId = ''
  }

  async function load() {
    const userId = getUserId()
    if (!userId) {
      // 已登出：清空列表与未读角标，避免残留上一账号的未读数
      if (loadedUserId) {
        clearAll()
      }
      return
    }
    if (userId !== loadedUserId) {
      // 切换账号：先清空上一账号的列表与角标，再加载新账号数据
      clearAll()
      loadedUserId = userId
    }
    const seq = ++loadSeq
    loading.value = true
    try {
      const r = await fetch('/api/notifications?userId=' + encodeURIComponent(userId) + '&page=1&pageSize=500')
      const j = await r.json()
      // 响应到达时账号已变化则丢弃（防旧账号迟到响应覆盖新账号数据）
      if (seq === loadSeq && getUserId() === userId && j.success) list.value = j.data.list || []
    } catch (e) {}
    try {
      const r2 = await fetch('/api/notifications/unread-count?userId=' + encodeURIComponent(userId))
      const j2 = await r2.json()
      if (seq === loadSeq && getUserId() === userId && j2.success) unreadCount.value = j2.data.count || 0
    } catch (e) {}
    if (seq === loadSeq) loading.value = false
  }

  async function markRead(id) {
    const userId = getUserId()
    if (!userId) return
    try {
      await fetch('/api/notifications/' + id + '/read', { method: 'PUT' })
    } catch (e) {}
    // 本地即时更新，确保弹窗与消息中心同步
    const item = list.value.find((n: any) => n.id === id)
    if (item && !item.isRead) {
      item.isRead = 1
      if (unreadCount.value > 0) unreadCount.value -= 1
    }
  }

  async function markAllRead() {
    const userId = getUserId()
    if (!userId) return
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    } catch (e) {}
    list.value.forEach((n: any) => { n.isRead = 1 })
    unreadCount.value = 0
  }

  // 幂等：多个组件调用也只起一个定时器（单一轮询源）
  function startPolling() {
    if (started) return
    started = true
    load()
    timer = setInterval(load, 30000)
  }

  function stopPolling() {
    if (timer) { clearInterval(timer); timer = null }
    started = false
  }

  // 弹窗预览：最新未读 5 条
  const unreadPreview = computed(() => list.value.filter((n: any) => !n.isRead).slice(0, 5))

  return { list, unreadCount, loading, unreadPreview, load, clearAll, markRead, markAllRead, startPolling, stopPolling }
})
