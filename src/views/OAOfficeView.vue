<template>
  <div class="collaboration-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 页面标题 -->
        <div class="page-header">
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </span>
            协同管理中心
          </h2>
          <p class="page-subtitle">集成审批、任务、文档、分析于一体的工作协同平台</p>
        </div>

        <!-- 统计概览卡片 -->
        <div class="stats-section">
          <div class="stat-card" v-for="stat in statistics" :key="stat.key">
            <div class="stat-icon" :class="stat.class">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="stat.icon"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>

        <!-- 协同管理功能模块 -->
        <div class="collaboration-section">
          <!-- 我的工作�?-->
          <div class="module-card primary" @click="navigateTo('/oa-workflow')">
            <div class="module-header">
              <div class="module-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </div>
              <div class="module-badge" v-if="pendingCount > 0">{{ pendingCount }}</div>
            </div>
            <h3 class="module-title">审批中心</h3>
            <p class="module-description">请假、报销、会议申请与审批管理</p>
            <div class="module-features">
              <span class="feature-tag">请假申请</span>
              <span class="feature-tag">费用报销</span>
              <span class="feature-tag">会议管理</span>
            </div>
            <button class="module-button">进入审批</button>
          </div>

          <!-- 任务中心 -->
          <div class="module-card" @click="navigateTo('/task-center')">
            <div class="module-header">
              <div class="module-icon blue">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
            </div>
            <h3 class="module-title">任务中心</h3>
            <p class="module-description">个人任务管理与团队协作看�?/p>
            <div class="module-features">
              <span class="feature-tag">任务看板</span>
              <span class="feature-tag">进度跟踪</span>
              <span class="feature-tag">团队协同</span>
            </div>
            <button class="module-button secondary">查看任务</button>
          </div>

          <!-- 文档中心 -->
          <div class="module-card" @click="navigateTo('/document-center')">
            <div class="module-header">
              <div class="module-icon green">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
            </div>
            <h3 class="module-title">文档中心</h3>
            <p class="module-description">企业文档管理与知识库共享</p>
            <div class="module-features">
              <span class="feature-tag">文档管理</span>
              <span class="feature-tag">知识�?/span>
              <span class="feature-tag">在线协作</span>
            </div>
            <button class="module-button secondary">管理文档</button>
          </div>

          <!-- 分析中心 -->
          <div class="module-card" @click="navigateTo('/analytics-center')">
            <div class="module-header">
              <div class="module-icon purple">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
            </div>
            <h3 class="module-title">分析中心</h3>
            <p class="module-description">流程数据分析与工作效能报�?/p>
            <div class="module-features">
              <span class="feature-tag">流程分析</span>
              <span class="feature-tag">效能报表</span>
              <span class="feature-tag">数据可视�?/span>
            </div>
            <button class="module-button secondary">查看分析</button>
          </div>
        </div>

        <!-- 快捷入口 -->
        <div class="quick-actions">
          <h3 class="quick-title">快捷操作</h3>
          <div class="quick-buttons">
            <button class="quick-btn" @click="quickAction('leave')">
              <span class="quick-icon">📝</span>
              <span>发起请假</span>
            </button>
            <button class="quick-btn" @click="quickAction('reimbursement')">
              <span class="quick-icon">💰</span>
              <span>提交报销</span>
            </button>
            <button class="quick-btn" @click="quickAction('meeting')">
              <span class="quick-icon">📅</span>
              <span>创建会议</span>
            </button>
            <button class="quick-btn" @click="quickAction('task')">
              <span class="quick-icon">�?/span>
              <span>新建任务</span>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 协同管理模块 v2.0</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getPendingLeaveApplications, getPendingReimbursements, getPendingMeetings } from '../services/api'

const router = useRouter()

// 统计数据
const statistics = ref([
  { key: 'pending', label: '待处�?, value: 0, class: 'orange', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { key: 'processing', label: '进行�?, value: 0, class: 'blue', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' },
  { key: 'completed', label: '已完�?, value: 0, class: 'green', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { key: 'total', label: '总事�?, value: 0, class: 'purple', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' }
])

// 待处理数�?const pendingCount = computed(() => {
  return statistics.value.find(s => s.key === 'pending')?.value || 0
})

