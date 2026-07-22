<template>
  <div class="project-detail-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/landing-project" class="nav-item">成交项目管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </span>
          项目详情
        </h2>

        <!-- 项目详情卡片 -->
        <div class="project-detail-card">
          <h3 class="project-detail-title">{{ project.name }}</h3>
          <div class="project-detail-content">
            <div class="detail-item">
              <span class="detail-label">项目描述:</span>
              <span class="detail-value">{{ project.description }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目状�?</span>
              <span class="detail-value">{{ project.status }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">开始日�?</span>
              <span class="detail-value">{{ project.startDate }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">成交时间:</span>
              <span class="detail-value">{{ project.dealTime }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目成交价格:</span>
              <span class="detail-value">{{ project.price }} 元</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">服务截止时间:</span>
              <span class="detail-value">{{ project.serviceEndTime }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">下一年服务费:</span>
              <span class="detail-value">{{ project.nextYearFeeStatus }}</span>
            </div>
          </div>
          <div class="project-actions">
            <el-button type="primary" @click="openEditDialog">
              <el-icon><Edit /></el-icon>
              编辑项目
            </el-button>
            <el-button type="danger" @click="deleteProject">
              <el-icon><Delete /></el-icon>
              删除项目
            </el-button>
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

    <!-- 编辑项目对话�?-->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑成交项目"
      width="500px"
      class="dialog"
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="项目名称">
          <el-input v-model="editForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="editForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="editForm.status" placeholder="请选择项目状态">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="editForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="成交时间">
          <el-date-picker
            v-model="editForm.dealTime"
            type="date"
            placeholder="选择成交时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="项目成交价格">
          <el-input v-model.number="editForm.price" type="number" placeholder="请输入项目成交价格" />
        </el-form-item>
        <el-form-item label="服务截止时间">
          <el-date-picker
            v-model="editForm.serviceEndTime"
            type="date"
            placeholder="选择服务截止时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="下一年服务费">
          <el-select v-model="editForm.nextYearFeeStatus" placeholder="请选择下一年服务费状态">
            <el-option label="未交" value="未交" />
            <el-option label="已交" value="已交" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateProject">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElDatePicker, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const handleBack = () => {
  // 返回上一�?  router.back()
}

// 项目数据
interface Project {
  id: number
  name: string
  description: string
  status: string
  startDate: string
  dealTime: string
  price: number
  serviceEndTime: string
  nextYearFeeStatus: string
}

// 项目详情
const project = ref<Project>({
  id: 0,
  name: '',
  description: '',
  status: '',
  startDate: '',
  dealTime: '',
  price: 0,
  serviceEndTime: '',
  nextYearFeeStatus: ''
})

// 编辑项目对话框
const editDialogVisible = ref(false)
const editForm = ref({
  id: 0,
  name: '',
  description: '',
  status: '进行中',
  startDate: null,
  dealTime: null,
  price: 0,
  serviceEndTime: null,
  nextYearFeeStatus: '未交'
})

function autoCalcFeeStatus(serviceEndTime) {
  if (!serviceEndTime) return '未交';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(serviceEndTime); end.setHours(0, 0, 0, 0);
  return end < today ? '未交' : '已交';
}

watch(() => editForm.value.serviceEndTime, (newVal) => {
  editForm.value.nextYearFeeStatus = autoCalcFeeStatus(newVal);
})

// 模拟项目数据
const mockProjects: Project[] = [
  {
    id: 1,
    name: '项目1',
    description: '这是一个成交项目的描述',
    status: '进行中',
    startDate: '2026-01-01',
    dealTime: '2025-12-15',
    price: 100000,
    serviceEndTime: '2026-12-31',
    nextYearFeeStatus: '未交'
  },
  {
    id: 2,
    name: '项目2',
    description: '这是另一个成交项目的描述',
    status: '已完成',
    startDate: '2025-12-01',
    dealTime: '2025-11-20',
    price: 150000,
    serviceEndTime: '2025-11-30',
    nextYearFeeStatus: '已交'
  }
]

// 加载项目详情
const loadProjectDetail = async () => {
  const id = Number(route.params.id)
  try {
    const response = await fetch(`/api/closing-projects/${id}`)
    const data = await response.json()
    if (data.success) {
      project.value = data.data
    } else {
      ElMessage.error('项目不存在')
      router.push('/landing-project')
    }
  } catch (error) {
    console.error('加载项目详情失败:', error)
    ElMessage.error('加载项目详情失败')
    router.push('/landing-project')
  }
}

const openEditDialog = () => {
  // 填充编辑表单
  editForm.value = {
    id: project.value.id,
    name: project.value.name,
    description: project.value.description,
    status: project.value.status,
    startDate: project.value.startDate,
    dealTime: project.value.dealTime,
    price: project.value.price,
    serviceEndTime: project.value.serviceEndTime,
    nextYearFeeStatus: project.value.nextYearFeeStatus
  }
  editDialogVisible.value = true
}

const updateProject = async () => {
  // 验证表单
  if (!editForm.value.name) {
    ElMessage.error('请输入项目名称')
    return
  }
  
  try {
    const response = await fetch(`/api/closing-projects/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editForm.value)
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('项目更新成功')
      editDialogVisible.value = false
      // 重新加载项目详情
      loadProjectDetail()
    } else {
      ElMessage.error('项目更新失败')
    }
  } catch (error) {
    console.error('更新项目失败:', error)
    ElMessage.error('更新项目失败')
  }
}

const deleteProject = async () => {
  ElMessageBox.confirm('确定要删除该项目吗？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const response = await fetch(`/api/closing-projects/${project.value.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        ElMessage.success('项目删除成功')
        router.push('/landing-project')
      } else {
        ElMessage.error('项目删除失败')
      }
    } catch (error) {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 组件挂载时加载项目详情
onMounted(() => {
  loadProjectDetail()
})
</script>

<style scoped>
.project-detail-container {
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
  padding: 2.5rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* 标题 */
.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
  animation: fadeInUp 0.6s ease-out;
}

.title-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4);
  transition: all 0.3s ease;
}

.title-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.5);
}

.title-icon svg {
  width: 24px;
  height: 24px;
}

/* 项目详情卡片 */
.project-detail-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.25);
  border-radius: 16px;
  padding: 2.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.project-detail-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED, #87CEEB);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 4s linear infinite;
  background-size: 300% 300%;
}

.project-detail-card:hover::before {
  opacity: 1;
}

.project-detail-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.35);
  border-color: rgba(100, 149, 237, 0.6);
}

