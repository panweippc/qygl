﻿<template>
  <div class="project-category-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/project-category" class="nav-item active">产品分类</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 产品分类管理 -->
        <div class="category-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </span>
              产品分类
            </h2>
            <el-button type="primary" @click="openAddCategoryDialog" class="add-btn">
              添加分类
            </el-button>
          </div>

          <!-- 分类列表 -->
          <div class="category-grid">
            <div
              v-for="category in categories"
              :key="category.id"
              class="category-card"
            >
              <div class="category-header">
                <h3 class="category-name">{{ category.name }}</h3>
                <div class="category-actions">
                  <el-button size="small" @click="editCategory(category)" class="action-btn">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button size="small" @click="deleteCategory(category.id)" class="action-btn delete">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <div class="category-info">
                <div class="category-stats">
                  <span class="stat-item">项目数 {{ category.projectCount }}</span>
                  <span class="stat-item">负责人 {{ category.manager }}</span>
                </div>
              </div>
              <div class="category-projects">
                <h4 class="projects-title">相关项目</h4>
                <div class="project-slider">
                  <ul class="project-list">
                    <li v-for="project in category.projects" :key="project.id" class="project-item">
                    <div class="project-content">
                      <div class="project-name">{{ project.project_name }}</div>
                      <div class="project-description">{{ project.description }}</div>
                      <div v-if="project.project_link" class="project-link">
                        <a :href="project.project_link" target="_blank" rel="noopener noreferrer" class="link-btn">
                          <el-icon><Link /></el-icon>
                          {{ project.project_link }}
                        </a>
                      </div>
                    </div>
                    <div class="project-actions">
                      <el-button size="small" @click="editProject(project)" class="action-btn">
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button size="small" @click="handleDeleteProject(project)" class="action-btn delete">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </li>
                  </ul>
                </div>
              </div>
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

    <!-- 添加分类对话�?-->
    <el-dialog
      v-model="addDialogVisible"
      title="添加分类"
      width="500px"
      class="dialog"
    >
      <el-form :model="categoryForm" label-position="top">
        <el-form-item label="分类名称">
          <el-select v-model="categoryForm.name" placeholder="请选择分类名称" style="width:100%">
            <el-option label="研发项目" value="研发项目" />
            <el-option label="市场项目" value="市场项目" />
            <el-option label="运营项目" value="运营项目" />
            <el-option label="基建项目" value="基建项目" />
            <el-option label="其他项目" value="其他项目" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请人">
          <el-select v-model="categoryForm.applicantId" placeholder="请选择申请人" style="width:100%">
            <el-option v-for="emp in allEmployees" :key="emp.id" :label="emp.name" :value="emp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目数">
          <el-input v-model.number="categoryForm.projectCount" type="number" placeholder="请输入项目数" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addCategory">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑分类对话�?-->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑分类"
      width="500px"
      class="dialog"
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="分类名称">
          <el-select v-model="editForm.name" placeholder="请选择分类名称" style="width:100%">
            <el-option label="研发项目" value="研发项目" />
            <el-option label="市场项目" value="市场项目" />
            <el-option label="运营项目" value="运营项目" />
            <el-option label="基建项目" value="基建项目" />
            <el-option label="其他项目" value="其他项目" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="editForm.manager" placeholder="请选择负责人" style="width:100%">
            <el-option v-for="emp in allEmployees" :key="emp.id" :label="emp.name" :value="emp.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目数">
          <el-input :model-value="editForm.projectCount" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateCategory">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑项目对话�?-->
    <el-dialog
      v-model="editProjectDialogVisible"
      title="编辑项目"
      width="500px"
      class="dialog"
    >
      <el-form :model="editProjectForm" label-position="top">
        <el-form-item label="项目名称">
          <el-input v-model="editProjectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="editProjectForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="项目链接">
          <el-input v-model="editProjectForm.link" placeholder="请输入项目链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editProjectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateProject">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Edit, Delete, Link } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, addProjectApplication, deleteProject, deleteProjectCategory, updateProjectCategory, updateProjectDetail, updateProjectManager, getEmployees } from '../services/api'

const router = useRouter()

const handleBack = () => {
  router.back()
}

interface Project {
  id: number
  project_name: string
  project_type: string
  description: string
  applicant_name: string
  created_at: string
  project_link?: string
}

interface Category {
  id: number
  name: string
  description: string
  manager: string
  projectCount: number
  projects: Project[]
}

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const categories = ref<Category[]>([])
const loading = ref(false)
const allEmployees = ref<any[]>([])

const categoryForm = ref({
  name: '',
  applicantId: 0,
  projectCount: 1
})

const editForm = ref({
  id: 0,
  name: '',
  originalName: '',
  description: '',
  manager: '',
  projectCount: 0
})

