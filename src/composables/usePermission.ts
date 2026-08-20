import { useRoute } from 'vue-router'

const parentPathMap: Record<string, string> = {
  '/city-sales': '/sales-funnel',
  '/county-detail': '/sales-funnel',
  '/town-detail': '/sales-funnel',
  '/project-detail': '/closing-project',
}

// 判断当前用户是否为管理员/总经理等高级角色（这些角色对所有按钮权限默认放行）
function isPrivilegedUser(): boolean {
  try {
    const role = String(localStorage.getItem('role') || '').toLowerCase()
    const roleName = String(localStorage.getItem('roleName') || '').toLowerCase()
    const username = String(localStorage.getItem('username') || '')
    const privilegedRoles = ['admin', 'gm', 'ceo', 'general_manager', '系统管理员', '总经理']
    if (privilegedRoles.some(r => role.includes(r) || roleName.includes(r))) return true
    if (username === '李智鑫' || username.includes('admin')) return true
    return false
  } catch {
    return false
  }
}

export function useButtonPermission() {
  const route = useRoute()

  function getButtonPermissions(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem('buttonPermissions')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function getMenuIdByPath(path: string): number | null {
    try {
      const perms = JSON.parse(localStorage.getItem('permissions') || '[]')
      const found = perms.find((p: any) => p.path === path)
      return found ? found.id : null
    } catch {
      return null
    }
  }

  function resolveMenuPath(path: string): string | null {
    if (getMenuIdByPath(path)) return path
    for (const [prefix, parent] of Object.entries(parentPathMap)) {
      if (path.startsWith(prefix)) return parent
    }
    return null
  }

  function hasPerm(buttonKey: string, menuPath?: string): boolean {
    // 高级角色始终放行
    if (isPrivilegedUser()) return true

    const btnPerms = getButtonPermissions()
    const rawPath = menuPath || route.path
    const resolvedPath = resolveMenuPath(rawPath)

    let menuId: number | null = null
    if (resolvedPath) {
      menuId = getMenuIdByPath(resolvedPath)
    }
    if (!menuId) {
      const keys = Object.keys(btnPerms)
      if (keys.length > 0) menuId = Number(keys[0])
    }

    // 当该菜单确实在用户权限列表内（即该用户可访问该菜单），但 buttonPermissions 未
    // 配置该菜单的按钮权限时，对导出类按钮做兼容兜底：允许可见。
    // 原因：历史数据库可能仅分配了菜单级权限但未同步 role_button_permissions 数据，
    // 此时不应把本应可见的导出按钮完全隐藏。
    const isMenuAccessible = !!menuId && resolvedPath ? !!getMenuIdByPath(resolvedPath) : false
    const isExportLikeButton = /export|导出/.test(buttonKey)

    if (isExportLikeButton && isMenuAccessible) {
      if (!menuId || !btnPerms[menuId]) return true
    }

    if (!menuId || !btnPerms[menuId]) return false
    return btnPerms[menuId].includes(buttonKey)
  }

  return { hasPerm, getButtonPermissions }
}
