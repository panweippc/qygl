import { ref, computed } from 'vue'
import { extractRealName } from '@/utils/oaWorkflowUtils'

/**
 * 统一的角色判定工具。
 *
 * 背景：此前各面板各自实现 isManager / canManage，判定基准不一致
 * （有的读 localStorage.role、有的读 roleName，有的把「姓名」当角色比较），
 * 导致同一用户在 A 面板算管理员、B 面板不算。
 *
 * 本文件与后端保持同一口径：
 *   - 管理员白名单 = server/routes/knowledge.js 的 MANAGER_ROLES
 *   - 内置管理账号 = 「管理员」「总经理」/ admin
 * 后端角色一律以数据库为准，前端这里只负责「按钮显隐」，
 * 真正的鉴权由 requireAuth / requireRole / requireOwnerOrRole 兜底。
 */

// 与后端 knowledge.js、projects.js 的 MANAGER_ROLES 保持完全一致
export const MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监']

// 内置管理账号（users 表账号，非 employees 表员工）
const BUILTIN_ADMIN_NAMES = ['管理员', '总经理', '李智鑫']

// 首页角色分层：与后端 SALES_ROLES / canDistribute / SENSITIVE_ROLES 口径保持一致
export type RoleTier = 'gm' | 'finance' | 'biz' | 'employee'

const GM_ROLES = ['系统管理员', '总经理']
const FINANCE_ROLES = ['财务总监']
// 业务中心经理与销售部经理后端权限几乎一致（SALES_ROLES），合并为 biz 层
const BIZ_ROLES = ['业务中心经理', '销售部经理']

/**
 * 将职位字符串映射为首页角色层。
 * - gm：总经理 / 系统管理员 / 内置管理账号（全局审批·任务下发·项目·员工·经营看板·系统）
 * - finance：财务总监（财务待审批·月报审核·物资台账·报销/招待查询）
 * - biz：业务中心经理 / 销售部经理（任务下发·销售漏斗·客户·商机·目标·项目·员工导出）
 * - employee：其余全部（普通员工，仅本人发起类）
 */
export function getRoleTier(roleName: string): RoleTier {
  const r = (roleName || '').trim()
  if (GM_ROLES.includes(r) || r.includes('管理员')) return 'gm'
  if (FINANCE_ROLES.includes(r)) return 'finance'
  if (BIZ_ROLES.includes(r)) return 'biz'
  return 'employee'
}

function readUserName(): string {
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const u = JSON.parse(raw)
      const name = u?.name || u?.username
      if (name) return extractRealName(String(name))
    }
  } catch { /* ignore */ }
  return extractRealName(String(localStorage.getItem('username') || ''))
}

function readRoleName(): string {
  return String(localStorage.getItem('role') || localStorage.getItem('roleName') || '')
}

function judgeManager(roleName: string, userName: string): boolean {
  if (userName && BUILTIN_ADMIN_NAMES.includes(userName)) return true
  const role = String(roleName || '')
  if (/admin/i.test(role)) return true
  if (/(^|[\s_-])gm([\s_-]|$)/i.test(role)) return true
  return MANAGER_ROLES.includes(role)
}

function sameUserName(owner: unknown, me: string): boolean {
  const clean = extractRealName(String(owner ?? ''))
  return !!me && !!clean && me === clean
}

/**
 * 校正并缓存当前用户角色（登录流程可能未写入 role，这里用 /api/user/role 补一次）。
 * 写入 localStorage 以便其他模块沿用。
 */
export async function refreshCurrentRole(): Promise<string> {
  const username = localStorage.getItem('username')
  if (!username) return readRoleName()
  try {
    const res = await fetch('/api/user/role?username=' + encodeURIComponent(username)).then(r => r.json())
    if (res?.success && res.data?.roleName) {
      localStorage.setItem('role', res.data.roleName)
      return res.data.roleName
    }
  } catch { /* ignore */ }
  return readRoleName()
}

export function useRoleGuard() {
  const userName = ref(readUserName())
  const roleName = ref(readRoleName())

  /** 是否为管理员（可管理他人内容） */
  const isManager = computed(() => judgeManager(roleName.value, userName.value))

  /** 首页角色层（gm / finance / biz / employee） */
  const roleTier = computed(() => getRoleTier(roleName.value))

  /** 是否为内容的创建人本人或管理员 */
  const isOwnerOrManager = (owner?: unknown): boolean =>
    isManager.value || sameUserName(owner, userName.value)

  /** 重新读取本地身份（登录/切换用户后调用） */
  const reload = () => {
    userName.value = readUserName()
    roleName.value = readRoleName()
  }

  /** 拉取并校正角色后重新读取 */
  const refresh = async () => {
    await refreshCurrentRole()
    reload()
  }

  return { userName, roleName, isManager, roleTier, isOwnerOrManager, reload, refresh }
}
