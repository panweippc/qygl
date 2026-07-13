﻿<template>
  <div class="project-category-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <button class="nav-item user-btn">{{ currentUser }}</button>
        <button class="nav-item logout-btn" @click="handleLogout">退出</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <div class="main-container">
      <!-- 左侧导航 -->
      <aside class="sidebar">
        <div class="sidebar-content">
          <nav class="sidebar-nav">
            <router-link to="/" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
              </div>
              <span>首页</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/tool-inventory" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </div>
              <span>工具入库</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/oa-office" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </div>
              <span>OA办公</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/monthly-report" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
                </svg>
              </div>
              <span>月报</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/employee-management" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C13.67 13 9 14.17 9 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
                </svg>
              </div>
              <span>员工管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
                        <router-link to="/file-storage" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
                </svg>
              </div>
              <span>文件存储</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/project-category" class="sidebar-item active">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </div>
              <span>项目分类</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/closing-project" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
              </div>
              <span>成交项目</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/sales-funnel" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span>销售漏斗</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/system" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM16 17H8V15H16V17ZM16 13H8V11H16V13ZM16 9H8V7H16V9Z"/>
                </svg>
              </div>
              <span>系统管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
          </nav>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="main-content">
        <div class="content-wrapper">
        <!-- 项目分类管理 -->
        <div class="category-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </span>
              项目分类
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
    </div>

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
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="categoryForm.manager" placeholder="请输入负责人姓名" />
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
          <el-input v-model="editForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="editForm.manager" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="项目数">
          <el-input v-model.number="editForm.projectCount" type="number" placeholder="请输入项目数" />
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
import { getProjects, addProjectApplication, deleteProjectCategory, updateProjectCategory, updateProject as updateProjectApi } from '../services/api'

const router = useRouter()

const currentUser = ref(localStorage.getItem('username') || '用户')

const handleBack = () => {
  router.back()
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('permissions')
  router.push('/login')
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

const categoryForm = ref({
  name: '',
  manager: '',
  projectCount: 0
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
      ElMessage.error('加载项目分类数据失败')
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
    console.error('加载项目分类数据失败:', error)
    ElMessage.error('加载项目分类数据失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数�?
onMounted(async () => {
  await loadCategories()
})

const openAddCategoryDialog = () => {
  categoryForm.value = {
    name: '',
    manager: '',
    projectCount: 1
  }
  addDialogVisible.value = true
}

const addCategory = async () => {
  loading.value = true
  try {
    // 根据项目数添加相应数量的项目
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
        applicantId: '37'
      });
      
      if (!response.success) {
        ElMessage.error(`添加项目分类失败: ${response.message || '未知错误'}`)
        return;
      }
    }
    
    // 重新加载数据
    await loadCategories()
    addDialogVisible.value = false
    ElMessage.success('项目分类添加成功')
  } catch (error: any) {
    console.error('添加项目分类失败:', error)
    ElMessage.error(`添加项目分类失败: ${error.message || '网络错误'}`)
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
      // 调用API更新项目类型
      const updateResponse = await updateProjectCategory({
        oldType: editForm.value.originalName,
        newType: editForm.value.name
      });
      
      if (!updateResponse.success) {
        ElMessage.error('编辑项目分类失败')
        return;
      }
    }
    
    // 重新加载数据
    await loadCategories()
    editDialogVisible.value = false
    ElMessage.success('项目分类编辑成功')
  } catch (error) {
    console.error('编辑项目分类失败:', error)
    ElMessage.error('编辑项目分类失败')
  } finally {
    loading.value = false
  }
}

const deleteCategory = async (id: number) => {
  try {
    ElMessageBox.confirm('确定要删除该项目分类吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        const category = categories.value.find(c => c.id === id)
        if (category) {
          // 使用API删除项目分类
          const response = await deleteProjectCategory(category.name);
          
          if (response.success) {
            // 重新加载数据
            await loadCategories()
            ElMessage.success('项目分类删除成功')
          } else {
            ElMessage.error('删除项目分类失败')
          }
        }
      } catch (error) {
        console.error('删除项目分类失败:', error)
        ElMessage.error('删除项目分类失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除项目分类失败:', error)
    ElMessage.error('删除项目分类失败')
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
    const response = await updateProjectApi(editProjectForm.value.id, {
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

/* 主容器 */
.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧导航 */
.sidebar {
  width: 220px;
  background: rgba(255, 255, 255, 0.9);
  border-right: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 0;
  overflow-y: auto;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar-content {
  padding: 0.5rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: rgba(51, 51, 51, 0.7);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.sidebar-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.sidebar-item:hover,
.sidebar-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.15);
}

.sidebar-item:hover::before,
.sidebar-item.active::before {
  transform: scaleY(1);
}

.sidebar-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6495ED;
}

.sidebar-item.active .sidebar-icon {
  color: #6495ED;
}

.sidebar-item span {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-item-indicator {
  position: absolute;
  right: 0.5rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.3s ease;
}

.sidebar-item.active .sidebar-item-indicator {
  background: #6495ED;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.5);
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

/* 项目分类管理 */
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
