<template>
  <div class="oa-approval-container">
    <h1>OA审批中心</h1>
    
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" @click="activeTab = 'todo'">
        <div class="stat-number">{{ stats.todo }}</div>
        <div class="stat-label">待办审批</div>
      </div>
      <div class="stat-card" @click="activeTab = 'done'">
        <div class="stat-number">{{ stats.done }}</div>
        <div class="stat-label">已办审批</div>
      </div>
      <div class="stat-card" @click="activeTab = 'my'">
        <div class="stat-number">{{ stats.my }}</div>
        <div class="stat-label">我的申请</div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button type="primary" @click="showSubmitDialog = true">
        <el-icon><Plus /></el-icon> 发起申请
      </el-button>
    </div>
    
    <!-- 标签�?-->
    <el-tabs v-model="activeTab" class="approval-tabs">
      <!-- 待办审批 -->
      <el-tab-pane label="待办审批" name="todo">
        <el-table :data="todoList" style="width: 100%" v-loading="loading">
          <el-table-column prop="id" label="申请编号" width="100" />
          <el-table-column prop="businessType" label="申请类型" width="120" />
          <el-table-column prop="applicantName" label="申请人" width="100" />
          <el-table-column prop="applicantDept" label="所属部门" width="120" />
          <el-table-column prop="createdAt" label="申请时间" width="180" />
          <el-table-column prop="currentApproverName" label="当前审批人" width="120" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleApprove(scope.row)">审批</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <!-- 已办审批 -->
      <el-tab-pane label="已办审批" name="done">
        <el-table :data="doneList" style="width: 100%" v-loading="loading">
          <el-table-column prop="instanceId" label="申请编号" width="100" />
          <el-table-column prop="businessType" label="申请类型" width="120" />
          <el-table-column prop="applicantName" label="申请人" width="100" />
          <el-table-column prop="action" label="审批操作" width="100">
            <template #default="scope">
              <el-tag :type="getActionType(scope.row.action)">{{ getActionText(scope.row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="审批时间" width="180" />
          <el-table-column prop="comment" label="审批意见" />
        </el-table>
      </el-tab-pane>
      
      <!-- 我的申请 -->
      <el-tab-pane label="我的申请" name="my">
        <el-table :data="myList" style="width: 100%" v-loading="loading">
          <el-table-column prop="id" label="申请编号" width="100" />
          <el-table-column prop="businessType" label="申请类型" width="120" />
          <el-table-column prop="createdAt" label="申请时间" width="180" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="currentApproverName" label="当前审批人" width="120" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button type="primary" size="small" @click="viewDetail(scope.row)">查看</el-button>
              <el-button 
                v-if="scope.row.status === '审批中'" 
                type="danger" 
                size="small" 
                @click="withdrawApplication(scope.row)"
              >
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 发起申请对话�?-->
    <el-dialog v-model="showSubmitDialog" title="发起申请" width="600px">
      <el-form :model="submitForm" label-width="100px">
        <el-form-item label="申请类型">
          <el-select v-model="submitForm.flowCode" placeholder="请选择申请类型" style="width: 100%">
            <el-option label="请假申请" value="leave" />
            <el-option label="报销申请" value="reimburse" />
            <el-option label="采购申请" value="purchase" />
            <el-option label="出差申请" value="business_trip" />
            <el-option label="办公用品申请" value="office_supplies" />
          </el-select>
        </el-form-item>
        
        <!-- 请假申请表单 -->
        <template v-if="submitForm.flowCode === 'leave'">
          <el-form-item label="请假类型">
            <el-select v-model="submitForm.businessData.leaveType" placeholder="请选择请假类型" style="width: 100%">
              <el-option label="病假" value="病假" />
              <el-option label="事假" value="事假" />
              <el-option label="年假" value="年假" />
              <el-option label="婚假" value="婚假" />
              <el-option label="产假" value="产假" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="submitForm.businessData.startDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="submitForm.businessData.endDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="请假天数">
            <el-input-number v-model="submitForm.businessData.days" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="请假原因">
            <el-input v-model="submitForm.businessData.reason" type="textarea" :rows="3" />
          </el-form-item>
        </template>
        
        <!-- 报销申请表单 -->
        <template v-if="submitForm.flowCode === 'reimburse'">
          <el-form-item label="报销类型">
            <el-select v-model="submitForm.businessData.reimburseType" placeholder="请选择报销类型" style="width: 100%">
              <el-option label="差旅费" value="差旅费" />
              <el-option label="招待费" value="招待费" />
              <el-option label="办公费" value="办公费" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="报销金额">
            <el-input-number v-model="submitForm.businessData.amount" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="报销日期">
            <el-date-picker v-model="submitForm.businessData.reimburseDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="报销说明">
            <el-input v-model="submitForm.businessData.reason" type="textarea" :rows="3" />
          </el-form-item>
        </template>
        
        <!-- 采购申请表单 -->
        <template v-if="submitForm.flowCode === 'purchase'">
          <el-form-item label="物品名称">
            <el-input v-model="submitForm.businessData.itemName" />
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="submitForm.businessData.quantity" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="预估金额">
            <el-input-number v-model="submitForm.businessData.estimatedAmount" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="用途说明">
            <el-input v-model="submitForm.businessData.reason" type="textarea" :rows="3" />
          </el-form-item>
        </template>
        
        <!-- 出差申请表单 -->
        <template v-if="submitForm.flowCode === 'business_trip'">
          <el-form-item label="目的地">
            <el-input v-model="submitForm.businessData.destination" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="submitForm.businessData.startDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="submitForm.businessData.endDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="出差目的">
            <el-input v-model="submitForm.businessData.purpose" type="textarea" :rows="3" />
          </el-form-item>
        </template>
        
        <!-- 办公用品申请表单 -->
        <template v-if="submitForm.flowCode === 'office_supplies'">
          <el-form-item label="物品名称">
            <el-input v-model="submitForm.businessData.itemName" />
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="submitForm.businessData.quantity" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="用途说明">
            <el-input v-model="submitForm.businessData.reason" type="textarea" :rows="3" />
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="showSubmitDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApplication" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>
    
    <!-- 审批对话�?-->
    <el-dialog v-model="showApproveDialog" title="审批处理" width="600px">
      <div v-if="currentApplication" class="approval-detail">
        <h3>申请信息</h3>
        <p><strong>申请编号：</strong>{{ currentApplication.id }}</p>
        <p><strong>申请类型：</strong>{{ currentApplication.businessType }}</p>
        <p><strong>申请人：</strong>{{ currentApplication.applicantName }}</p>
        <p><strong>所属部门：</strong>{{ currentApplication.applicantDept }}</p>
        <p><strong>申请时间：</strong>{{ currentApplication.createdAt }}</p>
        
        <h3>业务数据</h3>
        <div class="business-data">
          <p v-for="(value, key) in currentApplication.businessData" :key="key">
            <strong>{{ formatKey(key) }}：</strong>{{ value }}
          </p>
        </div>
        
        <h3>审批路径</h3>
        <el-steps :active="getCurrentStep" finish-status="success">
          <el-step 
            v-for="(node, index) in currentApplication.approvalPath" 
            :key="index"
            :title="node.name"
            :description="node.position"
          />
        </el-steps>
      </div>
      
      <el-form :model="approveForm" label-width="100px" style="margin-top: 20px;">
        <el-form-item label="审批意见">
          <el-input v-model="approveForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showApproveDialog = false">取消</el-button>
        <el-button type="danger" @click="processApproval('return')">退回修改</el-button>
        <el-button type="warning" @click="processApproval('reject')">驳回</el-button>
        <el-button type="primary" @click="processApproval('agree')" :loading="processing">同意</el-button>
      </template>
    </el-dialog>
    
    <!-- 详情对话�?-->
    <el-dialog v-model="showDetailDialog" title="申请详情" width="600px">
      <div v-if="currentApplication" class="approval-detail">
        <h3>申请信息</h3>
        <p><strong>申请编号：</strong>{{ currentApplication.id }}</p>
        <p><strong>申请类型：</strong>{{ currentApplication.businessType }}</p>
        <p><strong>申请人：</strong>{{ currentApplication.applicantName }}</p>
        <p><strong>所属部门：</strong>{{ currentApplication.applicantDept }}</p>
        <p><strong>申请时间：</strong>{{ currentApplication.createdAt }}</p>
        <p><strong>当前状态：</strong>
          <el-tag :type="getStatusType(currentApplication.status)">{{ currentApplication.status }}</el-tag>
        </p>
        
        <h3>业务数据</h3>
        <div class="business-data">
          <p v-for="(value, key) in currentApplication.businessData" :key="key">
            <strong>{{ formatKey(key) }}：</strong>{{ value }}
          </p>
        </div>
        
        <h3>审批历史</h3>
        <el-timeline v-if="currentApplication.histories && currentApplication.histories.length > 0">
          <el-timeline-item 
            v-for="(history, index) in currentApplication.histories" 
            :key="index"
            :type="getHistoryType(history.action)"
          >
            <p><strong>{{ history.approverName }}</strong> ({{ history.approverPosition }})</p>
            <p>{{ getActionText(history.action) }} - {{ history.createdAt }}</p>
            <p v-if="history.comment">意见：{{ history.comment }}</p>
          </el-timeline-item>
        </el-timeline>
        <p v-else>暂无审批记录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '../services/api'

// 当前用户信息（从localStorage获取�?const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

// 状�?const activeTab = ref('todo')
const loading = ref(false)
const submitting = ref(false)
const processing = ref(false)
const showSubmitDialog = ref(false)
const showApproveDialog = ref(false)
const showDetailDialog = ref(false)

// 统计数据
const stats = reactive({
  todo: 0,
  done: 0,
  my: 0
})

// 列表数据
const todoList = ref([])
const doneList = ref([])
const myList = ref([])

// 当前申请
const currentApplication = ref(null)

// 表单数据
const submitForm = reactive({
  flowCode: 'leave',
  businessData: {}
})

const approveForm = reactive({
  comment: ''
})

// 计算当前步骤
const getCurrentStep = computed(() => {
  if (!currentApplication.value || !currentApplication.value.approvalPath) return 0
  const path = currentApplication.value.approvalPath
  const currentIndex = path.findIndex(p => p.userId === currentUser.id)
  return currentIndex + 1
})

// 获取状态类型
  const getStatusType = (status) => {
    const typeMap = {
      '审批中': 'warning',
      '已批准': 'success',
      '已驳回': 'danger',
    '已退回': 'info',
    '已撤回': 'info'
  }
  return typeMap[status] || 'info'
}

// 获取操作类型
const getActionType = (action) => {
  const typeMap = {
    'agree': 'success',
    'reject': 'danger',
    'return': 'warning'
  }
  return typeMap[action] || 'info'
}

// 获取操作文本
const getActionText = (action) => {
  const textMap = {
    'agree': '同意',
    'reject': '驳回',
    'return': '退回'
  }
  return textMap[action] || action
}

// 获取历史记录类型
const getHistoryType = (action) => {
  const typeMap = {
    'agree': 'success',
    'reject': 'danger',
    'return': 'warning'
  }
  return typeMap[action] || 'primary'
}

// 格式化键名
const formatKey = (key) => {
  const keyMap = {
      'leaveType': '请假类型',
      'startDate': '开始日期',
      'endDate': '结束日期',
      'days': '请假天数',
    'reason': '原因说明',
    'reimburseType': '报销类型',
    'amount': '报销金额',
    'reimburseDate': '报销日期',
    'itemName': '物品名称',
    'quantity': '数量',
    'estimatedAmount': '预估金额',
    'destination': '目的地',
    'purpose': '出差目的'
  }
  return keyMap[key] || key
}

// 获取待办列表
const fetchTodoList = async () => {
  try {
    loading.value = true
    const response = await api.get(`/oa/todo/${currentUser.id}`)
    if (response.data.success) {
      todoList.value = response.data.data
      stats.todo = todoList.value.length
    }
  } catch (error) {
    console.error('获取待办列表失败:', error)
    ElMessage.error('获取待办列表失败')
  } finally {
    loading.value = false
  }
}

// 获取已办列表
const fetchDoneList = async () => {
  try {
    loading.value = true
    const response = await api.get(`/oa/done/${currentUser.id}`)
    if (response.data.success) {
      doneList.value = response.data.data
      stats.done = doneList.value.length
    }
  } catch (error) {
    console.error('获取已办列表失败:', error)
    ElMessage.error('获取已办列表失败')
  } finally {
    loading.value = false
  }
}

// 获取我的申请列表
const fetchMyList = async () => {
  try {
    loading.value = true
    const response = await api.get(`/oa/my-applications/${currentUser.id}`)
    if (response.data.success) {
      myList.value = response.data.data
      stats.my = myList.value.length
    }
  } catch (error) {
    console.error('获取我的申请列表失败:', error)
    ElMessage.error('获取我的申请列表失败')
  } finally {
    loading.value = false
  }
}

// 提交申请
const submitApplication = async () => {
  try {
    submitting.value = true
    
    // 获取员工信息
    const response = await api.get('/employees')
    const employees = response.data.data || []
    const employee = employees.find(e => e.name === currentUser.username)
    
    if (!employee) {
        ElMessage.error('未找到员工信息')
        return
      }
    
    const submitData = {
      flowCode: submitForm.flowCode,
      applicantId: employee.id,
      applicantName: employee.name,
      applicantDept: employee.department,
      applicantPosition: employee.position,
      businessType: getBusinessTypeName(submitForm.flowCode),
      businessData: submitForm.businessData
    }
    
    const result = await api.post('/oa/submit', submitData)
    if (result.data.success) {
      ElMessage.success('申请提交成功')
      showSubmitDialog.value = false
      fetchMyList()
      // 重置表单
      submitForm.flowCode = 'leave'
      submitForm.businessData = {}
    }
  } catch (error) {
    console.error('提交申请失败:', error)
    ElMessage.error('提交申请失败: ' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

// 获取业务类型名称
const getBusinessTypeName = (flowCode) => {
  const typeMap = {
    'leave': '请假申请',
    'reimburse': '报销申请',
    'purchase': '采购申请',
    'business_trip': '出差申请',
    'office_supplies': '办公用品申请'
  }
  return typeMap[flowCode] || flowCode
}

// 处理审批
const handleApprove = async (row) => {
  try {
    const response = await api.get(`/oa/detail/${row.id}`)
    if (response.data.success) {
      currentApplication.value = response.data.data
      showApproveDialog.value = true
    }
  } catch (error) {
    console.error('获取审批详情失败:', error)
    ElMessage.error('获取审批详情失败')
  }
}

// 执行审批
const processApproval = async (action) => {
  try {
    processing.value = true
    
    // 获取员工信息
    const response = await api.get('/employees')
    const employees = response.data.data || []
    const employee = employees.find(e => e.name === currentUser.username)
    
    if (!employee) {
        ElMessage.error('未找到员工信息')
        return
      }
    
    const processData = {
      instanceId: currentApplication.value.id,
      approverId: employee.id,
      approverName: employee.name,
      approverPosition: employee.position,
      action: action,
      comment: approveForm.comment
    }
    
    const result = await api.post('/oa/process', processData)
    if (result.data.success) {
      ElMessage.success('审批处理成功')
      showApproveDialog.value = false
      fetchTodoList()
      fetchDoneList()
      // 重置表单
      approveForm.comment = ''
    }
  } catch (error) {
    console.error('审批处理失败:', error)
    ElMessage.error('审批处理失败: ' + (error.response?.data?.message || error.message))
  } finally {
    processing.value = false
  }
}

// 查看详情
const viewDetail = async (row) => {
  try {
    const response = await api.get(`/oa/detail/${row.id}`)
    if (response.data.success) {
      currentApplication.value = response.data.data
      showDetailDialog.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 撤回申请
const withdrawApplication = async (row) => {
  try {
    await ElMessageBox.confirm('确定要撤回该申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const withdrawData = {
      instanceId: row.id,
      applicantId: currentUser.id
    }
    
    const result = await api.post('/oa/withdraw', withdrawData)
    if (result.data.success) {
      ElMessage.success('申请撤回成功')
      fetchMyList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回申请失败:', error)
      ElMessage.error('撤回申请失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 初始化
onMounted(() => {
  fetchTodoList()
  fetchDoneList()
  fetchMyList()
})
</script>

<style scoped>
.oa-approval-container {
  padding: 20px;
}

.stats-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.action-buttons {
  margin-bottom: 20px;
}

.approval-tabs {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.approval-detail {
  max-height: 400px;
  overflow-y: auto;
}

.approval-detail h3 {
  margin-top: 20px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.approval-detail p {
  margin: 8px 0;
  line-height: 1.6;
}

.business-data {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin: 10px 0;
}
</style>
