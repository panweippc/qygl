<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="(v: boolean) => { if (!v) close() }"
    width="640px"
    :show-close="true"
    class="gs-dialog"
    @open="onOpen"
    @closed="onClosed"
  >
    <div class="gs-box">
      <div class="gs-input-row">
        <span class="gs-ico">⌕</span>
        <input
          ref="inputRef"
          v-model="localKeyword"
          class="gs-input"
          placeholder="搜索 员工 / 申请 / 资料 / 客户 / 公告 / 日志"
          @input="onInput(localKeyword)"
          @keydown.up.prevent="move(-1)"
          @keydown.down.prevent="move(1)"
          @keydown.enter.prevent="goActive"
        />
        <span class="gs-esc">ESC</span>
      </div>

      <div class="gs-body">
        <el-empty
          v-if="!keyword || (!loading && total === 0)"
          :description="keyword ? '没有找到相关内容' : '输入关键词开始搜索'"
          :image-size="90"
        />
        <div v-else class="gs-results">
          <div v-for="(g, gi) in results" :key="g.module" class="gs-group">
            <div class="gs-group-title">{{ g.label }}</div>
            <div
              v-for="(it, ii) in g.items"
              :key="g.module + '-' + it.id"
              class="gs-item"
              :class="{ on: activeIndex === globalIndex(gi, ii) }"
              @mouseenter="activeIndex = globalIndex(gi, ii)"
              @click="go(it)"
            >
              <span class="gs-badge" :class="'gs-badge-' + it.type">{{ typeLabel(it.type) }}</span>
              <div class="gs-text">
                <div class="gs-title" v-html="highlight(it.title, keyword)"></div>
                <div class="gs-sub">{{ it.sub }}</div>
              </div>
              <span class="gs-arrow">↵</span>
            </div>
          </div>
        </div>
      </div>

      <div class="gs-foot">
        <span>↑↓ 选择</span>
        <span>↵ 打开</span>
        <span>ESC 关闭</span>
        <span class="gs-foot-right">仅展示你有权限的数据</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalSearch, type SearchItem } from '../composables/useGlobalSearch'
import { highlight } from '../utils/highlight'

const router = useRouter()
const { visible, keyword, results, total, loading, close, onInput } = useGlobalSearch()
const localKeyword = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)

const flatItems = computed(() => results.value.flatMap((g) => g.items))
function globalIndex(gi: number, ii: number) {
  let idx = 0
  for (let i = 0; i < gi; i++) idx += results.value[i].items.length
  return idx + ii
}
function typeLabel(t: string) {
  const map: Record<string, string> = {
    employee: '员工', leave: '请假', reimbursement: '报销', entertainment: '招待',
    meeting: '会议', 'business-trip': '出差', project: '协同', file: '文件',
    article: '文章', 'project-info': '项目', customer: '客户', announcement: '公告', log: '日志'
  }
  return map[t] || t
}
function onOpen() {
  nextTick(() => inputRef.value?.focus())
}
function onClosed() {
  activeIndex.value = 0
}
function move(d: number) {
  const n = flatItems.value.length
  if (!n) return
  activeIndex.value = (activeIndex.value + d + n) % n
}
function goActive() {
  const it = flatItems.value[activeIndex.value]
  if (it) go(it)
}
function go(it: SearchItem) {
  close()
  router.push({ path: it.route, query: it.query || {} })
}
</script>

<style scoped>
.gs-box { display: flex; flex-direction: column; min-height: 200px; }
.gs-input-row {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--el-color-primary, #409eff);
  border-radius: 8px; padding: 10px 12px;
}
.gs-ico { font-size: 16px; color: #909399; }
.gs-input { flex: 1; border: none; outline: none; font-size: 15px; background: transparent; color: var(--el-text-color-primary); }
.gs-esc { font-size: 11px; color: #909399; border: 1px solid #dcdfe6; border-radius: 4px; padding: 0 5px; }
.gs-body { margin-top: 12px; max-height: 420px; overflow-y: auto; }
.gs-group { margin-bottom: 10px; }
.gs-group-title { font-size: 12px; color: #909399; margin: 8px 0 6px; font-weight: 500; }
.gs-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer;
}
.gs-item.on { background: var(--el-fill-color-light, #f5f7fa); }
.gs-badge {
  flex-shrink: 0; font-size: 11px; color: #fff; border-radius: 6px; padding: 2px 7px; min-width: 32px; text-align: center;
  background: #909399;
}
.gs-badge-employee, .gs-badge-customer { background: #378add; }
.gs-badge-leave, .gs-badge-reimbursement, .gs-badge-entertainment, .gs-badge-meeting, .gs-badge-business-trip, .gs-badge-project { background: #ef9f27; }
.gs-badge-file, .gs-badge-article, .gs-badge-project-info { background: #0f6e56; }
.gs-badge-announcement { background: #534ab7; }
.gs-badge-log { background: #5f5e5a; }
.gs-text { flex: 1; min-width: 0; }
.gs-title { font-size: 14px; color: var(--el-text-color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-title :deep(mark) { background: #FAEEDA; color: inherit; border-radius: 3px; padding: 0 2px; }
.gs-sub { font-size: 12px; color: #909399; margin-top: 2px; }
.gs-arrow { color: #c0c4cc; font-size: 13px; }
.gs-foot {
  display: flex; align-items: center; gap: 14px; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5); font-size: 11px; color: #909399;
}
.gs-foot-right { margin-left: auto; }
</style>
