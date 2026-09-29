import express from 'express'
import { createOperationLog } from '../utils/audit.js'

const router = express.Router()

// ===== 意图配置（规则版；未来可替换为 LLM function calling，接口签名保持不变）=====
// action.type: 'navigate' 表示跳转到某前端路由（可带 query 触发现有弹窗逻辑）
// canPrefill: true 表示 AI 卡片额外提供「帮我填好」按钮，由前端预填默认值
const INTENTS = [
  { id: 'apply-leave', label: '请假申请', keywords: ['请假', '休假', '请个假', '休假申请', '请假申请'], path: '/oa/leave-apply', reply: '已为你打开请假申请页，填写请假类型与日期后提交，由上级审批。' },
  { id: 'apply-reimburse', label: '报销申请', keywords: ['报销', '费用报销', '旅费', '报销申请'], path: '/oa/reimbursement-apply', reply: '已为你打开报销申请页，填写发票与金额后提交。' },
  { id: 'apply-business-trip', label: '出差申请', keywords: ['出差', '差旅', '外出公干', '出差申请'], path: '/oa/business-trip', reply: '已为你打开出差申请页，填写行程后提交审批。' },
  { id: 'apply-entertainment', label: '招待申请', keywords: ['招待', '商务接待', '请客', '招待申请'], path: '/oa/entertainment-apply', reply: '已为你打开招待申请页。' },
  { id: 'apply-meeting', label: '会议申请', keywords: ['会议', '开会', '约会议', '会议申请', '预订会议'], path: '/oa/meeting-apply', reply: '已为你打开会议申请页，可预订会议室并邀请参会人。' },
  { id: 'apply-project', label: '项目申请', keywords: ['立项', '项目申请', '申请新项目', '建项目'], path: '/oa/project-apply', reply: '已为你打开项目申请页。' },
  { id: 'add-asset', label: '新增资产', keywords: ['登记资产', '新增资产', '添加资产', '录入资产', '资产入库'], path: '/asset-management?action=add', canPrefill: true, reply: '已为你定位到资产台账的新增入口，可直接登记一台新资产。' },
  { id: 'view-monthly-report', label: '查看月报', keywords: ['查看月报', '看月报', '查阅月报', '月报记录', '历史月报', '月报列表', '同事月报', '团队月报', '月报'], path: '/monthly-report-history', reply: '已为你打开月报记录页，可按人员与月份查看权限范围内的月报（如需查看指定同事的月报，在页面顶部按人员筛选即可）。' },
  { id: 'write-monthly-report', label: '撰写月报', keywords: ['写月报', '提交月报', '新建月报', '填写月报', '撰写月报', '本月月报'], path: '/monthly-report', reply: '已为你打开月报页面，新建本月月报，填写完成后点击提交。' },
  { id: 'upload-resource', label: '资料上传', keywords: ['上传文件', '文档上传', '上传资料', '资料上传', '上传文章', '传文件'], path: '/resource-center?action=upload', reply: '已为你打开资料中心并选中「全部」分类，可上传文件或发布文章。' },
  { id: 'my-todo', label: '我的待办', keywords: ['待办', '待我审批', '待处理', '待办事项', '要审的', '需要我审批'], path: '/oa-workflow', reply: '已为你打开审批中心，这里列出所有待你处理的事项。' },
  { id: 'my-messages', label: '我的消息', keywords: ['消息', '通知', '提醒', '站内信', '未读'], path: '/message-center', reply: '已为你打开消息中心，可查看全部通知与提醒。' },
  { id: 'asset-ledger', label: '资产台账', keywords: ['资产台账', '设备清单', '查资产', '资产列表', '资产查询', '资产'], path: '/asset-management', reply: '已为你打开资产台账，可按分类、状态、负责人筛选。' },
  { id: 'employee-mgmt', label: '员工管理', keywords: ['员工管理', '人员管理', '通讯录', '员工信息', '花名册'], path: '/employee-management', reply: '已为你打开员工管理页。' }
]

