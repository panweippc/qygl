<template>
  <div class="message">
    <div class="bar">
      <div class="m-title">消息中心</div>
      <span class="readall" v-if="list.length" @click="readAll">全部已读</span>
    </div>

    <div v-if="loading" class="m-muted">加载中…</div>
    <div v-else-if="list.length === 0" class="m-muted">暂无消息</div>

    <div
      v-for="m in list"
      :key="m.id"
      class="msg-item"
      :class="{ unread: !m.isRead }"
      @click="markRead(m)"
    >
      <div class="m-top">
        <span class="m-title2">{{ m.title || m.type || '通知' }}</span>
        <span class="m-dot" v-if="!m.isRead"></span>
      </div>
      <div class="m-body" v-if="m.content">{{ m.content }}</div>
      <div class="m-muted">{{ (m.createdAt || '').slice(0, 16).replace('T', ' ') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { badge } from '@/mobile/badge'

const list = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  const userId = localStorage.getItem('userId') || 0
  try {
    const res = await api.get(`/notifications?userId=${userId}&pageSize=50`)
    if (res.data && res.data.success) list.value = res.data.data?.list || []
  } catch (e) { /* ignore */ }
  finally { loading.value = false }
}

async function markRead(m: any) {
  if (m.isRead) return
  try {
    await api.put(`/notifications/${m.id}/read`)
    m.isRead = 1
    badge.msg = Math.max(0, badge.msg - 1)
  } catch (e) { /* ignore */ }
}

async function readAll() {
  const userId = localStorage.getItem('userId') || 0
  try {
    await api.put('/notifications/read-all', { userId })
    list.value.forEach(m => (m.isRead = 1))
    badge.msg = 0
  } catch (e) { /* ignore */ }
}

onMounted(load)
</script>

<style scoped>
.bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 8px; }
.readall { color: #185fa5; font-size: 13px; }
.msg-item {
  padding: 12px 0; border-top: 1px solid #f0f1f2; position: relative;
}
.m-top { display: flex; align-items: center; gap: 6px; }
.m-title2 { font-size: 15px; font-weight: 600; }
.m-dot { width: 8px; height: 8px; border-radius: 50%; background: #ee0a24; }
.m-body { font-size: 13px; color: #646566; margin: 4px 0; }
.unread { background: #f7fbff; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
</style>
