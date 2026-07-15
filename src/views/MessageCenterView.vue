<template>
  <div class="message-center">
    <header class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/')" class="back-btn">← 返回</el-button>
        <h2 class="page-title">
          <span class="title-icon">🔔</span>
          消息中心
        </h2>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="markAllRead" :disabled="unreadCount === 0">全部标记已读</el-button>
        <el-button size="small" @click="fetchNotifications">刷新</el-button>
      </div>
    </header>

    <div class="tabs-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部 ({{ total }})</button>
      <button class="tab-btn" :class="{ active: activeTab === 'unread' }" @click="activeTab = 'unread'">未读 ({{ unreadCount }})</button>
    </div>

    <div class="notification-list" v-loading="loading">
      <div v-if="filteredList.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无消息</p>
      </div>
      <div v-for="item in filteredList" :key="item.id" class="notification-item" :class="{ unread: !item.isRead }" @click="markRead(item)">
        <div class="notif-dot" v-if="!item.isRead" />
        <div class="notif-icon" :class="'type-' + item.type">
          <span>{{ typeIcon(item.type) }}</span>
        </div>
        <div class="notif-body">
          <div class="notif-title">{{ item.title }}</div>
          <div class="notif-content" v-if="item.content">{{ item.content }}</div>
          <div class="notif-time">{{ formatTime(item.createdAt) }}</div>
        </div>
        <button class="notif-close" @click.stop="deleteNotif(item.id)">✕</button>
      </div>
      <div class="pagination-bar" v-if="total > pageSize">
        <el-pagination layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchNotifications" background small />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const notifications = ref<any[]>([])
const total = ref(0)
const unreadCount = ref(0)
const currentPage = ref(1)
const pageSize = 20
const activeTab = ref('all')

const userId = computed(() => localStorage.getItem('userId') || '')

const filteredList = computed(() => {
  if (activeTab.value === 'unread') return notifications.value.filter(n => !n.isRead)
  return notifications.value
})

function typeIcon(type: string) {
  const map: Record<string, string> = { approval: '📋', task: '✅', mention: '💬', system: '🔔' }
  return map[type] || '🔔'
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 172800000) return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function fetchNotifications() {
  if (!userId.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/notifications?userId=${userId.value}&page=${currentPage.value}&pageSize=${pageSize}`)
    const json = await res.json()
    if (json.success) {
      notifications.value = json.data.list
      total.value = json.data.total
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function fetchUnreadCount() {
  if (!userId.value) return
  try {
    const res = await fetch(`/api/notifications/unread-count?userId=${userId.value}`)
    const json = await res.json()
    if (json.success) unreadCount.value = json.data.count
  } catch { /* ignore */ }
}

async function markRead(item: any) {
  if (item.isRead) return
  try {
    await fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' })
    item.isRead = 1
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch { /* ignore */ }
}

async function markAllRead() {
  if (!userId.value) return
  try {
    await fetch('/api/notifications/read-all', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId.value }) })
    notifications.value.forEach(n => n.isRead = 1)
    unreadCount.value = 0
    ElMessage.success('全部标记为已读')
  } catch { /* ignore */ }
}

async function deleteNotif(id: number) {
  try {
    const item = notifications.value.find(n => n.id === id)
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    if (item && !item.isRead) unreadCount.value = Math.max(0, unreadCount.value - 1)
    notifications.value = notifications.value.filter(n => n.id !== id)
    total.value--
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchNotifications()
  fetchUnreadCount()
})
</script>

<style scoped>
.message-center { max-width: 800px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a2e; display: flex; align-items: center; gap: 8px; margin: 0; }
.title-icon { font-size: 24px; }
.header-actions { display: flex; gap: 8px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.back-btn { font-size: 14px; color: #666; }
.tabs-bar { display: flex; gap: 0; margin-bottom: 16px; background: #f5f7fa; border-radius: 8px; overflow: hidden; }
.tab-btn { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: #666; transition: all 0.3s; }
.tab-btn.active { background: #fff; color: #667eea; font-weight: 600; box-shadow: 0 2px 8px rgba(102,126,234,0.15); }
.notification-list { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); min-height: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #999; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.notification-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f2f5; cursor: pointer; transition: background 0.2s; position: relative; }
.notification-item:hover { background: #f8f9fb; }
.notification-item.unread { background: #f0f4ff; }
.notif-dot { position: absolute; left: 10px; top: 22px; width: 6px; height: 6px; border-radius: 50%; background: #667eea; }
.notif-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; background: #f0f4ff; flex-shrink: 0; margin-left: 6px; }
.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 14px; font-weight: 500; color: #1a1a2e; margin-bottom: 4px; }
.notif-content { font-size: 13px; color: #666; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-time { font-size: 12px; color: #bbb; margin-top: 6px; }
.notif-close { background: none; border: none; color: #ccc; cursor: pointer; font-size: 14px; padding: 4px; opacity: 0; transition: opacity 0.2s; }
.notification-item:hover .notif-close { opacity: 1; }
.notif-close:hover { color: #f44336; }
.pagination-bar { display: flex; justify-content: center; padding: 16px; }
</style>
