<template>
  <div class="ft-panel">
    <div class="ft-toolbar">
      <div class="ft-filters">
        <el-input v-model="filter.keyword" placeholder="客户/合作伙伴/owner" clearable style="width:200px" @keyup.enter="load" />
        <el-input v-model="filter.month" placeholder="申报月份 如 2024-07" clearable style="width:160px" @keyup.enter="load" />
        <el-button type="primary" @click="load">查询</el-button>
      </div>
      <div class="ft-actions">
        <el-button v-if="perm.canWrite" type="primary" @click="openEdit()">+ 新增</el-button>
        <el-button v-if="perm.canWrite" @click="importVisible = true">导入 Excel</el-button>
      </div>
    </div>

    <div class="ft-table-wrapper">
      <el-table :data="list" v-loading="loading" stripe style="width:100%" @row-click="(_, __, e) => (e && perm.canWrite) && openEdit(_)">
        <el-table-column type="index" label="序号" width="60" :index="indexMethod" align="center" />
        <el-table-column prop="owner" label="owner" width="100" />
        <el-table-column prop="customer_name" label="客户名单" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link size="small" @click.stop="emit('customer-click', row.customer_name)">{{ row.customer_name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="partner_name" label="合作伙伴" min-width="120" show-overflow-tooltip />
        <el-table-column prop="sales_type" label="销售类型" width="100" />
        <el-table-column prop="revenue_type" label="代理类型" width="100" />
        <el-table-column prop="report_date" label="申报日期" width="110" />
        <el-table-column prop="product_type" label="产品类型" min-width="120" show-overflow-tooltip />
        <el-table-column prop="monthly_repayment" label="本月回款" width="110">
          <template #default="{ row }">{{ Number(row.monthly_repayment || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="estimated_total" label="预计总额" width="110">
          <template #default="{ row }">{{ Number(row.estimated_total || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="sales_status" label="销售状态" width="100" />
        <el-table-column label="归属" width="110">
          <template #default="{ row }">
            <el-tag :type="row.progress_percent >= 91 ? 'success' : (row.progress_percent >= 41 ? 'warning' : 'info')" size="small" effect="light">{{ progressBandLabel(row.progress_percent) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="report_month" label="申报月份" width="100" />
        <el-table-column label="拜访记录" width="90">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="emit('open-visit-records', row.customer_name)">{{ Number(row.visit_count || 0) }} 条</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="op-cell">
              <el-button v-if="perm.canWrite" text size="small" @click.stop="openEdit(row)">编辑</el-button>
              <el-button text size="small" @click.stop="openVersions(row)">版本</el-button>
              <el-button v-if="perm.canWrite" text size="small" type="danger" @click.stop="remove(row)">删除</el-button>
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

    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑' + title : '新增' + title" width="600px" align-center destroy-on-close>
      <div class="dialog-body">
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
          <el-form-item label="合作伙伴"><el-input v-model="editForm.partner_name" /></el-form-item>
          <el-form-item label="主要竞争对手"><el-input v-model="editForm.competitor" /></el-form-item>
          <el-form-item label="客户名单"><el-input v-model="editForm.customer_name" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="editForm.contact" /></el-form-item>
          <el-form-item label="电话"><el-input v-model="editForm.phone" /></el-form-item>
          <el-form-item label="站点数"><el-input-number v-model="editForm.site_count" :min="0" style="width:100%" /></el-form-item>
          <el-form-item label="本月回款金额"><el-input-number v-model="editForm.monthly_repayment" :min="0" style="width:100%" /></el-form-item>
          <el-form-item label="本月回款把握度"><el-input v-model="editForm.monthly_confidence" /></el-form-item>
          <el-form-item label="预计总回款额"><el-input-number v-model="editForm.estimated_total" :min="0" style="width:100%" /></el-form-item>
          <el-form-item label="进展状态%">
            <el-input-number v-model="editForm.progress_percent" :min="0" :max="100" style="width:100%" />
          </el-form-item>
          <el-alert
            v-if="predictedDest"
            class="dest-hint"
            :title="`保存后将归入：${DEST_TYPE_LABEL[predictedDest]}`"
            :type="willMigrate ? 'warning' : 'info'"
            :closable="false"
            show-icon
          />
          <el-form-item label="销售状态">
            <el-select v-model="editForm.sales_status" placeholder="请选择" style="width:100%">
              <el-option v-for="s in salesStatusOptions" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计回款月份"><el-input v-model="editForm.estimated_repay_month" /></el-form-item>
          <el-form-item label="主观机会度"><el-input v-model="editForm.opportunity_assessment" /></el-form-item>
          <el-form-item label="成功/放弃"><el-input v-model="editForm.success_or_giveup" /></el-form-item>
          <el-form-item label="公司级支持"><el-input v-model="editForm.company_support" type="textarea" :rows="2" /></el-form-item>
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

    <ImportDialog v-model="importVisible" :type="type" @success="onImportSuccess" />
    <DiffDialog v-model="diffVisible" :type="type" :record-id="diffRecordId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetch, salesFetchJSON } from './salesApi'
import ImportDialog from './ImportDialog.vue'
import DiffDialog from './DiffDialog.vue'
import { SALES_TYPE_OPTIONS, REVENUE_TYPE_OPTIONS, SALES_STATUS_BY_TYPE, destTypeByProgress, progressBandLabel, DEST_TYPE_LABEL } from './salesConstants'

const props = defineProps<{ type: 'intention' | 'key', title: string, perm: any }>()
const emit = defineEmits(['customer-click', 'progress-jump', 'refresh-stats', 'open-visit-records'])

const salesStatusOptions = computed(() => SALES_STATUS_BY_TYPE[props.type] || [])

const list = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const indexMethod = (index: number) => (page.value - 1) * pageSize.value + index + 1
const filter = ref({ keyword: '', month: '' })
const editVisible = ref(false)
const importVisible = ref(false)
const diffVisible = ref(false)
const diffRecordId = ref<number | null>(null)
const saving = ref(false)
const emptyForm = () => ({
  owner: '', sales_type: '', revenue_type: '', report_date: '', product_type: '', partner_name: '', competitor: '',
  customer_name: '', contact: '', phone: '', site_count: 0, monthly_repayment: 0, monthly_confidence: '',
  estimated_total: 0, progress_percent: 0, sales_status: '', estimated_repay_month: '', opportunity_assessment: '',
  success_or_giveup: '', company_support: '', remark: ''
})
const editForm = ref<any>(emptyForm())

// 跨表归属透明度：根据进展百分比预测保存后将归入的表，编辑跨表记录时二次确认
const predictedDest = computed(() => destTypeByProgress(editForm.value.progress_percent))
const willMigrate = computed(() => !!editForm.value.id && predictedDest.value !== props.type)

async function load() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filter.value.keyword) qs.set('keyword', filter.value.keyword)
    if (filter.value.month) qs.set('month', filter.value.month)
    qs.set('page', String(page.value))
    qs.set('pageSize', String(pageSize.value))
    const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}?${qs.toString()}`)
    if (json.success) {
      list.value = json.data.list
      total.value = json.data.total
    }
  } catch (e: any) { ElMessage.error('加载失败: ' + e.message) }
  finally { loading.value = false }
}

function openEdit(row?: any) {
  editForm.value = row ? { ...row } : emptyForm()
  editVisible.value = true
}

async function save() {
  // 跨表归属透明度：编辑已有记录且保存后会跨表迁移时，二次确认
  if (editForm.value.id && predictedDest.value !== props.type) {
    try {
      await ElMessageBox.confirm(
        `保存后该记录将从「${DEST_TYPE_LABEL[props.type]}」迁移到「${DEST_TYPE_LABEL[predictedDest.value]}」（按进展状态 ${editForm.value.progress_percent}% 判定），是否继续？`,
        '跨表归属确认',
        { type: 'warning', confirmButtonText: '确认迁移', cancelButtonText: '取消' }
      )
    } catch {
      return // 用户取消，不保存
    }
  }
  saving.value = true
  try {
    const url = `/api/sales-four-tables/${props.type}` + (editForm.value.id ? `/${editForm.value.id}` : '')
    const method = editForm.value.id ? 'PUT' : 'POST'
    const json = await salesFetchJSON(url, { method, body: JSON.stringify(editForm.value) })
    if (json.success) {
      const dest = json.data?.destType
      // 同步结果回显（大项目进展 / 客户档案）
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
      editVisible.value = false
      load()
      emit('refresh-stats')
      if (dest && dest !== props.type) {
        emit('progress-jump', dest)
        ElMessage.success(`保存成功，记录已归入「${DEST_TYPE_LABEL[dest]}」`)
      } else {
        ElMessage.success(msg)
      }
    } else { ElMessage.error(json.message || '保存失败') }
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}

function onSizeChange(s: number) { pageSize.value = s; page.value = 1; load() }

async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${row.id}`, { method: 'DELETE' })
    if (json.success) { ElMessage.success('删除成功'); load(); emit('refresh-stats') }
    else ElMessage.error(json.message || '删除失败')
  } catch {}
}

function openVersions(row: any) {
  diffRecordId.value = row.id
  diffVisible.value = true
}

function onImportSuccess() {
  load()
  emit('refresh-stats')
}

onMounted(load)
watch(() => props.type, load)
defineExpose({ load })
</script>

<style scoped>
.ft-panel { background: #fff; border-radius: 8px; padding: 1rem; }
.ft-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.ft-filters { display: flex; gap: 0.5rem; }
.ft-actions { display: flex; gap: 0.5rem; }
.ft-pagination { margin-top: 1rem; justify-content: flex-end; }
.dialog-body { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; }
.dest-hint { margin-bottom: 0.75rem; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
.ft-table-wrapper { width: 100%; overflow-x: auto; border: 1px solid #ebeef5; border-radius: 4px; }
.ft-table-wrapper :deep(.el-table) { min-width: max-content; }
.op-cell { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; white-space: nowrap; }
.op-cell :deep(.el-button) { padding: 0 4px; margin-left: 0 !important; margin-right: 0; }
</style>