// 当前用户�?const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

// 计算用户角色
const isAdmin = computed(() => {
  return localStorage.getItem('role') === 'admin'
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    const [leaveRes, reimbursementRes, meetingRes] = await Promise.all([
      getPendingLeaveApplications(currentUsername.value),
      getPendingReimbursements(currentUsername.value),
      getPendingMeetings(currentUsername.value)
    ])

    let pending = 0
    if (leaveRes.success) pending += leaveRes.data.length
    if (reimbursementRes.success) pending += reimbursementRes.data.length
    if (meetingRes.success) pending += meetingRes.data.length

    // 更新统计数据
    const pendingStat = statistics.value.find(s => s.key === 'pending')
    if (pendingStat) pendingStat.value = pending

    // 模拟其他数据（实际应从后端获取）
    const processingStat = statistics.value.find(s => s.key === 'processing')
    if (processingStat) processingStat.value = Math.floor(Math.random() * 10) + 1

    const completedStat = statistics.value.find(s => s.key === 'completed')
    if (completedStat) completedStat.value = Math.floor(Math.random() * 50) + 20

    const totalStat = statistics.value.find(s => s.key === 'total')
    if (totalStat) {
      totalStat.value = (pendingStat?.value || 0) + (processingStat?.value || 0) + (completedStat?.value || 0)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 导航方法
const navigateTo = (path: string) => {
  router.push(path)
}

// 快捷操作
const quickAction = (type: string) => {
  switch (type) {
    case 'leave':
    case 'reimbursement':
    case 'meeting':
      router.push({
        path: '/oa-workflow',
        query: { action: 'create', type }
      })
      break
    case 'task':
      router.push('/task-center')
      break
  }
}

// 返回
const handleBack = () => {
  router.back()
}

// 组件挂载
onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.collaboration-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #E4EDF2 0%, #F0F4F8 100%);
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
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
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
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
  max-width: 400px;
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

.nav-item:hover {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
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

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 24px;
  height: 24px;
}

.page-subtitle {
  color: rgba(51, 51, 51, 0.6);
  font-size: 1rem;
  margin: 0;
}

/* 统计概览 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.orange {
  background: linear-gradient(135deg, #FF9800, #FFC107);
}

.stat-icon.blue {
  background: linear-gradient(135deg, #2196F3, #03A9F4);
}

.stat-icon.green {
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
}

.stat-icon.purple {
  background: linear-gradient(135deg, #9C27B0, #E91E63);
}

.stat-icon svg {
  width: 28px;
  height: 28px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.6);
  margin-top: 0.25rem;
}

/* 协同管理功能模块 */
.collaboration-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.module-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.4);
}

.module-card.primary {
  border: 2px solid rgba(100, 149, 237, 0.4);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
}

.module-card.primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6495ED, #87CEEB);
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.module-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6495ED, #87CEEB);
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.module-icon.blue {
  background: linear-gradient(135deg, #2196F3, #03A9F4);
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
}

.module-icon.green {
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.module-icon.purple {
  background: linear-gradient(135deg, #9C27B0, #E91E63);
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3);
}

.module-icon svg {
  width: 28px;
  height: 28px;
}

.module-badge {
  background: linear-gradient(135deg, #FF5252, #FF1744);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255, 82, 82, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.module-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.module-description {
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.module-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.feature-tag {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  border: 1px solid rgba(100, 149, 237, 0.2);
}

.module-button {
  width: 100%;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.module-button.secondary {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: none;
}

.module-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4);
}

.module-button.secondary:hover {
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2);
}

/* 快捷操作 */
.quick-actions {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.quick-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.quick-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #333;
}

.quick-btn:hover {
  background: rgba(100, 149, 237, 0.1);
  border-color: rgba(100, 149, 237, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.15);
}

.quick-icon {
  font-size: 1.2rem;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.2);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.4);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.6);
}

/* 响应式设�?*/
@media (max-width: 1200px) {
  .collaboration-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .collaboration-section {
    grid-template-columns: 1fr;
  }
  
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-buttons {
    justify-content: center;
  }
}
</style>
