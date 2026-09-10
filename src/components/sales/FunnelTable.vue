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

    <el-table :data="list" v-loading="loading" stripe style="width:100%" @row-click="(_, __, e) => e && openEdit(_)">
      <el-table-column type="index" width="50" />
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
      <el-table-column prop="report_month" label="申报月份" width="100" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" @click.stop="openEdit(row)">编辑</el-button>
          <el-button text size="small" @click.stop="openVersions(row)">版本</el-button>
          <el-button v-if="perm.canWrite" text size="small" type="danger" @click.stop="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > pageSize" v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev,pager,next" class="ft-pagination" @current-change="load" />

    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑' + title : '新增' + title" width="600px" align-center destroy-on-close>
      <div class="dialog-body">
        <el-form :model="editForm" label-width="120px">
          <el-form-item label="owner"><el-input v-model="editForm.owner" /></el-form-item>
          <el-form-item label="销售类型">
            <el-select v-model="editForm.sales_type" placeholder="请选择" style="width:100%">
              <el-option label="渠道" value="渠道" />
              <el-option label="直销" value="直销" />
              <el-option label="服务" value="服务" />
            </el-select>
          </el-form-item>
          <el-form-item label="代理类型">
            <el-select v-model="editForm.revenue_type" placeholder="请选择" style="width:100%">
              <el-option label="代理" value="代理" />
              <el-option label="直销" value="直销" />
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

    <ImportDialog v-model="importVisible" :type="type" @success="load" />
    <DiffDialog v-model="diffVisible" :type="type" :record-id="diffRecordId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetch, salesFetchJSON } from './salesApi'
import ImportDialog from './ImportDialog.vue'
import DiffDialog from './DiffDialog.vue'

const props = defineProps<{ type: 'intention' | 'key', title: string, perm: any }>()
const emit = defineEmits(['customer-click', 'progress-jump'])

const salesStatusMap: Record<string, string[]> = {
  intention: ['确认意向', '引导立项', '方案提交'],
  key: ['赢得认可', '商务谈判']
}
const salesStatusOptions = computed(() => salesStatusMap[props.type] || [])

const list = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
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

function targetTabByProgress(p: number): string | null {
  if (p >= 10 && p <= 40) return 'intention'
  if (p >= 41 && p <= 90) return 'key'
  if (p >= 91 && p <= 100) return 'deal'
  return null
}

async function save() {
  saving.value = true
  try {
    const url = `/api/sales-four-tables/${props.type}` + (editForm.value.id ? `/${editForm.value.id}` : '')
    const method = editForm.value.id ? 'PUT' : 'POST'
    const json = await salesFetchJSON(url, { method, body: JSON.stringify(editForm.value) })
    if (json.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      load()
      const target = targetTabByProgress(Number(editForm.value.progress_percent || 0))
      if (target && target !== props.type) emit('progress-jump', target)
    } else { ElMessage.error(json.message || '保存失败') }
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${row.id}`, { method: 'DELETE' })
    if (json.success) { ElMessage.success('删除成功'); load() }
    else ElMessage.error(json.message || '删除失败')
  } catch {}
}

function openVersions(row: any) {
  diffRecordId.value = row.id
  diffVisible.value = true
}

onMounted(load)
watch(() => props.type, load)
</script>

<style scoped>
.ft-panel { background: #fff; border-radius: 8px; padding: 1rem; }
.ft-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.ft-filters { display: flex; gap: 0.5rem; }
.ft-actions { display: flex; gap: 0.5rem; }
.ft-pagination { margin-top: 1rem; justify-content: flex-end; }
.dialog-body { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
