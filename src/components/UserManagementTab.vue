<template>
  <div class="management-section">
    <div class="section-header">
      <h3 class="subsection-title">用户列表</h3>
      <el-button type="primary" @click="openAddUserDialog" class="add-btn">
        添加用户
      </el-button>
    </div>

    <div class="table-container">
      <el-table :data="users" style="width: 100%" class="data-table" v-loading="userLoading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="position" label="职位" width="120" />
        <el-table-column prop="roleId" label="角色" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.roleId" size="small" type="info">{{ getRoleName(row.roleId) }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '在职' ? 'success' : 'danger'">
              {{ row.status || '在职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)" class="edit-btn">编辑</el-button>
            <el-button size="small" @click="resetPassword(row)" class="reset-pwd-btn">重置密码</el-button>
            <el-button size="small" type="danger" @click="deleteUser(row)" class="delete-btn">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="pwdDialogVisible" title="重置密码" width="420px" class="dialog">
      <el-form :model="pwdForm" label-position="top">
        <el-form-item label="用户名">
          <el-input :model-value="pwdForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="pwdForm.password" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePassword" :loading="pwdSaving">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="userDialogVisible"
      :title="isEditingUser ? '编辑用户' : '添加用户'"
      width="500px"
      class="dialog"
    >
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" :disabled="isEditingUser" />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-input v-model="userForm.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="职位">
          <el-input v-model="userForm.position" placeholder="请输入职位" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.roleId" placeholder="请选择角色" style="width: 100%" clearable>
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="userForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="userForm.status">
            <el-radio label="在职">在职</el-radio>
            <el-radio label="离职">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = 'http://localhost:3005/api'

const users = ref<any[]>([])
const roles = ref<any[]>([])
const userLoading = ref(false)
const saving = ref(false)

const userDialogVisible = ref(false)
const isEditingUser = ref(false)
const userFormRef = ref()
const pwdDialogVisible = ref(false)
const pwdSaving = ref(false)
const pwdForm = ref({ username: '', password: '' })
const userForm = ref({
  id: null as number | null,
  name: '',
  department: '',
  position: '',
  roleId: null as number | null,
  phone: '',
  email: '',
  status: '在职'
})

const userRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  department: [{ required: true, message: '请输入部门', trigger: 'blur' }]
}

const fetchApi = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return res.json()
}

const getRoleName = (roleId: number) => {
  const role = roles.value.find((r: any) => r.id === roleId)
  return role ? role.name : '-'
}

const loadRoles = async () => {
  try {
    const data = await fetchApi(`${API_BASE}/roles`)
    if (data.success) {
      roles.value = data.data
    }
  } catch (error) {
    console.error('加载角色失败:', error)
  }
}

const loadUsers = async () => {
  try {
    userLoading.value = true
    const data = await fetchApi(`${API_BASE}/employees`)
    if (data.success) {
      users.value = data.data || []
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    userLoading.value = false
  }
}

const openAddUserDialog = () => {
  isEditingUser.value = false
  userForm.value = { id: null, name: '', department: '', position: '', roleId: null, phone: '', email: '', status: '在职' }
  userDialogVisible.value = true
}

const editUser = (row: any) => {
  isEditingUser.value = true
  userForm.value = {
    id: row.id,
    name: row.name,
    department: row.department,
    position: row.position || '',
    roleId: row.roleId || null,
    phone: row.phone || '',
    email: row.email || '',
    status: row.status || '在职'
  }
  userDialogVisible.value = true
}

const saveUser = async () => {
  if (!userFormRef.value) return
  await userFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      saving.value = true
      if (isEditingUser.value) {
        await fetchApi(`${API_BASE}/employees/${userForm.value.name}`, {
          method: 'PUT',
          body: JSON.stringify(userForm.value)
        })
        ElMessage.success('更新成功')
      } else {
        await fetchApi(`${API_BASE}/employees`, {
          method: 'POST',
          body: JSON.stringify(userForm.value)
        })
        ElMessage.success('添加成功')
      }
      userDialogVisible.value = false
      loadUsers()
    } catch (error) {
      ElMessage.error('操作失败')
    } finally {
      saving.value = false
    }
  })
}

const deleteUser = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户"${row.name}"吗？`, '确认删除', { type: 'warning' })
    await fetchApi(`${API_BASE}/employees/${row.name}`, { method: 'DELETE' })
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const resetPassword = (row: any) => {
  pwdForm.value = { username: row.name, password: '' }
  pwdDialogVisible.value = true
}

const savePassword = async () => {
  if (!pwdForm.value.password) {
    ElMessage.warning('请输入新密码')
    return
  }
  try {
    pwdSaving.value = true
    await fetchApi(`${API_BASE}/employees/${pwdForm.value.username}`, {
      method: 'PUT',
      body: JSON.stringify({ password: pwdForm.value.password })
    })
    ElMessage.success('密码重置成功')
    pwdDialogVisible.value = false
  } catch (error) {
    ElMessage.error('密码重置失败')
  } finally {
    pwdSaving.value = false
  }
}

onMounted(() => {
  loadRoles()
  loadUsers()
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

.delete-btn {
  background: rgba(244, 67, 54, 0.2) !important;
  color: #f44336 !important;
  border: 1px solid rgba(244, 67, 54, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.reset-pwd-btn {
  background: rgba(255, 152, 0, 0.2) !important;
  color: #ff9800 !important;
  border: 1px solid rgba(255, 152, 0, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.reset-pwd-btn:hover {
  background: rgba(255, 152, 0, 0.3) !important;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.4) !important;
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
