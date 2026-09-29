import express from 'express'
import { createOperationLog } from '../utils/audit.js'

const router = express.Router()

// ===== 意图配置（规则版；未来可替换为 LLM function calling，接口签名保持不变）=====
// action.type: 'navigate' 表示跳转到某前端路由（可带 query 触发现有弹窗逻辑）
// canPrefill: true 表示 AI 卡片额外提供「帮我填好」按钮，由前端预填默认值
const INTENTS = [
  { id: 'apply-leave', label: '请假申请', keywords: ['请假', '休假', '请个假', '休假申请', '请假申请'], path: '/oa/leave-apply', reply: '已为你打开请假申请页，填写后提交，由上级审批。' },
  { id: 'apply-reimburse', label: '报销申请', keywords: ['报销', '费用报销', '旅费', '报销申请'], path: '/oa/reimbursement-apply', reply: '已为你打开报销申请页，填写发票与金额后提交。' },
  { id: 'apply-business-trip', label: '出差申请', keywords: ['出差', '差旅', '外出公干', '出差申请'], path: '/oa/business-trip', reply: '已为你打开出差申请页。' },
  { id: 'apply-entertainment', label: '招待申请', keywords: ['招待', '商务接待', '请客', '招待申请'], path: '/oa/entertainment-apply', reply: '已为你打开招待申请页。' },
  { id: 'apply-meeting', label: '会议申请', keywords: ['会议', '开会', '约会议', '会议申请', '预订会议'], path: '/oa/meeting-apply', reply: '已为你打开会议申请页。' },
  { id: 'apply-project', label: '项目申请', keywords: ['项目', '立项', '项目申请'], path: '/oa/project-apply', reply: '已为你打开项目申请页。' },
  { id: 'add-asset', label: '新增资产', keywords: ['资产', '设备', '登记资产', '新增资产', '添加资产'], path: '/asset-management?action=add', canPrefill: true, reply: '已为你打开资产新增，可登记一台新资产。' },
  { id: 'upload-resource', label: '资料上传', keywords: ['资料', '上传文件', '文档上传', '上传资料', '资料上传'], path: '/resource-center?action=upload', reply: '已为你打开资料中心并选中「全部」分类，可上传文件或文章。' },
  { id: 'my-todo', label: '我的待办', keywords: ['待办', '审批', '待我审批', '待处理', '待办事项'], path: '/oa-workflow', reply: '已为你打开审批中心，可查看待你处理的事项。' },
  { id: 'my-messages', label: '我的消息', keywords: ['消息', '通知', '提醒', '站内信'], path: '/message-center', reply: '已为你打开消息中心。' },
  { id: 'asset-ledger', label: '资产台账', keywords: ['资产台账', '设备清单', '查资产', '资产列表'], path: '/asset-management', reply: '已为你打开资产台账。' },
  { id: 'employee-mgmt', label: '员工管理', keywords: ['员工', '人员', '通讯录', '员工管理'], path: '/employee-management', reply: '已为你打开员工管理页。' }
]

// FAQ 知识库（操作手册问答）
const FAQ = [
  { q: ['导出', '资产台账', '导出资产'], a: '进入「资产管理」，在资产台账页签点击导出按钮，即可导出当前筛选条件下的资产列表。' },
  { q: ['审批', '请假', '怎么审批'], a: '进入「审批中心 / OA 办公」，在「待我审批」中找到请假单，点击通过或驳回并填写意见。' },
  { q: ['忘记密码', '密码', '重置密码'], a: '在登录页点击「忘记密码」，或联系系统管理员为你重置密码。' },
  { q: ['月报', '提交月报', '写月报'], a: '进入「月报」页面，新建本月月报，填写后点击提交。' },
  { q: ['上传', '资料', '怎么上传'], a: '首页点击「资料上传」，或在资料中心点击上传，选择「全部」分类后上传文件或文章。' },
  { q: ['待办', '查待办', '我的待办'], a: '进入「审批中心」或「消息中心」可查看待你处理的事项与通知。' },
  { q: ['闲置', '预警', '资产预警'], a: '资产状态为「闲置」且入库超过 180 天会被标记为闲置预警，可在资产概览页查看。' },
  { q: ['出差', '申请出差'], a: '进入「OA 办公 → 出差申请」填写表单提交，由上级审批。' },
  { q: ['卡顿', '无响应', '慢', '故障'], a: '先尝试刷新页面；若持续异常，请联系管理员检查服务状态。' },
  { q: ['修改密码', '改密码', '个人密码'], a: '进入「个人中心 → 修改密码」即可修改登录密码。' }
]

// 规则版意图识别：关键词命中（可扩展为同义词表 / 正则）
function ruleResolve(text) {
  const t = (text || '').toLowerCase()
  for (const it of INTENTS) {
    if (it.keywords.some((k) => t.includes(k.toLowerCase()))) return { kind: 'intent', intent: it }
  }
  return null
}

// FAQ 匹配：关键词重叠度打分取最高
function matchFaq(text) {
  const t = (text || '').toLowerCase()
  let best = null
  let bestScore = 0
  for (const f of FAQ) {
    let score = 0
    for (const k of f.q) if (t.includes(k.toLowerCase())) score++
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }
  return bestScore > 0 ? best : null
}

// 预留：未来替换为 LLM 实现（function calling 决定调用哪个业务接口 / 返回结构化动作）
// 当前调用方只依赖返回结构 { kind, intent }，替换实现无需改动路由
async function resolveIntent(text) {
  return ruleResolve(text)
}

// 答疑问句标记：含这些词的文本优先命中 FAQ（使用答疑）而非跳转意图
const QUESTION_MARKERS = ['怎么', '如何', '怎样', '在哪', '哪里', '步骤', '教程', '教我', '什么', '为什么']

// 对外暴露的快捷指令（前端卡片直接发送 intent id）
export const AI_SHORTCUTS = INTENTS.map((i) => ({ id: i.id, label: i.label }))

router.post('/intent', async (req, res) => {
  try {
    const body = req.body || {}
    const text = typeof body.text === 'string' ? body.text : ''
    const action = typeof body.action === 'string' ? body.action : ''

    let reply = ''
    let intent = null
    let actionOut = null
    let matched = 'fallback'

    // 1) 快捷指令直发：action 为已知意图 id，跳过文本匹配
    const byId = INTENTS.find((i) => i.id === action)
    if (byId) {
      intent = byId
      matched = 'intent'
      reply = byId.reply
      actionOut = { type: 'navigate', path: byId.path, canPrefill: !!byId.canPrefill }
    } else {
      // 2) 文本意图识别
      const hit = await resolveIntent(text)
      const faq = matchFaq(text)
      const isQuestion = QUESTION_MARKERS.some((m) => (text || '').toLowerCase().includes(m))
      if (isQuestion && faq) {
        // 答疑问句优先 FAQ（使用答疑）
        matched = 'faq'
        reply = faq.a
      } else if (hit && hit.kind === 'intent') {
        intent = hit.intent
        matched = 'intent'
        reply = hit.intent.reply
        actionOut = { type: 'navigate', path: hit.intent.path, canPrefill: !!hit.intent.canPrefill }
      } else if (faq) {
        matched = 'faq'
        reply = faq.a
      } else {
          // 4) 兜底
          matched = 'fallback'
          reply = '抱歉，我暂时没理解你的意思。你可以试试下面的快捷操作，或直接说「怎么申请请假」「查我的待办」「上传资料」等。'
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
      matched
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