const editProjectDialogVisible = ref(false)
const editProjectForm = ref({
  id: 0,
  name: '',
  description: '',
  link: ''
})

const loadCategories = async () => {
  loading.value = true
  try {
    const response = await getProjects();
    if (!response.success || !response.data?.list) {
      ElMessage.error('加载产品分类数据失败')
      return
    }
    
    const projects = response.data.list as Project[];
    const categoryMap = new Map<string, Category>()
    
    projects.forEach(project => {
      if (!categoryMap.has(project.project_type)) {
        categoryMap.set(project.project_type, {
          id: categoryMap.size + 1,
          name: project.project_type,
          description: project.description,
          manager: project.applicant_name,
          projectCount: 0,
          projects: []
        })
      }
      
      const category = categoryMap.get(project.project_type)!
      category.projects.push(project)
      category.projectCount = category.projects.length
      if (!category.manager && project.applicant_name) {
        category.manager = project.applicant_name
      }
    })
      
    categories.value = Array.from(categoryMap.values()).sort((a, b) => {
      const dateA = a.projects.length > 0 ? new Date(a.projects[0].created_at).getTime() : 0
      const dateB = b.projects.length > 0 ? new Date(b.projects[0].created_at).getTime() : 0
      return dateA - dateB
    })
  } catch (error) {
    console.error('加载产品分类数据失败:', error)
    ElMessage.error('加载产品分类数据失败')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const res = await getEmployees()
    if (res.success) allEmployees.value = res.data
  } catch { /* ignore */ }
}

// 组件挂载时加载数据
onMounted(async () => {
  await Promise.all([loadCategories(), loadEmployees()])
})

const openAddCategoryDialog = () => {
  const currentUserId = parseInt(localStorage.getItem('userId') || '0')
  categoryForm.value = {
    name: '',
    applicantId: currentUserId,
    projectCount: 1
  }
  addDialogVisible.value = true
}

const addCategory = async () => {
  if (!categoryForm.value.name) {
    ElMessage.warning('请选择分类名称')
    return
  }
  if (!categoryForm.value.applicantId) {
    ElMessage.warning('请选择申请人')
    return
  }
  loading.value = true
  try {
    const projectCount = categoryForm.value.projectCount || 0;
    
    for (let i = 0; i < projectCount; i++) {
      const response = await addProjectApplication({
        projectName: `项目${i + 1}`,
        projectType: categoryForm.value.name,
        priority: '高',
        budget: 1000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `项目${i + 1}的详细描述`,
        objectives: `项目${i + 1}的目标`,
        teamMembers: [30, 31],
        resources: '资源描述',
        applicantId: String(categoryForm.value.applicantId)
      });
      
      if (!response.success) {
        ElMessage.error(`添加产品分类失败: ${response.message || '未知错误'}`)
        return;
      }
    }
    
    await loadCategories()
    addDialogVisible.value = false
    ElMessage.success('产品分类添加成功')
  } catch (error: any) {
    console.error('添加产品分类失败:', error)
    ElMessage.error(`添加产品分类失败: ${error.message || '网络错误'}`)
  } finally {
    loading.value = false
  }
}

const editCategory = (category: Category) => {
  // 填充编辑表单
  editForm.value = {
    id: category.id,
    name: category.name,
    originalName: category.name,
    description: category.description,
    manager: category.manager,
    projectCount: category.projectCount
  }
  // 打开编辑对话�?
  editDialogVisible.value = true
}

const updateCategory = async () => {
  loading.value = true
  try {
    // 如果分类名称发生了变化，更新所有该分类下项目的类型
    if (editForm.value.originalName !== editForm.value.name) {
      const updateResponse = await updateProjectCategory({
        oldType: editForm.value.originalName,
        newType: editForm.value.name
      });
      if (!updateResponse.success) {
        ElMessage.error('编辑产品分类失败')
        return;
      }
    }
    
    const projectType = editForm.value.originalName !== editForm.value.name ? editForm.value.name : editForm.value.originalName
    const managerResponse = await updateProjectManager({
      projectType,
      manager: editForm.value.manager
    })
    if (!managerResponse.success) {
      ElMessage.error('更新负责人失败')
      return;
    }
    
    await loadCategories()
    editDialogVisible.value = false
    ElMessage.success('产品分类编辑成功')
  } catch (error) {
    console.error('编辑产品分类失败:', error)
    ElMessage.error('编辑产品分类失败')
  } finally {
    loading.value = false
  }
}

