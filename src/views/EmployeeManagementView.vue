<template>
  <div class="employee-management-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/employee-management" class="nav-item active">员工管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 员工管理 -->
        <div class="employee-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C13.67 13 9 14.17 9 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
                </svg>
              </span>
              员工管理
            </h2>
            <el-button type="primary" @click="openAddEmployeeDialog" class="add-btn">
              添加员工
            </el-button>
          </div>

          <!-- 搜索和筛选-->
          <div class="search-filter">
            <el-input
              v-model="searchQuery"
              placeholder="搜索员工姓名或工号"
              prefix-icon="Search"
              class="search-input"
            />
            <el-select v-model="departmentFilter" placeholder="筛选部门" class="filter-select">
              <el-option label="全部部门" value="" />
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
            <el-select v-model="statusFilter" placeholder="筛选状态" class="filter-select">
              <el-option label="全部状态" value="" />
              <el-option label="在职" value="在职" />
              <el-option label="离职" value="离职" />
              <el-option label="试用期" value="试用期" />
              <el-option label="休假" value="休假" />
            </el-select>
            <el-select v-model="employeeTypeFilter" placeholder="筛选类型" class="filter-select">
              <el-option label="全部类型" value="" />
              <el-option label="正式员工" value="正式员工" />
              <el-option label="实习生" value="实习生" />
              <el-option label="外包" value="外包" />
            </el-select>
          </div>

          <!-- Excel导入导出按钮 -->
          <div class="excel-actions">
            <el-button type="success" @click="exportEmployees" :loading="exportLoading">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
            <el-button type="warning" @click="showImportDialog">
              <el-icon><Upload /></el-icon> 导入Excel
            </el-button>
          </div>

          <!-- 员工列表 -->
          <div class="employee-list">
            <el-table :data="filteredEmployees" style="width: 100%" class="employee-table" stripe>
              <el-table-column prop="name" label="姓名" width="100" fixed="left" />
              <el-table-column prop="department" label="部门" width="100" />
              <el-table-column prop="position" label="职位" width="120" />
              <el-table-column prop="email" label="邮箱" min-width="150" show-overflow-tooltip />
              <el-table-column prop="phone" label="电话" width="120" />
              <el-table-column prop="entryDate" label="入职日期" width="100" :formatter="(row) => row.entryDate ? new Date(row.entryDate).toLocaleDateString() : '-'" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ row.status || '在职' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="employeeType" label="类型" width="90">
                <template #default="{ row }">
                  <el-tag :type="getEmployeeTypeType(row.employeeType)" size="small">
                    {{ row.employeeType || '正式员工' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="education" label="学历" width="80" />
              <el-table-column prop="emergencyContact" label="紧急联系人" width="100" show-overflow-tooltip />
              <el-table-column prop="emergencyPhone" label="紧急电话" width="120" />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="editEmployee(row)" class="edit-btn">
                    编辑
                  </el-button>
                  <el-button size="small" @click="deleteEmployee(row.name)" class="delete-btn">
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
              :total="filteredEmployees.length"
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

    <!-- 添加员工对话框-->
    <el-dialog
      v-model="addDialogVisible"
      title="添加员工"
      width="600px"
      class="dialog"
    >
      <el-form :model="employeeForm" :rules="employeeRules" ref="employeeFormRef" label-position="top" class="employee-form">
        <div class="form-row">
          <el-form-item label="姓名" class="form-item">
            <el-input v-model="employeeForm.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="部门" class="form-item">
            <el-select v-model="employeeForm.department" placeholder="请选择部门" @change="handleDepartmentChange">
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="职位" class="form-item">
            <el-select v-model="employeeForm.position" placeholder="请选择职位">
              <el-option
                v-for="position in availablePositions"
                :key="position"
                :label="position"
                :value="position"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="邮箱" class="form-item">
            <el-input v-model="employeeForm.email" placeholder="请输入邮箱" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="电话" class="form-item">
            <el-input v-model="employeeForm.phone" placeholder="请输入电话" />
          </el-form-item>
          <el-form-item label="登录密码" class="form-item">
            <el-input v-model="employeeForm.password" type="password" placeholder="请输入登录密码" show-password />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="入职日期" class="form-item">
            <el-date-picker
              v-model="employeeForm.entryDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <!-- 扩展信息 -->
        <el-divider>扩展信息</el-divider>
        
        <div class="form-row">
          <el-form-item label="员工状态" class="form-item">
            <el-select v-model="employeeForm.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="在职" value="在职" />
              <el-option label="离职" value="离职" />
              <el-option label="试用期" value="试用期" />
              <el-option label="休假" value="休假" />
            </el-select>
          </el-form-item>
          <el-form-item label="员工类型" class="form-item">
            <el-select v-model="employeeForm.employeeType" placeholder="请选择类型" style="width: 100%">
              <el-option label="正式员工" value="正式员工" />
              <el-option label="实习生" value="实习生" />
              <el-option label="外包" value="外包" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="学历" class="form-item">
            <el-select v-model="employeeForm.education" placeholder="请选择学历" style="width: 100%">
              <el-option label="博士" value="博士" />
              <el-option label="硕士" value="硕士" />
              <el-option label="本科" value="本科" />
              <el-option label="大专" value="大专" />
              <el-option label="高中" value="高中" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="出生日期" class="form-item">
            <el-date-picker
              v-model="employeeForm.birthDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="身份证号" class="form-item">
            <el-input v-model="employeeForm.idCard" placeholder="请输入身份证号" />
          </el-form-item>
          <el-form-item label="地址" class="form-item">
            <el-input v-model="employeeForm.address" placeholder="请输入地址" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="紧急联系人" class="form-item">
            <el-input v-model="employeeForm.emergencyContact" placeholder="请输入紧急联系人姓名" />
          </el-form-item>
          <el-form-item label="紧急联系电话" class="form-item">
            <el-input v-model="employeeForm.emergencyPhone" placeholder="请输入紧急联系电话" />
          </el-form-item>
        </div>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addEmployee">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑员工对话框-->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑员工"
      width="600px"
      class="dialog"
    >
      <el-form :model="editForm" :rules="employeeRules" ref="editFormRef" label-position="top" class="employee-form">
        <div class="form-row">
          <el-form-item label="姓名" class="form-item">
            <el-input v-model="editForm.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="部门" class="form-item">
            <el-select v-model="editForm.department" placeholder="请选择部门" @change="handleEditDepartmentChange">
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="职位" class="form-item">
            <el-select v-model="editForm.position" placeholder="请选择职位">
              <el-option
                v-for="position in editAvailablePositions"
                :key="position"
                :label="position"
                :value="position"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="邮箱" class="form-item">
            <el-input v-model="editForm.email" placeholder="请输入邮箱" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="电话" class="form-item">
            <el-input v-model="editForm.phone" placeholder="请输入电话" />
          </el-form-item>
          <el-form-item label="登录密码" class="form-item">
            <el-input v-model="editForm.password" type="password" placeholder="不修改则保留原密码" show-password />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="入职日期" class="form-item">
            <el-date-picker
              v-model="editForm.entryDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <!-- 扩展信息 -->
        <el-divider>扩展信息</el-divider>
        
        <div class="form-row">
          <el-form-item label="员工状态" class="form-item">
            <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="在职" value="在职" />
              <el-option label="离职" value="离职" />
              <el-option label="试用期" value="试用期" />
              <el-option label="休假" value="休假" />
            </el-select>
          </el-form-item>
          <el-form-item label="员工类型" class="form-item">
            <el-select v-model="editForm.employeeType" placeholder="请选择类型" style="width: 100%">
              <el-option label="正式员工" value="正式员工" />
              <el-option label="实习生" value="实习生" />
              <el-option label="外包" value="外包" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="学历" class="form-item">
            <el-select v-model="editForm.education" placeholder="请选择学历" style="width: 100%">
              <el-option label="博士" value="博士" />
              <el-option label="硕士" value="硕士" />
              <el-option label="本科" value="本科" />
              <el-option label="大专" value="大专" />
              <el-option label="高中" value="高中" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="出生日期" class="form-item">
            <el-date-picker
              v-model="editForm.birthDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="身份证号" class="form-item">
            <el-input v-model="editForm.idCard" placeholder="请输入身份证号" />
          </el-form-item>
          <el-form-item label="联系地址" class="form-item">
            <el-input v-model="editForm.address" placeholder="请输入联系地址" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="紧急联系人" class="form-item">
            <el-input v-model="editForm.emergencyContact" placeholder="请输入紧急联系人" />
          </el-form-item>
          <el-form-item label="紧急联系电话" class="form-item">
            <el-input v-model="editForm.emergencyPhone" placeholder="请输入紧急联系电话" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateEmployee">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEmployees, addEmployee as apiAddEmployee, deleteEmployee as apiDeleteEmployee, updateEmployee as apiUpdateEmployee, getDepartments } from '../services/api'

const router = useRouter()

const handleBack = () => {
  // 返回上一页
  router.back()
}

interface Employee {
  id?: number
  name: string
  department: string
  position: string
  email: string
  phone: string
  entryDate: string
  createdAt: string
  password?: string
  // 扩展字段
  status?: string
  employeeType?: string
  education?: string
  birthDate?: string
  idCard?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
}

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const searchQuery = ref('')
const departmentFilter = ref('')
const statusFilter = ref('')
const employeeTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const exportLoading = ref(false)
const departments = ref<any[]>([])

const employeeForm = ref({
  name: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  entryDate: '',
  password: '',
  // 扩展字段
  status: '在职',
  employeeType: '正式员工',
  education: '',
  birthDate: '',
  idCard: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: ''
})

const employeeFormRef = ref()
const editFormRef = ref()

const editForm = ref({
  name: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  entryDate: '',
  password: '',
  // 扩展字段
  status: '在职',
  employeeType: '正式员工',
  education: '',
  birthDate: '',
  idCard: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: ''
})

// 职位选项配置
  const positionOptions = {
    '销售部': ['销售部经理', '销售'],
    '技术部': ['技术部经理', '项目经理', '系统运维工程师', '软件研发工程师'],
    '财务部': ['财务总监'],
  '人力资源部': ['人事经理'],
  '管理部门': ['总经理']
}

// 添加员工时的可用职位
const availablePositions = computed(() => {
  const department = employeeForm.value.department
  return positionOptions[department] || []
})

// 编辑员工时的可用职位
const editAvailablePositions = computed(() => {
  const department = editForm.value.department
  return positionOptions[department] || []
})

// 处理部门变化
const handleDepartmentChange = () => {
  employeeForm.value.position = ''
}

// 处理编辑时的部门变化
const handleEditDepartmentChange = () => {
  editForm.value.position = ''
}

const employeeRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '请选择部门', trigger: 'change' }
  ],
  position: [
    { required: true, message: '请选择职位', trigger: 'change' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' }
  ],
  entryDate: [
    { required: true, message: '请选择入职日期', trigger: 'change' }
  ]
}

