<template>
  <div class="tool-inventory-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/tool-inventory" class="nav-item active">工具入库</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 工具入库管理 -->
        <div class="inventory-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"/>
                </svg>
              </span>
              工具入库
            </h2>
            <el-button type="primary" @click="openAddToolDialog" class="add-btn">
              添加工具
            </el-button>
          </div>

          <!-- 搜索和筛选-->
          <div class="search-filter">
            <el-input
              v-model="searchQuery"
              placeholder="搜索工具名称"
              prefix-icon="Search"
              class="search-input"
            />
            <el-select v-model="categoryFilter" placeholder="筛选分类" class="filter-select">
              <el-option label="全部分类" value="" />
              <el-option label="电子设备" value="电子设备" />
              <el-option label="办公文具" value="办公文具" />
              <el-option label="工具设备" value="工具设备" />
              <el-option label="其他" value="其他" />
            </el-select>
          </div>

          <!-- 工具列表 -->
          <div class="tool-list">
            <el-table :data="filteredTools" style="width: 100%" class="tool-table">
              <el-table-column label="序号" width="80">
                <template #default="{ $index }">{{ (currentPage - 1) * pageSize + $index + 1 }}</template>
              </el-table-column>
              <el-table-column prop="name" label="工具名称" />
              <el-table-column prop="category" label="分类" width="120" />
              <el-table-column prop="quantity" label="库存数量" width="120" />
              <el-table-column prop="price" label="单价" width="100" />
              <el-table-column prop="supplier" label="供应商" />
              <el-table-column prop="location" label="存放位置" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="entryDate" label="入库日期" width="150" />
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="editTool(row)" class="edit-btn">
                    编辑
                  </el-button>
                  <el-button size="small" @click="deleteTool(row.id)" class="delete-btn">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="filteredTools.length"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
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

    <!-- 添加工具对话�?-->
    <el-dialog
      v-model="addDialogVisible"
      title="添加工具"
      width="500px"
      class="dialog"
    >
      <el-form :model="toolForm" label-position="top">
        <el-form-item label="工具名称">
          <el-input v-model="toolForm.name" placeholder="请输入工具名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="toolForm.category" placeholder="请选择分类">
            <el-option label="电子设备" value="电子设备" />
            <el-option label="办公文具" value="办公文具" />
            <el-option label="工具设备" value="工具设备" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存数量">
          <el-input v-model.number="toolForm.quantity" type="number" placeholder="请输入库存数量" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input v-model.number="toolForm.price" type="number" placeholder="请输入单价" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="toolForm.supplier" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="toolForm.location" placeholder="请输入存放位置" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="toolForm.status" placeholder="请选择状态">
            <el-option label="在库" value="在库" />
            <el-option label="借出" value="借出" />
            <el-option label="维修" value="维修" />
            <el-option label="报废" value="报废" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库日期">
          <el-date-picker
            v-model="toolForm.entryDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addTool">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑工具对话�?-->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑工具"
      width="500px"
      class="dialog"
    >
      <el-form :model="toolForm" label-position="top">
        <el-form-item label="工具名称">
          <el-input v-model="toolForm.name" placeholder="请输入工具名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="toolForm.category" placeholder="请选择分类">
            <el-option label="电子设备" value="电子设备" />
            <el-option label="办公文具" value="办公文具" />
            <el-option label="工具设备" value="工具设备" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存数量">
          <el-input v-model.number="toolForm.quantity" type="number" placeholder="请输入库存数量" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input v-model.number="toolForm.price" type="number" placeholder="请输入单价" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="toolForm.supplier" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="toolForm.location" placeholder="请输入存放位置" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="toolForm.status" placeholder="请选择状态">
            <el-option label="在库" value="在库" />
            <el-option label="借出" value="借出" />
            <el-option label="维修" value="维修" />
            <el-option label="报废" value="报废" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库日期">
          <el-date-picker
            v-model="toolForm.entryDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateToolData">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTools, addTool as apiAddTool, deleteTool as apiDeleteTool, updateTool } from '../services/api'

const router = useRouter()

const handleBack = () => {
  // 返回上一�?
  router.back()
}

interface Tool {
  id: number
  name: string
  category: string
  quantity: number
  price: number
  supplier: string
  location: string
  status: string
  entryDate: string
}

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const searchQuery = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const toolForm = ref({
  id: 0,
  name: '',
  category: '',
  quantity: 0,
  price: 0,
  supplier: '',
  location: '',
  status: '在库',
  entryDate: ''
})

const tools = ref<Tool[]>([])