// FAQ 知识库（操作答疑；可带 path 生成跳转卡片）
const FAQ = [
  { q: ['导出资产', '导出台账', '资产导出', '导出'], a: '进入「资产管理」，在资产台账页签设置好筛选条件后，点击右上角「导出」按钮即可导出当前列表。', path: '/asset-management' },
  { q: ['怎么审批', '如何审批', '怎样审批', '审批流程', '审批在哪'], a: '进入「审批中心 / OA 办公」，在「待我审批」中找到对应单据，点击通过或驳回并填写审批意见；你发起的申请可在「我发起的」中跟踪进度。', path: '/oa-workflow' },
  { q: ['忘记密码', '重置密码', '密码忘了'], a: '在登录页点击「忘记密码」按引导重置；或联系系统管理员为你重置密码。' },
  { q: ['闲置预警', '闲置资产', '资产预警'], a: '资产状态为「闲置」且入库超过 180 天会被标记为闲置预警，可在「资产管理 → 概览」的闲置预警卡片中查看明细。', path: '/asset-management' },
  { q: ['上传', '怎么上传', '资料'], a: '首页点击「资料上传」，或在资料中心点击上传，选择「全部」分类后上传文件或发布文章。', path: '/resource-center?action=upload' },
  { q: ['卡顿', '无响应', '页面慢', '故障', '打不开'], a: '先尝试刷新页面（Ctrl+F5 强制刷新）；若持续异常，请联系管理员检查服务状态。' },
  { q: ['修改密码', '改密码', '个人密码'], a: '进入「个人中心 → 修改密码」即可修改登录密码。', path: '/change-password' },
  { q: ['折旧', '月折旧', '累计折旧'], a: '系统按直线法自动计算固定资产折旧（(原值-残值)/年限/12 × 已计提月数），可在「资产管理 → 概览」查看月折旧与累计折旧汇总。', path: '/asset-management' }
]

// 快捷指令：口语化问法（与首页常用操作的"直达导航"互补，不重复）
const SHORTCUTS = [
  { id: 'sc-leave-how', label: '怎么申请请假', text: '怎么申请请假' },
  { id: 'sc-approval', label: '审批怎么操作', text: '审批怎么操作' },
  { id: 'sc-todo', label: '查我的待办', text: '查我的待办' },
  { id: 'sc-export', label: '怎么导出资产台账', text: '怎么导出资产台账' },
  { id: 'sc-monthly', label: '怎么写月报', text: '怎么写月报' },
  { id: 'sc-idle', label: '闲置资产预警在哪', text: '闲置资产预警在哪' },
  { id: 'sc-upload', label: '资料怎么上传', text: '资料怎么上传' },
  { id: 'sc-password', label: '忘记密码怎么办', text: '忘记密码怎么办' }
]

// 对外暴露的快捷指令（前端卡片直接发送 shortcut id）
export const AI_SHORTCUTS = SHORTCUTS.map(({ id, label }) => ({ id, label }))

// 规则版意图识别：关键词命中按"匹配词长度"加权评分，取最高分（避免"查看月报"被"月报"FAQ 抢走）
function ruleResolve(text) {
  const t = (text || '').toLowerCase()
  let best = null
  let bestScore = 0
  for (const it of INTENTS) {
    let score = 0
    for (const k of it.keywords) {
      if (t.includes(k.toLowerCase())) score += k.length
    }
    if (score > bestScore) {
      bestScore = score
      best = it
    }
  }
  return best ? { kind: 'intent', intent: best } : null
}

// FAQ 匹配：关键词重叠度打分取最高
function matchFaq(text) {
  const t = (text || '').toLowerCase()
  let best = null
  let bestScore = 0
  for (const f of FAQ) {
    let score = 0
    for (const k of f.q) if (t.includes(k.toLowerCase())) score += k.length
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }
  return bestScore > 0 ? best : null
}

// 兜底时基于共享字推荐相关意图/问题（让"没听懂"也有用）
function relatedFor(text) {
  const t = (text || '').toLowerCase()
  const rel = []
  for (const it of INTENTS) {
    if (it.keywords.some((k) => k.length >= 2 && t.includes(k.slice(0, 2)))) {
      rel.push({ id: it.id, label: it.label, text: it.label })
      if (rel.length >= 3) break
    }
  }
  for (const s of SHORTCUTS) {
    if (rel.length >= 4) break
    if (s.text.split('').some((ch) => ch !== '的' && t.includes(ch)) && !rel.some((r) => r.label === s.label)) {
      rel.push({ id: s.id, label: s.label, text: s.text })
    }
  }
  // 完全没命中时给默认推荐，保证"你可能想问"永不空白
  if (rel.length === 0) {
    for (const s of SHORTCUTS.slice(0, 4)) rel.push({ id: s.id, label: s.label, text: s.text })
  }
  return rel
}

