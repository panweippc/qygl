<template>
  <div class="customer-page">
    <header class="page-header">
      <h2>客户管理</h2>
      <div class="header-actions">
        <el-input v-model="searchQuery" placeholder="搜索客户名称/联系人/电话" clearable style="width:260px" @clear="loadCustomers" @keyup.enter="loadCustomers" />
        <el-button type="primary" @click="openAddDialog">+ 新增客户</el-button>
      </div>
    </header>

    <el-table :data="customers" v-loading="loading" stripe style="width:100%" @row-click="openDetail">
      <el-table-column prop="name" label="客户名称" min-width="160" />
      <el-table-column prop="contact" label="联系人" width="120" />
      <el-table-column prop="phone" label="联系电话" width="140" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="tags" label="标签" width="140">
        <template #default="{ row }">
          <el-tag v-for="t in (row.tags || '').split(',').filter(Boolean)" :key="t" size="small" style="margin:1px">{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === '活跃' ? 'success' : row.status === '意向' ? 'warning' : 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" @click.stop="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定删除此客户？" @confirm.stop="deleteCustomer(row.id)">
            <template #reference>
              <el-button text size="small" type="danger" @click.stop>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadCustomers" />
    </div>

    <el-dialog v-model="showForm" :title="editingId ? '编辑客户' : '新增客户'" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="客户名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人" prop="contact"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="联系电话" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="form.tags" placeholder="多个标签用逗号分隔" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status">
            <el-option label="活跃" value="活跃" />
            <el-option label="意向" value="意向" />
            <el-option label="沉默" value="沉默" />
            <el-option label="流失" value="流失" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" @click="saveCustomer" :loading="saving">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetail" title="客户详情" width="700px" :close-on-click-modal="false">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户名称" span="2">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail.contact }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱" span="2">{{ detail.email }}</el-descriptions-item>
          <el-descriptions-item label="地址" span="2">{{ detail.address }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag v-for="t in (detail.tags || '').split(',').filter(Boolean)" :key="t" size="small" style="margin:1px">{{ t }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detail.status === '活跃' ? 'success' : detail.status === '意向' ? 'warning' : 'info'" size="small">{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <h3 style="margin:20px 0 12px">跟进记录</h3>
        <div class="activity-list" v-loading="activitiesLoading">
          <div v-if="activities.length === 0" class="empty-activities">暂无跟进记录</div>
          <div v-for="act in activities" :key="act.id" class="activity-item">
            <div class="activity-meta">
              <span class="act-method">{{ act.followUpMethod }}</span>
              <span class="act-time">{{ formatDate(act.followUpTime) }}</span>
            </div>
            <div class="act-content">{{ act.content }}</div>
          </div>
        </div>
        <el-divider />
        <el-form :model="activityForm" label-width="80px">
          <el-form-item label="跟进方式">
            <el-select v-model="activityForm.followUpMethod">
              <el-option label="电话" value="电话" />
              <el-option label="拜访" value="拜访" />
              <el-option label="微信" value="微信" />
              <el-option label="邮件" value="邮件" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="跟进时间">
            <el-date-picker v-model="activityForm.followUpTime" type="datetime" placeholder="选择跟进时间" />
          </el-form-item>
          <el-form-item label="跟进内容">
            <el-input v-model="activityForm.content" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addActivity" :loading="savingActivity">添加跟进</el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const saving = ref(false)
const savingActivity = ref(false)
const customers = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const searchQuery = ref('')
const showForm = ref(false)
const editingId = ref<number | null>(null)
const showDetail = ref(false)
const detail = ref<any>(null)
const activities = ref<any[]>([])
const activitiesLoading = ref(false)

const form = ref({ name: '', contact: '', phone: '', email: '', address: '', tags: '', status: '活跃' })

const rules = {
  name: [{ required: true, message: '请输入客户名称' }],
  contact: [{ required: true, message: '请输入联系人' }],
  phone: [{ required: true, message: '请输入联系电话' }],
  status: [{ required: true, message: '请选择状态' }]
}

const activityForm = ref({ customerId: 0, followUpMethod: '电话', followUpTime: new Date().toISOString().slice(0, 16), content: '' })

const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d.includes('T') ? d : d + 'Z')
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadCustomers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(currentPage.value), pageSize: String(pageSize) })
    if (searchQuery.value.trim()) params.set('keyword', searchQuery.value.trim())
    const res = await fetch('/api/customers?' + params.toString()).then(r => r.json())
    if (res.success) {
      if (Array.isArray(res.data)) {
        customers.value = res.data
        total.value = res.data.length
      } else if (res.data && res.data.list) {
        customers.value = res.data.list
        total.value = res.data.total || 0
      }
    }
  } catch { /* ignore */ }
  loading.value = false
}

const openAddDialog = () => {
  editingId.value = null
  form.value = { name: '', contact: '', phone: '', email: '', address: '', tags: '', status: '活跃' }
  showForm.value = true
}

const openEdit = (row: any) => {
  editingId.value = row.id
  form.value = { name: row.name, contact: row.contact, phone: row.phone, email: row.email || '', address: row.address || '', tags: row.tags || '', status: row.status }
  showForm.value = true
}

const saveCustomer = async () => {
  saving.value = true
  try {
    const url = editingId.value ? '/api/customers/' + editingId.value : '/api/customers'
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success(editingId.value ? '客户更新成功' : '客户添加成功')
      showForm.value = false
      await loadCustomers()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch { ElMessage.error('操作失败') }
  saving.value = false
}

const deleteCustomer = async (id: number) => {
  try {
    const res = await fetch('/api/customers/' + id, { method: 'DELETE' }).then(r => r.json())
    if (res.success) {
      ElMessage.success('客户已删除')
      await loadCustomers()
    }
  } catch { /* ignore */ }
}

const openDetail = async (row: any) => {
  detail.value = row
  showDetail.value = true
  activityForm.value.customerId = row.id
  await loadActivities(row.id)
}

const loadActivities = async (customerId: number) => {
  activitiesLoading.value = true
  try {
    const res = await fetch('/api/customer-activities/' + customerId).then(r => r.json())
    if (res.success) activities.value = res.data
  } catch { /* ignore */ }
  activitiesLoading.value = false
}

const addActivity = async () => {
  if (!activityForm.value.content.trim()) { ElMessage.warning('请输入跟进内容'); return }
  savingActivity.value = true
  try {
    const res = await fetch('/api/customer-activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityForm.value)
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success('跟进记录已添加')
      activityForm.value.content = ''
      await loadActivities(activityForm.value.customerId)
    }
  } catch { /* ignore */ }
  savingActivity.value = false
}

onMounted(loadCustomers)
</script>

<style scoped>
.customer-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: #333; }
.header-actions { display: flex; gap: 10px; }
.pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }
.activity-list { max-height: 300px; overflow-y: auto; }
.activity-item { padding: 10px 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px; }
.activity-meta { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.act-method { color: #409eff; font-weight: 500; }
.act-time { color: #999; }
.act-content { font-size: 13px; color: #333; line-height: 1.5; }
.empty-activities { text-align: center; padding: 20px; color: #999; font-size: 13px; }
</style>
