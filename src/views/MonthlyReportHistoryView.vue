<template>
  <div class="monthly-report-history-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/monthly-report" class="nav-item">月报</router-link>
        <router-link to="/monthly-report-history" class="nav-item active">历史月报</router-link>
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
          历史月报详情
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

        <!-- 员工选择（仅管理员和总经理可见） -->
        <div class="employee-selector">
          <el-select v-if="isAdmin || isGeneralManager" v-model="selectedEmployee" placeholder="选择员工" class="employee-select">
            <el-option label="全部" value="0" />
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
          <h3 class="section-subtitle">{{ isAdmin || isGeneralManager ? '所有用户月报' : '我的历史月报' }}</h3>
          <div class="history-list">
            <template v-if="Object.keys(groupedReports).length > 0">
              <div v-for="(reports, title) in groupedReports" :key="title" class="month-group">
                <div class="month-group-title">{{ title }}</div>
                <div v-for="report in reports" :key="report.id" class="report-item">
                  <div class="report-meta-group">
                    <span class="report-date-label">{{ report.date || '' }}</span>
                    <span v-if="isAdmin || isGeneralManager" class="report-employee">{{ getEmployeeName(report.userId) }}</span>
                    <span class="report-time">{{ report.createdAt || '' }}</span>
                  </div>
                  <div v-if="report.content" class="report-content">{{ report.content }}</div>
                  <div v-if="report.plan" class="report-plan">计划: {{ report.plan }}</div>
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
                              v-if="canPreview(file)"
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
                            <el-button
                              v-if="isCurrentUserReport(report) || isAdmin || isGeneralManager"
                              size="small"
                              @click="removeFileFromReport(report, file)"
                              class="remove-btn"
                              :icon="Delete"
                            >
                              撤回
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="report-footer">
                    <div v-if="isCurrentUserReport(report)" class="report-actions">
                      <el-button size="small" @click="editReport(report)" class="edit-btn">
                        编辑
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="empty-state">
              暂无月报数据
            </div>
          </div>
        </div>

        <!-- 编辑对话�?-->
        <el-dialog
          v-model="dialogVisible"
          title="编辑月报"
          width="600px"
          class="edit-dialog"
        >
          <el-form :model="editForm" label-position="top">
            <el-form-item label="月报标题">
              <el-input v-model="editForm.title" placeholder="请输入标题" />
            </el-form-item>
            <el-form-item label="本月内容">
              <el-input v-model="editForm.content" type="textarea" :rows="3" placeholder="请输入本月工作内容" />
            </el-form-item>
            <el-form-item label="下月计划">
              <el-input v-model="editForm.plan" type="textarea" :rows="3" placeholder="请输入下月工作计划" />
            </el-form-item>
            <el-form-item label="上传附件">
              <el-upload
                ref="editUploadRef"
                class="upload-demo"
                action="#"
                :on-change="handleFileChange"
                :auto-upload="false"
                :file-list="editForm.files"
                list-type="picture-card"
                :on-remove="handleFileRemove"
              >
                <el-icon><Plus /></el-icon>
                <template #file="{ file }">
                  <div class="file-item">
                    <div class="file-actions-bar">
                      <el-icon class="file-delete" @click.stop="handleFileRemove(file)">
                        <Delete />
                      </el-icon>
                    </div>
                    <div class="file-preview-wrap">
                      <img v-if="file.url && file.type && file.type.startsWith('image/')" :src="file.url" alt="" class="file-preview" />
                      <div v-else class="file-icon-placeholder">
                        <el-icon class="file-type-icon"><Document /></el-icon>
                        <span class="file-type-name">{{ file.name }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="dialogVisible = false">取消</el-button>
              <el-button type="primary" @click="saveEdit">保存</el-button>
            </span>
          </template>
        </el-dialog>

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
            <!-- Word文档预览（doc/docx） -->
            <div v-else-if="previewDocContent !== ''" class="doc-preview">
              <div class="doc-toolbar">
                <span class="doc-name">{{ previewFileData.name }}</span>
                <el-button size="small" @click="downloadFile(previewFileData)" :icon="Download">下载</el-button>
              </div>
              <div class="doc-content" v-html="previewDocContent"></div>
            </div>
            <!-- 其他文件类型 -->
            <div v-else class="other-preview">
              <div class="file-icon">
                <el-icon><Document /></el-icon>
              </div>
              <p>该文件类型无法直接预览，请下载后查看</p>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElImage } from 'element-plus'
