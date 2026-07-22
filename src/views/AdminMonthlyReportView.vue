<template>
  <div class="admin-monthly-report-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/system" class="nav-item">系统管理</router-link>
        <router-link to="/admin-monthly-report" class="nav-item active">管理员月�?/router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM8 16H16V14H8V16ZM8 12H16V10H8V12ZM8 8H16V6H8V8Z"/>
            </svg>
          </span>
          管理员月报管�?        </h2>

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

        <!-- 员工选择 -->
        <div class="employee-selector">
          <el-select v-model="selectedEmployee" placeholder="选择员工" class="employee-select">
            <el-option
              v-for="employee in employees"
              :key="employee.id"
              :label="employee.name"
              :value="employee.id"
            />
          </el-select>
        </div>

        <!-- 月报列表 -->
        <div class="history-section">
          <h3 class="section-subtitle">所有用户月�?/h3>
          <div class="history-list">
            <div v-for="report in filteredReports" :key="report.id" class="report-item">
              <div class="report-header">
                <h4 class="report-title">{{ report.title }}</h4>
                <div class="report-meta">
                  <span class="report-date">{{ report.date }}</span>
                  <span class="report-employee">{{ getEmployeeName(report.userId) }}</span>
                </div>
              </div>
              <!-- 显示附件 -->
              <div v-if="report.files && report.files.length > 0" class="report-files">
                <h5 class="files-title">附件:</h5>
                <div class="files-list">
                  <div v-for="(file, index) in report.files" :key="index" class="file-item">
                    <el-image
                      v-if="file.url && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif')"
                      :src="file.url"
                      class="file-preview"
                      fit="cover"
                      @click="previewFile(file)"
                      style="cursor: pointer"
                    />
                    <div v-else class="file-placeholder" @click="previewFile(file)">
                      <el-icon><Document /></el-icon>
                    </div>
                    <div class="file-actions">
                      <span class="file-name">{{ file.name }}</span>
                      <div class="file-buttons">
                        <el-button 
                          size="small" 
                          @click="previewFile(file)" 
                          class="view-btn"
                          :icon="View"
                        >
                          预览
                        </el-button>
                        <el-button 
                          size="small" 
                          @click="downloadFile(file)" 
                          class="download-btn"
                          :icon="Download"
                        >
                          下载
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="filteredReports.length === 0" class="empty-state">
              暂无月报数据
            </div>
          </div>
        </div>

        <!-- 预览对话�?-->
        <el-dialog
          v-model="previewVisible"
          :title="previewFileData.name"
          width="800px"
          class="preview-dialog"
        >
          <div class="preview-content">
            <!-- 图片预览 -->
            <el-image
              v-if="previewFileData.type && previewFileData.type.startsWith('image/')"
              :src="previewFileData.url"
              class="image-preview"
              fit="contain"
            />
            <!-- 文本预览 -->
            <div v-else-if="previewFileData.type && (previewFileData.type.startsWith('text/') || previewFileData.type === 'application/json' || previewFileData.type === 'application/xml')"
                 class="text-preview">
              <pre>{{ previewFileContent }}</pre>
            </div>
            <!-- PDF预览 -->
            <div v-else-if="previewFileData.type === 'application/pdf'" class="pdf-preview">
              <iframe :src="previewFileData.url" frameborder="0" width="100%" height="500px"></iframe>
            </div>
            <!-- 其他文件类型 -->
            <div v-else class="other-preview">
              <div class="file-icon">
                <el-icon><Document /></el-icon>
              </div>
              <p>该文件类型无法直接预�?/p>
              <el-button type="primary" @click="downloadFile(previewFileData)">
                下载文件
              </el-button>
            </div>
          </div>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="previewVisible = false">关闭</el-button>
            </span>
          </template>
        </el-dialog>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElImage } from 'element-plus'
import { Document, Download, View } from '@element-plus/icons-vue'
import { getMonthlyReports, getEmployees } from '../services/api'

const router = useRouter()

const handleBack = () => {
  // 返回系统管理页面
  router.push('/system')
}