// 预留：未来替换为 LLM 实现（function calling 决定调用哪个业务接口 / 返回结构化动作）
// 当前调用方只依赖返回结构 { kind, intent }，替换实现无需改动路由
async function resolveIntent(text) {
  return ruleResolve(text)
}

// 答疑问句标记：含这些词的文本优先命中 FAQ（使用答疑）而非跳转意图
const QUESTION_MARKERS = ['怎么', '如何', '怎样', '在哪', '哪里', '步骤', '教程', '教我', '什么', '为什么']
// 查看/检索类动词：命中时优先走"查看"意图而非答疑（如"查看潘伟的月报"）
const VIEW_MARKERS = ['查看', '查阅', '看下', '看看', '找一下', '查一下', '检索', '打开']

router.post('/intent', async (req, res) => {
  try {
    const body = req.body || {}
    let text = typeof body.text === 'string' ? body.text : ''
    let action = typeof body.action === 'string' ? body.action : ''

    // 快捷指令直发：映射为等价自然语言，走统一匹配（保证与用户手输同一出口）
    const sc = SHORTCUTS.find((s) => s.id === action)
    if (!text && sc) text = sc.text

    let reply = ''
    let intent = null
    let actionOut = null
    let matched = 'fallback'
    let related = []

    if (!text && !action) {
      // 空请求：仅返回快捷指令（前端初始化用）
      reply = ''
    } else {
      const hit = await resolveIntent(text)
      const faq = matchFaq(text)
      const isQuestion = QUESTION_MARKERS.some((m) => text.toLowerCase().includes(m))
      const isView = VIEW_MARKERS.some((m) => text.toLowerCase().includes(m))

      if (isView && hit) {
        // 查看/检索类优先跳转（如"查看潘伟的月报"→ 月报记录页）
        intent = hit.intent
        matched = 'intent'
        reply = hit.intent.reply
        actionOut = { type: 'navigate', path: hit.intent.path, canPrefill: !!hit.intent.canPrefill }
      } else if (isQuestion && faq) {
        // 答疑问句优先 FAQ（使用答疑）
        matched = 'faq'
        reply = faq.a
        actionOut = faq.path ? { type: 'navigate', path: faq.path, canPrefill: false } : null
      } else if (hit && hit.kind === 'intent') {
        intent = hit.intent
        matched = 'intent'
        reply = hit.intent.reply
        actionOut = { type: 'navigate', path: hit.intent.path, canPrefill: !!hit.intent.canPrefill }
      } else if (faq) {
        matched = 'faq'
        reply = faq.a
        actionOut = faq.path ? { type: 'navigate', path: faq.path, canPrefill: false } : null
      } else {
        // 兜底：没听懂也给"相关推荐"
        matched = 'fallback'
        related = relatedFor(text)
        reply = related.length
          ? `我不太确定「${text.slice(0, 20)}」的具体需求，以下问题也许能帮到你：`
          : '抱歉，我暂时没理解你的意思。可以试试下面的快捷问题，或直接说「怎么申请请假」「查我的待办」「查看月报」等。'
      }
    }

    // 轻量审计（失败不影响主流程）
    try {
      const u = req.user || {}
      await createOperationLog(req.app.locals.pool, {
        username: u.username || '未知',
        action: 'ai_ask',
        module: 'ai',
        targetName: (text || action || '').slice(0, 50),
        detail: `matched=${matched}` + (intent ? ` intent=${intent.id}` : '')
      })
    } catch (e) {
      /* ignore */
    }

    res.json({
      success: true,
      reply,
      intent: intent ? { id: intent.id, label: intent.label } : null,
      action: actionOut,
      shortcuts: AI_SHORTCUTS,
      related,
      matched
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
