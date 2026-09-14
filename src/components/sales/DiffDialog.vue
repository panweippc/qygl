<template>
  <el-dialog v-model="visible" title="版本对比" width="780px">
    <div v-if="loading" v-loading="true" element-loading-text="加载中…" style="min-height:120px" />
    <div v-else-if="!chain.length" class="diff-empty">该记录暂无历史版本。</div>
    <div v-else>
      <!-- 任意两版对比（非连续版本，如 v5 与 v1） -->
      <div class="diff-select">
        <span>对比</span>
        <el-select v-model="oldV" placeholder="旧版本" style="width:110px">
          <el-option v-for="v in versionList" :key="v.version" :label="`v${v.version}`" :value="v.version" />
        </el-select>
        <span>与</span>
        <el-select v-model="newV" placeholder="新版本" style="width:110px">
          <el-option v-for="v in versionList" :key="v.version" :label="`v${v.version}`" :value="v.version" />
        </el-select>
        <el-button type="primary" size="small" @click="loadArbitrary">对比</el-button>
      </div>

      <div v-if="arbitrary.length" class="arbitrary-result">
        <div class="arbitrary-title">v{{ oldV }} → v{{ newV }} 差异（{{ arbitrary.length }} 项）</div>
        <el-table :data="arbitrary" stripe size="small" max-height="260">
          <el-table-column prop="label" label="字段" width="160" />
          <el-table-column prop="old" label="旧值" min-width="180">
            <template #default="{ row }"><span class="diff-old">{{ row.old || '—' }}</span></template>
          </el-table-column>
          <el-table-column prop="new" label="新值" min-width="180">
            <template #default="{ row }"><span class="diff-new">{{ row.new || '—' }}</span></template>
          </el-table-column>
        </el-table>
      </div>

      <el-divider>每次提交对比（较上一版）</el-divider>

      <!-- 链式摘要：每次提交与上一版的差异，直接展示 -->
      <div class="version-chain">
        <div v-for="item in chainDesc" :key="item.version" class="version-card">
          <div class="vc-head" @click="toggle(item.version)">
            <span class="vc-title">v{{ item.version }}</span>
            <span class="vc-meta">{{ item.created_by || '—' }} · {{ formatTime(item.created_at) }}</span>
            <span v-if="item.prevVersion" class="vc-summary">
              较 v{{ item.prevVersion }} 修改 {{ item.changedCount }} 项：
              <template v-if="item.changedCount">
                <span v-for="c in item.changes" :key="c.field" class="vc-tag">{{ c.label }}</span>
              </template>
              <span v-else>无</span>
            </span>
            <span v-else class="vc-summary initial">初始版本</span>
            <span class="vc-arrow">{{ expanded[item.version] ? '▾' : '▸' }}</span>
          </div>
          <div v-if="expanded[item.version] && item.changes.length" class="vc-body">
            <el-table :data="item.changes" stripe size="small" max-height="260">
              <el-table-column prop="label" label="字段" width="160" />
              <el-table-column prop="old" label="旧值" min-width="180">
                <template #default="{ row }"><span class="diff-old">{{ row.old || '—' }}</span></template>
              </el-table-column>
              <el-table-column prop="new" label="新值" min-width="180">
                <template #default="{ row }"><span class="diff-new">{{ row.new || '—' }}</span></template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="expanded[item.version] && !item.changes.length" class="vc-empty">本版相对上一版无字段变更</div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{ modelValue: boolean, type: string, recordId: number | null }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const chain = ref<any[]>([])
const versionList = ref<any[]>([])
const loading = ref(false)
const expanded = ref<Record<number, boolean>>({})
const oldV = ref<number | null>(null)
const newV = ref<number | null>(null)
const arbitrary = ref<any[]>([])

// 最新版本在最上方
const chainDesc = computed(() => [...chain.value].reverse())

async function loadChain() {
  if (!props.recordId) return
  loading.value = true
  arbitrary.value = []
  try {
    const [vJson, cJson] = await Promise.all([
      salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.recordId}/versions`),
      salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.recordId}/diff?mode=chain`)
    ])
    if (vJson.success) {
      versionList.value = vJson.data
      if (vJson.data.length) {
        oldV.value = vJson.data[Math.max(0, vJson.data.length - 2)].version
        newV.value = vJson.data[vJson.data.length - 1].version
      }
    }
    if (cJson.success) {
      chain.value = cJson.chain || []
      // 默认展开最新版本的明细
      const newest = chain.value[chain.value.length - 1]
      expanded.value = newest ? { [newest.version]: true } : {}
    }
  } catch (e: any) {
    ElMessage.error('加载版本对比失败: ' + (e?.message || ''))
  } finally {
    loading.value = false
  }
}

async function loadArbitrary() {
  if (!props.recordId || oldV.value == null || newV.value == null) return
  if (oldV.value === newV.value) { ElMessage.warning('请选择两个不同的版本'); return }
  const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.recordId}/diff?oldVersion=${oldV.value}&newVersion=${newV.value}`)
  if (json.success) arbitrary.value = json.data
  else ElMessage.error(json.message || '对比失败')
}

function toggle(v: number) {
  expanded.value = { ...expanded.value, [v]: !expanded.value[v] }
}

function formatTime(t: string) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(0, 19)
}

watch(visible, (v) => { if (v) loadChain() })
watch(() => props.recordId, () => { if (visible.value) loadChain() })
</script>

<style scoped>
.diff-empty { text-align: center; color: #999; padding: 2rem; }
.diff-select { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.arbitrary-result { margin-bottom: 0.5rem; }
.arbitrary-title { font-size: 0.85rem; color: #409eff; margin-bottom: 0.4rem; }
.version-chain { display: flex; flex-direction: column; gap: 0.5rem; max-height: 46vh; overflow-y: auto; }
.version-card { border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden; }
.vc-head { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; background: #f7f9fc; cursor: pointer; flex-wrap: wrap; }
.vc-title { font-weight: 600; color: #303133; }
.vc-meta { color: #909399; font-size: 0.8rem; }
.vc-summary { font-size: 0.82rem; color: #606266; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.vc-summary.initial { color: #67c23a; }
.vc-tag { background: #ecf5ff; color: #409eff; border-radius: 3px; padding: 0 0.35rem; font-size: 0.75rem; }
.vc-arrow { margin-left: auto; color: #c0c4cc; }
.vc-body { padding: 0.5rem 0.75rem; }
.vc-empty { padding: 0.5rem 0.75rem; color: #909399; font-size: 0.82rem; }
.diff-old { color: #c0392b; background: #ffeaea; padding: 0.1rem 0.3rem; border-radius: 3px; word-break: break-all; }
.diff-new { color: #27ae60; background: #eafff2; padding: 0.1rem 0.3rem; border-radius: 3px; word-break: break-all; }
</style>
