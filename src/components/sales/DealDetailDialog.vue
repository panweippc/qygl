<template>
  <el-dialog v-model="visible" :title="`成交项目详情 · ${customerName || ''}`" width="920px" top="4vh" destroy-on-close>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="基本信息" name="basic">
        <el-descriptions :column="2" border v-loading="basicLoading" class="basic-desc">
          <el-descriptions-item label="负责人">{{ basic.owner || '—' }}</el-descriptions-item>
          <el-descriptions-item label="客户名单">{{ basic.customer_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="销售类型">{{ basic.sales_type || '—' }}</el-descriptions-item>
          <el-descriptions-item label="代理类型">{{ basic.revenue_type || '—' }}</el-descriptions-item>
          <el-descriptions-item label="销售状态">{{ basic.sales_status || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申报日期">{{ basic.report_date || '—' }}</el-descriptions-item>
          <el-descriptions-item label="合同额">¥{{ fmt(basic.contract_amount) }}</el-descriptions-item>
          <el-descriptions-item label="实际金额">¥{{ fmt(basic.actual_amount) }}</el-descriptions-item>
          <el-descriptions-item label="回款金额">¥{{ fmt(basic.received_amount) }}</el-descriptions-item>
          <el-descriptions-item label="未回款金额">¥{{ fmt(basic.unreceived_amount) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ basic.contact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ basic.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="站点数">{{ basic.site_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="申报月份">{{ basic.report_month || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ basic.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane v-for="k in KINDS" :key="k.key" :label="`${k.label} (${counts[k.key]})`" :name="k.key">
        <div class="sub-toolbar">
          <el-button v-if="perm.canWrite" type="primary" size="small" @click="openAdd(k.key)">+ 新增{{ k.label }}</el-button>
        </div>
        <el-table :data="subData[k.key]" v-loading="subLoading[k.key]" stripe size="small" max-height="320">
          <el-table-column v-for="f in k.fields" :key="f.name" :label="f.label" min-width="120">
            <template #default="{ row }">
              <span v-if="f.money">¥{{ fmt(row[f.name]) }}</span>
              <span v-else>{{ row[f.name] || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column v-if="perm.canWrite" label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" @click="openEdit(k.key, row)">编辑</el-button>
              <el-button text size="small" type="danger" @click="removeSub(k.key, row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editVisible" :title="editingId ? '编辑' + editKindLabel : '新增' + editKindLabel" width="480px" append-to-body>
      <el-form label-width="110px">
        <el-form-item v-for="f in currentKindFields" :key="f.name" :label="f.label">
          <el-date-picker v-if="f.type === 'date'" v-model="editForm[f.name]" value-format="YYYY-MM-DD" style="width:100%" />
          <el-input-number v-else-if="f.type === 'number'" v-model="editForm[f.name]" :min="0" style="width:100%" />
          <el-input v-else-if="f.type === 'textarea'" v-model="editForm[f.name]" type="textarea" :rows="3" />
          <el-input v-else v-model="editForm[f.name]" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSub">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="convertVisible" title="转为成交项目" width="520px" append-to-body :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="项目名称">
          <el-input v-model="convertForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="关联客户">
          <el-select v-model="convertForm.customerId" placeholder="选择关联客户（可不选）" clearable filterable style="width:100%">
            <el-option v-for="c in convertCustomers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="成交价格">
          <el-input-number v-model="convertForm.price" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="成交时间">
          <el-date-picker v-model="convertForm.dealTime" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="convertForm.status">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="convertForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="convertVisible = false">取消</el-button>
        <el-button type="primary" :loading="converting" @click="confirmConvert">确定生成</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const KINDS = [
  {
    key: 'service', label: '服务记录',
    fields: [
      { name: 'service_date', label: '服务日期', type: 'date' },
      { name: 'service_type', label: '服务类型', type: 'text' },
      { name: 'content', label: '服务内容', type: 'textarea' },
      { name: 'handler', label: '处理人', type: 'text' }
    ]
  },
  {
    key: 'purchase', label: '后续购买记录',
    fields: [
      { name: 'purchase_date', label: '购买日期', type: 'date' },
      { name: 'product', label: '产品', type: 'text' },
      { name: 'amount', label: '金额', type: 'number', money: true },
      { name: 'remark', label: '备注', type: 'textarea' }
    ]
  },
  {
    key: 'aftersales', label: '售后运维工单',
    fields: [
      { name: 'title', label: '工单标题', type: 'text' },
      { name: 'ticket_type', label: '类型(售后/运维)', type: 'text' },
      { name: 'status', label: '状态', type: 'text' },
      { name: 'content', label: '内容', type: 'textarea' },
      { name: 'handler', label: '处理人', type: 'text' }
    ]
  }
]

const props = defineProps<{ modelValue: boolean, recordId: number | null, customerName?: string, perm: any }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const activeTab = ref('basic')
const basic = ref<any>({})
const basicLoading = ref(false)
const subData = ref<Record<string, any[]>>({ service: [], purchase: [], aftersales: [] })
const counts = ref<Record<string, number>>({ service: 0, purchase: 0, aftersales: 0 })
const subLoading = ref<Record<string, boolean>>({ service: false, purchase: false, aftersales: false })
const editVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const editKind = ref<string>('service')
const editForm = ref<any>({})

const editKindLabel = computed(() => KINDS.find((k) => k.key === editKind.value)?.label || '')
const currentKindFields = computed(() => KINDS.find((k) => k.key === editKind.value)?.fields || [])

function fmt(n: any): string {
  return Number(n || 0).toLocaleString()
}
function formatTime(t: string) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(0, 19)
}

async function loadBasic() {
  if (!props.recordId) return
  basicLoading.value = true
  try {
    const json = await salesFetchJSON(`/api/sales-four-tables/deal/${props.recordId}`)
    if (json.success) basic.value = json.data || {}
  } catch (e: any) {
    ElMessage.error('加载详情失败: ' + (e?.message || ''))
  } finally {
    basicLoading.value = false
  }
}

async function loadSub(kind: string) {
  if (!props.recordId) return
  subLoading.value[kind] = true
  try {
    const json = await salesFetchJSON(`/api/sales-four-tables/deal/${props.recordId}/sub-records?kind=${kind}`)
    if (json.success) {
      subData.value[kind] = json.data || []
      counts.value[kind] = subData.value[kind].length
    }
  } catch (e: any) {
    ElMessage.error('加载子记录失败: ' + (e?.message || ''))
  } finally {
    subLoading.value[kind] = false
  }
}

watch(visible, (v) => {
  if (v && props.recordId) {
    loadBasic()
    KINDS.forEach((k) => loadSub(k.key))
  }
})

function openAdd(kind: string) {
  editKind.value = kind
  editingId.value = null
  const blank: any = {}
  KINDS.find((k) => k.key === kind)?.fields.forEach((f) => { blank[f.name] = f.type === 'number' ? 0 : '' })
  editForm.value = blank
  editVisible.value = true
}
function openEdit(kind: string, row: any) {
  editKind.value = kind
  editingId.value = row.id
  editForm.value = { ...row }
  editVisible.value = true
}

async function saveSub() {
  if (!props.recordId) return
  saving.value = true
  try {
    const url = `/api/sales-four-tables/deal/${props.recordId}/sub-records` + (editingId.value ? `/${editingId.value}` : '')
    const method = editingId.value ? 'PUT' : 'POST'
    const body = { kind: editKind.value, ...editForm.value }
    const json = await salesFetchJSON(url, { method, body: JSON.stringify(body) })
    if (json.success) {
      ElMessage.success(json.message || '已保存')
      editVisible.value = false
      loadSub(editKind.value)
    } else ElMessage.error(json.message || '保存失败')
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e?.message || ''))
  } finally {
    saving.value = false
  }
}

async function removeSub(kind: string, row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    const json = await salesFetchJSON(`/api/sales-four-tables/deal/${props.recordId}/sub-records/${row.id}?kind=${kind}`, { method: 'DELETE' })
    if (json.success) { ElMessage.success('已删除'); loadSub(kind) }
    else ElMessage.error(json.message || '删除失败')
  } catch (e: any) {
    ElMessage.error('删除失败: ' + (e?.message || ''))
  }
}
</script>

<style scoped>
.basic-desc { margin-top: 0.5rem; }
.sub-toolbar { margin-bottom: 0.6rem; }
</style>
