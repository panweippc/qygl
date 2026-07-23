<template>
  <div class="home-container">
    <DashboardHeader />

    <div class="main-container">
      <DashboardSidebar />

      <main class="content">
        <div class="dashboard">
          <div class="dashboard-cards">
            <DashboardCard title="文件存储" to="/file-storage" :stats="[{ value: fileStats.total, label: '总文件数' }, { value: fileStats.categories, label: '分类数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
                </svg>
              </template>
            </DashboardCard>

            <DashboardCard title="项目分类" to="/project-category" :stats="[{ value: projectStats.total, label: '总项目数' }, { value: projectStats.categories, label: '分类数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
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

            <DashboardCard title="工具管理" to="/tool-inventory" :stats="[{ value: toolStats.total, label: '总工具数' }, { value: toolStats.categories, label: '分类数' }]">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </template>
            </DashboardCard>
          </div>

          <div class="dashboard-visualization">
            <div class="visualization-row">
              <TrendChart />
              <PieChart />
            </div>
            <div class="visualization-row">
              <RankingChart />
              <ComparisonChart />
            </div>
          </div>
        </div>
      </main>
    </div>

    <DashboardFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import DashboardHeader from '../components/DashboardHeader.vue'
import DashboardSidebar from '../components/DashboardSidebar.vue'
import DashboardCard from '../components/DashboardCard.vue'
import DashboardFooter from '../components/DashboardFooter.vue'
import TrendChart from '../components/TrendChart.vue'
import PieChart from '../components/PieChart.vue'
import RankingChart from '../components/RankingChart.vue'
import ComparisonChart from '../components/ComparisonChart.vue'
import { getFiles, getFileCategories, getProjects, getMonthlyReports, getTools } from '../services/api'

echarts.registerTheme('default', {
  textStyle: {
    fontFamily: 'Microsoft YaHei, SimHei, sans-serif'
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#4169E1',
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    textStyle: {
      color: '#333',
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif'
    }
  }
})

const fileStats = ref({ total: 0, categories: 0 })
const projectStats = ref({ total: 0, categories: 0 })
const monthlyReportStats = ref({ total: 0, pending: 0 })
const toolStats = ref({ total: 0, categories: 0 })

const loadDashboardData = async () => {
  try {
    const [filesResponse, categoriesResponse] = await Promise.all([
      getFiles(),
      getFileCategories()
    ])
    if (filesResponse.success) {
      fileStats.value = {
        total: filesResponse.data.length,
        categories: categoriesResponse.success ? categoriesResponse.data.length : 0
      }
    }

    const projectsResponse = await getProjects()
    if (projectsResponse.success) {
      projectStats.value = {
        total: projectsResponse.data.list.length,
        categories: new Set(projectsResponse.data.list.map((project: any) => project.project_type)).size
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

.dashboard-visualization {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
  border-radius: 20px;
  border: 1px solid rgba(100, 149, 237, 0.4);
  box-shadow: 0 8px 30px rgba(100, 149, 237, 0.2);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.dashboard-visualization::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6495ED, #87CEFA, #6495ED);
  border-radius: 20px 20px 0 0;
  z-index: 2;
}

.dashboard-visualization::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -10%;
  width: 30%;
  height: 100%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1) 0%, transparent 70%);
  transform: translateY(-50%);
  z-index: 0;
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0% { opacity: 0.3; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.6; transform: translateY(-50%) scale(1.1); }
  100% { opacity: 0.3; transform: translateY(-50%) scale(1); }
}

.visualization-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5rem;
}

@media (max-width: 1440px) {
  .dashboard-cards { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
  .visualization-row { grid-template-columns: 1fr; gap: 2rem; }
}

@media (max-width: 1200px) {
  .dashboard-cards { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
  .visualization-row { grid-template-columns: 1fr; gap: 2rem; }
  .content { padding: 1.5rem; }
  .dashboard-visualization { padding: 1.5rem; gap: 2rem; }
}

@media (max-width: 768px) {
  .dashboard-cards { grid-template-columns: 1fr; gap: 1.2rem; }
  .dashboard-visualization { padding: 1.2rem; gap: 1.5rem; margin-top: 2rem; }
  .visualization-row { gap: 1.5rem; }
  .content { padding: 1rem; }
}

@media (max-width: 480px) {
  .dashboard-cards { grid-template-columns: 1fr; gap: 1rem; }
  .dashboard-visualization { padding: 1rem; gap: 1.2rem; margin-top: 1.5rem; }
  .content { padding: 0.8rem; }
}

.content::-webkit-scrollbar { width: 8px; }
.content::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 4px; }
.content::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 4px; }
.content::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.7); }
</style>
