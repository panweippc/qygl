import { ref } from 'vue'
import { globalSearch } from '../services/api'

export interface SearchItem {
  id: number | string
  type: string
  title: string
  sub: string
  route: string
  query?: Record<string, any>
}
export interface SearchGroup {
  module: string
  label: string
  items: SearchItem[]
}

// 模块级单例状态：保证顶栏按钮、全局快捷键、Modal 共享同一份状态
const visible = ref(false)
const keyword = ref('')
const results = ref<SearchGroup[]>([])
const total = ref(0)
const loading = ref(false)
let timer: any = null

async function runSearch(q: string) {
  keyword.value = q
  const text = q.trim()
  if (!text) {
    results.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res: any = await globalSearch(text)
    if (res && res.success) {
      results.value = res.data.groups || []
      total.value = res.data.total || 0
    } else {
      results.value = []
      total.value = 0
    }
  } catch (e) {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onInput(q: string) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => runSearch(q), 300)
}

function open() {
  visible.value = true
}
function close() {
  visible.value = false
}

export function useGlobalSearch() {
  return { visible, keyword, results, total, loading, open, close, onInput, runSearch }
}
