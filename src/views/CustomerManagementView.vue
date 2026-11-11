<template>
  <div class="customer-page">
    <PageHeaderBar title="客户管理" />
    <div class="customer-body">
    <div class="page-header">
      <div class="header-actions">
        <el-button-group class="tab-group">
          <el-button :type="activeTab === 'active' ? 'primary' : ''" @click="switchTab('active')">在跟进</el-button>
          <el-button :type="activeTab === 'archived' ? 'primary' : ''" @click="switchTab('archived')">已放弃 / 归档</el-button>
        </el-button-group>
        <el-input v-model="searchQuery" placeholder="搜索客户名称/联系人/电话" clearable style="width:240px" @clear="loadCustomers" @keyup.enter="loadCustomers" />
        <el-select v-model="tagFilter" placeholder="标签筛选" clearable style="width:140px" @change="loadCustomers">
          <el-option label="全部标签" value="" />
          <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-if="activeTab === 'active'" v-model="statusFilter" placeholder="状态筛选" clearable style="width:140px" @change="loadCustomers">
          <el-option label="跟进中" value="跟进中" />
          <el-option label="暂缓" value="暂缓" />
          <el-option label="已成交" value="已成交" />
        </el-select>
        <el-select v-model="poolFilter" placeholder="公海/私海" style="width:140px" @change="loadCustomers">
          <el-option label="全部" value="" />
          <el-option label="公海" value="public" />
          <el-option label="私海" value="private" />
          <el-option label="我的私海" value="mine" />
        </el-select>
        <el-button @click="downloadTemplate">下载模板</el-button>
        <el-button @click="triggerImport">导入 Excel</el-button>
        <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onImportFile" />
        <el-button type="success" @click="exportCustomers">导出 Excel</el-button>
        <el-button type="primary" v-if="hasPerm('btn_add')" @click="openAddDialog">+ 新增客户</el-button>
      </div>
    </div>

    <el-alert v-if="reminders.length" type="warning" :closable="true" class="reminder-banner" show-icon>
      <template #title>
        有 {{ reminders.length }} 个客户跟进{{ reminders.some(r => r.overdue) ? '已超期' : '即将到期' }}：
        <span v-for="r in reminders.slice(0,5)" :key="r.id" class="reminder-item" @click="openByName(r.name)">{{ r.name }}({{ r.overdue ? '超期' : '临近' }})</span>
        <span v-if="reminders.length > 5"> 等</span>
      </template>
    </el-alert>

    <el-table :data="customers" v-loading="loading" stripe class="customer-table" style="width:100%" @row-click="openDetail">
      <el-table-column prop="name" label="客户名称" min-width="160" />
      <el-table-column prop="contact" label="联系人" width="110" />
      <el-table-column prop="phone" label="联系电话" width="140" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
      <el-table-column prop="tags" label="标签" width="150">
        <template #default="{ row }">
          <el-tag v-for="t in (row.tags || '').split(',').filter(Boolean)" :key="t" size="small" style="margin:1px">{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="owner" label="负责人" width="100" />
      <el-table-column prop="pool_status" label="公海/私海" width="90">
        <template #default="{ row }">
          <el-tag :type="row.pool_status === 'public' ? 'info' : 'success'" size="small">{{ row.pool_status === 'public' ? '公海' : '私海' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="next_followup_at" label="下次跟进" width="170">
        <template #default="{ row }">
          <span v-if="row.next_followup_at" :class="{ 'overdue-text': isOverdue(row.next_followup_at) }">{{ formatDate(row.next_followup_at) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ row.status || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="activeTab === 'archived'" label="放弃信息" min-width="220">
        <template #default="{ row }">
          <div class="archive-cell">
            <span>{{ formatDate(row.archived_at) || '未记录时间' }}</span>
            <span class="archive-reason" :title="row.archive_reason">{{ row.archive_reason || '未填写原因' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="340" fixed="right" class-name="op-col">
        <template #default="{ row }">
          <el-button text size="small" type="primary" @click.stop="openDetail(row)">详情</el-button>
          <el-button text size="small" v-if="row.pool_status === 'public'" @click.stop="claim(row)">认领</el-button>
          <el-button text size="small" v-if="row.pool_status === 'private' && row.owner === currentUser" @click.stop="release(row)">释放</el-button>
          <el-button text size="small" v-if="hasPerm('btn_edit') && canManage(row)" @click.stop="openEdit(row)">编辑</el-button>
          <el-button text size="small" type="warning" v-if="activeTab === 'active' && canManage(row)" @click.stop="archiveCustomer(row)">放弃跟进</el-button>
          <el-button text size="small" type="success" v-if="activeTab === 'archived' && canManage(row)" @click.stop="reactivateCustomer(row)">重新跟进</el-button>
          <el-dropdown trigger="click" @command="cmd => onMore(cmd, row)">
            <el-button text size="small" @click.stop>更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isManager && row.pool_status === 'public'" command="assign">分配</el-dropdown-item>
                <el-dropdown-item v-if="hasPerm('btn_delete') && row.pool_status === 'private' && row.owner === currentUser" command="delete">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadCustomers" />
    </div>

    <el-dialog v-model="showForm" :title="editingId ? '编辑客户' : '新增客户'" width="540px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules">
        <el-form-item label="客户名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人" prop="contact"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="联系电话" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="form.tags" placeholder="多个标签用逗号分隔" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="跟进中" value="跟进中" />
            <el-option label="暂缓" value="暂缓" />
            <el-option label="已成交" value="已成交" />
            <el-option v-if="form.status && !newStatuses.includes(form.status)" :label="form.status + '（历史）'" :value="form.status" />
          </el-select>
          <div class="form-hint">暂时不跟进请用列表的「放弃跟进」，可记录原因并随时「重新跟进」。</div>
        </el-form-item>
        <el-form-item label="公海/私海">
          <el-select v-model="form.pool_status">
            <el-option label="私海" value="private" />
            <el-option label="公海" value="public" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" v-if="form.pool_status === 'private' && form.owner === currentUser">
          <el-input v-model="form.owner" :placeholder="`转交给（留空则保持 ${form.owner || '当前用户'}）`" />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker v-model="form.next_followup_at" type="datetime" placeholder="设置跟进时间" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" @click="saveCustomer" :loading="saving">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetail" title="客户详情" width="720px" :close-on-click-modal="false">
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
            <el-tag :type="statusTagType(detail.status)" size="small">{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detail.owner || '—' }}</el-descriptions-item>
          <el-descriptions-item label="公海/私海">
            <el-tag :type="detail.pool_status === 'public' ? 'info' : 'success'" size="small">{{ detail.pool_status === 'public' ? '公海' : '私海' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            <el-tag v-if="detail.source === '销售漏斗'" type="primary" size="small">销售漏斗</el-tag>
            <el-tag v-else-if="detail.source === '导入'" type="warning" size="small">导入</el-tag>
            <el-tag v-else type="info" size="small">手动录入</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.status === '已放弃'" label="放弃时间">{{ formatDate(detail.archived_at) || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.status === '已放弃'" label="放弃原因" span="2">{{ detail.archive_reason || '未填写' }}</el-descriptions-item>
        </el-descriptions>

        <div class="followup-box">
          <span class="followup-label">下次跟进时间：</span>
          <span v-if="detail.next_followup_at" :class="{ 'overdue-text': isOverdue(detail.next_followup_at) }">{{ formatDate(detail.next_followup_at) }}</span>
          <span v-else class="muted">未设置</span>
          <el-date-picker v-model="followupInput" type="datetime" size="small" placeholder="设置/修改" value-format="YYYY-MM-DD HH:mm:ss" style="margin-left:8px" />
          <el-button size="small" type="primary" @click="saveFollowup">保存</el-button>
        </div>

        <div v-if="linkedFunnel.length" class="linked-funnel">
          <h3 style="margin:16px 0 12px">关联销售漏斗（{{ linkedFunnel.length }}）</h3>
          <el-table :data="linkedFunnel" border size="small" style="margin-bottom:8px">
            <el-table-column label="阶段" width="80">
              <template #default="{ row }">
                <el-tag :type="row.stage === '成交' ? 'success' : row.stage === '重点' ? 'warning' : 'info'" size="small">{{ row.stage }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="owner" label="负责人" width="100" />
            <el-table-column label="进展" width="90">
              <template #default="{ row }">{{ row.progress != null ? row.progress + '%' : '—' }}</template>
            </el-table-column>
            <el-table-column prop="salesStatus" label="销售状态" width="130" />
            <el-table-column label="合同/实际金额">
              <template #default="{ row }">
                <span v-if="row.stage === '成交'">{{ fmtMoney(row.contractAmount) }} / {{ fmtMoney(row.actualAmount) }}</span>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default>
                <el-button type="primary" link size="small" @click="goFunnel">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" link style="margin-top:4px" @click="goFunnel">前往销售漏斗</el-button>
        </div>

        <h3 style="margin:20px 0 12px">状态时间线</h3>
        <div class="status-timeline" v-loading="statusLogsLoading">
          <div v-if="statusLogs.length === 0" class="empty-activities">暂无状态变更记录</div>
          <div v-for="log in statusLogs" :key="log.id" class="status-log-item">
            <span class="sl-time">{{ formatDate(log.created_at) }}</span>
            <el-tag size="small" :type="statusTagType(log.to_status)">{{ log.from_status || '新建' }} → {{ log.to_status }}</el-tag>
            <span class="sl-reason">{{ log.reason || '' }}</span>
            <span class="sl-operator">{{ log.operator || '' }}</span>
          </div>
        </div>

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
            <el-date-picker v-model="activityForm.followUpTime" type="datetime" placeholder="选择跟进时间" value-format="YYYY-MM-DD HH:mm:ss" />
          </el-form-item>
          <el-form-item label="跟进内容">
            <el-input v-model="activityForm.content" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" v-if="hasPerm('btn_add')" @click="addActivity" :loading="savingActivity">添加跟进</el-button>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button v-if="detail && detail.status !== '已放弃' && canManage(detail)" type="warning" @click="archiveCustomer(detail)">放弃跟进</el-button>
        <el-button v-if="detail && detail.status === '已放弃' && canManage(detail)" type="success" @click="reactivateCustomer(detail)">重新跟进</el-button>
        <el-button type="primary" :loading="creatingProject" @click="createProject">创建大项目进展</el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useButtonPermission } from '@/composables/usePermission'
import PageHeaderBar from '../components/PageHeaderBar.vue'

const loading = ref(false)
const saving = ref(false)
const { hasPerm } = useButtonPermission()
const savingActivity = ref(false)
const customers = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const route = useRoute()
const searchQuery = ref('')
const tagFilter = ref('')
const poolFilter = ref('')
const tagOptions = ref<string[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const showDetail = ref(false)
const detail = ref<any>(null)
const activities = ref<any[]>([])
const activitiesLoading = ref(false)
const linkedFunnel = ref<any[]>([])
const followupInput = ref('')
const reminders = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const activeTab = ref<'active' | 'archived'>('active')
const statusFilter = ref('')
const statusLogs = ref<any[]>([])
const statusLogsLoading = ref(false)
const newStatuses = ['跟进中', '暂缓', '已成交', '已放弃']

const currentUser = (localStorage.getItem('username') || '') as string
const isManager = /经理|管理员|GM|admin/i.test(localStorage.getItem('role') || '')

const form = ref({ name: '', contact: '', phone: '', email: '', address: '', tags: '', status: '跟进中', pool_status: 'private', owner: '', next_followup_at: '' })

// 与后端 canManageCustomer 保持一致：经理/管理员 或 公海 或 本人私海
const canManage = (row: any) => !!row && (isManager || row.pool_status === 'public' || row.owner === currentUser)
const statusTagType = (s: string) => {
  if (!s) return 'info'
  if (s === '已放弃' || s === '流失') return 'danger'
  if (s === '已成交' || s === '成交' || s === '活跃') return 'success'
  if (s === '跟进中' || s === '意向') return 'primary'
  if (s === '暂缓' || s === '沉默') return 'warning'
  return 'info'
}
const switchTab = (tab: 'active' | 'archived') => {
  activeTab.value = tab
  statusFilter.value = ''
  currentPage.value = 1
  loadCustomers()
}
const onMore = (cmd: string, row: any) => {
  if (cmd === 'assign') assign(row)
  else if (cmd === 'delete') deleteCustomer(row.id)
}

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

const isOverdue = (d: string) => {
  if (!d) return false
  return new Date(d).getTime() < Date.now()
}

const buildParams = () => {
  const params = new URLSearchParams({ page: String(currentPage.value), pageSize: String(pageSize) })
  if (searchQuery.value.trim()) params.set('keyword', searchQuery.value.trim())
  if (tagFilter.value) params.set('tag', tagFilter.value)
  if (poolFilter.value === 'mine') { params.set('pool', 'private'); params.set('owner', currentUser) }
  else if (poolFilter.value) params.set('pool', poolFilter.value)
  params.set('archived', activeTab.value === 'archived' ? '1' : '0')
  if (statusFilter.value && activeTab.value === 'active') params.set('status', statusFilter.value)
  return params.toString()
}

const loadCustomers = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/customers?' + buildParams()).then(r => r.json())
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

const loadTags = async () => {
  try {
    const res = await fetch('/api/customers/tags').then(r => r.json())
    if (res.success) tagOptions.value = res.data || []
  } catch { /* ignore */ }
}

const loadReminders = async () => {
  try {
    const res = await fetch('/api/customers/followup-reminders').then(r => r.json())
    if (res.success) reminders.value = res.data || []
  } catch { /* ignore */ }
}

const openAddDialog = () => {
  editingId.value = null
  form.value = { name: '', contact: '', phone: '', email: '', address: '', tags: '', status: '跟进中', pool_status: 'private', owner: '', next_followup_at: '' }
  showForm.value = true
}

const openEdit = (row: any) => {
  editingId.value = row.id
  form.value = { name: row.name, contact: row.contact, phone: row.phone, email: row.email || '', address: row.address || '', tags: row.tags || '', status: row.status, pool_status: row.pool_status || 'private', owner: row.owner || '', next_followup_at: row.next_followup_at || '' }
  showForm.value = true
}

const saveCustomer = async () => {
  saving.value = true
  try {
    const payload: any = { ...form.value }
    if (!editingId.value && !payload.owner) payload.owner = currentUser
    const url = editingId.value ? '/api/customers/' + editingId.value : '/api/customers'
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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

// 放弃跟进：弹窗收集原因；后端负责置状态、释放公海、清空跟进时间并写流水
const archiveCustomer = async (row: any) => {
  if (!row) return
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      '放弃后状态变为「已放弃」，自动释放到公海并清空下次跟进时间；以后随时可点「重新跟进」恢复。请填写放弃原因（可留空）：',
      '放弃跟进 · ' + row.name,
      { type: 'warning', inputPlaceholder: '如：预算冻结 / 暂不考虑 / 转竞品', confirmButtonText: '确认放弃', cancelButtonText: '取消' }
    )
    reason = value || ''
  } catch { return }
  try {
    const res = await fetch('/api/customers/' + row.id + '/archive', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success(res.message)
      showDetail.value = false
      await Promise.all([loadCustomers(), loadReminders()])
    } else ElMessage.error(res.message || '放弃跟进失败')
  } catch { ElMessage.error('放弃跟进失败') }
}

// 重新跟进：一键复活，状态回到「跟进中」，归档标记清空，历史流水保留
const reactivateCustomer = async (row: any) => {
  if (!row) return
  try {
    const res = await fetch('/api/customers/' + row.id + '/reactivate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '手动重新跟进' })
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success(res.message)
      showDetail.value = false
      await loadCustomers()
    } else ElMessage.error(res.message || '重新跟进失败')
  } catch { ElMessage.error('重新跟进失败') }
}

const loadStatusLogs = async (customerId: number) => {
  statusLogsLoading.value = true
  try {
    const res = await fetch('/api/customers/' + customerId + '/status-logs').then(r => r.json())
    if (res.success) statusLogs.value = res.data || []
  } catch { /* ignore */ }
  statusLogsLoading.value = false
}

const deleteCustomer = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '删除后客户将从所有列表消失，当前无法自行恢复。若只是暂时不跟进，请改用「放弃跟进」，可记录原因并随时重新跟进。确定仍要删除吗？',
      '删除客户（不可自行恢复）',
      { type: 'warning', confirmButtonText: '仍要删除', cancelButtonText: '取消' }
    )
    const res = await fetch('/api/customers/' + id, { method: 'DELETE' }).then(r => r.json())
    if (res.success) {
      ElMessage.success('客户已删除')
      await loadCustomers()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch { /* ignore */ }
}

const claim = async (row: any) => {
  const res = await fetch('/api/customers/' + row.id + '/claim', { method: 'POST' }).then(r => r.json())
  if (res.success) { ElMessage.success('认领成功'); await loadCustomers() }
  else ElMessage.error(res.message || '认领失败')
}

const release = async (row: any) => {
  const res = await fetch('/api/customers/' + row.id + '/release', { method: 'POST' }).then(r => r.json())
  if (res.success) { ElMessage.success('已释放到公海'); await loadCustomers() }
  else ElMessage.error(res.message || '释放失败')
}

const assign = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入负责人姓名', '分配客户', { inputValue: row.owner || '' })
    if (!value || !value.trim()) return
    const res = await fetch('/api/customers/' + row.id + '/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: value.trim() })
    }).then(r => r.json())
    if (res.success) { ElMessage.success('分配成功'); await loadCustomers() }
    else ElMessage.error(res.message || '分配失败')
  } catch { /* ignore */ }
}

const openDetail = async (row: any) => {
  detail.value = row
  showDetail.value = true
  linkedFunnel.value = []
  followupInput.value = row.next_followup_at || ''
  activityForm.value.customerId = row.id
  await Promise.all([loadActivities(row.id), loadStatusLogs(row.id)])
  if (row.name) {
    try {
      const res = await fetch('/api/customers/funnel-link?name=' + encodeURIComponent(row.name)).then(r => r.json())
      if (res.success) linkedFunnel.value = res.data || []
    } catch { /* ignore */ }
  }
  // 方案A/D：按客户ID反查其关联成交项目与销售漏斗·成交阶段
  try {
    const [pj, dl] = await Promise.all([
      fetch('/api/closing-projects/by-customer/' + row.id).then(r => r.json()),
      fetch('/api/sales-four-tables/by-customer/' + row.id).then(r => r.json())
    ])
    linkedProjects.value = pj.success ? (pj.data || []) : []
    linkedDeals.value = dl.success ? (dl.data || []) : []
  } catch { /* ignore */ }
}

const saveFollowup = async () => {
  if (!detail.value) return
  const res = await fetch('/api/customers/' + detail.value.id + '/followup', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next_followup_at: followupInput.value || null })
  }).then(r => r.json())
  if (res.success) {
    ElMessage.success('已更新跟进时间')
    detail.value.next_followup_at = followupInput.value || ''
    await loadReminders()
  } else ElMessage.error(res.message || '更新失败')
}

const goFunnel = () => { window.open('/sales-funnel', '_blank') }

// 方案A：客户管理 → 大项目进展 按需手动创建，不做反向自动建骨架
const creatingProject = ref(false)
const createProject = async () => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `将为「${detail.value.name}」在大项目进展表中创建一条骨架记录（客户名称、申报日期、负责人），其余字段留空待补充。该客户已有记录时不会重复创建。`,
      '创建大项目进展', { type: 'info', confirmButtonText: '创建', cancelButtonText: '取消' }
    )
  } catch { return }
  creatingProject.value = true
  try {
    const res = await fetch('/api/customers/' + detail.value.id + '/create-project', { method: 'POST' }).then(r => r.json())
    if (res.success) ElMessage.success(res.message + (res.created ? '，可前往销售漏斗补充详情' : ''))
    else ElMessage.error(res.message || '创建失败')
  } catch { ElMessage.error('创建失败') }
  creatingProject.value = false
}