import { Plus, Delete, Document, Download, View } from '@element-plus/icons-vue'
import { getMonthlyReports, getEmployees, updateMonthlyReport } from '../services/api'
import * as mammoth from 'mammoth'

const router = useRouter()
const editUploadRef = ref<any>(null)

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
const loading = ref(false)

// 当前用户角色
const currentUserRole = ref<string>(localStorage.getItem('role') || 'employee')
// localStorage�?
const localStorageRole = ref<string>(localStorage.getItem('role') || '')
const localStorageUsername = ref<string>(localStorage.getItem('username') || '')

// 监听localStorage变化，实时更新角色信�?
window.addEventListener('storage', (event) => {
  if (event.key === 'role') {
    currentUserRole.value = event.newValue || 'employee'
    localStorageRole.value = event.newValue || ''
  }
  if (event.key === 'username') {
    localStorageUsername.value = event.newValue || ''
  }
})

// 员工选择
const selectedEmployee = ref<number>(0)

// 计算属性：是否为管理员
const isAdmin = computed(() => {
    return currentUserRole.value === 'admin' || currentUserRole.value === '管理员'
  })

// 计算属性：是否为总经理
const isGeneralManager = computed(() => {
  // 检查多种可能的总经理角色值
  return currentUserRole.value === 'general_manager' || currentUserRole.value === '总经理'
})

// 编辑相关状态
const dialogVisible = ref(false)
const editForm = ref<{
  id: number
  title: string
  content: string
  plan: string
  files: any[]
  userId: number
  date: string
}>({
  id: 0,
  title: '',
  content: '',
  plan: '',
  files: [],
  userId: 0,
  date: ''
})

// 预览相关状�?
const previewVisible = ref(false)
const previewFileData = ref<any>({ name: '', url: '', type: '', size: 0 })
const previewFileContent = ref('')
const previewDocContent = ref('')

// 处理文件添加
const handleFileChange = (file: any) => {
  editForm.value.files.push(file)
}

// 处理文件删除
const handleFileRemove = (file: any) => {
  try {
    editUploadRef.value?.handleRemove(file)
  } catch {
    const index = editForm.value.files.findIndex(item => item.uid === file.uid)
    if (index !== -1) {
      editForm.value.files.splice(index, 1)
    } else {
      const nameIndex = editForm.value.files.findIndex(item => item.name === file.name)
      if (nameIndex !== -1) {
        editForm.value.files.splice(nameIndex, 1)
      }
    }
  }
}

// 获取当前登录用户ID（这里假设从localStorage获取，实际项目中可能需要从状态管理或API获取�?
const getCurrentUserId = (): number => {
  // 这里假设用户ID存储在localStorage中，实际项目中可能需要调�?
  const userIdStr = localStorage.getItem('userId')
  return userIdStr ? parseInt(userIdStr) : 0
}

// 判断是否是当前用户的月报
const isCurrentUserReport = (report: Report): boolean => {
  return report.userId === getCurrentUserId()
}

// 从月报中撤回附件
const removeFileFromReport = async (report: Report, file: any) => {
  ElMessageBox.confirm(`确定要撤回附件"${file.name}"吗？`, '确认撤回', {
    type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消'
  }).then(async () => {
    const newFiles = (report.files || []).filter((f: any) => f.name !== file.name)
    if (newFiles.length === report.files.length) return
    try {
      const response = await updateMonthlyReport({
        id: report.id,
        title: report.title,
        content: report.content || '',
        plan: report.plan || '',
        files: newFiles,
        userId: report.userId,
        date: report.date
      })
      if (response.success) {
        ElMessage.success('附件已撤回')
        await loadReports()
      } else {
        ElMessage.error('撤回失败')
      }
    } catch (error) {
      console.error('撤回附件失败:', error)
      ElMessage.error('撤回失败')
    }
  }).catch(() => {})
}

