// 全局回收站单例状态：与 useGlobalSearch 同构，保证首页顶栏、内页顶栏、抽屉共享一份显隐状态
import { ref } from 'vue'
import { getRecycleBin, getRecycleModules, restoreRecycleItem, purgeRecycleItem } from '../services/api'
import type { RecycleItem, RecycleListData } from '../services/api'
import { ElMessage } from 'element-plus'
import { RESTORE_EVENT } from './useRestoreRefresh'
import type { RestoreDetail } from './useRestoreRefresh'

const visible = ref(false)
const loading = ref(false)
const list = ref<RecycleItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const isAdmin = ref(false)
const keepDays = ref(30)
const keyword = ref('')
const module = ref('')
const modules = ref<{ key: string; label: string }[]>([])
// 兜底：当前页面没有订阅就地刷新时，递增该版本号重建路由组件
const restoreVersion = ref(0)

async function load() {
  loading.value = true
  try {
    const res: any = await getRecycleBin({
      module: module.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    const d = (res?.data || {}) as RecycleListData
    list.value = d.list || []
    total.value = d.total || 0
    isAdmin.value = !!d.isAdmin
    keepDays.value = d.keepDays || 30
  } catch (e: any) {
    ElMessage.error(e?.message || '加载回收站失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadModules() {
  try {
    const res: any = await getRecycleModules()
    modules.value = res?.data || []
  } catch (e) { modules.value = [] }
}

async function open() {
  visible.value = true
  page.value = 1
  await Promise.all([load(), loadModules()])
}
function close() { visible.value = false }

function search() { page.value = 1; return load() }
function changePage(p: number) { page.value = p; return load() }

async function restore(id: number) {
  const target: any = list.value.find((x: any) => x.id === id)
  try {
    const res: any = await restoreRecycleItem(id)
    if (res?.success) {
      ElMessage.success(res.message || '已恢复')
      await load()
      // 通知当前业务页面立刻重拉数据，无需用户手动刷新
      const detail: RestoreDetail = {
        module: target?.module || '',
        recordId: target?.record_id ?? res?.data?.restoredId ?? null,
        title: target?.title || '',
        handled: false
      }
      window.dispatchEvent(new CustomEvent(RESTORE_EVENT, { detail }))
      // 没有任何页面认领（例如首页、未接入的页面）时，重建当前路由兜底
      if (!detail.handled) restoreVersion.value++
      return true
    }
    ElMessage.error(res?.message || '恢复失败')
    return false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '恢复失败')
    return false
  }
}

async function purge(id: number) {
  try {
    const res: any = await purgeRecycleItem(id)
    if (res?.success) { ElMessage.success('已彻底清除'); await load(); return true }
    ElMessage.error(res?.message || '清除失败')
    return false
  } catch (e: any) {
    ElMessage.error(e?.message || '清除失败')
    return false
  }
}

export function useRecycleBin() {
  return {
    visible, loading, list, total, page, pageSize, isAdmin, keepDays, keyword, module, modules,
    restoreVersion, open, close, load, search, changePage, restore, purge
  }
}
