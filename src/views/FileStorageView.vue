<template>
  <div class="file-storage-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/file-storage" class="nav-item active">文件存储</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 分类管理 -->
        <div class="category-section">
          <div class="section-header">
            <h3 class="section-subtitle">文件分类</h3>
            <el-button type="primary" @click="showAddCategoryDialog = true">
              <el-icon><Plus /></el-icon>
              添加分类
            </el-button>
          </div>
          <div class="category-grid">
            <div
              v-for="category in categories"
              :key="category.id"
              class="category-card"
              :class="{ 'category-selected': selectedCategory?.id === category.id }"
            >
              <div class="category-info">
                <div class="category-name">{{ category.name }}</div>
                <div class="category-description">{{ category.description || '无描述' }}</div>
                <div class="category-actions">
                  <el-button size="small" @click="selectCategory(category)" class="action-btn">
                    <el-icon><Folder /></el-icon>
                    查看文件
                  </el-button>
                  <el-button size="small" @click="deleteCategory(category.id)" class="action-btn delete">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            <div
              v-if="categories.length === 0"
              class="empty-category"
            >
              <el-icon class="empty-icon"><Folder /></el-icon>
              <div class="empty-text">暂无分类，请先创建分类</div>
            </div>
          </div>
        </div>

        <!-- 上传区域 -->
        <div class="upload-section" v-if="selectedCategory">
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM12 17V13H8L12 9L16 13H12V17Z"/>
              </svg>
            </span>
            上传文件到{{ selectedCategory.name }}
          </h2>
          <div class="upload-area">
            <el-upload
              class="upload-demo"
              :action="'/api/upload'"
              :auto-upload="true"
              :data="{ categoryId: selectedCategory?.id, uploaderId: getUserId() }"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              name="file"
              multiple
            >
              <div class="upload-trigger">
                <el-icon class="upload-icon"><Plus /></el-icon>
                <div class="upload-text">点击或拖拽文件到此处上传</div>
                <div class="upload-hint">支持 JPG、PNG、PDF、DOCX 等格式</div>
              </div>
              <template #file="{ file }">
                <div class="file-item">
                  <div class="file-preview">
                    <img v-if="file.url" :src="file.url" alt="" />
                    <div v-else class="file-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    <el-icon class="file-delete" @click="handleFileRemove(file)">
                      <Delete />
                    </el-icon>
                  </div>
                </div>
              </template>
            </el-upload>
          </div>
        </div>

        <!-- 文件列表 -->
        <div class="file-section" v-if="selectedCategory">
          <div class="section-header">
            <h3 class="section-subtitle">{{ selectedCategory.name }} - 文件列表</h3>
            <el-input
              v-model="searchQuery"
              placeholder="搜索文件"
              prefix-icon="Search"
              class="search-input"
            />
          </div>
          <div class="file-grid">
            <div
              v-for="file in filteredFiles"
              :key="file.id"
              class="file-card"
            >
              <div class="file-card-preview">
                <img v-if="['png','jpg','jpeg','gif','bmp','webp','svg'].includes(file.type)" :src="file.url" alt="" />
                <div v-else class="file-card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                  </svg>
                </div>
              </div>
              <div class="file-card-info">
                <div class="file-card-name">{{ file.name }}</div>
                <div class="file-card-meta">
                  <span class="file-card-size">{{ formatFileSize(file.size) }}</span>
                  <span class="file-card-date">{{ new Date(file.createdAt).toLocaleDateString() }}</span>
                </div>
                <div class="file-card-actions">
                  <el-button size="small" @click="viewFile(file)" class="action-btn">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button size="small" @click="downloadFile(file)" class="action-btn">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                  <el-button size="small" @click="deleteFile(file.id)" class="action-btn delete">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            <div
              v-if="filteredFiles.length === 0"
              class="empty-file"
            >
              <el-icon class="empty-icon"><Document /></el-icon>
              <div class="empty-text">该分类下暂无文件</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 添加分类对话�?-->
    <el-dialog
      v-model="showAddCategoryDialog"
      title="添加文件分类"
      width="400px"
    >
      <el-form :model="newCategory" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCategory.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类描述">
          <el-input
            v-model="newCategory.description"
            type="textarea"
            placeholder="请输入分类描述"
            rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddCategoryDialog = false">取消</el-button>
          <el-button type="primary" @click="addCategory">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 文件预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewFileData.name"
      width="700px"
      class="preview-dialog"
      destroy-on-close
    >
      <div class="preview-content">
        <img v-if="previewFileData.type && ['png','jpg','jpeg','gif','bmp','webp','svg'].includes(previewFileData.type)" :src="previewFileData.url" class="image-preview" />
        <div v-else-if="previewFileData.type === 'pdf'" class="pdf-preview">
          <iframe :src="previewFileData.url" frameborder="0" width="100%" height="500px"></iframe>
        </div>
        <div v-else-if="previewFileData.type === 'txt' || previewFileData.type === 'md'" class="text-preview">
          <pre>{{ previewFileContent }}</pre>
        </div>
        <div v-else class="other-preview">
          <div class="file-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <p>该文件类型无法直接预览，请下载后查看</p>
          <el-button type="primary" @click="downloadFile(previewFileData)">下载文件</el-button>
        </div>
      </div>
    </el-dialog>

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
import { Plus, Delete, Download, Folder, Document, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFiles, deleteFile as apiDeleteFile, getFileCategories, addFileCategory, deleteFileCategory } from '../services/api'