// 根据用户ID获取用户姓名
const getEmployeeName = (userId: number): string => {
  // 首先尝试从员工表中查�?
  const employee = employees.value.find(emp => emp.id === userId)
  if (employee) {
    return employee.name
  }
  
  // 如果员工表中没有找到，尝试从用户表中查找
  // 这里假设用户表中的用户ID与周报表中的userId对应
  // 由于我们没有直接获取用户表数据，我们可以尝试从用户名中提取姓名
  // 例如，对于用户名"emp_潘伟_1773649916318"，提取"潘伟"
  const users = [
    { id: 1, name: 'admin' },
    { id: 6, name: '潘伟' },
    { id: 10, name: '陈东' },
    { id: 12, name: '李志' },
    { id: 25, name: '总经理' },
    { id: 32, name: '娜慕' },
    { id: 41, name: '潘伟' },
    { id: 49, name: '财务总监' }
  ]
  
  const user = users.find(u => u.id === userId)
  if (user) {
    return user.name
  }
  
  return '未知用户'
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
  const options = Array.from(months).map(month => ({
    label: month,
    value: month
  })).sort((a, b) => {
    // 按月份排�?
    return b.value.localeCompare(a.value)
  })
  
  // 添加"全部"选项
  options.unshift({ label: '全部', value: '' })
  
  return options
})

// 计算属性：根据选择的月份和员工过滤月报
const filteredReports = computed(() => {
  let result = reports.value
  
  console.log('Total reports:', reports.value.length)
  console.log('isAdmin:', isAdmin.value)
  console.log('isGeneralManager:', isGeneralManager.value)
  
  // 非管理员和非总经理只能查看自己的月报
  if (!isAdmin.value && !isGeneralManager.value) {
    const currentUserId = getCurrentUserId()
    console.log('Current user ID:', currentUserId)
    result = result.filter(report => report.userId === currentUserId)
    console.log('Filtered reports for non-admin/non-manager:', result.length)
  } else if (isAdmin.value || isGeneralManager.value) {
    // 管理员和总经理可以查看所有用户的月报
    console.log('Admin/Manager viewing all reports')
    // 如果选择了员工，按员工筛�?
    if (selectedEmployee.value && selectedEmployee.value !== 0) {
      console.log('Selected employee ID:', selectedEmployee.value)
      // 找到选择的员�?
      const selectedEmp = employees.value.find(emp => emp.id === selectedEmployee.value)
      if (selectedEmp) {
        console.log('Selected employee name:', selectedEmp.name)
        // 根据员工姓名过滤报告
        result = result.filter(report => {
          const employeeName = getEmployeeName(report.userId)
          return employeeName === selectedEmp.name
        })
        console.log('Filtered reports by employee:', result.length)
      }
    }
  }
  
  // 如果选择了月份，再按月份过滤
  if (selectedMonth.value) {
    console.log('Selected month:', selectedMonth.value)
    result = result.filter(report => report.date === selectedMonth.value)
    console.log('Filtered reports by month:', result.length)
  }
  
  console.log('Final filtered reports:', result.length)
  return result
})

// 按标题分组月报
const groupedReports = ref<{ [title: string]: any[] }>({})

watch(filteredReports, (list) => {
  const groups: { [title: string]: any[] } = {}
  list.forEach(report => {
    const t = report.title || '未命名'
    if (!groups[t]) groups[t] = []
    groups[t].push(report)
  })
  groupedReports.value = groups
}, { immediate: true, deep: true })

