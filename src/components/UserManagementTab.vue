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
          <el-input v-model="pwdForm.password" type="password" placeholder="至少10位，含大小写、数字和特殊字符" show-password />
          <div v-if="pwdForm.password" class="pwd-strength-mini">
            <div class="pwd-strength-mini-bar">
              <div class="pwd-strength-mini-fill" :class="pwdStrength.class" :style="{ width: pwdStrength.percent + '%' }"></div>
            </div>
            <span class="pwd-strength-mini-label" :class="pwdStrength.class">强度：{{ pwdStrength.label }}</span>
          </div>
        </el-form-item>
        <el-form-item label="当前登录密码" required>
          <el-input v-model="pwdForm.adminPassword" type="password" placeholder="请输入您的当前登录密码以确认" show-password />
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
      top="8vh"
      :close-on-click-modal="false"
    >
      <div class="dialog-scroll">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" :disabled="isEditingUser" />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-select v-model="userForm.department" placeholder="请选择部门" style="width: 100%" filterable @change="handleDepartmentChange" :disabled="isEditingUser">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="职位" prop="position">
          <el-select v-model="userForm.position" placeholder="请选择职位" style="width: 100%" filterable :disabled="isEditingUser">
            <el-option
              v-for="position in availablePositions"
              :key="position"
              :label="position"
              :value="position"
            />
          </el-select>
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
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 初始密码展示对话框（纯文本显示，支持一键复制）-->
    <el-dialog
      v-model="initPwdDialogVisible"
      title="用户初始密码"
      width="460px"
      class="dialog"
      :close-on-click-modal="false"
      :show-close="true"
    >
      <div style="padding: 10px 0;">
        <p style="margin: 0 0 12px; color: #555; font-size: 14px;">
          用户「<strong>{{ initPwdEmployeeName }}</strong>」的初始密码如下，请妥善告知用户：
        </p>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <el-input
            :model-value="initPwdValue"
            readonly
            :type="initPwdVisible ? 'text' : 'password'"
            style="flex: 1; font-family: Consolas, monospace; font-size: 14px;"
          >
            <template #suffix>
              <span style="cursor: pointer; color: #409EFF; font-size: 13px;" @click="initPwdVisible = !initPwdVisible">
                {{ initPwdVisible ? '隐藏' : '显示' }}
              </span>
            </template>
          </el-input>
          <el-button type="primary" @click="copyInitPwd">复制</el-button>
        </div>
        <p style="margin: 0; color: #f56c6c; font-size: 13px;">
          请将此密码告知用户，用户登录后请在【修改密码】中更改为自己的密码。
        </p>
      </div>
      <template #footer>
        <el-button type="primary" @click="initPwdDialogVisible = false">我已复制</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = '/api'

const users = ref<any[]>([])
const roles = ref<any[]>([])
const departments = ref<any[]>([])
const userLoading = ref(false)
const saving = ref(false)

// 职位选项配置（与添加员工页面保持一致）
const positionOptions: Record<string, string[]> = {
  '销售部': ['销售部经理', '销售代表', '销售工程师', '区域销售经理', '大客户经理', '销售内勤'],
  '技术部': ['技术部经理', '项目经理', '系统运维工程师', '软件研发工程师', '前端开发工程师', '后端开发工程师', '测试工程师', '技术支持工程师', '数据库管理员', '网络安全工程师'],
  '财务部': ['财务总监', '财务经理', '会计', '出纳', '成本会计', '税务专员', '审计专员'],
  '人力资源部': ['人事经理', '人事专员', '招聘专员', '培训专员', '薪酬福利专员', '绩效专员'],
  '管理部门': ['总经理', '副总经理', '总经理助理', '办公室主任', '行政主管', '行政专员', '前台'],
  '采购部': ['采购经理', '采购专员', '供应商管理专员'],
  '市场部': ['市场经理', '市场专员', '品牌推广专员', '文案策划'],
  '客服部': ['客服经理', '客服专员', '售后专员']
}

// 根据所选部门返回可用职位
const availablePositions = computed(() => {
  const department = userForm.value.department
  return positionOptions[department] || []
})

// 处理部门变化时清空职位
const handleDepartmentChange = () => {
  userForm.value.position = ''
}

