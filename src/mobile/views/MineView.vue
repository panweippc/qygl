<template>
  <div class="mine">
    <header class="mine-head">
      <div class="avatar">{{ uname.slice(0, 1) }}</div>
      <div>
        <div class="mine-name">{{ uname }}</div>
        <div class="m-muted" style="color: rgba(255,255,255,.85)">{{ role || '员工' }}</div>
      </div>
    </header>

    <section class="m-card">
      <div class="m-row mine-row" @click="go(isApprover ? '/todo' : '/my-apply')">
        <span>{{ isApprover ? '待我审批' : '我的申请' }}</span>
        <span class="mine-arrow">{{ isApprover ? badge.todo : '' }} ›</span>
      </div>
      <div class="m-row mine-row" @click="go('/monthly-report')">
        <span>月报上传</span>
        <span class="mine-arrow">›</span>
      </div>
      <div class="m-row mine-row" @click="go('/message')">
        <span>消息中心</span>
        <span class="mine-arrow">{{ badge.msg > 0 ? badge.msg : '' }} ›</span>
      </div>
      <div class="m-row mine-row">
        <span>设备类型</span>
        <span class="m-muted">移动端（与 PC 可同时在线）</span>
      </div>
    </section>

    <button class="m-btn block danger" @click="logout">退出登录</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { disconnectSocket } from '@/services/socket'
import { badge } from '@/mobile/badge'

const router = useRouter()
const uname = localStorage.getItem('username') || '用户'
const role = localStorage.getItem('role') || ''
const APPROVER_KEYS = ['经理', '总监', '管理员', '总经理', '主管', '部长', '负责人', 'leader']
const isApprover = computed(() => APPROVER_KEYS.some(k => (role || '').includes(k)) || badge.todo > 0)

function go(p: string) {
  router.push(p)
}

function logout() {
  localStorage.clear()
  disconnectSocket()
  router.replace('/login')
}
</script>

<style scoped>
.mine-head {
  background: #185fa5;
  color: #fff;
  padding: 24px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}
.mine-name {
  font-size: 18px;
  font-weight: 600;
}
.mine-row {
  padding: 14px 0;
  border-top: 1px solid #f0f1f2;
  font-size: 15px;
}
.mine-row:first-child {
  border-top: none;
}
.mine-arrow {
  color: #969799;
}
.mine .m-btn.block {
  margin: 16px 12px;
  width: calc(100% - 24px);
}
</style>
