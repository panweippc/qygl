<template>
  <div class="management-section">
    <div class="section-header">
      <h3 class="subsection-title">角色列表</h3>
      <el-button type="primary" @click="openAddRoleDialog" class="add-btn">
        添加角色
      </el-button>
    </div>

    <div class="table-container">
      <el-table :data="roles" style="width: 100%" class="data-table" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)" class="edit-btn">编辑</el-button>
            <el-button size="small" @click="assignPermissions(row)" class="perm-btn">权限</el-button>
            <el-button size="small" type="danger" @click="deleteRole(row.id)" class="delete-btn">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="roleDialogVisible"
      :title="isEditingRole ? '编辑角色' : '添加角色'"
      width="500px"
      class="dialog"
    >
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-position="top">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" placeholder="请输入角色编码" :disabled="isEditingRole" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="roleForm.status">
            <el-radio label="启用">启用</el-radio>
            <el-radio label="禁用">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRole" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = '/api'

const loading = ref(false)
const saving = ref(false)
const roles = ref<any[]>([])

const roleDialogVisible = ref(false)
const isEditingRole = ref(false)
const roleFormRef = ref()
const roleForm = ref({
  id: null as number | null,
  name: '',
  code: '',
  description: '',
  status: '启用'
})

const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const fetchApi = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return res.json()
}

const loadRoles = async () => {
  loading.value = true
  try {
    const data = await fetchApi(`${API_BASE}/roles`)
    if (data.success) {
      roles.value = data.data
    }
  } catch (error) {
    console.error('加载角色失败:', error)
    ElMessage.error('加载角色失败')
  } finally {
    loading.value = false
  }
}

const openAddRoleDialog = () => {
  isEditingRole.value = false
  roleForm.value = { id: null, name: '', code: '', description: '', status: '启用' }
  roleDialogVisible.value = true
}

const editRole = (role: any) => {
  isEditingRole.value = true
  roleForm.value = { ...role }
  roleDialogVisible.value = true
}

const saveRole = async () => {
  if (!roleFormRef.value) return
  await roleFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    saving.value = true
    try {
      let data
      if (isEditingRole.value && roleForm.value.id) {
        data = await fetchApi(`${API_BASE}/roles/${roleForm.value.id}`, {
          method: 'PUT',
          body: JSON.stringify(roleForm.value)
        })
      } else {
        data = await fetchApi(`${API_BASE}/roles`, {
          method: 'POST',
          body: JSON.stringify(roleForm.value)
        })
      }
      if (data.success) {
        ElMessage.success(isEditingRole.value ? '角色更新成功' : '角色创建成功')
        roleDialogVisible.value = false
        await loadRoles()
      } else {
        ElMessage.error(data.message || '操作失败')
      }
    } catch (error) {
      console.error('保存角色失败:', error)
      ElMessage.error('保存角色失败')
    } finally {
      saving.value = false
    }
  })
}

const deleteRole = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该角色吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    loading.value = true
    const data = await fetchApi(`${API_BASE}/roles/${id}`, { method: 'DELETE' })
    if (data.success) {
      ElMessage.success('角色删除成功')
      await loadRoles()
    } else {
      ElMessage.error('删除角色失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除角色失败')
    }
  } finally {
    loading.value = false
  }
}

const emit = defineEmits<{
  assignPermissions: [role: any]
}>()

const assignPermissions = (role: any) => {
  emit('assignPermissions', role)
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.management-section {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.subsection-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.add-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
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

.table-container {
  overflow-x: auto;
}

.data-table {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

.data-table th {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.data-table td {
  color: rgba(51, 51, 51, 0.8) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2) !important;
}

.data-table tr:hover {
  background: rgba(100, 149, 237, 0.1) !important;
}

.edit-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.edit-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.perm-btn {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4CAF50 !important;
  border: 1px solid rgba(76, 175, 80, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.perm-btn:hover {
  background: rgba(76, 175, 80, 0.3) !important;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.4) !important;
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

.dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.dialog .el-dialog__title {
  color: #333 !important;
  font-weight: 600 !important;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
}

.dialog .el-form-item__label {
  color: rgba(51, 51, 51, 0.8) !important;
  font-weight: 500 !important;
}

.dialog .dialog-footer .el-button {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #333 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.dialog .dialog-footer .el-button:hover {
  background: rgba(255, 255, 255, 1) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(100, 149, 237, 0.6) !important;
}
</style>
