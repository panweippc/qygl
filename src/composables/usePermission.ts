import { useRoute } from 'vue-router'

const parentPathMap: Record<string, string> = {
  '/city-sales': '/sales-funnel',
  '/county-detail': '/sales-funnel',
  '/town-detail': '/sales-funnel',
  '/project-detail': '/closing-project',
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
    if (!menuId || !btnPerms[menuId]) return false
    return btnPerms[menuId].includes(buttonKey)
  }

  return { hasPerm, getButtonPermissions }
}
