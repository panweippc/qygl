<template>
  <el-dialog v-model="visible" :title="`客户联查：${customer}`" width="800px" top="5vh" destroy-on-close>
    <el-alert v-if="!customer" title="未指定客户" type="warning" :closable="false" />
    <div v-else v-loading="loading" class="cr-body">
      <el-empty v-if="isEmpty" description="未找到该客户在其他表中的记录" />
      <div v-for="sec in sections" :key="sec.type" class="cr-section">
        <div class="cr-section-title">
          <span>{{ sec.label }}</span>
          <el-tag size="small" type="info">{{ sec.rows.length }} 条</el-tag>
        </div>
        <el-table v-if="sec.rows.length" :data="sec.rows" size="small" stripe>
          <el-table-column prop="report_month" label="申报月份" width="100" />
          <el-table-column v-if="sec.type !== 'project'" prop="owner" label="owner" width="100" />
          <el-table-column v-if="sec.type !== 'project'" prop="sales_type" label="销售类型" width="100" />
          <el-table-column v-if="sec.type !== 'project'" prop="product_type" label="产品类型" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="sec.type === 'project'" prop="project_owner" label="项目负责人" width="120" />
          <el-table-column v-if="sec.type === 'project'" prop="unit_nature" label="单位性质" width="120" />
          <el-table-column v-if="sec.type === 'project'" prop="project_budget" label="项目预算" min-width="120" />
          <el-table-column prop="report_date" label="日期" width="110" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" @click="jump(sec.type, row.id)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="cr-section" v-if="customerRec">
        <div class="cr-section-title">
          <span>客户管理</span>
          <el-tag size="small" type="success">已同步</el-tag>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客户名称">{{ customerRec.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="customerRec.status === '活跃' ? 'success' : customerRec.status === '成交' ? 'warning' : 'info'">{{ customerRec.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系人">{{ customerRec.contact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ customerRec.phone || '—' }}</el-descriptions-item>
        </el-descriptions>
        <el-button type="primary" link size="small" style="margin-top:6px" @click="openInCustomerMgmt">在客户管理中打开</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{ modelValue: boolean, customer: string }>()
const emit = defineEmits(['update:modelValue', 'jump'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const loading = ref(false)
const data = ref<any>({})
const customerRec = ref<any>(null)

async function loadCustomer() {
  customerRec.value = null
  if (!props.customer) return
  try {
    const res = await fetch('/api/customers?keyword=' + encodeURIComponent(props.customer)).then(r => r.json())
    if (res.success) {
      const list = res.data?.list || res.data || []
      customerRec.value = (list.find((c: any) => c.name === props.customer) || list[0]) || null
    }
  } catch { /* ignore */ }
}

function openInCustomerMgmt() {
  window.open('/customer-management?name=' + encodeURIComponent(props.customer), '_blank')
}

const sections = computed(() => [
  { type: 'intention', label: '意向漏斗', rows: data.value.intention || [] },
  { type: 'key', label: '重点漏斗', rows: data.value.key || [] },
  { type: 'deal', label: '成交用户', rows: data.value.deal || [] },
  { type: 'project', label: '大项目进展', rows: data.value.project || [] }
])

const isEmpty = computed(() => sections.value.every(s => !s.rows.length))

async function load() {
  if (!props.customer) return
  loading.value = true
  try {
    const json = await salesFetchJSON(`/api/sales-four-tables/cross-reference?customer=${encodeURIComponent(props.customer)}`)
    if (json.success) data.value = json.data || {}
  } catch (e: any) {
    console.error('联查失败:', e.message)
  } finally {
    loading.value = false
  }
  await loadCustomer()
}

function jump(type: string, id: number) {
  emit('jump', { type, id })
}

watch(visible, (v) => { if (v) load() })
watch(() => props.customer, () => { if (visible.value) load() })
</script>

<style scoped>
.cr-body { max-height: 65vh; overflow-y: auto; }
.cr-section { margin-bottom: 1rem; }
.cr-section-title { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: 0.5rem; color: #333; }
</style>
