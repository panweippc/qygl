<template>
  <div class="project-panel">
    <div class="pp-toolbar">
      <span class="pp-title">{{ categoryId !== null ? '「' + categoryName + '」' : '未分类 - ' }}项目信息 <span class="count-badge">{{ visibleProjects.length }}</span></span>
      <el-button type="primary" size="small" @click="openAddProject">新增项目</el-button>
    </div>

    <el-alert
      v-if="categoryId === null && visibleProjects.length > 0"
      type="warning"
      :closable="false"
      show-icon
      title="未归入任何分类的项目"
      description="以下项目尚未分配到资料分类，请在每条记录上点击「归入分类」整理。"
      style="margin-bottom:1rem"
    />

    <div class="project-list" v-loading="loading">
      <div v-if="visibleProjects.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <p>该分类下暂无项目信息</p>
        <el-button type="primary" size="small" class="empty-cta" @click="openAddProject">在这里新增第一条项目信息</el-button>
      </div>

      <div v-for="project in visibleProjects" :key="project.id" class="project-item">
        <div class="project-content">
          <div class="project-name">{{ project.project_name }}</div>
          <div class="project-description">{{ project.description || '暂无描述' }}</div>
          <div v-if="project.applicant_name || project.manager" class="project-manager">负责人: {{ project.applicant_name || project.manager }}</div>
          <div v-if="project.project_link" class="project-link">
            <a :href="project.project_link" target="_blank" rel="noopener noreferrer">
              <el-icon><Link /></el-icon>{{ project.project_link }}
            </a>
          </div>
          <div v-if="project.category_name && categoryId === null" class="project-uncat">原分类：{{ project.category_name }}</div>
        </div>
        <div class="project-actions">
          <el-dropdown v-if="categoryId === null" trigger="click" @command="(name) => assignProject(project, name)">
            <el-button size="small" class="action-btn assign">
              <el-icon><FolderOpened /></el-icon>归入分类
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="c in categoryOptions" :key="c.id" :command="c.name">{{ c.name }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-if="isOwnerOrManager(project.applicant_name)" size="small" @click="editProject(project)" class="action-btn">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button v-if="isOwnerOrManager(project.applicant_name)" size="small" @click="handleDeleteProject(project)" class="action-btn delete">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 新增项目 -->
    <el-dialog v-model="addDialogVisible" title="新增项目" width="500px">
      <el-form :model="addForm" label-position="top">
        <el-form-item label="所属分类" v-if="categoryId === null">
          <el-select v-model="addForm.categoryName" placeholder="选择资料分类" style="width:100%">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="addForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="addForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="项目链接">
          <el-input v-model="addForm.link" placeholder="请输入项目链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddProject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑项目 -->
    <el-dialog v-model="editDialogVisible" title="编辑项目" width="500px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="项目名称">
          <el-input v-model="editForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="editForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="项目链接">
          <el-input v-model="editForm.link" placeholder="请输入项目链接" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input :model-value="currentUsername" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditProject">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Edit, Delete, Link, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategoryProjects, addCategoryProject, updateCategoryProject, deleteCategoryProject, getFileCategories } from '../../services/api'
import { useRoleGuard } from '@/composables/useRoleGuard'

const props = defineProps<{
  categoryId: number | null
  categoryName: string
}>()

const loading = ref(false)
const projects = ref<any[]>([])
const categoryOptions = ref<{ id: number; name: string }[]>([])

const { userName, isOwnerOrManager, refresh: refreshRole } = useRoleGuard()

const currentUsername = computed(() => userName.value || '当前用户')

const validNames = computed(() => new Set(categoryOptions.value.map(c => c.name)))

const visibleProjects = computed(() => {
  if (props.categoryId === null) {
    return projects.value.filter(p => !p.category_name || !validNames.value.has(p.category_name))
  }
  return projects.value.filter(p => p.category_name === props.categoryName)
})

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await getCategoryProjects()
    if (res.success) projects.value = res.data || []
  } catch (e) { console.error('加载项目失败:', e) }
  finally { loading.value = false }
}
const loadCategories = async () => {
  try { const res = await getFileCategories(); if (res.success) categoryOptions.value = res.data } catch { /* ignore */ }
}

const addDialogVisible = ref(false)
const addForm = ref({ name: '', description: '', link: '', categoryName: '' })
const openAddProject = () => {
  addForm.value = { name: '', description: '', link: '', categoryName: props.categoryId !== null ? props.categoryName : '' }
  addDialogVisible.value = true
}
const submitAddProject = async () => {
  if (!addForm.value.name) { ElMessage.warning('请输入项目名称'); return }
  const catName = props.categoryId !== null ? props.categoryName : addForm.value.categoryName
  if (!catName) { ElMessage.warning('请选择所属分类'); return }
  loading.value = true
  try {
    const res = await addCategoryProject({
      categoryId: props.categoryId !== null ? props.categoryId : 0,
      categoryName: catName,
      projectName: addForm.value.name,
      description: addForm.value.description || `${addForm.value.name}的项目描述`,
      link: addForm.value.link || ''
    })
    if (res.success) { await loadProjects(); addDialogVisible.value = false; ElMessage.success('项目添加成功') }
    else ElMessage.error('添加项目失败')
  } finally { loading.value = false }
}