.project-detail-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 2rem 0;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(100, 149, 237, 0.2);
}

.project-detail-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(248, 250, 252, 0.8);
  padding: 1.25rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.detail-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 4px 0 0 4px;
}

.detail-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2);
  background: rgba(240, 244, 255, 0.9);
}

.detail-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  color: rgba(44, 62, 80, 0.8);
  flex: 1;
  line-height: 1.6;
  font-size: 1.05rem;
  font-weight: 500;
}

.project-actions {
  display: flex;
  gap: 1.25rem;
  justify-content: flex-end;
  padding-top: 2rem;
  border-top: 1px solid rgba(100, 149, 237, 0.25);
}

/* 操作按钮样式 */
.project-actions .el-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.project-actions .el-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.project-actions .el-button:hover::before {
  left: 100%;
}

.project-actions .el-button[type="primary"] {
  background: linear-gradient(135deg, #4CAF50, #45a049) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}

.project-actions .el-button[type="primary"]:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(76, 175, 80, 0.4) !important;
}

.project-actions .el-button[type="danger"] {
  background: linear-gradient(135deg, #f44336, #d32f2f) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3) !important;
}

.project-actions .el-button[type="danger"]:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(244, 67, 54, 0.4) !important;
}

/* 页脚 */
.footer {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
  backdrop-filter: blur(15px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1.5rem 2rem;
  text-align: center;
  color: rgba(44, 62, 80, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -3px 15px rgba(0, 0, 0, 0.1);
  margin-top: 3rem;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.95rem;
}

/* 滚动条样�?*/
.main-content::-webkit-scrollbar {
  width: 10px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.8);
  border-radius: 5px;
}

.main-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 5px;
  transition: all 0.3s ease;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #4169E1, #6495ED);
  transform: scale(1.1);
}

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 对话框样�?*/
.dialog {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95)) !important;
  border: 1px solid rgba(100, 149, 237, 0.25) !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
  overflow: hidden !important;
}

