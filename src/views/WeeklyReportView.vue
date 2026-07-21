<template>
  <div class="monthly-report-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/monthly-report" class="nav-item active">月报</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 上传表格 - 仅非管理员和非总经理可�?-->
        <div v-if="!isAdmin && !isGeneralManager" class="upload-section">
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
              </svg>
            </span>
            月报
          </h2>
          
          <!-- 月份选择 -->
          <div class="month-selector">
            <el-select v-model="selectedMonth" placeholder="选择月份" class="month-select">
              <el-option
                v-for="month in availableMonths"
                :key="month.value"
                :label="month.label"
                :value="month.value"
              />
            </el-select>
          </div>
          
          <div class="upload-table">
            <div class="table-wrapper">
              <table class="monthly-report-table">
                <thead>
                  <tr>
                    <th>月报信息</th>
                    <th>{{ currentUser.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="table-label">月报标题</td>
                    <td>
                      <el-input v-model="currentReport.title" placeholder="请输入标题" />
                    </td>
                  </tr>
                  <tr>
                    <td class="table-label">上传附件</td>
                    <td>
                      <el-upload
                        ref="uploadRef"
                        class="upload-demo"
                        action="#"
                        :on-change="handleFileChange"
                        :auto-upload="false"
                        :file-list="currentReport.files"
                        list-type="picture-card"
                      >
                        <el-icon><Plus /></el-icon>
                        <template #file="{ file }">
                          <div class="file-item">
                            <div class="file-actions-bar">
                              <el-icon class="file-delete" @click="handleFileRemove(file)">
                                <Delete />
                              </el-icon>
                            </div>
                            <div class="file-preview-wrap">
                              <img v-if="file.type && file.type.startsWith('image/')" :src="file.url" alt="" class="file-preview" />
                              <div v-else class="file-icon-placeholder">
                                <el-icon class="file-type-icon"><Document /></el-icon>
                                <span class="file-type-name">{{ file.name }}</span>
                              </div>
                            </div>
                          </div>
                        </template>
                      </el-upload>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-actions">
              <el-button type="primary" @click="submitReports" class="submit-btn">
                提交月报
              </el-button>
            </div>
          </div>
        </div>

        <!-- 历史月报 -->
        <div class="history-section" @click="navigateToHistory">
          <div class="history-card">
            <div class="history-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM8 16H16V14H8V16ZM8 12H16V10H8V12ZM8 8H16V6H8V8Z"/>
              </svg>
            </div>
            <h2 class="history-title">历史月报</h2>
            <p class="history-desc">查看所有员工一年内的月报记录</p>
            <div class="history-arrow">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Delete, Document, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getWeeklyReports, addWeeklyReport, getEmployees } from '../services/api'

const router = useRouter()

const uploadRef = ref<any>(null)

const handleBack = () => {
  // 返回上一�?
  router.back()
}

interface Report {
  id: number
  title: string
  content: string
  plan: string
  date: string
  files: any[]
  employeeName?: string
}

interface Employee {
  id: number
  name: string
  department: string
  position: string
  email: string
  phone: string
  entryDate: string
  createdAt: string
}

interface EmployeeReport {
  title: string
  content: string
  plan: string
  files: any[]
}

const employees = ref<Employee[]>([])
const reports = ref<Report[]>([])
const loading = ref(false)

// 月份选择相关
const selectedMonth = ref<string>('')

// 当前用户信息
const currentUser = ref<{
  id: number
  name: string
}>({
  id: 0,
  name: '当前用户'
})

// 当前用户角色
const currentUserRole = ref<string>(localStorage.getItem('role') || 'employee')

// 监听localStorage变化，实时更新角色信�?
window.addEventListener('storage', (event) => {
  if (event.key === 'role') {
    currentUserRole.value = event.newValue || 'employee'
  }
})

// 当前报告
const currentReport = ref<EmployeeReport>({
  title: '',
  content: '',
  plan: '',
  files: []
})

// 计算属性：可用的月份选项
const availableMonths = computed(() => {
  // 生成全年的月份选项
  const months = []
  const year = new Date().getFullYear()
  
  // 生成�?月到12月的选项
  for (let month = 1; month <= 12; month++) {
    const monthLabel = `${year}年${month}月`
    months.push({
      label: monthLabel,
      value: monthLabel
    })
  }
  
  return months
})

// 计算属性：是否为管理员
  const isAdmin = computed(() => {
    return currentUserRole.value === 'admin' || currentUserRole.value === '管理员'
  })

// 计算属性：是否为总经理
const isGeneralManager = computed(() => {
  return currentUserRole.value === 'general_manager' || currentUserRole.value === '总经理'
})

// 从API加载员工列表
const loadEmployees = async () => {
  loading.value = true
  try {
    const response = await getEmployees();
    if (response.success) {
      employees.value = response.data;
      
      // 找到当前登录用户对应的员工信�?
      const currentUsername = localStorage.getItem('username')
      if (currentUsername) {
        const userEmployee = employees.value.find(emp => emp.name === currentUsername)
        if (userEmployee) {
          currentUser.value = {
            id: userEmployee.id,
            name: userEmployee.name
          }
        }
      }
      
      // 获取用户角色
      const role = localStorage.getItem('role')
      if (role) {
        currentUserRole.value = role
      }
    } else {
      ElMessage.error('加载员工列表失败')
    }
  } catch (error) {
    console.error('加载员工列表失败:', error)
    ElMessage.error('加载员工列表失败')
  } finally {
    loading.value = false
  }
}

// 计算日期是当年的第几�?
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// 从API加载周报
const loadReports = async () => {
  loading.value = true
  try {
    // 调用API获取周报数据
    const response = await getWeeklyReports();
    if (response.success) {
      reports.value = (response.data as any[]).map(report => {
        // 优先使用 report.date（用户选择的月份），如果不存在则使�?createdAt 计算
        let date = report.date
        if (!date) {
          const reportDate = new Date(report.createdAt)
          const year = reportDate.getFullYear()
          const month = reportDate.getMonth() + 1
          date = `${year}年${month}月`
        }
        return {
          ...report,
          date: date,
          files: report.files || [],
          plan: report.plan || '' // 使用API返回的plan字段
        }
      }).reverse();
    } else {
      ElMessage.error('加载周报失败')
    }
  } catch (error) {
    console.error('加载周报失败:', error)
    ElMessage.error('加载周报失败')
  } finally {
    loading.value = false
  }
}

watch(selectedMonth, (newMonth) => {
  if (newMonth) {
    currentReport.value.title = newMonth
  }
})

// 组件挂载时加载数�?
onMounted(async () => {
  await loadEmployees()
  await loadReports()
})

const handleFileChange = (file: any) => {
  currentReport.value.files.push(file)
}

const handleFileRemove = (file: any) => {
  try {
    uploadRef.value?.handleRemove(file)
  } catch {
    const index = currentReport.value.files.findIndex(item => item.uid === file.uid)
    if (index !== -1) {
      currentReport.value.files.splice(index, 1)
    } else {
      const nameIndex = currentReport.value.files.findIndex(item => item.name === file.name)
      if (nameIndex !== -1) {
        currentReport.value.files.splice(nameIndex, 1)
      }
    }
  }
}

// 获取当前登录用户ID
const getCurrentUserId = (): number => {
  // 直接�?localStorage 获取 userId，因�?weeklyReports 表的 userId 字段引用的是 users 表的 id 字段
  const userIdStr = localStorage.getItem('userId')
  return userIdStr ? parseInt(userIdStr) : 0
}

const uploadFile = async (file: any): Promise<{name: string, url: string, type: string, size: number}> => {
  if (file.raw) {
    const formData = new FormData()
    formData.append('file', file.raw, encodeURIComponent(file.name))
    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await response.json()
    if (data.success && data.data.length > 0) {
      return {
        name: data.data[0].name,
        url: data.data[0].url,
        type: file.type || '',
        size: file.size || 0
      }
    }
  }
  return { name: file.name || '', url: file.url || '', type: file.type || '', size: file.size || 0 }
}

const submitReports = async () => {
  loading.value = true
  try {
    const currentUserId = getCurrentUserId()
    
    if (currentReport.value.title || currentReport.value.files.length > 0) {
      try {
        // 先上传所有文件到服务器，获取永久 URL
        const uploadPromises = currentReport.value.files.map(file => uploadFile(file))
        const processedFiles = await Promise.all(uploadPromises)
        
        console.log('提交月报数据:', {
          title: currentReport.value.title,
          files: processedFiles,
          userId: currentUserId,
          date: selectedMonth.value
        });
        
        const response = await addWeeklyReport({
          title: currentReport.value.title,
          content: '',
          plan: '',
          files: processedFiles,
          userId: currentUserId,
          date: selectedMonth.value
        });
        
        console.log('上传响应:', response);
        
        if (response.success) {
          await loadReports()
          currentReport.value = { title: '', content: '', plan: '', files: [] };
          selectedMonth.value = ''
          ElMessage.success('成功上传月报')
        } else {
          ElMessage.error('上传月报失败')
        }
      } catch (error) {
        console.error('上传月报失败:', error)
        ElMessage.error('上传月报失败')
      }
    } else {
      ElMessage.warning('没有需要上传的月报')
    }
  } catch (error) {
    console.error('上传月报失败:', error)
    ElMessage.error('上传月报失败')
  } finally {
    loading.value = false
  }
}

const navigateToHistory = () => {
  router.push('/monthly-report-history')
}
</script>

<style scoped>
.monthly-report-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

/* 顶部导航 */
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

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

/* 上传表单 */
.upload-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
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

.upload-table {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(100, 149, 237, 0.3);
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.table-wrapper {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.monthly-report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.monthly-report-table th,
.monthly-report-table td {
  padding: 1rem;
  text-align: left;
  border: 1px solid rgba(100, 149, 237, 0.3);
}

.monthly-report-table th {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  font-weight: 600;
  white-space: nowrap;
}

.monthly-report-table .table-label {
  background: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  width: 150px;
}

.month-selector {
  margin-bottom: 1.5rem;
}

.month-select {
  width: 200px;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.el-input__wrapper,
.el-textarea__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  width: 100% !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
}

.el-input__inner,
.el-textarea__inner {
  color: #333 !important;
  font-size: 14px;
}

.el-input__placeholder,
.el-textarea__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.upload-demo {
  margin-top: 0.5rem;
  width: 100%;
}

.file-item {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.file-actions-bar {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
  display: flex;
  gap: 4px;
}

.file-delete {
  color: #d32f2f;
  cursor: pointer;
  font-size: 18px;
  padding: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.file-delete:hover {
  background: #d32f2f;
  color: #fff;
}

.file-preview-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  text-align: center;
}

.file-type-icon {
  font-size: 48px;
  color: #6495ED;
}

.file-type-name {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.submit-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.75rem 2rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
  color: #fff !important;
}

.submit-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

/* 历史周报 */
.history-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
}

.history-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.5);
}

.history-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(100, 149, 237, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.history-section:hover::before {
  transform: translateX(100%);
}

.history-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.history-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.3);
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.history-section:hover .history-icon {
  transform: scale(1.1);
  box-shadow: 0 12px 35px rgba(100, 149, 237, 0.4);
}

.history-icon svg {
  width: 32px;
  height: 32px;
}

.history-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.history-desc {
  color: rgba(51, 51, 51, 0.7);
  font-size: 1rem;
  margin: 0 0 1.5rem 0;
  max-width: 400px;
}

.history-arrow {
  width: 40px;
  height: 40px;
  background: rgba(100, 149, 237, 0.2);
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6495ED;
  transition: all 0.3s ease;
}

.history-section:hover .history-arrow {
  background: rgba(100, 149, 237, 0.3);
  transform: translateX(5px);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.history-arrow svg {
  width: 20px;
  height: 20px;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
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
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.5);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}
</style>