const deleteCategory = async (id: number) => {
  try {
    ElMessageBox.confirm('确定要删除该产品分类吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        const category = categories.value.find(c => c.id === id)
        if (category) {
          // 使用API删除产品分类
          const response = await deleteProjectCategory(category.name);
          
          if (response.success) {
            // 重新加载数据
            await loadCategories()
            ElMessage.success('产品分类删除成功')
          } else {
            ElMessage.error('删除产品分类失败')
          }
        }
      } catch (error) {
        console.error('删除产品分类失败:', error)
        ElMessage.error('删除产品分类失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除产品分类失败:', error)
    ElMessage.error('删除产品分类失败')
  }
}

const editProject = (project: Project) => {
  // 填充编辑表单
  editProjectForm.value = {
    id: project.id,
    name: project.project_name,
    description: project.description,
    link: project.project_link || ''
  }
  // 打开编辑对话�?
  editProjectDialogVisible.value = true
}

const updateProject = async () => {
  loading.value = true
  try {
    console.log('编辑项目表单数据:', editProjectForm.value);
    // 使用API更新项目
    const response = await updateProjectDetail(editProjectForm.value.id, {
      project_name: editProjectForm.value.name,
      description: editProjectForm.value.description,
      project_link: editProjectForm.value.link
    });
    console.log('编辑项目API响应:', response);
    
    if (response.success) {
      // 重新加载数据
      await loadCategories()
      editProjectDialogVisible.value = false
      ElMessage.success('项目编辑成功')
    } else {
      ElMessage.error('编辑项目失败')
    }
  } catch (error) {
    console.error('编辑项目失败:', error)
    ElMessage.error('编辑项目失败')
  } finally {
    loading.value = false
  }
}

const handleDeleteProject = async (project: Project) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目"${project.project_name}"吗？`, '确认删除', { type: 'warning' })
    loading.value = true
    const response = await deleteProject(project.id)
    if (response.success) {
      await loadCategories()
      ElMessage.success('项目删除成功')
    } else {
      ElMessage.error('删除项目失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.project-category-container {
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
}

/* 产品分类管理 */
.category-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
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

.add-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.5rem 1.5rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3) !important;
  transition: all 0.3s ease !important;
}

.add-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4) !important;
}

/* 分类列表 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(100, 149, 237, 0.1), transparent);
  transition: left 0.3s ease;
}

.category-card:hover::before {
  left: 100%;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.25);
  border-color: rgba(100, 149, 237, 0.6);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  background: rgba(100, 149, 237, 0.1);
}

.category-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(100, 149, 237, 0.15) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
}

.action-btn:hover {
  background: rgba(100, 149, 237, 0.25) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
}

.action-btn.delete {
  background: rgba(244, 67, 54, 0.1) !important;
  color: #d32f2f !important;
  border: 1px solid rgba(244, 67, 54, 0.3) !important;
}

.action-btn.delete:hover {
  background: rgba(244, 67, 54, 0.2) !important;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.2) !important;
}

.category-info {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
}

.category-desc {
  color: rgba(51, 51, 51, 0.7);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.category-stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.6);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.category-projects {
  padding: 1.5rem;
}

.projects-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.project-slider {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 8px;
  padding-right: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 149, 237, 0.4) rgba(240, 248, 255, 0.6);
}

.project-slider::-webkit-scrollbar {
  width: 6px;
}

.project-slider::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.6);
  border-radius: 4px;
}

.project-slider::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.4);
  border-radius: 4px;
}

.project-slider::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.6);
}

.project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-item {
  padding: 1rem;
  background: rgba(100, 149, 237, 0.1);
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  border-left: 3px solid rgba(100, 149, 237, 0.5);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.project-item:hover {
  background: rgba(100, 149, 237, 0.2);
  transform: translateX(5px);
}

.project-content {
  flex: 1;
  min-width: 0;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.project-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.project-description {
  color: rgba(51, 51, 51, 0.7);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.project-link {
  font-size: 0.8rem;
}

.project-link a {
  color: #6495ED;
  text-decoration: none;
  transition: all 0.3s ease;
  word-break: break-all;
}

.project-link a:hover {
  color: #87CEEB;
  text-decoration: underline;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

/* 对话�?*/
.dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(5px) !important;
}

.dialog .el-dialog__title {
  color: #333 !important;
  font-weight: 600 !important;
}

.dialog .el-form-item__label {
  color: rgba(51, 51, 51, 0.8) !important;
  font-weight: 500 !important;
}

.dialog .el-input__wrapper,
.dialog .el-textarea__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.dialog .el-input__inner,
.dialog .el-textarea__inner {
  color: #333 !important;
  font-size: 14px;
}

.dialog .el-input__placeholder,
.dialog .el-textarea__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.dialog .dialog-footer .el-button {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #333 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.dialog .dialog-footer .el-button:hover {
  background: rgba(240, 248, 255, 0.8) !important;
  box-shadow: 0 4px 8px rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4) !important;
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
</style>
