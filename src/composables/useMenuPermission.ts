import { ref, onMounted } from 'vue'

// 模块级单例：多个组件共享同一份菜单权限，避免重复请求
const permissions = ref<any[]>([])
// 记录最近一次已拉取权限的用户，用户切换(如张海琼登录)时强制重新拉取
let lastUser = ''
// 并发去重：避免同一时刻多个组件重复发起请求
let inflight: Promise<void> | null = null

function loadFromCache() {
  try {
    const raw = localStorage.getItem('permissions')
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed) && parsed.length > 0) permissions.value = parsed
  } catch { /* ignore */ }
}
loadFromCache()

export function refreshMenuPermissions(force = false) {
  const username = localStorage.getItem('username')
  const token = localStorage.getItem('token') || ''
  if (!username) {
    permissions.value = []
    lastUser = ''
    return Promise.resolve()
  }
  // 同一用户且已加载过则跳过；用户切换时强制重新拉取
  if (!force && lastUser === username && permissions.value.length > 0) return Promise.resolve()
  if (inflight) return inflight
  const userChanged = lastUser && lastUser !== username
  lastUser = username
  // 用户切换时先清空上一位用户的权限，避免短暂沿用导致卡片仍可下钻
  if (userChanged) permissions.value = []
  inflight = (async () => {
    try {
      const res = await fetch('/api/user/permissions?username=' + encodeURIComponent(username), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).then(r => r.json())
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        permissions.value = res.data
        localStorage.setItem('permissions', JSON.stringify(res.data))
      }
    } catch { /* ignore */ }
    finally { inflight = null }
  })()
  return inflight
}

export function useMenuPermission() {
  const isAdmin = (): boolean => {
    const uname = localStorage.getItem('username') || ''
    const role = (localStorage.getItem('roleName') || localStorage.getItem('role') || '').toLowerCase()
    if (uname === '管理员') return true
    if (['总经理', '系统管理员'].includes(role) || role.includes('admin') || role.includes('gm')) return true
    return false
  }
  const hasMenu = (path: string): boolean => {
    if (isAdmin()) return true
    return permissions.value.some((p: any) => p.path === path)
  }
  onMounted(() => {
    // 每次挂载都检查：用户切换(张海琼登录)后重新拉取权限，避免沿用上一位用户的缓存（修复 #262）
    refreshMenuPermissions()
  })
  return { permissions, hasMenu, isAdmin, refreshMenuPermissions }
}