interface Report {
  id: number
  title: string
  content: string
  plan: string
  date: string
  files: any[]
  employeeName?: string
  userId: number
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

const employees = ref<Employee[]>([])
const reports = ref<Report[]>([])
const selectedMonth = ref<string>('')
const selectedEmployee = ref<number>(0)
const loading = ref(false)

// 预览相关状�?const previewVisible = ref(false)
const previewFileData = ref({
  name: '',
  url: '',
  type: '',
  size: 0
})
const previewFileContent = ref('')

// 从API加载员工列表
const loadEmployees = async () => {
  loading.value = true
  try {
    const response = await getEmployees();
    if (response.success) {
      employees.value = response.data;
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

// 从API加载月报
const loadReports = async () => {
  loading.value = true
  try {
    // 调用API获取月报数据
    const response = await getMonthlyReports();
    if (response.success) {
      // 过滤出一年内的月�?      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      reports.value = (response.data as any[]).map(report => {
        // 优先使用 report.date（用户选择的月份），如果不存在则使�?createdAt 计算
        let date = report.date
        if (!date) {
          const reportDate = new Date(report.createdAt)
          const year = reportDate.getFullYear()
          const month = reportDate.getMonth() + 1
          date = `${year}�?{month}月`
        }
        return {
          ...report,
          date: date,
          files: report.files || [],
          plan: report.plan || ''
        }
      }).filter(report => {
        const reportDate = new Date(report.createdAt)
        return reportDate >= oneYearAgo
      }).reverse();
    } else {
      ElMessage.error('加载月报失败')
    }
  } catch (error) {
    console.error('加载月报失败:', error)
    ElMessage.error('加载月报失败')
  } finally {
    loading.value = false
  }
}

// 根据员工ID获取员工姓名
const getEmployeeName = (userId: number): string => {
  const employee = employees.value.find(emp => emp.id === userId)
  return employee ? employee.name : '未知用户'
}

// 计算属性：可用的月份选项
const availableMonths = computed(() => {
  // 从月报数据中提取所有不同的月份
  const months = new Set<string>()
  reports.value.forEach(report => {
    if (report.date) {
      months.add(report.date)
    }
  })
  
  // 转换为选项格式
  return Array.from(months).map(month => ({
    label: month,
    value: month
  })).sort((a, b) => {
    // 按月份排�?    return b.value.localeCompare(a.value)
  })
})

// 计算属性：根据选择的月份和员工过滤月报
const filteredReports = computed(() => {
  let result = reports.value
  
  // 如果选择了员工，按员工过�?  if (selectedEmployee.value) {
    result = result.filter(report => report.userId === selectedEmployee.value)
  }
  
  // 如果选择了月份，再按月份过滤
  if (selectedMonth.value) {
    result = result.filter(report => report.date === selectedMonth.value)
  }
  
  return result
})

// 下载文件
const downloadFile = (file: any) => {
  if (file.url) {
    try {
      // 检查是否是数据URL
      if (file.url.startsWith('data:')) {
        // 对于数据URL，直接使用fetch API处理
        try {
          // 使用fetch API获取数据
          fetch(file.url)
            .then(response => response.blob())
            .then(blob => {
              // 创建Blob URL
              const blobUrl = URL.createObjectURL(blob);
              
              // 创建下载链接
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = file.name;
              document.body.appendChild(link);
              
              // 点击下载
              link.click();
              
              // 5秒后撤销URL，给足够时间完成下载
              setTimeout(() => {
                try {
                  URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(link);
                } catch (e) {
                  console.error('清理下载链接失败:', e);
                }
                ElMessage.success('文件下载成功');
              }, 5000);
            })
            .catch(error => {
              console.error('处理文件数据失败:', error);
              ElMessage.error('文件数据处理失败，下载失�?);
            });
        } catch (fetchError) {
          console.error('下载文件失败:', fetchError);
          ElMessage.error('文件下载失败');
        }
      } else {
        // 对于普通URL
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        
        link.click();
        
        // 延迟移除链接
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch (e) {
            console.error('清理下载链接失败:', e);
          }
          ElMessage.success('文件下载成功');
        }, 2000);
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      ElMessage.error('文件下载失败');
    }
  } else {
    ElMessage.error('文件链接不存�?);
  }
}

// 预览附件
const previewFile = (file: any) => {
  if (file.url) {
    // 设置预览文件数据
    previewFileData.value = {
      name: file.name || '未知文件',
      url: file.url,
      type: file.type || '',
      size: file.size || 0
    };
    
    // 对于文本类型文件，尝试读取内�?    if (file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml')) {
      if (file.url.startsWith('data:')) {
        // 对于数据URL，解码并显示内容
        try {
          const [header, data] = file.url.split(',');
          const decodedData = atob(data);
          previewFileContent.value = decodedData;
        } catch (error) {
          console.error('读取文件内容失败:', error);
          previewFileContent.value = '无法读取文件内容';
        }
      } else {
        // 对于普通URL，尝试通过fetch获取内容
        fetch(file.url)
          .then(response => response.text())
          .then(content => {
            previewFileContent.value = content;
          })
          .catch(error => {
            console.error('读取文件内容失败:', error);
            previewFileContent.value = '无法读取文件内容';
          });
      }
    } else {
      // 非文本文件，清空内容
      previewFileContent.value = '';
    }
    
    // 显示预览对话�?    previewVisible.value = true;
  } else {
    ElMessage.error('文件链接不存�?);
  }
}

// 组件挂载时加载数�?onMounted(async () => {
  await loadEmployees()
  await loadReports()
})
</script>