.dialog .el-dialog__title {
  color: #2c3e50 !important;
  font-weight: 700 !important;
  font-size: 1.25rem !important;
  padding: 1.5rem 1.5rem 1rem !important;
}

.dialog .el-dialog__header {
  border-bottom: 1px solid rgba(100, 149, 237, 0.2) !important;
  padding: 0 !important;
}

.dialog .el-dialog__body {
  padding: 1.5rem !important;
}

.dialog .el-form-item {
  margin-bottom: 1.25rem !important;
}

.dialog .el-form-item__label {
  color: #2c3e50 !important;
  font-weight: 600 !important;
  font-size: 0.95rem !important;
}

.dialog .el-input__wrapper,
.dialog .el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s ease !important;
}

.dialog .el-input__wrapper:hover,
.dialog .el-select .el-input__wrapper:hover {
  border-color: rgba(100, 149, 237, 0.6) !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2) !important;
}

.dialog .el-input__inner,
.dialog .el-select .el-input__inner {
  color: #2c3e50 !important;
  font-size: 1rem !important;
}

.dialog .el-input__placeholder,
.dialog .el-select .el-input__placeholder {
  color: rgba(44, 62, 80, 0.4) !important;
}

.dialog .el-date-picker {
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
}

.dialog .el-date-picker__header-label {
  color: #2c3e50 !important;
  font-weight: 600 !important;
}

.dialog .el-date-picker__header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9)) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.dialog .el-date-picker__body {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9)) !important;
}

.dialog .el-date-table th {
  color: rgba(44, 62, 80, 0.7) !important;
  font-weight: 600 !important;
}

.dialog .el-date-table td {
  color: #2c3e50 !important;
  font-weight: 500 !important;
}

.dialog .el-date-table td.available:hover {
  background: rgba(100, 149, 237, 0.2) !important;
}

.dialog .el-date-table td.today {
  color: #4169E1 !important;
  font-weight: 600 !important;
}

.dialog .el-date-table td.in-range div {
  background: rgba(100, 149, 237, 0.2) !important;
}

.dialog .el-date-table td.start-date div,
.dialog .el-date-table td.end-date div {
  background: linear-gradient(135deg, #6495ED, #4169E1) !important;
  color: white !important;
}

.dialog .dialog-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem 1.5rem !important;
  border-top: 1px solid rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button {
  padding: 0.6rem 1.5rem !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
  position: relative;
  overflow: hidden;
}

.dialog .dialog-footer .el-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.dialog .dialog-footer .el-button:hover::before {
  left: 100%;
}

.dialog .dialog-footer .el-button:not(.el-button--primary) {
  background: rgba(248, 250, 252, 0.9) !important;
  color: #2c3e50 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.dialog .dialog-footer .el-button:not(.el-button--primary):hover {
  background: rgba(240, 244, 255, 0.9) !important;
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(135deg, #6495ED, #4169E1) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.3) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  box-shadow: 0 6px 18px rgba(100, 149, 237, 0.4) !important;
  transform: translateY(-2px);
}

/* 响应式设�?*/
@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .title-icon {
    width: 40px;
    height: 40px;
  }
  
  .title-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .project-detail-card {
    padding: 1.75rem;
  }
  
  .project-detail-title {
    font-size: 1.5rem;
  }
  
  .project-detail-content {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .detail-item {
    padding: 1rem;
  }
  
  .project-actions {
    flex-direction: column;
  }
  
  .project-actions .el-button {
    width: 100%;
    justify-content: center;
  }
  
  .dialog {
    width: 95% !important;
    margin: 20px auto !important;
  }
  
  .dialog .el-dialog__title {
    font-size: 1.1rem !important;
  }
  
  .dialog .el-dialog__body {
    padding: 1.25rem !important;
  }
  
  .dialog .dialog-footer {
    flex-direction: column;
  }
  
  .dialog .dialog-footer .el-button {
    width: 100%;
  }
}

.dialog .dialog-footer .el-button:hover {
  background: rgba(100, 149, 237, 0.1) !important;
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  color: #fff !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}
</style>
