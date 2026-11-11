<template>
  <el-dialog v-model="visible" :title="(customerName || '') + ' · 拜访记录'" width="680px" align-center destroy-on-close>
    <div v-loading="loading">
      <p v-if="!customerName" class="hint">未关联客户</p>
      <template v-else>
        <div class="vr-head">
          <span class="vr-count">共 {{ list.length }} 条 <span class="vr-tip">点击「内容」或「下一步」查看全文</span></span>
          <el-button v-if="canWrite" type="primary" size="small" @click="showForm = !showForm">+ 新增拜访</el-button>
        </div>
        <el-table :data="list" stripe style="width:100%; margin-bottom:12px;" max-height="360">
          <el-table-column prop="visitDate" label="拜访日期" width="110" />
          <el-table-column prop="visitPerson" label="拜访人" width="90" show-overflow-tooltip />
          <el-table-column label="内容" min-width="140">
            <template #default="{ row }">
              <span class="vr-cell" :title="row.visitContent" @click="openDetail(row)">{{ row.visitContent || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="下一步" min-width="120">
            <template #default="{ row }">
              <span class="vr-cell" :title="row.nextPlan" @click="openDetail(row)">{{ row.nextPlan || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="canWrite" label="操作" width="76" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="showForm" class="vr-form">
          <el-form :model="form" label-width="80px">
            <el-form-item label="拜访日期"><el-date-picker v-model="form.visitDate" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
            <el-form-item label="拜访人"><el-input v-model="form.visitPerson" maxlength="255" show-word-limit placeholder="不超过 255 字" /></el-form-item>
            <el-form-item label="拜访内容"><el-input v-model="form.visitContent" type="textarea" :rows="2" placeholder="长文本可保存，列表中点击即可查看全文" /></el-form-item>
            <el-form-item label="下一步"><el-input v-model="form.nextPlan" type="textarea" :rows="2" placeholder="长文本可保存，列表中点击即可查看全文" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="form.address" maxlength="255" show-word-limit placeholder="不超过 255 字" /></el-form-item>
            <el-form-item>
              <el-button @click="showForm = false">取消</el-button>
              <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </div>
  </el-dialog>

  <el-dialog v-model="detailVisible" title="拜访记录详情" width="560px" align-center append-to-body destroy-on-close>
    <div class="vr-detail-meta">
      <span>拜访日期：{{ fmtDate(detailRow.visitDate) }}</span>
      <span>拜访人：{{ detailRow.visitPerson || '—' }}</span>
      <span>地址：{{ detailRow.address || '—' }}</span>
    </div>
    <div class="vr-detail-block">
      <div class="vr-detail-label">拜访内容</div>
      <div class="vr-detail-text">{{ detailRow.visitContent || '—' }}</div>
    </div>
    <div class="vr-detail-block">
      <div class="vr-detail-label">下一步</div>
      <div class="vr-detail-text">{{ detailRow.nextPlan || '—' }}</div>
    </div>
    <template #footer>
      <el-button type="primary" @click="detailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{ modelValue: boolean, customerName: string, canWrite?: boolean }>()
const emit = defineEmits(['update:modelValue', 'changed'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const list = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const detailVisible = ref(false)
const detailRow = ref<any>({})
const emptyForm = () => ({ visitDate: '', visitPerson: '', visitContent: '', nextPlan: '', address: '' })
const form = ref<any>(emptyForm())

function fmtDate(v: any) {
  return v ? String(v).slice(0, 10) : '—'
}
function openDetail(row: any) {
  detailRow.value = row || {}
  detailVisible.value = true
}

async function loadList() {
  if (!props.customerName) { list.value = []; return }
  loading.value = true
  try {
    const json = await salesFetchJSON(`/api/visit-records/customer/${encodeURIComponent(props.customerName)}`)
    if (json.success) list.value = json.data || []
  } catch (e: any) { ElMessage.error('加载拜访记录失败: ' + e.message) }
  finally { loading.value = false }
}

watch(() => props.modelValue, (v) => { if (v) { showForm.value = false; loadList() } })

async function save() {
  if (!form.value.visitDate || !form.value.visitPerson || !form.value.visitContent) {
    ElMessage.warning('拜访日期、拜访人、拜访内容为必填'); return
  }
  saving.value = true
  try {
    const json = await salesFetchJSON('/api/visit-records', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, customerName: props.customerName, townId: null })
    })
    if (json.success) {
      ElMessage.success('保存成功')
      form.value = emptyForm()
      showForm.value = false
      await loadList()
      emit('changed')
    }
    else ElMessage.error(json.message || '保存失败')
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(
      '确定删除这条拜访记录吗？大项目进展中对应的拜访记录也会一并删除。',
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch { return }
  try {
    const json = await salesFetchJSON(`/api/visit-records/${row.id}`, { method: 'DELETE' })
    if (json.success) {
      ElMessage.success('删除成功')
      await loadList()
      emit('changed')
    } else ElMessage.error(json.message || '删除失败')
  } catch (e: any) { ElMessage.error('删除失败: ' + e.message) }
}
</script>

<style scoped>
.vr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.vr-count { font-size: 13px; color: #909399; }
.vr-tip { margin-left: 8px; color: #c0c4cc; }
.vr-form { border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; margin-top: 8px; }
.hint { color: #909399; font-size: 13px; }
.vr-cell { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; color: #409eff; }
.vr-cell:hover { text-decoration: underline; }
.vr-detail-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: #606266; margin-bottom: 14px; }
.vr-detail-block { margin-bottom: 14px; }
.vr-detail-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 6px; }
.vr-detail-text { white-space: pre-wrap; word-break: break-word; line-height: 1.7; font-size: 13px; color: #303133; background: #f7f8fa; border-radius: 6px; padding: 10px 12px; max-height: 320px; overflow-y: auto; }
</style>