const editDialogVisible = ref(false)
const editForm = ref({ id: 0, name: '', description: '', link: '' })
const editProject = (project: any) => {
  editForm.value = { id: project.id, name: project.project_name, description: project.description || '', link: project.project_link || '' }
  editDialogVisible.value = true
}
const submitEditProject = async () => {
  if (!editForm.value.name) { ElMessage.warning('请输入项目名称'); return }
  loading.value = true
  try {
    const res = await updateCategoryProject(editForm.value.id, { projectName: editForm.value.name, description: editForm.value.description, link: editForm.value.link })
    if (res.success) { await loadProjects(); editDialogVisible.value = false; ElMessage.success('项目编辑成功') }
    else ElMessage.error('编辑项目失败')
  } finally { loading.value = false }
}

const handleDeleteProject = async (project: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目"${project.project_name}"吗？`, '确认删除', { type: 'warning' })
    loading.value = true
    const res = await deleteCategoryProject(project.id)
    if (res.success) { await loadProjects(); ElMessage.success('项目删除成功') }
    else ElMessage.error('删除项目失败')
  } catch (error: any) {
    if (error !== 'cancel') { console.error('删除项目失败:', error); ElMessage.error('删除项目失败') }
  } finally { loading.value = false }
}

const assignProject = async (project: any, categoryName: string) => {
  try {
    const target = categoryOptions.value.find(c => c.name === categoryName)
    const res = await fetch('/api/project-categories/projects/' + project.id + '/category', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: target ? target.id : 0, categoryName })
    }).then(r => r.json())
    if (res.success) { ElMessage.success(`已归入「${categoryName}」`); await loadProjects() }
    else ElMessage.error(res.message || '归入分类失败')
  } catch (e: any) { ElMessage.error(e.message || '归入分类失败') }
}

watch(() => props.categoryId, () => { /* visibleProjects 自动重算 */ })

onMounted(() => { refreshRole(); loadProjects(); loadCategories() })
</script>

<style scoped>
.project-panel { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0.25rem; }
.pp-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.pp-title { font-size: 1.1rem; font-weight: 600; color: #333; display: flex; align-items: center; gap: 0.5rem; }
.count-badge { background: rgba(100,149,237,0.15); color: #4169E1; font-size: 0.8rem; padding: 0.1rem 0.55rem; border-radius: 10px; font-weight: 600; }
.project-list { display: flex; flex-direction: column; gap: 0.75rem; }
.project-item { padding: 1rem 1.25rem; background: rgba(255,255,255,0.9); border: 1px solid rgba(100,149,237,0.2); border-left: 3px solid rgba(100,149,237,0.5); border-radius: 8px; font-size: 0.9rem; transition: all 0.3s ease; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.project-item:hover { background: rgba(100,149,237,0.12); transform: translateX(4px); }
.project-content { flex: 1; min-width: 0; }
.project-name { font-weight: 600; color: #333; margin-bottom: 0.4rem; }
.project-description { color: rgba(51,51,51,0.7); font-size: 0.85rem; margin-bottom: 0.5rem; line-height: 1.4; }
.project-manager { font-size: 0.8rem; color: #6495ED; margin-bottom: 0.4rem; }
.project-link a { color: #6495ED; text-decoration: none; font-size: 0.8rem; word-break: break-all; }
.project-link a:hover { text-decoration: underline; }
.project-uncat { font-size: 0.78rem; color: #faad14; margin-top: 0.35rem; }
.project-actions { display: flex; gap: 0.4rem; align-items: flex-start; flex-shrink: 0; }
.action-btn { background: rgba(100,149,237,0.15) !important; color: #6495ED !important; border: 1px solid rgba(100,149,237,0.3) !important; border-radius: 6px !important; width: 32px !important; height: 32px !important; padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.3s ease !important; }
.action-btn:hover { background: rgba(100,149,237,0.25) !important; box-shadow: 0 0 10px rgba(100,149,237,0.3) !important; }
.action-btn.assign { width: auto !important; padding: 0 0.6rem !important; gap: 0.25rem; }
.action-btn.delete { background: rgba(244,67,54,0.1) !important; color: #d32f2f !important; border: 1px solid rgba(244,67,54,0.3) !important; }
.action-btn.delete:hover { background: rgba(244,67,54,0.2) !important; box-shadow: 0 0 10px rgba(244,67,54,0.2) !important; }
.empty-state { text-align: center; padding: 3rem; color: #999; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
.empty-state p { margin: 0; }
.empty-cta { margin-top: 0.9rem; }
</style>
