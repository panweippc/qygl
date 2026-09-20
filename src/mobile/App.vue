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
      <router-link to="/todo" class="tab-item" active-class="active">
        <span class="tab-ico">✓</span>
        <span class="tab-label">审批中心</span>
        <span class="tab-badge" v-if="badge.todo > 0">{{ badge.todo > 99 ? '99+' : badge.todo }}</span>
      </router-link>
      <router-link to="/monthly-report" class="tab-item" active-class="active">
        <span class="tab-ico">📅</span>
        <span class="tab-label">月报</span>
      </router-link>
      <router-link to="/tool-inventory" class="tab-item" active-class="active">
        <span class="tab-ico">📦</span>
        <span class="tab-label">物资管理</span>
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { badge } from '@/mobile/badge'

const route = useRoute()
const showTab = computed(() => route.path !== '/login')
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
  grid-template-columns: repeat(6, 1fr);
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
