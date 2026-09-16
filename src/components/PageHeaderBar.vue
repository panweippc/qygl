<template>
  <header class="header">
    <div class="logo">
      <span class="logo-text">宏友软件</span>
      <div class="logo-glow"></div>
    </div>
    <nav class="nav">
      <router-link to="/" class="nav-item">首页</router-link>
      <span v-if="title" class="nav-item nav-current active">{{ title }}</span>
      <span v-if="$slots.actions" class="nav-actions"><slot name="actions" /></span>
      <button class="nav-item logout-btn" @click="handleBack">返回</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

/**
 * 全站统一两级头部（与审批中心 OAWorkflowView 头部一致）
 * 结构：宏友软件 ｜ 首页 · 当前页(高亮) · [自定义操作] · 返回
 */
const props = withDefaults(defineProps<{
  /** 中间高亮的当前页名称 */
  title?: string
  /** 指定返回目标；不传则按浏览器历史回退，无历史时回首页 */
  backTo?: string
}>(), {
  title: '',
  backTo: ''
})

const router = useRouter()
const route = useRoute()

const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
    return
  }
  // 从消息中心跳转进入的页面，返回直接回首页（与审批中心保持一致）
  if (route.query.fromNotification) {
    router.push('/')
    return
  }
  const state = window.history.state as { back?: string | null } | null
  if (state && state.back) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(30, 90, 168, 0.2);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.logo {
  position: relative;
  display: flex;
  align-items: center;
}
.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(30, 90, 168, 0.3);
}
.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(30, 90, 168, 0.3), transparent);
  filter: blur(20px);
  animation: glow 3s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 760px;
  flex-wrap: wrap;
}
.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
.nav-item:hover,
.nav-item.active {
  color: #333;
  background: rgba(30, 90, 168, 0.2);
  box-shadow: 0 0 15px rgba(30, 90, 168, 0.3);
}
.nav-current {
  cursor: default;
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}
@media (max-width: 768px) {
  .header { padding: 0 1rem; }
  .nav { max-width: none; }
}
</style>