const router = useRouter()

const handleBack = () => {
  // 返回上一�?
  router.back()
}

interface File {
  id: number
  name: string
  size: number
  type: string
  url: string
  uploaderId: number
  categoryId: number | null
  createdAt: string
}

interface Category {
  id: number
  name: string
  description: string
  createdAt: string
}

const fileList = ref<any[]>([])
const searchQuery = ref('')
const files = ref<File[]>([])
const categories = ref<Category[]>([])
const selectedCategory = ref<Category | null>(null)
const loading = ref(false)
const showAddCategoryDialog = ref(false)
const newCategory = ref({ name: '', description: '' })
const previewVisible = ref(false)
const previewFileData = ref<File>({ id: 0, name: '', size: 0, type: '', url: '', uploaderId: 0, categoryId: null, createdAt: '' })
const previewFileContent = ref('')

// 从API加载文件数据
const loadFiles = async () => {
  loading.value = true
  try {
    // 调用API获取文件数据
    const response = await getFiles();
    if (response.success) {
      files.value = response.data;
    } else {
      ElMessage.error('加载文件数据失败')
    }
  } catch (error) {
    console.error('加载文件数据失败:', error)
    ElMessage.error('加载文件数据失败')
  } finally {
    loading.value = false
  }
}

// 从API加载分类数据
const loadCategories = async () => {
  loading.value = true
  try {
    // 调用API获取分类数据
    const response = await getFileCategories();
    if (response.success) {
      categories.value = response.data;
    } else {
      ElMessage.error('加载分类数据失败')
    }
  } catch (error) {
    console.error('加载分类数据失败:', error)
    ElMessage.error('加载分类数据失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数�?
onMounted(async () => {
  await loadCategories()
  await loadFiles()
})

// 过滤当前分类的文�?
const filteredFiles = computed(() => {
  if (!selectedCategory.value) return []
  let result = files.value.filter(file => file.categoryId === selectedCategory.value?.id)
  if (searchQuery.value) {
    result = result.filter(file => 
      file.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  return result
})

// 选择分类
const selectCategory = (category: Category) => {
  selectedCategory.value = category
  searchQuery.value = ''
  ElMessage.success(`已选择分类: ${category.name}`)
  setTimeout(() => {
    const el = document.querySelector('.upload-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

// 添加分类
const addCategory = async () => {
    if (!newCategory.value.name) {
      ElMessage.error('请输入分类名称')
      return
    }
  
  loading.value = true
  try {
    const response = await addFileCategory({
      name: newCategory.value.name,
      description: newCategory.value.description
    });
    
    if (response.success) {
      await loadCategories()
      showAddCategoryDialog.value = false
      newCategory.value = { name: '', description: '' }
      ElMessage.success('分类创建成功')
    } else {
      ElMessage.error('创建分类失败')
    }
  } catch (error) {
    console.error('创建分类失败:', error)
    ElMessage.error('创建分类失败')
  } finally {
    loading.value = false
  }
}

// 删除分类
const deleteCategory = async (id: number) => {
    try {
      ElMessageBox.confirm('确定要删除该分类吗？删除后该分类下的文件也将被删除', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        // 调用API删除分类
        const response = await deleteFileCategory(id);
        if (response.success) {
          // 重新加载数据
          await loadCategories()
          await loadFiles()
          // 如果删除的是当前选中的分类，清除选中状�?
          if (selectedCategory.value?.id === id) {
            selectedCategory.value = null
          }
          ElMessage.success('分类删除成功')
        } else {
          ElMessage.error('删除分类失败')
        }
      } catch (error) {
        console.error('删除分类失败:', error)
        ElMessage.error('删除分类失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除分类失败:', error)
    ElMessage.error('删除分类失败')
  }
}

// 处理文件上传完成
const handleUploadSuccess = async (response: any) => {
  if (response.success) {
    ElMessage.success('文件上传成功')
    await loadFiles()
  } else {
    ElMessage.error('上传文件失败: ' + (response.message || ''))
  }
}

const handleUploadError = () => {
  ElMessage.error('上传文件失败')
}

const handleFileRemove = (file: any) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index !== -1) {
    fileList.value.splice(index, 1)
  }
}

const downloadFile = (file: File) => {
  const a = document.createElement('a')
  a.href = file.url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const viewFile = (file: File) => {
  if (!file.url) {
    ElMessage.warning('文件地址无效')
    return
  }
  previewFileData.value = file
  previewFileContent.value = ''
  if (['txt', 'md'].includes(file.type)) {
    fetch(file.url).then(r => r.text()).then(t => { previewFileContent.value = t }).catch(() => {})
  }
  previewVisible.value = true
}

const deleteFile = async (id: number) => {
  try {
    ElMessageBox.confirm('确定要删除该文件吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        // 调用API删除文件
        const response = await apiDeleteFile(id);
        if (response.success) {
          // 重新加载数据
          await loadFiles()
          ElMessage.success('文件删除成功')
        } else {
          ElMessage.error('删除文件失败')
        }
      } catch (error) {
        console.error('删除文件失败:', error)
        ElMessage.error('删除文件失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除文件失败:', error)
    ElMessage.error('删除文件失败')
  }
}

const getUserId = (): number => {
  try { return parseInt(localStorage.getItem('userId') || '1') } catch { return 1 }
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<style scoped>
.file-storage-container {
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

/* 分类管理 */
.category-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.category-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
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
  box-shadow: 0 8px 20px rgba(100, 149, 237, 0.25);
  border-color: rgba(100, 149, 237, 0.6);
}

.category-selected {
  border-color: #6495ED !important;
  box-shadow: 0 0 0 2px rgba(100, 149, 237, 0.3), 0 8px 20px rgba(100, 149, 237, 0.25) !important;
  background: rgba(100, 149, 237, 0.08) !important;
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-name {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-description {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.6);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* 上传区域 */
.upload-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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

.upload-area {
  background: rgba(255, 255, 255, 0.9);
  border: 2px dashed rgba(100, 149, 237, 0.5);
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-area:hover {
  border-color: #6495ED;
  box-shadow: 0 0 20px rgba(100, 149, 237, 0.2);
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: relative;
}

.upload-icon {
  font-size: 2.5rem;
  color: rgba(100, 149, 237, 0.6);
  transform: translateY(10px);
}

.upload-text {
  font-size: 1.1rem;
  color: #333;
  font-weight: 500;
  transform: translateY(-10px);
}

.upload-hint {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.6);
  transform: translateY(-5px);
}

.file-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  margin: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-preview {
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(240, 248, 255, 0.5);
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  width: 40px;
  height: 40px;
  color: rgba(100, 149, 237, 0.6);
}

.file-icon svg {
  width: 100%;
  height: 100%;
}

.file-info {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid rgba(100, 149, 237, 0.2);
}

.file-name {
  color: #333;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  color: rgba(51, 51, 51, 0.6);
  font-size: 8px;
}

.file-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d32f2f;
  cursor: pointer;
  font-size: 16px;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  border: 1px solid rgba(211,47,47,0.3);
  transition: all 0.2s;
  z-index: 2;
}
.file-delete:hover {
  background: #d32f2f;
  color: #fff;
  transform: scale(1.15);
}

/* 文件列表 */
.file-section {
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
  margin-bottom: 1.5rem;
}

.section-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.search-input {
  width: 300px;
}

.el-input__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.el-input__inner {
  color: #333 !important;
  font-size: 14px;
}

.el-input__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.file-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(100, 149, 237, 0.1), transparent);
  transition: left 0.3s ease;
}

.file-card:hover::before {
  left: 100%;
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(100, 149, 237, 0.25);
  border-color: rgba(100, 149, 237, 0.6);
}

.file-card-preview {
  height: 150px;
  background: rgba(240, 248, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
}

.file-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-card-icon {
  width: 60px;
  height: 60px;
  color: rgba(100, 149, 237, 0.6);
}

.file-card-icon svg {
  width: 100%;
  height: 100%;
}

.file-card-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-card-name {
  font-weight: 500;
  color: #333;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(51, 51, 51, 0.6);
}

.file-card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-btn {
  flex: 1;
  background: rgba(100, 149, 237, 0.15) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
  font-size: 0.8rem !important;
  padding: 0.5rem !important;
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

/* 空状�?*/
.empty-category,
.empty-file {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.6);
  border: 2px dashed rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 3rem;
  color: rgba(100, 149, 237, 0.4);
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.1rem;
  color: rgba(51, 51, 51, 0.6);
  font-weight: 500;
}

/* 对话框样�?*/
.el-dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(5px) !important;
}

.el-dialog__header {
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.el-dialog__title {
  color: #333 !important;
  font-weight: 600 !important;
}

.el-dialog__footer {
  border-top: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.el-form-item__label {
  color: rgba(51, 51, 51, 0.8) !important;
}

.el-input__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.el-input__inner {
  color: #333 !important;
  font-size: 14px;
}

.el-input__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

.el-textarea__inner {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  color: #333 !important;
  resize: vertical;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* 上传组件样式 */
.upload-demo {
  /* 确保上传组件占满整个上传区域 */
  width: 100%;
  height: 100%;
}

.upload-demo .el-upload {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-demo .el-upload-list {
  display: none;
}

/* 确保el-upload的内部元素也居中 */
.upload-demo .el-upload--picture-card {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: none !important;
}

.upload-demo .el-upload__input {
  display: none;
}

/* 确保上传触发器在el-upload中居�?*/
.upload-demo .el-upload__trigger {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  border: none !important;
}

/* 预览弹窗 */
.preview-dialog .preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-height: 200px;
}
.preview-dialog .image-preview {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
  border-radius: 8px;
}
.preview-dialog .pdf-preview {
  width: 100%;
}
.preview-dialog .pdf-preview iframe {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.preview-dialog .text-preview {
  width: 100%;
  max-height: 500px;
  overflow: auto;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 1rem;
}
.preview-dialog .text-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}
.preview-dialog .other-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: rgba(51,51,51,0.6);
}
.preview-dialog .other-preview .file-icon {
  width: 64px;
  height: 64px;
  color: rgba(100,149,237,0.5);
}
.preview-dialog .other-preview .file-icon svg {
  width: 100%;
  height: 100%;
}
.preview-dialog .other-preview p {
  font-size: 1rem;
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
