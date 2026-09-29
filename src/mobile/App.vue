<template>
  <div class="app-root">
    <main class="app-body">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <nav class="tab-bar" v-if="showTab">
      <router-link to="/" class="tab-item" exact-active-class="active">
        <span class="tab-ico">⌂</span>
        <span class="tab-label">首页</span>
      </router-link>
      <router-link to="/chat" class="tab-item" active-class="active">
        <span class="tab-ico">💬</span>
        <span class="tab-label">聊天</span>
        <span class="tab-badge" v-if="badge.chat > 0">{{ badge.chat > 99 ? '99+' : badge.chat }}</span>
      </router-link>
      <router-link to="/todo" class="tab-item" active-class="active">
        <span class="tab-ico">✓</span>
        <span class="tab-label">审批中心</span>
        <span class="tab-badge" v-if="badge.todo > 0">{{ badge.todo > 99 ? '99+' : badge.todo }}</span>
      </router-link>
      <router-link to="/monthly-report" class="tab-item" active-class="active">
        <span class="tab-ico">📅</span>
        <span class="tab-label">月报</span>
      </router-link>
      <router-link to="/asset-management" class="tab-item" active-class="active">
        <span class="tab-ico">📦</span>
        <span class="tab-label">资产管理</span>
      </router-link>
      <router-link to="/resource" class="tab-item" active-class="active">
        <span class="tab-ico">📁</span>
        <span class="tab-label">资料中心</span>
      </router-link>
      <router-link to="/operation-log" class="tab-item" active-class="active">
        <span class="tab-ico">📝</span>
        <span class="tab-label">操作日志</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { badge } from '@/mobile/badge'

const route = useRoute()
const showTab = computed(() => route.path !== '/login')

let chatTimer: ReturnType<typeof setInterval> | null = null
async function fetchChatBadge() {
  const employeeId = localStorage.getItem('userId')
  if (!employeeId) return
  try {
    const res = await fetch(`/api/chat/unread-count?employeeId=${employeeId}`)
    const json = await res.json()
    if (json.success) badge.chat = json.data.count
  } catch { /* ignore */ }
}
onMounted(() => {
  fetchChatBadge()
  chatTimer = setInterval(fetchChatBadge, 10000)
})
onUnmounted(() => {
  if (chatTimer) clearInterval(chatTimer)
})
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f2f3f5;
}
.app-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tab-bar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 56px;
  background: #fff;
  border-top: 1px solid #ebedf0;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #969799;
  text-decoration: none;
  position: relative;
  font-size: 10px;
}
.tab-item.active {
  color: #185fa5;
}
.tab-ico {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 2px;
}
.tab-badge {
  position: absolute;
  top: 4px;
  left: 50%;
  margin-left: 6px;
  background: #ee0a24;
  color: #fff;
  font-size: 10px;
  line-height: 14px;
  padding: 0 4px;
  border-radius: 7px;
}
</style>