// 从API加载工具数据
const loadTools = async () => {
  loading.value = true
  try {
    // 调用API获取工具数据
    const response = await getTools();
    if (response.success) {
      tools.value = response.data;
    } else {
      ElMessage.error('加载工具数据失败')
    }
  } catch (error) {
    console.error('加载工具数据失败:', error)
    ElMessage.error('加载工具数据失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数�?
onMounted(async () => {
  await loadTools()
})

const filteredTools = computed(() => {
  let result = tools.value
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(tool => 
      tool.name.toLowerCase().includes(query)
    )
  }
  
  // 分类过滤
  if (categoryFilter.value) {
    result = result.filter(tool => tool.category === categoryFilter.value)
  }
  
  return result
})

const openAddToolDialog = () => {
  toolForm.value = {
    id: 0,
    name: '',
    category: '',
    quantity: 0,
    price: 0,
    supplier: '',
    location: '',
    status: '在库',
    entryDate: ''
  }
  addDialogVisible.value = true
  editDialogVisible.value = false
}

const addTool = async () => {
  loading.value = true
  try {
    // 调用API添加工具
    const response = await apiAddTool({
      name: toolForm.value.name,
      category: toolForm.value.category,
      quantity: toolForm.value.quantity,
      price: toolForm.value.price,
      supplier: toolForm.value.supplier,
      location: toolForm.value.location,
      status: toolForm.value.status,
      entryDate: toolForm.value.entryDate || new Date().toISOString()
    });
    
    if (response.success) {
      // 重新加载数据
      await loadTools()
      addDialogVisible.value = false
      ElMessage.success('工具添加成功')
    } else {
      ElMessage.error('添加工具失败')
    }
  } catch (error) {
    console.error('添加工具失败:', error)
    ElMessage.error('添加工具失败')
  } finally {
    loading.value = false
  }
}

const editTool = (tool: Tool) => {
  // 填充表单数据
  toolForm.value = {
    id: tool.id,
    name: tool.name,
    category: tool.category,
    quantity: tool.quantity,
    price: tool.price,
    supplier: tool.supplier,
    location: tool.location,
    status: tool.status,
    entryDate: tool.entryDate
  }
  // 打开编辑对话�?
  editDialogVisible.value = true
  addDialogVisible.value = false
}

const updateToolData = async () => {
  loading.value = true
  try {
    console.log('更新工具数据:', toolForm.value)
    console.log('工具ID:', toolForm.value.id)
    console.log('开始调用API更新工具')
    // 调用API更新工具
    const response = await updateTool(toolForm.value);
    
    console.log('更新工具响应:', response)
    if (response.success) {
      // 重新加载数据
      await loadTools()
      editDialogVisible.value = false
      ElMessage.success('工具更新成功')
    } else {
      ElMessage.error('更新工具失败: ' + response.message)
    }
  } catch (error: any) {
    console.error('更新工具失败:', error)
    console.error('错误类型:', typeof error)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    ElMessage.error('更新工具失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const deleteTool = async (id: number) => {
  try {
    ElMessageBox.confirm('确定要删除该工具吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        // 调用API删除工具
        const response = await apiDeleteTool(id);
        if (response.success) {
          // 重新加载数据
          await loadTools()
          ElMessage.success('工具删除成功')
        } else {
          ElMessage.error('删除工具失败')
        }
      } catch (error) {
        console.error('删除工具失败:', error)
        ElMessage.error('删除工具失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除工具失败:', error)
    ElMessage.error('删除工具失败')
  }
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (current: number) => {
  currentPage.value = current
}
</script>

<style scoped>
.tool-inventory-container {
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
  background: rgba(255, 255, 255, 0.9);
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
  color: #f44336;
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

/* 工具入库管理 */
.inventory-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.add-btn {
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.5rem 1.5rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
}

.add-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

/* 搜索和筛�?*/
.search-filter {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.filter-select {
  width: 200px;
}

.el-input__wrapper,
.el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
}

.el-input__inner,
.el-select .el-input__inner {
  color: #333 !important;
  font-size: 14px;
}

.el-input__placeholder,
.el-select .el-input__placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
}

/* 工具列表 */
.tool-list {
  margin-bottom: 1.5rem;
}

.tool-table {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

.tool-table th {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.tool-table td {
  color: rgba(51, 51, 51, 0.8) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2) !important;
}

.tool-table tr:hover {
  background: rgba(100, 149, 237, 0.1) !important;
}

.edit-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 6px !important;
  margin-right: 8px !important;
  transition: all 0.3s ease !important;
}

.edit-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.delete-btn {
  background: rgba(244, 67, 54, 0.2) !important;
  color: #f44336 !important;
  border: 1px solid rgba(244, 67, 54, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.3) !important;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.4) !important;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.el-pagination__total {
  color: rgba(51, 51, 51, 0.7) !important;
}

.el-pagination__sizes .el-input__inner {
  color: #333 !important;
}

.el-pagination__sizes .el-input .el-input__icon {
  color: rgba(51, 51, 51, 0.7) !important;
}

.el-pager li {
  color: rgba(51, 51, 51, 0.7) !important;
}

.el-pager li.active {
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
  color: #fff !important;
  border: none !important;
}

.el-pager li:hover {
  color: #6495ED !important;
}

/* 对话�?*/
.dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.dialog .el-dialog__title {
  color: #333 !important;
  font-weight: 600 !important;
}

.dialog .el-form-item__label {
  color: rgba(51, 51, 51, 0.8) !important;
  font-weight: 500 !important;
}

.dialog .el-date-picker__header-label {
  color: #333 !important;
}

.dialog .el-date-picker__header {
  background: rgba(255, 255, 255, 0.9) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.dialog .el-date-picker__body {
  background: rgba(255, 255, 255, 0.9) !important;
}

.dialog .el-date-table th {
  color: rgba(51, 51, 51, 0.7) !important;
}

.dialog .el-date-table td {
  color: #333 !important;
}

.dialog .el-date-table td.available:hover {
  background: rgba(100, 149, 237, 0.2) !important;
}

.dialog .el-date-table td.today {
  color: #6495ED !important;
}

.dialog .el-date-table td.in-range div {
  background: rgba(100, 149, 237, 0.2) !important;
}

.dialog .el-date-table td.start-date div,
.dialog .el-date-table td.end-date div {
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
}

.dialog .dialog-footer .el-button {
  background: rgba(240, 242, 245, 0.8) !important;
  color: #333 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.dialog .dialog-footer .el-button:hover {
  background: rgba(240, 242, 245, 1) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
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
  background: rgba(240, 242, 245, 0.6);
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
