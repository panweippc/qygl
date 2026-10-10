/**
 * 销售四表枚举值常量字典
 * 集中维护销售类型/代理类型/销售状态/跨表归属阈值，避免各组件散落硬编码。
 */

// 销售类型
export const SALES_TYPE_OPTIONS = ['渠道', '直销', '服务'] as const

// 代理类型（收入类型）
export const REVENUE_TYPE_OPTIONS = ['代理', '直销'] as const

// 销售状态（按表类型区分）
export const SALES_STATUS_BY_TYPE: Record<string, string[]> = {
  intention: ['确认意向', '引导立项', '方案提交'],
  key: ['赢得认可', '商务谈判'],
  deal: ['销售成交', '实施交付']
}

// 跨表归属中文标签
export const DEST_TYPE_LABEL: Record<string, string> = {
  intention: '意向漏斗',
  key: '重点漏斗',
  deal: '成交用户',
  project: '大项目进展'
}

// 按进展状态百分比归属到对应表：10-40%意向漏斗 / 41-90%重点漏斗 / 91-100%成交用户
// 与后端 destTypeByProgress 保持一致。
export function destTypeByProgress(p: number): 'intention' | 'key' | 'deal' {
  const n = Number(p) || 0
  if (n >= 91 && n <= 100) return 'deal'
  if (n >= 41 && n <= 90) return 'key'
  return 'intention'
}

// 进展百分比所属区间的中文描述（列表/编辑弹窗归属提示用）
export function progressBandLabel(p: number): string {
  return DEST_TYPE_LABEL[destTypeByProgress(p)]
}
