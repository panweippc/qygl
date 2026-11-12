<template>
  <div class="ft-panel">
    <div class="ft-toolbar">
      <div class="ft-filters">
        <el-input v-model="filter.keyword" placeholder="客户/owner" clearable style="width:160px" @keyup.enter="load" />
        <el-input v-model="filter.month" placeholder="申报月份 如 2024-07" clearable style="width:150px" @keyup.enter="load" />
        <el-select v-model="filter.sales_type" placeholder="销售类型" clearable style="width:120px">
          <el-option v-for="s in SALES_TYPE_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filter.revenue_type" placeholder="代理类型" clearable style="width:120px">
          <el-option v-for="s in REVENUE_TYPE_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filter.sales_status" placeholder="销售状态" clearable style="width:120px">
          <el-option v-for="s in dealStatusOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filter.payment_status" placeholder="回款状态" clearable style="width:130px">
          <el-option v-for="s in PAYMENT_STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
      <div class="ft-actions">
        <el-button v-if="perm.canWrite" type="primary" @click="openEdit()">+ 新增</el-button>
        <el-button v-if="perm.canWrite" @click="importVisible = true">导入 Excel</el-button>
        <el-button type="success" @click="exportExcel">导出 Excel</el-button>
      </div>
    </div>

    <div class="ft-table-wrapper">
      <el-table :data="list" v-loading="loading" stripe style="width:100%" :row-class-name="rowCls">
        <el-table-column type="index" label="序号" width="60" :index="indexMethod" align="center" />
        <el-table-column prop="owner" label="负责人" width="100" />
        <el-table-column prop="customer_name" label="客户名单" min-width="260" :resizable="true" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link size="small" @click.stop="emit('customer-click', row.customer_name)">{{ row.customer_name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="partner" label="合作伙伴" min-width="140" :resizable="true" show-overflow-tooltip />
        <el-table-column prop="sales_type" label="销售类型" width="100" />
        <el-table-column prop="revenue_type" label="代理类型" width="100" />
        <el-table-column prop="sales_status" label="销售状态" width="100" />
        <el-table-column prop="report_date" label="申报日期" width="110" />
        <el-table-column prop="product_type" label="产品类型" min-width="120" show-overflow-tooltip />
        <el-table-column prop="contract_amount" label="合同额" width="110">
          <template #default="{ row }">{{ Number(row.contract_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="actual_amount" label="实际金额" width="110">
          <template #default="{ row }">{{ Number(row.actual_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="received_amount" label="回款金额" width="110">
          <template #default="{ row }">{{ Number(row.received_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="unreceived_amount" label="未回款" width="110">
          <template #default="{ row }">
            <span :class="{ 'overdue-amt': row.is_overdue }">{{ Number(row.unreceived_amount || 0).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="回款进度" width="150">
          <template #default="{ row }">
            <span v-if="Number(row.contract_amount || 0) <= 0" class="muted-cell">—</span>
            <el-progress v-else :percentage="pct(row)" :stroke-width="10" :color="progColor(pct(row))" :format="(p: number) => p + '%'" />
          </template>
        </el-table-column>
        <el-table-column prop="expected_payment_date" label="约定回款" width="120" />
        <el-table-column label="回款状态" width="190">
          <template #default="{ row }">
            <el-tag :type="payTag(row.payment_status)" size="small">{{ payLabel(row.payment_status) }}</el-tag>
            <el-tag v-if="row.is_overdue" type="danger" size="small" effect="dark" style="margin-left:4px">超期</el-tag>
            <el-tag v-if="isPendingFill(row)" type="warning" size="small" effect="plain" class="pending-tag" title="金额字段待补齐，点击直接去补录" @click.stop="openEdit(row, true)">待补录</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="report_month" label="申报月份" width="100" />
        <el-table-column prop="contact" label="联系人" width="110" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="site_count" label="站点数" width="80" />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="拜访记录" width="90">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="emit('open-visit-records', row.customer_name)">{{ Number(row.visit_count || 0) }} 条</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="op-cell">
              <el-button text size="small" @click="openDetail(row)">详情</el-button>
              <el-button v-if="perm.canWrite" text size="small" @click="openEdit(row)">编辑</el-button>
              <el-button text size="small" @click="openVersions(row)">版本</el-button>
              <el-button v-if="perm.canWrite" text size="small" @click="openTransfer(row)">转交</el-button>
              <el-button v-if="perm.canWrite" text size="small" type="danger" @click="remove(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next"
      class="ft-pagination"
      @current-change="load"
      @size-change="onSizeChange"
    />

    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑成交用户' : '新增成交用户'" width="620px" align-center destroy-on-close @opened="onEditOpened">
      <div class="dialog-body">
        <el-alert v-if="showFillHint" class="fill-hint" type="warning" :closable="false" show-icon
          :title="funnelRef ? '该记录由漏斗自动迁入，金额字段尚未补齐' : '该记录的成交金额字段尚未补齐'"
          :description="`请核对并补充：${missingLabels}${funnelRef ? '。下方灰色文字是漏斗侧的预计值，仅供参考，请勿直接照抄为实际金额' : ''}。`" />
        <el-form :model="editForm" label-width="120px">
          <el-form-item label="owner"><el-input v-model="editForm.owner" /></el-form-item>
          <el-form-item label="销售类型">
            <el-select v-model="editForm.sales_type" placeholder="请选择" style="width:100%">
              <el-option v-for="s in SALES_TYPE_OPTIONS" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="代理类型">
            <el-select v-model="editForm.revenue_type" placeholder="请选择" style="width:100%">
              <el-option v-for="s in REVENUE_TYPE_OPTIONS" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="申报日期"><el-date-picker v-model="editForm.report_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
          <el-form-item label="产品类型"><el-input v-model="editForm.product_type" /></el-form-item>
          <el-form-item label="合作伙伴"><el-input v-model="editForm.partner" /></el-form-item>
          <el-form-item label="客户名单"><el-input v-model="editForm.customer_name" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="editForm.contact" /></el-form-item>
          <el-form-item label="电话"><el-input v-model="editForm.phone" /></el-form-item>
          <el-form-item label="站点数"><el-input-number v-model="editForm.site_count" :min="0" style="width:100%" /></el-form-item>
          <el-form-item label="合同额" :class="{ 'pending-field': isMissing('contract_amount') }">
            <div :id="'deal-field-contract_amount'" class="field-wrap">
              <el-input-number v-model="editForm.contract_amount" :min="0" style="width:100%" />
              <div v-if="funnelRef" class="ref-tip">漏斗参考（预计总回款额）：{{ fmtMoney(funnelRef.estimated_total) }} · 仅供参考，不作实际金额</div>
            </div>
          </el-form-item>
          <el-form-item label="实际金额" :class="{ 'pending-field': isMissing('actual_amount') }">
            <div :id="'deal-field-actual_amount'" class="field-wrap"><el-input-number v-model="editForm.actual_amount" :min="0" style="width:100%" /></div>
          </el-form-item>
          <el-form-item label="回款金额" :class="{ 'pending-field': isMissing('received_amount') }">
            <div :id="'deal-field-received_amount'" class="field-wrap">
              <el-input-number v-model="editForm.received_amount" :min="0" style="width:100%" />
              <div v-if="funnelRef" class="ref-tip">漏斗参考（本月回款金额）：{{ fmtMoney(funnelRef.monthly_repayment) }} · 仅供参考，不作实际金额</div>
            </div>
          </el-form-item>
          <el-form-item label="未回款金额">
            <div class="field-wrap">
              <el-input-number v-model="editForm.unreceived_amount" :min="0" style="width:100%" disabled />
              <div class="ref-tip">由「合同额 − 回款金额」自动计算，无需填写</div>
            </div>
          </el-form-item>
          <el-form-item label="约定回款日期" :class="{ 'pending-field': isMissing('expected_payment_date') }">
            <div :id="'deal-field-expected_payment_date'" class="field-wrap">
              <el-date-picker v-model="editForm.expected_payment_date" value-format="YYYY-MM-DD" style="width:100%" />
              <div v-if="funnelRef && funnelRef.estimated_repay_month" class="ref-tip">漏斗参考（预计回款月份）：{{ funnelRef.estimated_repay_month }} · 仅供参考</div>
            </div>
          </el-form-item>
          <el-form-item label="销售状态">
            <el-select v-model="editForm.sales_status" placeholder="请选择" style="width:100%">
              <el-option v-for="s in dealStatusOptions" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="2" /></el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <ImportDialog v-model="importVisible" type="deal" @success="onImportSuccess" />
    <DiffDialog v-model="diffVisible" type="deal" :record-id="diffRecordId" :pending-fill="diffRow ? isPendingFill(diffRow) : false" @go-fill="onGoFill" />
    <TransferDialog v-model="transferVisible" mode="single" type="deal" :id="transferRow?.id ?? null" :current-owner="transferRow?.owner || ''" @done="onTransferDone" />
    <DealDetailDialog v-model="dealDetailVisible" :record-id="dealDetailRow?.id ?? null" :customer-name="dealDetailRow?.customer_name || ''" :perm="perm" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetch, salesFetchJSON, exportSalesExcel } from './salesApi'
import ImportDialog from './ImportDialog.vue'
import DiffDialog from './DiffDialog.vue'
import TransferDialog from './TransferDialog.vue'
import DealDetailDialog from './DealDetailDialog.vue'
import { SALES_TYPE_OPTIONS, REVENUE_TYPE_OPTIONS, SALES_STATUS_BY_TYPE } from './salesConstants'

const props = defineProps<{ perm: any }>()
const emit = defineEmits(['customer-click', 'refresh-stats', 'open-visit-records', 'view-detail'])
const dealStatusOptions = computed(() => SALES_STATUS_BY_TYPE.deal || [])
const PAYMENT_STATUS_OPTIONS = [
  { label: '未回款', value: 'unreceived' },
  { label: '部分回款', value: 'partial' },
  { label: '已全额回款', value: 'full' }
]
const list = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const indexMethod = (index: number) => (page.value - 1) * pageSize.value + index + 1
const filter = ref({ keyword: '', month: '', sales_type: '', revenue_type: '', sales_status: '', payment_status: '' })
const editVisible = ref(false)
const importVisible = ref(false)
const diffVisible = ref(false)
const diffRecordId = ref<number | null>(null)
const transferVisible = ref(false)
const transferRow = ref<any>(null)
const dealDetailVisible = ref(false)
const dealDetailRow = ref<any>(null)
const saving = ref(false)
const emptyForm = () => ({
  owner: '', sales_type: '', revenue_type: '', report_date: '', product_type: '', partner: '',
  customer_name: '', contact: '', phone: '', site_count: 0, contract_amount: 0,
  actual_amount: 0, received_amount: 0, unreceived_amount: 0, expected_payment_date: '', sales_status: '', remark: ''
})
const editForm = ref<any>(emptyForm())
const diffRow = ref<any>(null)
const focusPending = ref(false)

// 方案A+：漏斗迁入成交表时，这 4 项在漏斗表单里不存在，需要用户随后补录
const DEAL_FILL_FIELDS = [
  { key: 'contract_amount', label: '合同额' },
  { key: 'actual_amount', label: '实际金额' },
  { key: 'received_amount', label: '回款金额' },
  { key: 'expected_payment_date', label: '约定回款日期' }
]
function missingDealFields(row: any) {
  return DEAL_FILL_FIELDS.filter(f => f.key === 'expected_payment_date'
    ? !row?.[f.key]
    : Number(row?.[f.key] || 0) <= 0)
}
function isBlankDealAmounts(row: any): boolean {
  return Number(row?.contract_amount || 0) <= 0 && Number(row?.actual_amount || 0) <= 0 &&
    Number(row?.received_amount || 0) <= 0 && !row?.expected_payment_date
}
// 待补录口径：由漏斗自动迁入（带参考值）或金额四项全空的历史记录，且仍有字段未补齐
function isPendingFill(row: any): boolean {
  return !!row && missingDealFields(row).length > 0 &&
    (!!row.funnel_reference || isBlankDealAmounts(row))
}
const showFillHint = computed(() => !!editForm.value.id && isPendingFill(editForm.value))
const missingLabels = computed(() => missingDealFields(editForm.value).map(f => f.label).join('、'))
function isMissing(key: string): boolean {
  return showFillHint.value && missingDealFields(editForm.value).some(f => f.key === key)
}
const funnelRef = computed(() => {
  const raw = editForm.value.funnel_reference
  if (!raw) return null
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
})
function fmtMoney(v: any): string {
  return Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
// 未回款金额前端联动：与后端「合同额 − 回款金额」口径一致，输入框只读
watch(() => [editForm.value.contract_amount, editForm.value.received_amount], () => {
  editForm.value.unreceived_amount = Math.max(0,
    Number(editForm.value.contract_amount || 0) - Number(editForm.value.received_amount || 0))
})

function payLabel(s: string): string {
  return ({ norevenue: '无合同额', full: '已全额回款', partial: '部分回款', unreceived: '未回款' } as Record<string, string>)[s] || '—'
}
function payTag(s: string): string {
  return ({ norevenue: 'info', full: 'success', partial: 'warning', unreceived: 'danger' } as Record<string, string>)[s] || 'info'
}
function rowCls({ row }: any): string {
  return row.is_overdue ? 'overdue-row' : ''
}

function pct(row: any): number {
  const c = Number(row.contract_amount || 0)
  if (c <= 0) return 0
  return Math.min(100, Math.round(Number(row.received_amount || 0) / c * 100))
}
function progColor(p: number): string {
  return p >= 100 ? '#67c23a' : '#1E5AA8'
}

function buildQuery(): string {
  const qs = new URLSearchParams()
  if (filter.value.keyword) qs.set('keyword', filter.value.keyword)
  if (filter.value.month) qs.set('month', filter.value.month)
  if (filter.value.sales_type) qs.set('sales_type', filter.value.sales_type)
  if (filter.value.revenue_type) qs.set('revenue_type', filter.value.revenue_type)
  if (filter.value.sales_status) qs.set('sales_status', filter.value.sales_status)
  if (filter.value.payment_status) qs.set('payment_status', filter.value.payment_status)
  qs.set('page', String(page.value))
  qs.set('pageSize', String(pageSize.value))
  return qs.toString()
}

async function load() {
  loading.value = true
  try {
    const json = await salesFetchJSON(`/api/sales-four-tables/deal?${buildQuery()}`)
    if (json.success) { list.value = json.data.list; total.value = json.data.total }
  } catch (e: any) { ElMessage.error('加载失败: ' + e.message) }
  finally { loading.value = false }
}
function resetFilter() {
  filter.value = { keyword: '', month: '', sales_type: '', revenue_type: '', sales_status: '', payment_status: '' }
  page.value = 1
  load()
}
async function exportExcel() {
  const filters: Record<string, string> = {}
  new URLSearchParams(buildQuery()).forEach((v, k) => {
    if (v && k !== 'page' && k !== 'pageSize') filters[k] = v
  })
  const r = await exportSalesExcel({
    type: 'deal',
    filename: '成交项目-' + new Date().toISOString().slice(0, 10) + '.xlsx',
    filters
  })
  if (r.ok) ElMessage.success('导出成功')
  else if (r.message !== '已取消') ElMessage.error(r.message || '导出失败')
}
function openEdit(row?: any, focus = false) {
  if (focus && !props.perm.canWrite) { ElMessage.warning('当前账号无编辑权限，请联系负责人补录'); return }
  editForm.value = row ? { ...emptyForm(), ...row } : emptyForm()
  if (focus) focusPending.value = true
  editVisible.value = true
}
// 弹窗打开动画结束后聚焦第一个缺失字段，用户不必自己在 17 个字段里找
function onEditOpened() {
  if (!focusPending.value) return
  focusPending.value = false
  const first = missingDealFields(editForm.value)[0]
  if (!first) return
  nextTick(() => {
    const box = document.getElementById('deal-field-' + first.key)
    const input = box?.querySelector('input') as HTMLInputElement | null
    input?.focus()
  })
}
async function save() {
  saving.value = true
  try {
    const url = '/api/sales-four-tables/deal' + (editForm.value.id ? `/${editForm.value.id}` : '')
    const method = editForm.value.id ? 'PUT' : 'POST'
    const json = await salesFetchJSON(url, { method, body: JSON.stringify(editForm.value) })
    if (json.success) {
      const sync = json.data?.sync
      let msg = '保存成功'
      if (sync) {
        const parts: string[] = []
        if (sync.project?.created) parts.push('已自动带出大项目进展')
        else if (sync.project?.analysisId) parts.push('已同步大项目进展')
        if (sync.customer?.customerId) parts.push('已同步客户档案')
        if (sync.project?.error) parts.push('大项目进展同步失败: ' + sync.project.error)
        if (sync.customer?.error) parts.push('客户档案同步失败: ' + sync.customer.error)
        if (parts.length) msg += '（' + parts.join('；') + '）'
      }
      ElMessage.success(msg)
      editVisible.value = false
      load()
      emit('refresh-stats')
    } else { ElMessage.error(json.message || '保存失败') }
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}

function onSizeChange(s: number) { pageSize.value = s; page.value = 1; load() }
async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    const json = await salesFetchJSON(`/api/sales-four-tables/deal/${row.id}`, { method: 'DELETE' })
    if (json.success) { ElMessage.success('删除成功'); load(); emit('refresh-stats') }
    else ElMessage.error(json.message || '删除失败')
  } catch {}
}
function openVersions(row: any) { diffRow.value = row; diffRecordId.value = row.id; diffVisible.value = true }
// 版本弹窗里的「去补录」：关版本、直接打开编辑并聚焦缺失字段
function onGoFill() {
  diffVisible.value = false
  if (diffRow.value) openEdit(diffRow.value, true)
}
function openTransfer(row: any) { transferRow.value = row; transferVisible.value = true }
function onTransferDone() { load() }
function openDetail(row: any) { dealDetailRow.value = row; dealDetailVisible.value = true }
function onImportSuccess() { load(); emit('refresh-stats') }
onMounted(load)
defineExpose({ load })
</script>

<style scoped>
.ft-panel { background: #fff; border-radius: 8px; padding: 1rem; }
.ft-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.ft-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.ft-actions { display: flex; gap: 0.5rem; }
.ft-pagination { margin-top: 1rem; justify-content: flex-end; }
.dialog-body { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
.pending-tag { cursor: pointer; margin-left: 4px; }
.fill-hint { margin-bottom: 0.75rem; }
.field-wrap { width: 100%; }
.ref-tip { color: #909399; font-size: 0.78rem; line-height: 1.4; margin-top: 2px; }
/* 待补录字段高亮：橙色标签 + 输入框描边，打开弹窗即可定位 */
:deep(.pending-field .el-form-item__label) { color: #d48806; font-weight: 600; }
:deep(.pending-field .el-input__wrapper) { box-shadow: 0 0 0 1px #e6a23c inset; }
.muted-cell { color: #909399; font-size: 0.85rem; }
.overdue-amt { color: #c62828; font-weight: 700; }
.ft-table-wrapper { width: 100%; overflow-x: auto; border: 1px solid #ebeef5; border-radius: 4px; }
.ft-table-wrapper :deep(.el-table) { min-width: max-content; }
.ft-table-wrapper :deep(.overdue-row) { background: #fef0f0 !important; }
.ft-table-wrapper :deep(.overdue-row:hover > td) { background: #fde2e2 !important; }
.op-cell { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; white-space: nowrap; }
.op-cell :deep(.el-button) { padding: 0 4px; margin-left: 0 !important; margin-right: 0; }
</style>