// 从API加载员工列表
const loadEmployees = async () => {
  loading.value = true
  try {
    const response = await getEmployees();
    if (response.success) {
      employees.value = response.data;
      
      // 获取用户角色
      const role = localStorage.getItem('role')
      console.log('Current user role:', role)
      if (role) {
        currentUserRole.value = role
      }
      console.log('isAdmin:', isAdmin.value)
      console.log('isGeneralManager:', isGeneralManager.value)
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

// 从API加载月报
const loadReports = async () => {
  loading.value = true
  try {
    // 调用API获取月报数据
    const response = await getMonthlyReports();
    if (response.success) {
      // 过滤出一年内的月�?
      const oneYearAgo = new Date()
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
          plan: report.plan || '' // 使用API返回的plan字段
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

// 编辑月报
const editReport = (report: Report) => {
  // 确保文件数据格式符合Element Plus上传组件的要�?
  const formattedFiles = (report.files || []).map((file, index) => ({
    ...file,
    uid: file.uid || `file_${index}_${Date.now()}`,
    status: 'success'
  }))
  
  editForm.value = {
    id: report.id,
    title: report.title,
    content: report.content || '',
    plan: report.plan || '',
    files: formattedFiles,
    userId: report.userId,
    date: report.date
  }
  console.log('编辑表单文件数据:', editForm.value.files)
  dialogVisible.value = true
}

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
              ElMessage.error('文件数据处理失败，下载失败');
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
    ElMessage.error('文件链接不存在');
  }
}

// 判断文件类型是否可预览
const canPreview = (file: any): boolean => {
  const type = file.type || '';
  const name = file.name || '';
  return type.startsWith('image/') || type.startsWith('text/') ||
    type === 'application/pdf' || type === 'application/json' || type === 'application/xml' ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.doc') || name.endsWith('.docx');
}

// 预览附件
const previewFile = async (file: any) => {
  if (!file.url) {
    ElMessage.error('文件链接不存在');
    return;
  }
  if (!canPreview(file)) {
    downloadFile(file);
    return;
  }
  // 设置预览文件数据
  previewFileData.value = {
    name: file.name || '未知文件',
    url: file.url,
    type: file.type || '',
    size: file.size || 0
  };
  previewDocContent.value = '';

  const name = file.name || '';
  const isDoc = name.endsWith('.doc') || name.endsWith('.docx') ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (isDoc) {
    try {
      const response = await fetch(file.url);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      previewDocContent.value = result.value;
    } catch (error) {
      console.error('文档预览失败:', error);
      previewDocContent.value = '<p style="color:#999">文档预览失败，请下载后查看</p>';
    }
  } else if (file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml')) {
    if (file.url.startsWith('data:')) {
      try {
        const [header, data] = file.url.split(',');
        const decodedData = atob(data);
        previewFileContent.value = decodedData;
      } catch (error) {
        console.error('读取文件内容失败:', error);
        previewFileContent.value = '无法读取文件内容';
      }
    } else {
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
    previewFileContent.value = '';
  }

  previewVisible.value = true;
}

// 保存编辑
const saveEdit = async () => {
  loading.value = true
  try {
    // 将新增的文件（有raw属性的）上传到服务器
    const uploadPromises = editForm.value.files.map(async (file: any) => {
      if (file.raw) {
        const formData = new FormData()
        formData.append('file', file.raw, encodeURIComponent(file.name))
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          return { ...file, name: data.data[0].name, url: data.data[0].url }
        }
      }
      return file
    })
    const uploadedFiles = await Promise.all(uploadPromises)

    const updateData = {
      id: editForm.value.id,
      title: editForm.value.title,
      content: editForm.value.content,
      plan: editForm.value.plan,
      files: uploadedFiles,
      userId: editForm.value.userId,
      date: editForm.value.date
    }
    const response = await updateMonthlyReport(updateData)
    if (response.success) {
      ElMessage.success('月报编辑成功')
      dialogVisible.value = false
      await loadReports()
    } else {
      ElMessage.error('月报编辑失败')
    }
  } catch (error) {
    console.error('编辑月报失败:', error)
    ElMessage.error('编辑月报失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数�?
onMounted(async () => {
  console.log('localStorage.role:', localStorage.getItem('role'));
  console.log('localStorage.user:', localStorage.getItem('user'));
  console.log('localStorage.username:', localStorage.getItem('username'));
  await loadEmployees()
  await loadReports()
})
</script>

<style scoped>
.monthly-report-history-container {
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
.month-selector,
.employee-selector {
  margin-bottom: 1rem;
}

.month-select,
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

.report-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.report-employee {
  color: rgba(51, 51, 51, 0.7);
  font-size: 0.9rem;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.report-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.report-date {
  color: rgba(100, 149, 237, 0.8);
  font-size: 0.9rem;
  background: rgba(100, 149, 237, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.report-meta-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: #999;
}

.report-time {
  color: #bbb;
  font-size: 0.75rem;
}

.report-date-label {
  color: #6495ED;
  font-size: 0.75rem;
  background: rgba(100, 149, 237, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
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

/* 月份分组样式 */
.month-group {
  margin-bottom: 0.5rem;
}

.month-group-title {
  font-size: 1rem;
  font-weight: 700;
  color: #6495ED;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid rgba(100, 149, 237, 0.3);
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
  width: 140px;
  flex-shrink: 0;
}

.files-list .file-preview {
  width: 140px;
  height: 100px;
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

.files-list .file-placeholder {
  width: 140px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  font-size: 32px;
  border-radius: 6px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.files-list .file-placeholder:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.files-list .file-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.files-list .file-name {
  font-size: 0.75rem;
  color: rgba(51, 51, 51, 0.7);
  text-align: center;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 140px;
  line-height: 1.2;
}

.files-list .file-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  justify-content: center;
  max-width: 140px;
}

.files-list .view-btn {
  background: rgba(16, 185, 129, 0.1) !important;
  color: #059669 !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  border-radius: 4px !important;
  font-size: 0.65rem !important;
  padding: 0.2rem 0.35rem !important;
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
  font-size: 0.65rem !important;
  padding: 0.2rem 0.35rem !important;
  transition: all 0.3s ease !important;
}

.files-list .download-btn:hover {
  background: rgba(100, 149, 237, 0.2) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
  transform: translateY(-1px) !important;
}

.files-list .remove-btn {
  background: rgba(211, 47, 47, 0.1) !important;
  color: #d32f2f !important;
  border: 1px solid rgba(211, 47, 47, 0.3) !important;
  border-radius: 4px !important;
  font-size: 0.65rem !important;
  padding: 0.2rem 0.35rem !important;
  transition: all 0.3s ease !important;
}

.files-list .remove-btn:hover {
  background: rgba(211, 47, 47, 0.2) !important;
  box-shadow: 0 0 10px rgba(211, 47, 47, 0.3) !important;
  transform: translateY(-1px) !important;
}

/* 编辑对话框中的文件上传样式 */
.edit-dialog .upload-demo {
  margin-top: 0.5rem;
  width: 100%;
}

.edit-dialog .file-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.edit-dialog .file-actions-bar {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.edit-dialog .file-delete {
  color: #d32f2f;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.edit-dialog .file-delete:hover {
  background: #d32f2f;
  color: #fff;
}

.edit-dialog .file-preview-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-dialog .file-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-dialog .file-icon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  text-align: center;
}

.edit-dialog .file-type-icon {
  font-size: 36px;
  color: #6495ED;
}

.edit-dialog .file-type-name {
  font-size: 11px;
  color: #666;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.edit-dialog .file-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  font-size: 24px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.edit-dialog .file-placeholder el-icon {
  font-size: 32px;
}

.report-plan {
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  flex: 1;
}

.report-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn {
  background: rgba(100, 149, 237, 0.1) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.edit-btn:hover {
  background: rgba(100, 149, 237, 0.2) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
}

/* 编辑对话�?*/
.edit-dialog .el-dialog__header {
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
}

.edit-dialog .el-dialog__title {
  color: #333;
  font-weight: 600;
}

.edit-dialog .el-dialog__body {
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  padding: 1.5rem;
}

.edit-dialog .el-dialog__footer {
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 1.5rem;
}

.edit-dialog .el-form-item__label {
  color: rgba(51, 51, 51, 0.8);
  font-weight: 500;
}

.edit-dialog .el-input__wrapper,
.edit-dialog .el-textarea__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
}

.edit-dialog .el-input__inner,
.edit-dialog .el-textarea__inner {
  color: #333 !important;
}

.edit-dialog .el-input__placeholder,
.edit-dialog .el-textarea__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.edit-dialog .el-button {
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.edit-dialog .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  color: #fff !important;
}

.edit-dialog .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

.edit-dialog .el-button--default {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #333 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.edit-dialog .el-button--default:hover {
  background: rgba(100, 149, 237, 0.1) !important;
  border-color: rgba(100, 149, 237, 0.4) !important;
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

.preview-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.preview-fallback p {
  color: rgba(51, 51, 51, 0.6);
  margin: 0;
  font-size: 0.9rem;
}

.doc-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.doc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.doc-name {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.doc-content {
  padding: 1rem;
  max-height: 500px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  line-height: 1.8;
}

.doc-content img {
  max-width: 100%;
}

.doc-content table {
  border-collapse: collapse;
  width: 100%;
}

.doc-content table, .doc-content th, .doc-content td {
  border: 1px solid #ccc;
  padding: 6px;
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