const employees = ref<Employee[]>([])

// 从API加载员工数据
const loadEmployees = async () => {
  loading.value = true
  try {
    // 调用API获取员工数据
    const response = await getEmployees();
    console.log('API返回的数�?', response);
    if (response.success) {
      console.log('员工数据:', response.data);
      // 检查员工数据的结构
      if (response.data && response.data.length > 0) {
        console.log('第一个员工的数据结构:', response.data[0]);
        console.log('第一个员工的ID:', response.data[0].id);
      }
      employees.value = response.data;
      console.log('赋值后的employees:', employees.value);
    } else {
      ElMessage.error('加载员工数据失败')
    }
  } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error('加载员工数据失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadEmployees()
  await loadDepartments()
})

const filteredEmployees = computed(() => {
  let result = employees.value
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(emp => 
      emp.name.toLowerCase().includes(query)
    )
  }
  
  // 部门过滤
  if (departmentFilter.value) {
    result = result.filter(emp => emp.department === departmentFilter.value)
  }
  
  // 状态过�?
  if (statusFilter.value) {
    result = result.filter(emp => emp.status === statusFilter.value)
  }
  
  // 员工类型过滤
  if (employeeTypeFilter.value) {
    result = result.filter(emp => emp.employeeType === employeeTypeFilter.value)
  }
  
  return result
})