const userDialogVisible = ref(false)
const isEditingUser = ref(false)
const userFormRef = ref()
const pwdDialogVisible = ref(false)
const pwdSaving = ref(false)
const pwdForm = ref({ username: '', password: '', adminPassword: '' })
// 初始密码展示对话框状态
const initPwdDialogVisible = ref(false)
const initPwdValue = ref('')
const initPwdEmployeeName = ref('')
const initPwdVisible = ref(false)

// 重置密码强度计算
const pwdStrength = computed(() => {
  const v = pwdForm.value.password || ''
  const c = {
    lengthOk: v.length >= 10,
    lowerOk: /[a-z]/.test(v),
    upperOk: /[A-Z]/.test(v),
    digitOk: /\d/.test(v),
    specialOk: /[^A-Za-z0-9]/.test(v)
  }
  const met = Object.values(c).filter(Boolean).length
  if (!v) return { percent: 0, class: '', label: '' }
  if (met <= 2) return { percent: 25, class: 'weak', label: '弱' }
  if (met === 3) return { percent: 50, class: 'medium', label: '中' }
  if (met === 4) return { percent: 75, class: 'good', label: '较强' }
  return { percent: 100, class: 'strong', label: '强' }
})

// 复制初始密码到剪贴板
const copyInitPwd = async () => {
  try {
    await navigator.clipboard.writeText(initPwdValue.value)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    try {
      const ta = document.createElement('textarea')
      ta.value = initPwdValue.value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ElMessage.success('已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}
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
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  position: [{ required: true, message: '请选择职位', trigger: 'change' }]
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

const loadDepartments = async () => {
  try {
    const data = await fetchApi(`${API_BASE}/departments`)
    if (data.success) {
      departments.value = data.data || []
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
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
        const result = await fetchApi(`${API_BASE}/employees`, {
          method: 'POST',
          body: JSON.stringify(userForm.value)
        })
        if (result.initialPassword) {
          initPwdValue.value = String(result.initialPassword)
          initPwdEmployeeName.value = userForm.value.name || ''
          initPwdVisible.value = true
          initPwdDialogVisible.value = true
        }
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
    // 二次验证：输入当前登录密码
    const { value } = await ElMessageBox.prompt(
      `此操作将永久删除用户"${row.name}"（含其登录账号），请输入您的当前登录密码以确认：`,
      '高危操作确认',
      { inputType: 'password', confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
    const result = await fetchApi(`${API_BASE}/employees/${row.name}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminPassword: value })
    })
    if (!result.success) {
      ElMessage.error(result.message || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const resetPassword = (row: any) => {
  pwdForm.value = { username: row.name, password: '', adminPassword: '' }
  pwdDialogVisible.value = true
}

const savePassword = async () => {
  if (!pwdForm.value.password) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (!pwdForm.value.adminPassword) {
    ElMessage.warning('请输入当前登录密码进行二次验证')
    return
  }
  try {
    pwdSaving.value = true
    const result = await fetchApi(`${API_BASE}/employees/${pwdForm.value.username}`, {
      method: 'PUT',
      body: JSON.stringify({ password: pwdForm.value.password, adminPassword: pwdForm.value.adminPassword })
    })
    if (!result.success) {
      ElMessage.error(result.message || '密码重置失败')
      return
    }
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
  loadDepartments()
  loadUsers()
})
</script>

<style scoped>
/* 对话框内容区可滚动，避免小屏幕下底部按钮被遮挡 */
.dialog-scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}
.pwd-strength-mini {
  width: 100%;
  margin-top: 4px;
}
.pwd-strength-mini-bar {
  height: 5px;
  border-radius: 3px;
  background: #ebeef5;
  overflow: hidden;
}
.pwd-strength-mini-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s, background-color 0.3s;
}
.pwd-strength-mini-fill.weak { background: #f56c6c; }
.pwd-strength-mini-fill.medium { background: #e6a23c; }
.pwd-strength-mini-fill.good { background: #409eff; }
.pwd-strength-mini-fill.strong { background: #67c23a; }
.pwd-strength-mini-label {
  display: block;
  margin-top: 3px;
  font-size: 12px;
}
.pwd-strength-mini-label.weak { color: #f56c6c; }
.pwd-strength-mini-label.medium { color: #e6a23c; }
.pwd-strength-mini-label.good { color: #409eff; }
.pwd-strength-mini-label.strong { color: #67c23a; }

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