const fmtMoney = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—'
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

const openByName = (name: string) => {
  searchQuery.value = name
  loadCustomers()
}

const downloadTemplate = () => {
  const a = document.createElement('a')
  a.href = '/api/customers/template?token=' + encodeURIComponent(localStorage.getItem('token') || '')
  a.download = '客户导入模板.xlsx'
  a.click()
}

const triggerImport = () => { fileInput.value?.click() }

const onImportFile = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await fetch('/api/customers/import', { method: 'POST', body: fd }).then(r => r.json())
    if (res.success) { ElMessage.success(res.message || '导入成功'); await loadCustomers(); await loadTags() }
    else ElMessage.error(res.message || '导入失败')
  } catch { ElMessage.error('导入失败') }
  target.value = ''
}

const exportCustomers = async () => {
  try {
    const res = await fetch('/api/customers/export?' + buildParams())
    if (!res.ok) { ElMessage.error('导出失败'); return }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '客户导出_' + new Date().toISOString().slice(0, 10) + '.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch { ElMessage.error('导出失败') }
}

onMounted(async () => {
  if (route.query.name) {
    searchQuery.value = String(route.query.name)
    await loadCustomers()
    const m = customers.value.find((c: any) => c.name === route.query.name)
    if (m) openDetail(m)
  } else {
    await loadCustomers()
  }
  await loadTags()
  await loadReminders()
})
</script>

<style scoped>
.customer-page { background: #E4EDF2; min-height: 100vh; }
.customer-body { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
/* 操作列按钮保持一行，不换行 */
:deep(.op-col .cell) { white-space: nowrap; }
/* 主列表整行可点开详情，给手型光标做提示；只作用于主表，避免详情弹窗内的联查表误显示可点 */
:deep(.customer-table .el-table__row) { cursor: pointer; }
.pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }
.activity-list { max-height: 300px; overflow-y: auto; }
.activity-item { padding: 10px 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px; }
.activity-meta { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.act-method { color: #409eff; font-weight: 500; }
.act-time { color: #999; }
.act-content { font-size: 13px; color: #333; line-height: 1.5; }
.empty-activities { text-align: center; padding: 20px; color: #999; font-size: 13px; }
.reminder-banner { margin-bottom: 12px; }
.reminder-item { display: inline-block; margin: 0 6px; color: #c62828; cursor: pointer; text-decoration: underline; }
.muted { color: #909399; }
.overdue-text { color: #c62828; font-weight: 600; }
.followup-box { margin: 14px 0; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.followup-label { font-size: 13px; color: #666; }
.tab-group { margin-right: 4px; }
.form-hint { font-size: 12px; color: #909399; line-height: 1.4; margin-top: 4px; }
.archive-cell { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.archive-reason { color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-timeline { max-height: 220px; overflow-y: auto; }
.status-log-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 6px; font-size: 12px; }
.sl-time { color: #909399; min-width: 132px; }
.sl-reason { color: #606266; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sl-operator { color: #909399; }
</style>
