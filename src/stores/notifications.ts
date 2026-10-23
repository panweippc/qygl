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

  async function load() {
    const userId = getUserId()
    if (!userId) return
    loading.value = true
    try {
      const r = await fetch('/api/notifications?userId=' + encodeURIComponent(userId) + '&page=1&pageSize=500')
      const j = await r.json()
      if (j.success) list.value = j.data.list || []
    } catch (e) {}
    try {
      const r2 = await fetch('/api/notifications/unread-count?userId=' + encodeURIComponent(userId))
      const j2 = await r2.json()
      if (j2.success) unreadCount.value = j2.data.count || 0
    } catch (e) {}
    loading.value = false
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

  return { list, unreadCount, loading, unreadPreview, load, markRead, markAllRead, startPolling, stopPolling }
})