const openAddEmployeeDialog = async () => {
  employeeForm.value = {
    name: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    entryDate: '',
    password: ''
  }
  // 加载部门列表
  await loadDepartments()
  addDialogVisible.value = true
}

// 加载部门列表
const loadDepartments = async () => {
  try {
    const response = await getDepartments()
    if (response.success) {
      departments.value = response.data
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

const addEmployee = async () => {
  if (employeeFormRef.value) {
    employeeFormRef.value.validate(async (valid: boolean) => {
      if (valid) {
        loading.value = true
        try {
          console.log('添加员工前的表单数据:', employeeForm.value);
          // 调用API添加员工
          const response = await apiAddEmployee({
            name: employeeForm.value.name,
            department: employeeForm.value.department,
            position: employeeForm.value.position,
            email: employeeForm.value.email,
            phone: employeeForm.value.phone,
            entryDate: employeeForm.value.entryDate || new Date().toISOString(),
            password: employeeForm.value.password,
            // 扩展字段
            status: employeeForm.value.status,
            employeeType: employeeForm.value.employeeType,
            education: employeeForm.value.education,
            birthDate: employeeForm.value.birthDate,
            idCard: employeeForm.value.idCard,
            address: employeeForm.value.address,
            emergencyContact: employeeForm.value.emergencyContact,
            emergencyPhone: employeeForm.value.emergencyPhone
          });
          
          console.log('添加员工的API响应:', response);
          if (response.success) {
            ElMessage.success('员工添加成功')
            // 重新加载数据
            console.log('重新加载员工数据...');
            await loadEmployees()
            addDialogVisible.value = false
          } else {
            ElMessage.error('添加员工失败')
          }
        } catch (error) {
          console.error('添加员工失败:', error)
          ElMessage.error('添加员工失败')
        } finally {
          loading.value = false
        }
      }
    })
  }
}

const editEmployee = async (employee: Employee) => {
  // 填充编辑表单数据
  editForm.value = {
    name: employee.name,
    department: employee.department,
    position: employee.position,
    email: employee.email,
    phone: employee.phone,
    entryDate: employee.entryDate,
    password: '********',
    // 扩展字段
    status: employee.status || '在职',
    employeeType: employee.employeeType || '正式员工',
    education: employee.education || '',
    birthDate: employee.birthDate || '',
    idCard: employee.idCard || '',
    address: employee.address || '',
    emergencyContact: employee.emergencyContact || '',
    emergencyPhone: employee.emergencyPhone || ''
  }
  // 加载部门列表
  await loadDepartments()
  editDialogVisible.value = true
}

const updateEmployee = async () => {
  console.log('开始更新员�?', editForm.value)
  if (editFormRef.value) {
    editFormRef.value.validate(async (valid: boolean) => {
      console.log('表单验证结果:', valid)
      if (valid) {
        loading.value = true
        try {
          // 调用API更新员工
          console.log('调用API更新员工:', editForm.value)
          const updateData: any = {
            name: editForm.value.name,
            department: editForm.value.department,
            position: editForm.value.position,
            email: editForm.value.email,
            phone: editForm.value.phone,
            entryDate: editForm.value.entryDate || new Date().toISOString(),
            // 扩展字段
            status: editForm.value.status,
            employeeType: editForm.value.employeeType,
            education: editForm.value.education,
            birthDate: editForm.value.birthDate,
            idCard: editForm.value.idCard,
            address: editForm.value.address,
            emergencyContact: editForm.value.emergencyContact,
            emergencyPhone: editForm.value.emergencyPhone
          };
          // 仅当密码被修改时才发送
          if (editForm.value.password && editForm.value.password !== '********') {
            updateData.password = editForm.value.password;
          }
          const response = await apiUpdateEmployee(updateData);
          
          console.log('API响应:', response)
          if (response.success) {
            ElMessage.success('员工更新成功')
            // 重新加载数据
            await loadEmployees()
            editDialogVisible.value = false
          } else {
            console.error('更新失败:', response.message)
            ElMessage.error('更新员工失败')
          }
        } catch (error) {
          console.error('更新员工失败:', error)
          ElMessage.error('更新员工失败')
        } finally {
          loading.value = false
        }
      }
    })
  } else {
    console.error('editFormRef未定义')
  }
}

const deleteEmployee = (name: string) => {
  try {
    ElMessageBox.confirm('确定要删除该员工吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      loading.value = true
      try {
        // 调用API删除员工
        const response = await apiDeleteEmployee(name);
        if (response.success) {
          // 重新加载数据
          await loadEmployees()
          ElMessage.success('员工删除成功')
        } else {
          ElMessage.error('删除员工失败')
        }
      } catch (error) {
        console.error('删除员工失败:', error)
        ElMessage.error('删除员工失败')
      } finally {
        loading.value = false
      }
    }).catch(() => {
      // 取消删除
    })
  } catch (error) {
    console.error('删除员工失败:', error)
    ElMessage.error('删除员工失败')
  }
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (current: number) => {
  currentPage.value = current
}

// 获取状态标签类�?
const getStatusType = (status: string) => {
  switch (status) {
    case '在职': return 'success'
      case '离职': return 'danger'
      case '试用期': return 'warning'
      case '休假': return 'info'
      default: return 'success'
  }
}

// 获取员工类型标签类型
const getEmployeeTypeType = (type: string) => {
  switch (type) {
      case '正式员工': return 'success'
      case '实习生': return 'warning'
      case '外包': return 'info'
      default: return 'success'
  }
}

// Excel导出员工数据
const exportEmployees = async () => {
  exportLoading.value = true
  try {
    const response = await fetch('http://localhost:3005/api/employees/export')
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `员工数据_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      ElMessage.success('导出成功')
    } else {
      ElMessage.error('导出失败')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 显示导入对话�?
const showImportDialog = () => {
  // 创建文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        if (jsonData.length === 0) {
          ElMessage.warning('Excel文件为空')
          return
        }
        
        // 转换数据格式
        const employees = jsonData.map((row: any) => ({
          name: row['姓名'] || row['name'],
          department: row['部门'] || row['department'],
          position: row['职位'] || row['position'],
          email: row['邮箱'] || row['email'] || '',
          phone: row['电话'] || row['phone'] || '',
          entryDate: row['入职日期'] || row['entryDate'],
          status: row['员工状态'] || row['status'] || '在职',
          employeeType: row['员工类型'] || row['employeeType'] || '正式员工',
          education: row['学历'] || row['education'] || '',
          birthDate: row['出生日期'] || row['birthDate'] || '',
          idCard: row['身份证号'] || row['idCard'] || '',
          address: row['地址'] || row['address'] || '',
          emergencyContact: row['紧急联系人'] || row['emergencyContact'] || '',
          emergencyPhone: row['紧急联系电话'] || row['emergencyPhone'] || ''
        }))
        
        // 调用导入API
        const response = await fetch('/api/employees/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employees })
        })
        
        const result = await response.json()
        if (result.success) {
          ElMessage.success(result.message)
          await loadEmployees()
        } else {
          ElMessage.error(result.message || '导入失败')
        }
      } catch (error) {
        console.error('导入失败:', error)
        ElMessage.error('导入失败，请检查文件格式')
      }
    }
    reader.readAsBinaryString(file)
  }
  input.click()
}

// 导入XLSX�?
import * as XLSX from 'xlsx'
</script>

<style scoped>
.employee-management-container {
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
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
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
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
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

/* 员工管理 */
.employee-section {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
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
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
}

.add-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(100, 149, 237, 0.6) !important;
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
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1) !important;
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

/* 员工列表 */
.employee-list {
  margin-bottom: 1.5rem;
}

.employee-table {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

.employee-table th {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.employee-table td {
  color: rgba(51, 51, 51, 0.8) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2) !important;
}

.employee-table tr:hover {
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

/* 员工表单样式 */
.employee-form {
  padding: 0 10px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.form-item {
  flex: 1;
  min-width: 250px;
}

.form-item.full-width {
  flex: 100%;
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
  background: linear-gradient(45deg, #6495ED, #87CEFA) !important;
  border: none !important;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(100, 149, 237, 0.6) !important;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
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
  background: rgba(100, 149, 237, 0.1);
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