<style scoped>
.admin-monthly-report-container {
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
  max-width: 500px;
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
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 标题 */
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

.section-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

/* 月份选择 */
.month-selector {
  margin-bottom: 1rem;
}

.month-select {
  width: 200px;
}

/* 员工选择 */
.employee-selector {
  margin-bottom: 1rem;
}

.employee-select {
  width: 200px;
}

/* 历史周报 */
.history-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.report-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #6495ED, #87CEEB);
}

.report-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.4);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.report-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.report-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.report-date {
  color: rgba(100, 149, 237, 0.8);
  font-size: 0.9rem;
  background: rgba(100, 149, 237, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.report-employee {
  color: rgba(51, 51, 51, 0.7);
  font-size: 0.9rem;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.report-content {
  color: rgba(51, 51, 51, 0.7);
  line-height: 1.5;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.report-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(100, 149, 237, 0.2);
}

/* 附件样式 */
.report-files {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(100, 149, 237, 0.2);
}

.files-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6495ED;
  margin-bottom: 0.5rem;
}

.files-list {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.files-list .file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  max-width: 120px;
}

.files-list .file-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.files-list .file-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.files-list .file-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.files-list .file-name {
  font-size: 0.8rem;
  color: rgba(51, 51, 51, 0.7);
  text-align: center;
  word-break: break-all;
  max-width: 100px;
}

.files-list .file-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.files-list .view-btn {
  background: rgba(16, 185, 129, 0.1) !important;
  color: #059669 !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  border-radius: 4px !important;
  font-size: 0.7rem !important;
  padding: 0.25rem 0.5rem !important;
  transition: all 0.3s ease !important;
}

.files-list .view-btn:hover {
  background: rgba(16, 185, 129, 0.2) !important;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important;
  transform: translateY(-1px) !important;
}

.files-list .download-btn {
  background: rgba(100, 149, 237, 0.1) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 4px !important;
  font-size: 0.7rem !important;
  padding: 0.25rem 0.5rem !important;
  transition: all 0.3s ease !important;
}

.files-list .download-btn:hover {
  background: rgba(100, 149, 237, 0.2) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
  transform: translateY(-1px) !important;
}

.files-list .file-placeholder {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  font-size: 24px;
  border-radius: 6px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  color: rgba(51, 51, 51, 0.5);
  padding: 3rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px dashed rgba(100, 149, 237, 0.3);
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

/* 选择器样�?*/
.el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
}

.el-select .el-input__inner {
  color: #333 !important;
}

.el-select .el-input__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.el-select-dropdown {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.el-select-dropdown__item {
  color: #333 !important;
}

.el-select-dropdown__item:hover {
  background: rgba(100, 149, 237, 0.1) !important;
}

.el-select-dropdown__item.selected {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
}

/* 预览对话框样�?*/
.preview-dialog .el-dialog__header {
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
}

.preview-dialog .el-dialog__title {
  color: #333;
  font-weight: 600;
}

.preview-dialog .el-dialog__body {
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  padding: 1.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.preview-dialog .el-dialog__footer {
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 1.5rem;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.image-preview {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.text-preview {
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.text-preview pre {
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333;
}

.pdf-preview {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.other-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
}

.other-preview .file-icon {
  font-size: 48px;
  color: #6495ED;
  margin-bottom: 1rem;
}

.other-preview p {
  color: rgba(51, 51, 51, 0.7);
  margin: 0;
}

/* 预览对话框滚动条样式 */
.preview-dialog .el-dialog__body::-webkit-scrollbar {
  width: 6px;
}

.preview-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 3px;
}

.preview-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.5);
  border-radius: 3px;
}

.preview-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}
</style>
