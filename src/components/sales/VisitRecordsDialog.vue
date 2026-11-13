<template>
  <el-dialog v-model="visible" :width="dialogWidth" :top="dialogTop" :class="{ 'vr-expanded': expanded }" align-center destroy-on-close>
    <template #header>
      <div class="vr-titlebar">
        <span class="vr-title">{{ (customerName || '') + ' · 拜访记录' }}</span>
        <button class="vr-zoom" type="button" @click="toggleExpand"
          :title="expanded ? '还原为常规尺寸' : '放大到接近全屏（宽高同时放大）'">{{ expanded ? '还原' : '放大' }}</button>
      </div>
    </template>
    <div v-loading="loading">
      <p v-if="!customerName" class="hint">未关联客户</p>
      <template v-else>
        <div class="vr-head">
          <span class="vr-count">共 {{ list.length }} 条 <span class="vr-tip">点击「内容」或「下一步」查看全文</span></span>
          <el-button v-if="canWrite" type="primary" size="small" @click="showForm = !showForm">+ 新增拜访</el-button>
        </div>
        <el-table :data="list" stripe style="width:100%; margin-bottom:12px;" :height="tableHeight">
          <el-table-column prop="visitDate" label="拜访日期" width="110" />
          <el-table-column prop="visitPerson" label="拜访人" width="90" show-overflow-tooltip />
          <el-table-column label="内容" min-width="300">
            <template #default="{ row }">
              <span class="vr-cell" :title="row.visitContent" @click="openDetail(row)">{{ row.visitContent || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="下一步" min-width="150">
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

  <el-dialog v-model="detailVisible" title="拜访记录详情" :width="expanded ? '900px' : '720px'" align-center append-to-body destroy-on-close>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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

// 放大状态：默认走自适应尺寸，点标题栏「放大」后宽、高一起放大到接近全屏，偏好本地记住
const EXPAND_KEY = 'sales.visit-dialog.expanded'
const expanded = ref(false)
try { expanded.value = localStorage.getItem(EXPAND_KEY) === '1' } catch {}
const dialogWidth = computed(() => expanded.value ? '96vw' : 'min(1040px, 92vw)')

// 表格改用固定 height（而非 max-height 上限）：数据少时也能把弹窗撑到指定高度，
// 这样「放大前」就有足够高度，「放大后」宽高同步变大，而不是只变宽。
// el-table 的 height 只认数值像素，按视口高度换算，避免 CSS min()/vh 被解析成 NaN。
const tableHeight = ref(460)
function calcTableHeight() {
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  // 放大态：视口高度扣掉标题栏/内边距/工具行等固定开销（约 230px），让弹窗接近满屏高度；
  // 默认态：稳定的固定高度，拜访记录少时弹窗也不会塌成一条。
  tableHeight.value = Math.round(
    expanded.value ? Math.max(420, vh - 230) : Math.min(520, vh * 0.52)
  )
}
// 本项目的 Element Plus 版本不支持 align-center（该属性只会被透传、不生效），
// 弹窗默认 margin-top: 15vh。放大态接近满屏时必须把顶部间距收掉，否则内容会被顶出屏幕。
const dialogTop = computed(() => expanded.value ? '2vh' : undefined)
function toggleExpand() {
  expanded.value = !expanded.value
  try { localStorage.setItem(EXPAND_KEY, expanded.value ? '1' : '0') } catch {}
}
watch(expanded, calcTableHeight)
onMounted(() => { calcTableHeight(); window.addEventListener('resize', calcTableHeight) })
onUnmounted(() => { window.removeEventListener('resize', calcTableHeight) })

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
.vr-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-right: 28px; }
.vr-title { font-size: 16px; font-weight: 500; color: var(--el-text-color-primary, #303133); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vr-zoom { flex: none; font-size: 12px; line-height: 1; padding: 5px 10px; border: 1px solid var(--el-border-color, #dcdfe6); border-radius: 4px; background: var(--el-bg-color, #fff); color: var(--el-text-color-regular, #606266); cursor: pointer; }
.vr-zoom:hover { border-color: #409eff; color: #409eff; }
/* 放大态：收掉默认 50px 底部间距，让接近满屏的弹窗完整落在视口内；
   body 上限放宽到只作兜底，常态下由表格自身滚动，避免出现双滚动条 */
:deep(.el-dialog.vr-expanded),
:deep(.vr-expanded .el-dialog) { margin-bottom: 0 !important; }
.vr-expanded :deep(.el-dialog__body) { max-height: calc(100vh - 70px); overflow-y: auto; }
.vr-cell { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; line-height: 1.5; overflow: hidden; cursor: pointer; color: #409eff; }
.vr-cell:hover { text-decoration: underline; }
.vr-detail-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: #606266; margin-bottom: 14px; }
.vr-detail-block { margin-bottom: 14px; }
.vr-detail-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 6px; }
.vr-detail-text { white-space: pre-wrap; word-break: break-word; line-height: 1.7; font-size: 13px; color: #303133; background: #f7f8fa; border-radius: 6px; padding: 10px 12px; max-height: 60vh; overflow-y: auto; }
</style>
