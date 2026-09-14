<template>
  <div class="home-container">
    <DashboardHeader />

    <div class="main-container">
      <DashboardSidebar />

      <main class="content">
        <div class="dashboard">
          <div class="dashboard-cards">
            <!-- 文件存储与产品分类已合并为「资料中心」单一入口 -->
            <DashboardCard title="资料中心" to="/resource-center" :stats="[{ value: fileStats.total, label: '文件数' }, { value: projectStats.total, label: '项目数' }, { value: fileStats.categories, label: '分类数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z"/>
                </svg>
              </template>
            </DashboardCard>

            <DashboardCard title="月报统计" to="/monthly-report" :stats="[{ value: monthlyReportStats.total, label: '总月报数' }, { value: monthlyReportStats.pending, label: '待提交' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
                </svg>
              </template>
            </DashboardCard>

            <DashboardCard title="物资管理" to="/tool-inventory" :stats="[{ value: toolStats.total, label: '总物资数' }, { value: toolStats.categories, label: '分类数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </template>
            </DashboardCard>

            <DashboardCard title="通讯录" class="contacts-card" :stats="[{ value: contactsStats.total, label: '总人数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </template>
              <div class="contacts-list">
                <div v-for="c in contactsList" :key="c.name + '|' + c.department" class="contact-row">
                  <div class="contact-main">
                    <span class="contact-name">{{ c.name }}</span>
                    <span class="contact-dept">{{ c.department }} · {{ c.position }}</span>
                  </div>
                  <div class="contact-contact">
                    <div class="contact-line"><span class="contact-label">邮箱</span><span class="contact-value">{{ c.email || '—' }}</span></div>
                    <div class="contact-line"><span class="contact-label">电话</span><span class="contact-value">{{ c.phone || '—' }}</span></div>
                    <div v-if="c.projects && c.projects.length" class="contact-line contact-projects"><span class="contact-label">负责项目</span><span class="contact-value">{{ c.projects.map(p => p.name).join('、') }}</span></div>
                  </div>
                </div>
                <div v-if="contactsList.length === 0" class="contact-empty">暂无通讯录数据</div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </main>
    </div>

    <DashboardFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DashboardHeader from '../components/DashboardHeader.vue'
import DashboardSidebar from '../components/DashboardSidebar.vue'
import DashboardCard from '../components/DashboardCard.vue'
import DashboardFooter from '../components/DashboardFooter.vue'
import { getFiles, getFileCategories, getProjectCategoryStats, getMonthlyReports, getTools, getEmployeeDirectory } from '../services/api'

const fileStats = ref({ total: 0, categories: 0 })
const projectStats = ref({ total: 0, categories: 0 })
const monthlyReportStats = ref({ total: 0, pending: 0 })
const toolStats = ref({ total: 0, categories: 0 })
const contactsList = ref<any[]>([])
const contactsStats = computed(() => ({
  total: contactsList.value.length,
  withPhone: contactsList.value.filter((e: any) => e.phone).length
}))

const loadDashboardData = async () => {
  try {
    // 所有用户均可看到并点击全部模块卡片，不再按权限过滤
    const [filesResponse, categoriesResponse] = await Promise.all([
      getFiles(),
      getFileCategories()
    ])
    loadContactsData()
    if (filesResponse.success) {
      fileStats.value = {
        total: filesResponse.data.length,
        categories: categoriesResponse.success ? categoriesResponse.data.length : 0
      }
    }

    const statsResponse = await getProjectCategoryStats()
    if (statsResponse.success) {
      projectStats.value = {
        total: statsResponse.data.total,
        categories: statsResponse.data.categories
      }
    }

    const reportsResponse = await getMonthlyReports()
    if (reportsResponse.success) {
      monthlyReportStats.value = {
        total: reportsResponse.data.length,
        pending: 0
      }
    }

    const toolsResponse = await getTools()
    if (toolsResponse.success) {
      toolStats.value = {
        total: toolsResponse.data.length,
        categories: new Set(toolsResponse.data.map((tool: any) => tool.category)).size
      }
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})

const loadContactsData = async () => {
  try {
    const res = await getEmployeeDirectory()
    if (res.success && Array.isArray(res.data)) {
      contactsList.value = res.data
    }
  } catch { /* 忽略：不影响主面板 */ }
}
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #333;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  animation: pageFadeIn 0.8s ease-out;
}

@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.home-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
  z-index: 0;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(5%, 5%) rotate(180deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}

.main-container {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 1;
  overflow: hidden;
  animation: mainContainerFadeIn 0.6s ease-out 0.2s both;
}

@keyframes mainContainerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
  animation: contentFadeIn 0.6s ease-out 0.4s both;
}

@keyframes contentFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1440px) {
  .dashboard-cards { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
}

@media (max-width: 1200px) {
  .dashboard-cards { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
  .content { padding: 1.5rem; }
}

@media (max-width: 768px) {
  .dashboard-cards { grid-template-columns: 1fr; gap: 1.2rem; }
  .content { padding: 1rem; }
}

@media (max-width: 480px) {
  .dashboard-cards { grid-template-columns: 1fr; gap: 1rem; }
  .content { padding: 0.8rem; }
}

/* 通讯录卡片：独占一行并横向展示 */
.contacts-card {
  grid-column: 1 / -1;
}

/* 通讯录列表 - 横向展示 */
.contacts-list {
  margin-top: 1rem;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding-right: 4px;
}

.contact-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.8rem;
  background: rgba(100, 149, 237, 0.08);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 10px;
  flex: 1 1 320px;
  min-width: 300px;
  max-width: 480px;
}

.contact-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.contact-name {
  font-size: 0.98rem;
  font-weight: 600;
  color: #333;
}

.contact-dept {
  font-size: 0.78rem;
  color: rgba(51, 51, 51, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-contact {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-left: auto;
  min-width: 0;
}

.contact-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: rgba(51, 51, 51, 0.8);
}

.contact-label {
  flex: 0 0 32px;
  color: #6495ED;
  font-weight: 600;
}

.contact-value {
  word-break: break-all;
}

.contact-empty {
  text-align: center;
  color: rgba(51, 51, 51, 0.5);
  font-size: 0.85rem;
  padding: 1rem 0;
  width: 100%;
}

.contacts-list::-webkit-scrollbar { width: 6px; }
.contacts-list::-webkit-scrollbar-thumb { background: rgba(100, 149, 237, 0.5); border-radius: 4px; }

.content::-webkit-scrollbar { width: 8px; }
.content::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 4px; }
.content::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 4px; }
.content::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.7); }
</style>
