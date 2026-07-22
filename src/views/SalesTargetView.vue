<template>
  <div class="sales-target-container">
    <div class="decorative-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

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

    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </span>
          销售目标管理
        </h2>

        <div class="toolbar">
          <div class="period-selector">
            <el-select v-model="selectedYear" @change="fetchTargets" style="width: 120px; margin-right: 8px;">
              <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
            </el-select>
            <el-select v-model="selectedMonth" @change="fetchTargets" style="width: 100px;">
              <el-option v-for="m in 12" :key="m" :label="m + '月'" :value="m" />
            </el-select>
          </div>
          <el-button type="primary" @click="saveTargets" :loading="saving">
            保存目标
          </el-button>
        </div>

        <div class="table-section">
          <el-table :data="targetList" stripe style="width: 100%" max-height="600">
            <el-table-column prop="managerId" label="客户方负责人" min-width="140" />
            <el-table-column prop="ourManager" label="我方负责人" min-width="120">
              <template #default="{ row }">
                <span :class="row.ourManager ? 'our-manager-value' : 'our-manager-empty'">{{ row.ourManager || '未分配' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="目标金额（元）" min-width="160">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.targetAmount"
                  :min="0"
                  :step="10000"
                  controls-position="right"
                  style="width: 160px"
                  :precision="0"
                />
              </template>
            </el-table-column>
            <el-table-column prop="actualCount" label="实际成交数" min-width="120">
              <template #default="{ row }">
                <span class="actual-value">{{ row.actualCount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="actualAmount" label="实际销售额（元）" min-width="160">
              <template #default="{ row }">
                <span class="actual-value">{{ Number(row.actualAmount).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="完成率" min-width="140">
              <template #default="{ row }">
                <div class="progress-cell">
                  <el-progress
                    :percentage="completionRate(row)"
                    :status="completionStatus(row)"
                    :stroke-width="16"
                    :text-inside="true"
                  />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="targetList.length === 0" class="empty-state">
          <el-empty description="暂无数据" />
        </div>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getSalesTargets, updateSalesTargets } from '../services/api'

const router = useRouter()

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const yearOptions = ref<number[]>([])
const targetList = ref<any[]>([])
const saving = ref(false)

const handleBack = () => {
  router.back()
}

const completionRate = (row: any) => {
  if (!row.targetAmount || row.targetAmount === 0) return 0
  return Math.min(100, Math.round((Number(row.actualAmount) / Number(row.targetAmount)) * 100))
}

const completionStatus = (row: any): any => {
  const rate = completionRate(row)
  if (rate >= 100) return 'success'
  if (rate >= 50) return 'warning'
  return 'exception'
}

const fetchTargets = async () => {
  try {
    const res = await getSalesTargets(selectedYear.value, selectedMonth.value)
    if (res.success) {
      targetList.value = res.data
    }
  } catch (error) {
    console.error('获取销售目标失败:', error)
    ElMessage.error('获取销售目标失败')
  }
}

const saveTargets = async () => {
  saving.value = true
  try {
    const res = await updateSalesTargets(targetList.value)
    if (res.success) {
      ElMessage.success('销售目标保存成功')
      await fetchTargets()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存销售目标失败:', error)
    ElMessage.error('保存销售目标失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const currentYear = now.getFullYear()
  const years: number[] = []
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    years.push(y)
  }
  yearOptions.value = years
  fetchTargets()
})
</script>

<style scoped>
.sales-target-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

.sales-target-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 20%, rgba(100, 149, 237, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(135, 206, 235, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(100, 149, 237, 0.05) 0%, transparent 50%);
  z-index: 0;
}

.decorative-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.3;
  animation: float 20s ease-in-out infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  top: -50px;
  left: -50px;
  animation-delay: 0s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #87CEEB, #6495ED);
  bottom: -30px;
  right: -30px;
  animation-delay: 5s;
}

.shape-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  top: 50%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(20px, -20px) rotate(5deg); }
  50% { transform: translate(0, 20px) rotate(0deg); }
  75% { transform: translate(-20px, -10px) rotate(-5deg); }
}

.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.nav-item:hover::before,
.nav-item.active::before {
  left: 100%;
}

.nav-item:hover,
.nav-item.active {
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
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent);
  transition: left 0.3s ease;
}

.logout-btn:hover::before {
  left: 100%;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.period-selector {
  display: flex;
  align-items: center;
}

.table-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.actual-value {
  font-weight: 600;
  color: #4169E1;
}

.progress-cell {
  min-width: 140px;
}

.our-manager-value {
  font-weight: 500;
  color: #4169E1;
}

.our-manager-empty {
  color: #999;
  font-style: italic;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.footer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}
</style>
