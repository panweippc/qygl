export const extractRealName = (name: string): string => {
  if (!name) return ''
  const match = name.match(/^emp_(.+?)_\d+$/)
  if (match) {
    return match[1]
  }
  return name
}

export const formatDate = (date: any, showTime: boolean = true) => {
  if (!date) return ''
  let dateObj: Date
  if (typeof date === 'string') {
    if (date.includes(' ')) {
      const [datePart, timePart] = date.split(' ')
      const isoString = `${datePart}T${timePart}Z`
      dateObj = new Date(isoString)
    } else {
      dateObj = new Date(date)
    }
  } else {
    dateObj = date instanceof Date ? date : new Date(date)
  }
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai'
  }
  if (showTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
    options.hour12 = false
  }
  return dateObj.toLocaleString('zh-CN', options)
}

export const getStatusClass = (status: string) => {
  switch (status) {
    case '审批中':
    case '待审批':
    case 'pending':
      return 'status-pending'
    case '已批准':
    case 'approved':
      return 'status-approved'
    case '已拒绝':
    case '拒绝':
    case 'rejected':
      return 'status-rejected'
    case '已取消':
      return 'status-cancelled'
    case '待处理':
      return 'status-pending-blue'
    case '已处理':
      return 'status-processed-green'
    default:
      return 'status-default'
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '审批中'
    case 'approved':
      return '已批准'
    case 'rejected':
      return '已拒绝'
    case 'cancelled':
      return '已取消'
    default:
      return status
  }
}

export const getLeaveTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'personal': '事假',
    'sick': '病假',
    'annual': '年假',
    'wedding': '婚假',
    'maternity': '产假',
    'other': '其他'
  }
  if (type === '??') {
    return '其他'
  }
  return typeMap[type] || type
}

export const getLeaveTypeClass = (type: string) => {
  const chineseType = getLeaveTypeText(type)
  const typeClasses: Record<string, string> = {
    '事假': 'type-personal',
    '病假': 'type-sick',
    '年假': 'type-annual',
    '婚假': 'type-wedding',
    '产假': 'type-maternity',
    '其他': 'type-other'
  }
  return typeClasses[chineseType] || 'type-default'
}

export const getReimburseTypeClass = (type: string) => {
  const typeClasses: Record<string, string> = {
    '差旅费': 'type-travel',
    '办公用品': 'type-office',
    '餐饮费': 'type-meal',
    '交通费': 'type-transport',
    '其他': 'type-other'
  }
  return typeClasses[type] || 'type-default'
}

export const getTripTypeClass = (type: string) => {
  const map: Record<string, string> = {
    '国内出差': 'type-domestic',
    '国外出差': 'type-international'
  }
  return map[type] || 'type-domestic'
}

export const getProjectTypeClass = (type: string) => {
  const map: Record<string, string> = {
    '研发项目': 'type-research',
    '市场项目': 'type-market',
    '运营项目': 'type-operation',
    '基建项目': 'type-construction',
    '其他项目': 'type-other'
  }
  return map[type] || 'type-other'
}

export const getPriorityClass = (priority: string) => {
  const map: Record<string, string> = {
    '高': 'priority-high',
    '中': 'priority-medium',
    '低': 'priority-low'
  }
  return map[priority] || 'priority-low'
}

export const getApprovalTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    leave: '请假申请',
    reimbursement: '报销申请',
    meeting: '会议申请',
    project: '项目申请',
    businessTrip: '出差申请',
    entertainment: '业务招待费'
  }
  return typeMap[type] || type
}

export const getApplicationTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'leave': '请假申请',
    'reimbursement': '报销申请',
    'meeting': '会议申请',
    'project': '项目申请',
    'businessTrip': '出差申请',
    'entertainment': '业务招待费'
  }
  return typeMap[type] || type
}

export const formatDays = (days: any) => {
  const num = Number(days)
  if (isNaN(num)) return days || '-'
  if (Math.abs(num - 0.5) < 0.001) return '半天'
  if (num === Math.floor(num)) return Math.floor(num) + '天'
  return num + '天'
}

const buildReimbursementDetailFields = (item: any): Record<string, string> => {
  let extra: Record<string, string> = {}
  try {
    const raw = item.detail
    const d = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
    if (d.projectName) extra['项目名称'] = d.projectName
    const segs = Array.isArray(d.segments) && d.segments.length > 0
      ? d.segments
      : (d.departureDate || d.departureTime
        ? [{ departureDate: d.departureTime || d.departureDate, departureLocation: d.departureLocation, arrivalDate: d.arrivalTime || d.arrivalDate, arrivalLocation: d.arrivalLocation, days: d.allowanceDays }]
        : [])
    if (segs.length > 0) {
      const lines = segs.map((s: any, i: number) =>
        `第${i + 1}段：${s.departureDate || s.departureTime || ''} ${s.departureLocation || ''} → ${s.arrivalDate || s.arrivalTime || ''} ${s.arrivalLocation || ''}${s.days ? `（${s.days}天）` : ''}`
      )
      extra['行程安排'] = lines.join('\n')
    }
    const pre = d.preBorrowedAmount
    if (pre !== undefined && pre !== null && pre !== '') {
      extra['预借金额'] = '¥' + Number(pre).toFixed(2)
    }
    const refund = d.refundAmount
    if (refund !== undefined && refund !== null && refund !== '') {
      const v = Number(refund)
      extra['退/补金额'] = (v >= 0 ? '+' : '') + v.toFixed(2)
    }
  } catch {}
  return extra
}

export const getDetailFields = (item: any, type: string, currentUsername: string) => {
  const fields: Record<string, Record<string, string>> = {
    leave: {
      '申请人': item.applicant || currentUsername,
      '请假类型': item.leaveType,
      '开始日期': item.startDate,
      '结束日期': item.endDate,
      '请假天数': formatDays(item.days),
      '请假原因': item.reason,
      '负责人': item.approver || '-',
      '提交时间': item.submitDate
    },
    reimbursement: {
      '申请人': item.applicant || currentUsername,
      '报销类型': item.reimburseType,
      '合计金额': '¥' + item.amount,
      '报销日期': item.reimburseDate,
      '报销事由': item.reason,
      ...buildReimbursementDetailFields(item),
      '审批人': item.approver || '-',
      '附件': item.attachments || '',
      '提交时间': item.submitDate
    },
    meeting: {
      '组织者': item.organizer || currentUsername,
      '会议主题': item.title,
      '会议日期': item.meetingDate,
      '会议时间': item.meetingTime,
      '会议地点': item.location,
      '参会人员': item.participants,
      '会议议程': item.agenda,
      '审批人': item.approver || '-',
      '创建时间': item.submitDate
    },
    project: {
      '申请人': item.applicant || currentUsername,
      '项目名称': item.projectName,
      '项目类型': item.projectType,
      '预算金额': '¥' + item.budget,
      '优先级': item.priority,
      '提交时间': item.submitDate
    },
    businessTrip: {
      '申请人': item.applicant || currentUsername,
      '同行人员': item.companion || '',
      '目的地': item.destination,
      '出差意向': item.purpose || '',
      '出差开始时间': item.startDate || '',
      '出差结束时间': item.endDate || '',
      '出差天数': formatDays(item.days),
      '预估费用': '¥' + item.estimatedCost,
      '提交时间': item.submitDate
    },
    entertainment: {
      '申请人': item.applicant || currentUsername,
      '客户名称': item.guestName,
      '招待单位': item.guestUnit || item.guest_unit || '',
      '招待人数': item.guestCount + '人',
      '场　所': item.location || '',
      '费用类型': item.expenseType,
      '招待金额': '¥' + item.expenseAmount,
      '招待日期': item.expenseDate,
      '招待事由': item.purpose,
      '审批人': item.approver || '-',
      '提交时间': item.submitDate
    }
  }
  return fields[type] || {}
}

const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      return value.substring(0, 19).replace('T', ' ')
    }
    if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(value)) {
      return value.replace(/\//g, '-')
    }
    if (/^\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}/.test(value)) {
      return value.replace(/\//g, '-')
    }
  }
  return String(value)
}

export const exportToCSV = (data: any[], filename: string, headers: string[], fields: string[]) => {
  let csvContent = '\uFEFF'
  csvContent += headers.join(',') + '\n'
  data.forEach(row => {
    const values = fields.map(field => {
      const value = row[field]
      if (value === null || value === undefined) return ''
      const stringValue = formatCellValue(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvContent += values.join(',') + '\n'
  })
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportSingleRow = (row: any, filename: string, headers: string[], fields: string[]) => {
  exportToCSV([row], filename, headers, fields)
}

const buildApproveRows = (row: any, resultColspan: number = 1, commentColspan: number = 1) => {
  const totalCols = 1 + resultColspan + commentColspan
  let entries: { name: string; action: string; text: string }[] = []

  // 1) 优先使用 approval_history（JSON 数组，结构化数据）
  try {
    const raw = row.approval_history
    if (raw) {
      const list = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(list) && list.length > 0) {
        entries = list.map((h: any) => ({
          name: extractRealName(String(h.approverName || h.approver_name || h.approver || '')) || (h.approverName || h.approver_name || ''),
          action: h.action === 'agree' || h.action === 'approved' ? '批准' : h.action === 'reject' || h.action === 'rejected' ? '拒绝' : (h.action || '已处理'),
          text: h.comment || h.commentText || ''
        }))
      }
    }
  } catch {}

  // 2) 回退使用 result 字段（"name:action;name:action" 格式）
  if (entries.length === 0 && row.result) {
    entries = (row.result as string).split(';').filter(Boolean).map((e: string) => {
      const idx = e.indexOf(':')
      return idx > 0 ? { name: e.substring(0, idx).trim(), action: e.substring(idx + 1).trim(), text: '' } : null
    }).filter(Boolean) as any
  }

  // 3) 最后回退：解析 comment 字段（"name: comment\n---\nname: comment"）
  if (entries.length === 0 && row.comment) {
    entries = (row.comment as string).split('\n---\n').filter(Boolean).map((e: string) => {
      const idx = e.indexOf(':')
      if (idx > 0) {
        return { name: e.substring(0, idx).trim(), action: row.status === 'approved' || row.status === '已批准' ? '批准' : row.status === 'rejected' || row.status === '已拒绝' ? '拒绝' : '已处理', text: e.substring(idx + 1).trim() }
      }
      return { name: '', action: '已处理', text: e.trim() }
    })
  }

  if (entries.length === 0) {
    return `<tr><td colspan="${totalCols}" style="padding:6px 10px;border:1px solid #000;text-align:center;color:#999;">（暂无审批记录）</td></tr>`
  }

  const remarkText = entries.map((e: any) => e.text).filter(Boolean).join('；') || ''

  const buildRow = (e: any) => {
    const actionText = e.action === '批准' || e.action === 'approved' ? '✓ 批准' : e.action === '拒绝' || e.action === 'rejected' ? '✗ 拒绝' : (e.action || '已处理')
    return `<tr><td style="padding:6px 10px;border:1px solid #000;">${e.name}</td><td colspan="${resultColspan}" style="padding:6px 10px;border:1px solid #000;">${actionText}</td><td colspan="${commentColspan}" style="padding:6px 10px;border:1px solid #000;">${e.text || ''}</td></tr>`
  }
  const headerRow = (label: string) =>
    `<tr class="approve-header"><td>${label}</td><td colspan="${resultColspan}" style="padding:6px 10px;border:1px solid #000;background:#eaeaea;font-weight:bold;text-align:center;">审批结果</td><td colspan="${commentColspan}" style="padding:6px 10px;border:1px solid #000;background:#eaeaea;font-weight:bold;text-align:center;">审批意见</td></tr>`

  let html = ''
  if (entries.length > 1) {
    html += headerRow('部门审批人')
    html += buildRow(entries[0])
    html += headerRow('审批人')
    for (let i = 1; i < entries.length; i++) html += buildRow(entries[i])
  } else {
    html += headerRow('审批人')
    html += buildRow(entries[0])
  }
  html += `<tr><td style="padding:6px 10px;border:1px solid #000;font-weight:bold;background:#f5f5f5;">备注</td><td colspan="${totalCols - 1}" style="padding:6px 10px;border:1px solid #000;">${remarkText}</td></tr>`
  return html
}

export const exportBusinessTripFormHTML = (row: any, department?: string, employees?: any[]) => {
  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }
  const applicant = row.applicant || ''
  const destination = row.destination || ''
  const purpose = row.purpose || row.reason || ''
  const days = row.days || ''
  const startDate = row.startDate || ''
  const endDate = row.endDate || ''
  const transport = row.transport || row.transportation || ''
  const companion = (row.companion || '').replace(/[\[\]"]/g, '')
  const yearS = startDate ? new Date(startDate).getFullYear() : ''
  const monthS = startDate ? new Date(startDate).getMonth() + 1 : ''
  const dayS = startDate ? new Date(startDate).getDate() : ''
  const yearE = endDate ? new Date(endDate).getFullYear() : ''
  const monthE = endDate ? new Date(endDate).getMonth() + 1 : ''
  const dayE = endDate ? new Date(endDate).getDate() : ''
  const transports = ['公司车', '私家车', '火车或高铁', '汽车', '飞机', '其他']

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>出差登记表 #${row.id}</title>
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "宋体", serif; color: #000; font-size: 14px; background: #fff; }
  .form-wrap { max-width: 750px; margin: 20px auto; border: 2px solid #000; padding: 0; background: #fff; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #000; padding: 8px 10px; vertical-align: middle; }
  .company-cell { text-align: center; font-size: 12px; color: #666; padding: 4px; letter-spacing: 2px; border-bottom: none; }
  .title-cell { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 8px; padding: 14px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .label { font-weight: bold; white-space: nowrap; width: 90px; background: #f5f5f5; text-align: center; }
  .reason-cell { min-height: 60px; line-height: 1.8; padding: 12px 10px; }
  .chk { display: inline-block; margin-right: 12px; }
  .chk-box { display: inline-block; width: 12px; height: 12px; border: 1px solid #333; margin-right: 3px; vertical-align: middle; }
  .chk-on .chk-box { background: #333; }
  .chk-on .chk-box::after { content: "✓"; color: #fff; font-size: 10px; line-height: 12px; padding-left: 1px; }
  .approve-header td { background: #eaeaea; font-weight: bold; text-align: center; padding: 6px 10px; }
  .print-hint { text-align: center; margin-top: 10px; font-size: 11px; color: #aaa; }
  @media print { .print-hint { display: none; } body { padding: 0; } .form-wrap { margin: 0 auto; } }
</style>
</head>
<body>
<div class="form-wrap">
<table>
  <tr><td colspan="4" class="company-cell">内蒙古宏友软件技术服务有限公司</td></tr>
  <tr><td colspan="4" class="title-cell">出 差 登 记 表</td></tr>
  <tr>
    <td class="label">申请人</td>
    <td>${applicant}</td>
    <td class="label">所属部门</td>
    <td>${department || ''}</td>
  </tr>
  <tr>
    <td class="label">同行人员</td>
    <td>${companion || '　'}</td>
    <td class="label">出差地点</td>
    <td>${destination || '　'}</td>
  </tr>
  <tr>
    <td class="label">计划出差时间</td>
    <td colspan="3">
      自 ${yearS || '____'}年${monthS || '__'}月${dayS || '__'}日
      至 ${yearE || '____'}年${monthE || '__'}月${dayE || '__'}日
      止（共 <strong>${days}</strong> 日）
    </td>
  </tr>
  <tr>
    <td class="label">出差意向</td>
    <td colspan="3" class="reason-cell">${purpose || '（未填写）'}</td>
  </tr>
  <tr>
    <td class="label">交通工具</td>
    <td colspan="3">${transports.map(t => `<span class="chk ${t === transport ? 'chk-on' : ''}"><span class="chk-box"></span>${t}</span>`).join('')}${transport && !transports.includes(transport) ? `<span class="chk chk-on"><span class="chk-box"></span>${transport}</span>` : ''}</td>
  </tr>
  ${(() => {
    // 判断员工是否为总经理角色
    const isGM = (name: string) => {
      if (!name) return false
      const emp = (employees || []).find((e: any) => extractRealName(e.name) === extractRealName(name))
      if (emp && /总经理/.test(String(emp.position || ''))) return true
      return false
    }
    // 审批结果条目：name + 结果 + 是否总经理（转发即视为批准）
    type Entry = { name: string; action: string; isGM: boolean }
    let entries: Entry[] = []
    // 1) approval_history（结构化，action 含 agree/reject，可能有 approverRole）
    const ah = row.approval_history
    if (ah) {
      try {
        const list = typeof ah === 'string' ? JSON.parse(ah) : ah
        if (Array.isArray(list) && list.length > 0) {
          entries = list.map((h: any) => {
            const name = extractRealName(String(h.approverName || h.approver_name || h.approver || '')) || (h.approverName || h.approver_name || '')
            const role = String(h.approverRole || '')
            return {
              name,
              action: (h.action === 'reject' || h.action === 'rejected') ? '拒绝' : '批准',
              isGM: /总经理/.test(role) || isGM(name)
            }
          }).filter((e: Entry) => e.name && e.action)
        }
      } catch {}
    }
    // 2) result 字段（"姓名:批准" 格式）
    if (entries.length === 0 && row.result) {
      entries = String(row.result).split(';').filter(Boolean).map((s: string) => {
        const idx = s.indexOf(':')
        const name = idx > 0 ? s.substring(0, idx).trim() : ''
        const actText = idx > 0 ? s.substring(idx + 1).trim() : ''
        const act = (/拒绝|驳回|reject|rejected|不同意/.test(actText)) ? '拒绝' : '批准'
        return name ? { name, action: act, isGM: isGM(name) } : null
      }).filter(Boolean) as any
    }
    // 3) comment 字段（"姓名: 意见"），转发即批准
    if (entries.length === 0 && row.comment) {
      const s = String(row.status || '')
      const statusReject = /rejected|已拒绝/.test(s)
      const act = statusReject ? '拒绝' : '批准'
      entries = String(row.comment).split('\n---\n').filter(Boolean).map((e: string) => {
        const idx = e.indexOf(':')
        const name = idx > 0 ? e.substring(0, idx).trim() : ''
        return name ? { name, action: act, isGM: isGM(name) } : null
      }).filter(Boolean) as any
    }
    // 4) 审批链补全：comment 中可能包含审批链中遗漏的部门审批人（如转发时仅写入 comment）
    //    approval_history/result 已存在时，把 comment 中出现但缺失的审批人补充进来
    if (entries.length > 0 && row.comment) {
      const s = String(row.status || '')
      const statusReject = /rejected|已拒绝/.test(s)
      const act = statusReject ? '拒绝' : '批准'
      const existingNames = new Set(entries.map((e: Entry) => e.name))
      const commentExtra = String(row.comment).split('\n---\n').filter(Boolean).map((e: string) => {
        const idx = e.indexOf(':')
        const name = idx > 0 ? e.substring(0, idx).trim() : ''
        return name ? { name, action: act, isGM: isGM(name) } : null
      }).filter(Boolean) as Entry[]
      commentExtra.forEach((ce: Entry) => {
        if (!existingNames.has(ce.name)) {
          entries.push(ce)
          existingNames.add(ce.name)
        }
      })
    }

    // 按角色区分：总经理 -> 负责人意见；非总经理 -> 部门意见
    const gmEntry = entries.find((e: Entry) => e.isGM)
    const deptEntry = entries.find((e: Entry) => !e.isGM)
    // 没有明确角色时：多个审批人 -> 最后一个为负责人，第一个为部门；单审批人 -> 若当前审批人(approver)是总经理则归负责人，否则归部门
    const deptFinal = deptEntry || (entries.length > 0 ? entries[0] : null)
    let leaderFinal = gmEntry || null
    if (!leaderFinal && entries.length > 0) {
      if (entries.length > 1) {
        leaderFinal = entries[entries.length - 1]
      } else {
        // 单个审批人：默认归部门意见（转发后的下一审批人未参与，负责人留空）
        leaderFinal = null
      }
    }
    const fmt = (name: string, v: string) => v ? `<div style="display:flex;align-items:baseline;justify-content:space-between;min-height:34px;padding-top:2px;"><span style="color:#c00;font-weight:bold;font-size:15px;">${v}</span>${name ? `<span style="font-size:12px;color:#666;margin-left:6px;">${name}</span>` : ''}</div>` : '　'
    return `
  <tr>
    <td class="label">部门意见</td>
    <td colspan="3" style="min-height:30px;">${fmt(deptFinal ? deptFinal.name : '', deptFinal ? deptFinal.action : '')}</td>
  </tr>
  <tr>
    <td class="label">负责人意见</td>
    <td colspan="3" style="min-height:30px;">${fmt(leaderFinal ? leaderFinal.name : '', leaderFinal ? leaderFinal.action : '')}</td>
  </tr>`
  })()}
</table>
</div>
<div class="form-date" style="text-align:right;margin-top:8px;font-size:12px;color:#999;">打印时间：${formatDateCN(new Date())}</div>
<div class="print-hint">按 Ctrl+P 可导出为 PDF 打印</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) {
    w.document.title = `出差登记表_${applicant}_${destination}`
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `出差登记表_${row.id}.html`
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const exportEntertainmentFormHTML = (row: any, department?: string, employees?: any[]) => {
  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }
  const applicant = row.applicant || ''
  const guestName = row.guestName || ''
  const guestUnit = row.guestUnit || ''
  const guestCount = row.guestCount || ''
  const expenseType = row.expenseType || ''
  const expenseAmount = row.expenseAmount || ''
  const expenseDate = row.expenseDate || ''
  const purpose = row.purpose || ''
  const location = row.location || ''
  // 解析审批：部门负责人意见(非总经理)、总经理意见
  const normalizeAct = (a: string) => {
    if (!a) return ''
    if (a === '同意' || a === 'agree' || a === 'approved' || a === '通过') return '批准'
    if (a === '拒绝' || a === 'reject' || a === 'rejected' || a === '驳回') return '拒绝'
    return a
  }
  let deptOpinionAct = ''
  let financeOpinionAct = ''
  let gmOpinionAct = ''
  let deptOpinionName = ''
  let financeOpinionName = ''
  let gmOpinionName = ''
  // 按角色分配意见：财务→财务意见，总经理→总经理意见，其余→部门意见，同时记录审批人姓名
  const setOpinion = (slot: 'dept' | 'finance' | 'gm', name: string, act: string) => {
    if (!name || !act) return
    const realName = extractRealName(name)
    if (slot === 'dept') {
      if (!deptOpinionAct) { deptOpinionAct = act; deptOpinionName = realName }
    } else if (slot === 'finance') {
      if (!financeOpinionAct) { financeOpinionAct = act; financeOpinionName = realName }
    } else {
      if (!gmOpinionAct) { gmOpinionAct = act; gmOpinionName = realName }
    }
  }
  const assignByRole = (name: string, act: string) => {
    if (!name || !act) return
    const emp = (employees || []).find((e: any) => extractRealName(e.name) === extractRealName(name))
    const role = emp?.position || ''
    if (/财务/.test(role)) {
      setOpinion('finance', name, act)
    } else if (/总经理/.test(role)) {
      setOpinion('gm', name, act)
    } else {
      setOpinion('dept', name, act)
    }
  }
  try {
    const ah = row.approval_history
    if (ah) {
      const list = typeof ah === 'string' ? JSON.parse(ah) : ah
      if (Array.isArray(list)) {
        for (const h of list) {
          const act = normalizeAct(h.action)
          const name = String(h.approverName || h.approver_name || h.approver || '')
          const role = String(h.approverRole || '')
          if (role) {
            if (/财务/.test(role)) setOpinion('finance', name, act)
            else if (/总经理/.test(role)) setOpinion('gm', name, act)
            else setOpinion('dept', name, act)
          } else {
            assignByRole(name, act)
          }
        }
      }
    }
  } catch {}
  // 从 result 字段回退（格式："李智鑫:批准" 或 "李智鑫:批准;陈东:批准"），按角色分配
  if (!deptOpinionAct && !financeOpinionAct && !gmOpinionAct && row.result) {
    const items = String(row.result).split(';').filter(Boolean).map((s: string) => {
      const idx = s.indexOf(':')
      const name = idx > 0 ? s.substring(0, idx).trim() : ''
      const act = normalizeAct(idx > 0 ? s.substring(idx + 1).trim() : s.trim())
      return { name, act }
    }).filter((i: any) => i.act)
    items.forEach((i: any) => assignByRole(i.name, i.act))
    // 兜底：单一审批人视为总经理（最终审批人）；多个→第一个部门、最后一个总经理
    if (!deptOpinionAct && !financeOpinionAct && !gmOpinionAct) {
      if (items.length === 1) setOpinion('gm', items[0].name, items[0].act)
      else if (items.length > 1) {
        setOpinion('dept', items[0].name, items[0].act)
        setOpinion('gm', items[items.length - 1].name, items[items.length - 1].act)
      }
    }
    // 强制修正：单一审批人应归入总经理意见
    const totalApprovers = items.length
    if (totalApprovers === 1 && deptOpinionAct && !gmOpinionAct) {
      gmOpinionAct = deptOpinionAct
      gmOpinionName = deptOpinionName
      deptOpinionAct = ''
      deptOpinionName = ''
    }
  }
  const numberToCN = (n: string) => {
    if (!n) return ''
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
    const units = ['', '拾', '佰', '仟']
    const bigUnits = ['', '万', '亿']
    const parts = n.split('.')
    let intPart = parseInt(parts[0] || '0', 10)
    let decPart = parts[1] || ''
    if (intPart === 0 && !decPart) return '零元整'
    let result = ''
    let groupIdx = 0
    while (intPart > 0) {
      const group = intPart % 10000
      if (group > 0) {
        let groupStr = ''
        let g = group
        let u = 0
        while (g > 0) {
          const d = g % 10
          if (d > 0) groupStr = digits[d] + units[u] + groupStr
          else if (groupStr) groupStr = '零' + groupStr
          g = Math.floor(g / 10)
          u++
        }
        result = groupStr + bigUnits[groupIdx] + result
      } else if (result && !result.startsWith('零')) {
        result = '零' + result
      }
      intPart = Math.floor(intPart / 10000)
      groupIdx++
    }
    result += '元'
    if (decPart) {
      const jiao = parseInt(decPart[0] || '0', 10)
      const fen = parseInt(decPart[1] || '0', 10)
      if (jiao > 0) result += digits[jiao] + '角'
      else if (fen > 0 && result) result += '零'
      if (fen > 0) result += digits[fen] + '分'
      else if (jiao === 0) result += '整'
    } else {
      result += '整'
    }
    return result
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>业务招待费申请表 #${row.id}</title>
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "宋体", serif; color: #000; font-size: 14px; background: #fff; }
  .form-wrap { max-width: 750px; margin: 20px auto; border: 2px solid #000; padding: 0; background: #fff; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #000; padding: 8px 10px; vertical-align: middle; }
  .company-cell { text-align: center; font-size: 12px; color: #666; padding: 4px; letter-spacing: 2px; border-bottom: none; }
  .title-cell { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 8px; padding: 14px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .label { font-weight: bold; white-space: nowrap; width: 110px; background: #f5f5f5; text-align: center; }
  .reason-cell { min-height: 50px; line-height: 1.8; padding: 12px 10px; }
  .approve-header td { background: #eaeaea; font-weight: bold; text-align: center; padding: 6px 10px; }
  .print-hint { text-align: center; margin-top: 10px; font-size: 11px; color: #aaa; }
  @media print { .print-hint { display: none; } body { padding: 0; } .form-wrap { margin: 0 auto; } }
</style>
</head>
<body>
<div class="form-wrap">
<table>
  <tr><td colspan="4" class="company-cell">内蒙古宏友软件技术服务有限公司</td></tr>
  <tr><td colspan="4" class="title-cell">业 务 招 待 费 申 请 表</td></tr>
  <tr>
    <td class="label">申请部门</td>
    <td colspan="3">${department || ''}</td>
  </tr>
  <tr>
    <td class="label">申请人</td>
    <td>${applicant}</td>
    <td class="label">申请时间</td>
    <td>${formatDateCN(expenseDate) || '　　年　月　日'}</td>
  </tr>
  <tr>
    <td class="label">招待单位</td>
    <td>${guestUnit || guestName || '　'}</td>
    <td class="label">招待人数</td>
    <td>${guestCount} 人</td>
  </tr>
  <tr>
    <td class="label">招待事由</td>
    <td colspan="3" class="reason-cell">${purpose || '（未填写）'}</td>
  </tr>
  <tr>
    <td class="label">招待时间</td>
    <td colspan="3">${formatDateCN(expenseDate) || '　　年　月　日'}</td>
  </tr>
  <tr>
    <td class="label">场　所</td>
    <td colspan="3">${location || '　'}</td>
  </tr>
  <tr>
    <td class="label">预计金额</td>
    <td colspan="1">小写：¥ ${expenseAmount}</td>
    <td colspan="2">大写：${numberToCN(String(expenseAmount))}</td>
  </tr>
  <tr>
    <td class="label">费用类型</td>
    <td colspan="3">${expenseType || '　'}</td>
  </tr>
  <tr>
    <td class="label" style="color:#c00;">部门负责人意见</td>
    <td style="height:36px;color:#c00;font-weight:bold;position:relative;">${deptOpinionAct ? `<div style="position:relative;min-height:34px;"><span style="color:#c00;font-weight:bold;position:absolute;top:0;left:2px;">${deptOpinionAct}</span>${deptOpinionName ? `<span style="position:absolute;bottom:0;right:2px;font-size:12px;color:#666;">${deptOpinionName}</span>` : ''}</div>` : '　'}</td>
    <td class="label">部门负责人签字</td>
    <td style="height:36px;">${deptOpinionName || '　'}</td>
  </tr>
  <tr>
    <td class="label" style="color:#c00;">财务负责人意见</td>
    <td style="height:36px;color:#c00;font-weight:bold;position:relative;">${financeOpinionAct ? `<div style="position:relative;min-height:34px;"><span style="color:#c00;font-weight:bold;position:absolute;top:0;left:2px;">${financeOpinionAct}</span>${financeOpinionName ? `<span style="position:absolute;bottom:0;right:2px;font-size:12px;color:#666;">${financeOpinionName}</span>` : ''}</div>` : '　'}</td>
    <td class="label">财务负责人签字</td>
    <td style="height:36px;">${financeOpinionName || '　'}</td>
  </tr>
  <tr>
    <td class="label" style="color:#c00;">总经理意见</td>
    <td style="height:36px;color:#c00;font-weight:bold;position:relative;">${gmOpinionAct ? `<div style="position:relative;min-height:34px;"><span style="color:#c00;font-weight:bold;position:absolute;top:0;left:2px;">${gmOpinionAct}</span>${gmOpinionName ? `<span style="position:absolute;bottom:0;right:2px;font-size:12px;color:#666;">${gmOpinionName}</span>` : ''}</div>` : '　'}</td>
    <td class="label">总经理签字</td>
    <td style="height:36px;">${gmOpinionName || '　'}</td>
  </tr>
  <tr>
    <td class="label">备　注</td>
    <td colspan="3">招待完毕后凭发票报销。</td>
  </tr>
</table>
</div>
<div class="print-hint">按 Ctrl+P 可导出为 PDF 打印</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) {
    w.document.title = `业务招待费申请表_${applicant}_${guestName}`
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `业务招待费申请表_${row.id}.html`
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const exportReimbursementFormHTML = (row: any, department?: string, employees?: any[]) => {
  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }

  const reimburseType = row.reimburseType || ''
  const reason = row.reason || ''
  const amount = row.amount || ''
  const reimburseDate = formatDateCN(row.reimburseDate)

  // 解析出差明细 detail（JSON对象或字符串）
  let d: any = {}
  try {
    const raw = row.detail
    if (raw) d = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {}

  const isTravel = /差旅|出差/.test(reimburseType)
  const title = isTravel ? '差旅费用报销单' : '报 销 单'

  // 解析审批结果：result 格式 "审批人姓名:批准;审批人姓名:拒绝"
  const normalizeAct = (a: string) => {
    if (!a) return ''
    if (a === '同意' || a === 'agree' || a === 'approved' || a === '通过') return '批准'
    if (a === '拒绝' || a === 'reject' || a === 'rejected' || a === '驳回') return '拒绝'
    return a
  }
  const resultItems = String(row.result || '').split(';').filter(Boolean).map((s: string) => {
    const idx = s.indexOf(':')
    if (idx <= 0) return null
    return { name: extractRealName(s.substring(0, idx).trim()), action: normalizeAct(s.substring(idx + 1).trim()) }
  }).filter(Boolean) as { name: string; action: string }[]
  // 从 comment 补充审批链中遗漏的审批人（如部门主管转发后未写入 result，转发即视为批准）
  try {
    const rawComment = String(row.comment || '')
    if (rawComment) {
      const existingNames = new Set(resultItems.map((i: any) => i.name))
      rawComment.split('\n---\n').filter(Boolean).forEach((e: string) => {
        const idx = e.indexOf(':')
        const name = idx > 0 ? extractRealName(e.substring(0, idx).trim()) : ''
        if (name && !existingNames.has(name)) {
          resultItems.push({ name, action: '批准' })
          existingNames.add(name)
        }
      })
    }
  } catch {}
  // 按职位分类审批意见：
  // 部门意见 = 第一个非总经理、非财务总监角色的审批人；
  // 财务意见 = 财务总监；领导批示 = 总经理
  const positionMap = new Map<string, string>()
  ;(employees || []).forEach((e: any) => {
    const n = extractRealName(e.name || '')
    if (n) positionMap.set(n, String(e.position || ''))
  })
  const posOf = (name: string) => positionMap.get(name) || ''
  const isGM = (name: string) => posOf(name).includes('总经理')
  const isFinanceHead = (name: string) => posOf(name).includes('财务总监')
  const deptItem = resultItems.find(i => i && !isGM(i.name) && !isFinanceHead(i.name)) || null
  const financeItem = resultItems.find(i => i && isFinanceHead(i.name)) || null
  const gmItem = resultItems.find(i => i && isGM(i.name)) || null
  const leaderItem = gmItem || (resultItems.length > 0 ? resultItems[resultItems.length - 1] : null)
  const fmtApprover = (item: any) => item && item.name
    ? `${item.name}<br/><span style="color:#c00;font-weight:bold;">${item.action}</span>`
    : '　'

  // 行程段：优先使用新结构 segments，兼容旧字段
  let segments: any[] = Array.isArray(d.segments) && d.segments.length > 0 ? d.segments : []
  if (segments.length === 0 && (d.departureDate || d.arrivalDate || d.departureLocation || d.arrivalLocation || d.departureTime)) {
    segments = [{
      departureDate: d.departureTime || d.departureDate,
      departureLocation: d.departureLocation,
      arrivalDate: d.arrivalTime || d.arrivalDate,
      arrivalLocation: d.arrivalLocation,
      transport: d.transport,
      transportAmount: d.transportAmount,
      days: d.allowanceDays,
      allowanceStandard: d.allowanceStandard,
      allowanceAmount: d.allowanceAmount,
      lodgingAmount: d.lodgingAmount,
      localTransportAmount: d.localTransportAmount,
      otherAmount: d.otherAmount
    }]
  }
  while (segments.length < 4) segments.push({})
  segments = segments.slice(0, 4)

  const totalDays = segments.reduce((sum: number, s: any) => sum + (Number(s.days) || 0), 0)
  const transportTotal = segments.reduce((sum: number, s: any) => sum + (Number(s.transportAmount) || 0), 0)
  const allowanceTotal = segments.reduce((sum: number, s: any) => sum + (Number(s.allowanceAmount) || 0), 0)
  const lodgingTotal = segments.reduce((sum: number, s: any) => sum + (Number(s.lodgingAmount) || 0), 0)
  const localTotal = segments.reduce((sum: number, s: any) => sum + (Number(s.localTransportAmount) || 0), 0)
  const otherTotal = segments.reduce((sum: number, s: any) => sum + (Number(s.otherAmount) || 0), 0)
  const preBorrowedAmount = d.preBorrowedAmount || 0
  // 退/补金额优先用手动输入值，未填写时兼容自动计算
  const refundAmount = (d.refundAmount !== undefined && d.refundAmount !== null && d.refundAmount !== '')
    ? Number(d.refundAmount)
    : Math.round((Number(amount) - Number(preBorrowedAmount)) * 100) / 100

  const money = (v: any) => (Number(v) || 0).toFixed(2)
  const moneySigned = (v: number) => `${v >= 0 ? '+' : ''}${money(v)}`
  const formatDateTimeCN = (dt: any) => {
    if (!dt) return '　'
    const str = String(dt).replace('T', ' ')
    const m = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2})/)
    if (m) return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日 ${m[4]}:${m[5]}`
    return formatDateCN(dt)
  }
  const segHeader = `
  <tr style="background:#fafafa;font-weight:bold;">
    <td class="label" style="text-align:center;" rowspan="2">段</td>
    <td colspan="4" class="label" style="text-align:center;">出发</td>
    <td colspan="5" class="label" style="text-align:center;">到达</td>
    <td colspan="3" class="label" style="text-align:center;">交通</td>
    <td colspan="2" class="label" style="text-align:center;">出差补助</td>
    <td colspan="3" class="label" style="text-align:center;">其他费用金额</td>
  </tr>
  <tr style="background:#fafafa;font-weight:bold;">
    <td colspan="2" class="label" style="text-align:center;">出发日期</td>
    <td colspan="2" class="label" style="text-align:center;">出发地点</td>
    <td colspan="2" class="label" style="text-align:center;">到达日期</td>
    <td colspan="2" class="label" style="text-align:center;">到达地点</td>
    <td class="label" style="text-align:center;">人<br>数</td>
    <td class="label" style="text-align:center;">交通<br>工具</td>
    <td class="label" style="text-align:center;">交通<br>金额</td>
    <td class="label" style="text-align:center;">天<br>数</td>
    <td class="label" style="text-align:center;">补助<br>标准</td>
    <td class="label" style="text-align:center;">补助<br>金额</td>
    <td class="label" style="text-align:center;">住<br>宿</td>
    <td class="label" style="text-align:center;">市<br>内</td>
    <td class="label" style="text-align:center;">其<br>他</td>
  </tr>`

  const segmentRows = segments.map((s: any, i: number) => {
    return `
  <tr>
    <td class="label" style="background:#fff;text-align:center;">${i + 1}</td>
    <td colspan="2" style="text-align:center;">${formatDateTimeCN(s.departureDate)}</td>
    <td colspan="2">${s.departureLocation || '　'}</td>
    <td colspan="2" style="text-align:center;">${formatDateTimeCN(s.arrivalDate)}</td>
    <td colspan="2">${s.arrivalLocation || '　'}</td>
    <td style="text-align:center;">${d.peopleCount || '　'}</td>
    <td style="text-align:center;">${s.transport || '　'}</td>
    <td style="text-align:center;">${money(s.transportAmount)}</td>
    <td style="text-align:center;">${s.days || '　'}</td>
    <td style="text-align:center;">${money(s.allowanceStandard)}</td>
    <td style="text-align:center;">${money(s.allowanceAmount)}</td>
    <td style="text-align:center;">${money(s.lodgingAmount)}</td>
    <td style="text-align:center;">${money(s.localTransportAmount)}</td>
    <td style="text-align:center;">${money(s.otherAmount)}</td>
  </tr>`
  }).join('')

  const segTotalRow = `
  <tr>
    <td class="label" style="background:#fff;text-align:center;">合计</td>
    <td colspan="2"></td>
    <td colspan="2"></td>
    <td colspan="2"></td>
    <td colspan="2"></td>
    <td></td>
    <td></td>
    <td style="text-align:center;">${money(transportTotal)}</td>
    <td style="text-align:center;">${totalDays || '　'}</td>
    <td></td>
    <td style="text-align:center;">${money(allowanceTotal)}</td>
    <td style="text-align:center;">${money(lodgingTotal)}</td>
    <td style="text-align:center;">${money(localTotal)}</td>
    <td style="text-align:center;">${money(otherTotal)}</td>
  </tr>`

  const numberToCN = (n: string) => {
    if (!n) return ''
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
    const units = ['', '拾', '佰', '仟']
    const bigUnits = ['', '万', '亿']
    const parts = String(n).split('.')
    let intPart = parseInt(parts[0] || '0', 10)
    let decPart = parts[1] || ''
    if (intPart === 0 && !decPart) return '零元整'
    let result = ''
    let groupIdx = 0
    while (intPart > 0) {
      const group = intPart % 10000
      if (group > 0) {
        let groupStr = ''
        let g = group
        let u = 0
        while (g > 0) {
          const d = g % 10
          if (d > 0) groupStr = digits[d] + units[u] + groupStr
          else if (groupStr) groupStr = '零' + groupStr
          g = Math.floor(g / 10)
          u++
        }
        result = groupStr + bigUnits[groupIdx] + result
      } else if (result && !result.startsWith('零')) {
        result = '零' + result
      }
      intPart = Math.floor(intPart / 10000)
      groupIdx++
    }
    result += '元'
    if (decPart) {
      const jiao = parseInt(decPart[0] || '0', 10)
      const fen = parseInt(decPart[1] || '0', 10)
      if (jiao > 0) result += digits[jiao] + '角'
      else if (fen > 0 && result) result += '零'
      if (fen > 0) result += digits[fen] + '分'
      else if (jiao === 0) result += '整'
    } else {
      result += '整'
    }
    return result
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title} #${row.id}</title>
<style>
  @page { margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "宋体", serif; color: #000; font-size: 13px; background: #fff; }
  .form-wrap { max-width: 1040px; margin: 10px auto; border: 2px solid #000; padding: 0; background: #fff; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
  .title-cell { text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 14px; padding: 10px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .label { font-weight: bold; text-align: center; white-space: nowrap; background: #fafafa; }
  .field-value { padding-left: 6px; }
  .reason-cell { min-height: 50px; line-height: 1.6; padding: 8px; }
  .approve-header td { background: #f5f5f5; font-weight: bold; text-align: center; padding: 4px 6px; }
  .print-hint { text-align: center; margin-top: 8px; font-size: 11px; color: #aaa; }
  @media print { .print-hint { display: none; } body { padding: 0; } .form-wrap { margin: 0 auto; } }
</style>
</head>
<body>
<div class="form-wrap">
<table>
  <tr><td colspan="18" class="title-cell">${title}</td></tr>
  <tr>
    <td class="label" colspan="2">报销日期</td>
    <td colspan="3">${reimburseDate || '　年　月　日'}</td>
    <td colspan="2" class="label">编　号</td>
    <td colspan="11">#${row.id || ''}</td>
  </tr>
  <tr>
    <td class="label" colspan="2">部　门</td>
    <td colspan="16">${department || ''}</td>
  </tr>
  <tr>
    <td class="label" colspan="2">出差人</td>
    <td colspan="3">${row.applicant || ''}</td>
    <td class="label" colspan="2">出差事由</td>
    <td colspan="6" class="reason-cell">${reason || ''}</td>
    <td class="label" colspan="2">项目名称</td>
    <td colspan="3">${d.projectName || '　'}</td>
  </tr>
  ${segHeader}
  ${segmentRows}
  ${segTotalRow}
  <tr style="font-weight:bold;">
    <td colspan="18" style="text-align:center;color:#c00;font-size:15px;">合计金额 ¥ ${money(amount)}</td>
  </tr>
  <tr>
    <td colspan="2" rowspan="2" class="label" style="background:#fafafa;">报销<br>总额</td>
    <td colspan="6" rowspan="2" style="text-align:center;border-right:1px solid #000;">
      <div style="font-weight:bold;font-size:14px;">（大写） ${numberToCN(String(amount))}</div>
      <div style="font-weight:bold;font-size:14px;margin-top:6px;">¥ ${money(amount)}</div>
    </td>
    <td colspan="5" class="label" style="background:#fafafa;">预借金额</td>
    <td colspan="5" style="text-align:right;font-weight:bold;font-size:14px;">¥ ${money(preBorrowedAmount)}</td>
  </tr>
  <tr>
    <td colspan="5" class="label" style="background:#fafafa;">退／补金额</td>
    <td colspan="5" style="text-align:right;font-weight:bold;font-size:14px;">${moneySigned(refundAmount)}</td>
  </tr>
  <tr>
    <td colspan="3" class="label" style="background:#fafafa;">附单据张数合计</td>
    <td colspan="2">　</td>
    <td colspan="2" class="label" style="background:#fafafa;">对应上方的项目</td>
    <td colspan="5">　</td>
    <td colspan="2" class="label" style="background:#fafafa;">城际交通</td>
    <td colspan="2">　</td>
    <td colspan="2" class="label" style="background:#fafafa;">其他</td>
  </tr>
  <tr style="height:50px;">
    <td colspan="3" class="label" style="background:#fafafa;">领导批示</td>
    <td>${fmtApprover(leaderItem)}</td>
    <td colspan="2" class="label" style="background:#fafafa;">部门主管</td>
    <td>${fmtApprover(deptItem)}</td>
    <td colspan="2" class="label" style="background:#fafafa;">财务主管</td>
    <td>${fmtApprover(financeItem)}</td>
    <td colspan="2" class="label" style="background:#fafafa;">会　计</td>
    <td></td>
    <td class="label" style="background:#fafafa;">出　纳</td>
    <td></td>
    <td colspan="2" class="label" style="background:#fafafa;">领款人</td>
    <td>${row.applicant || '　'}</td>
  </tr>
</table>
</div>
<div class="print-hint">按 Ctrl+P 可导出为 PDF 打印</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) {
    w.document.title = `${title}_${row.applicant}`
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}_${row.id}.html`
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const getStatDetailTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'project': '项目申请',
    'reimbursement': '报销申请',
    'leave': '请假申请',
    'businessTrip': '出差申请',
    'meeting': '会议申请',
    'entertainment': '业务招待费'
  }
  return typeMap[type] || type
}

export const getStatDetailName = (record: any) => {
  return record.projectName || record.title || record.reimburseType || record.leaveType || record.destination || record.guestName || '未知'
}

export const stripApproverName = (text: string) => {
  if (!text) return ''
  return text.replace(/^[^:：]+[:：]\s*/gm, '').trim()
}

export const hasButtonPermission = (buttonKey: string, menuPath?: string): boolean => {
  try {
    const btnPermsStr = localStorage.getItem('buttonPermissions')
    if (!btnPermsStr) return false
    const btnPerms = JSON.parse(btnPermsStr)
    const permsStr = localStorage.getItem('permissions')
    if (!permsStr) return false
    const perms = JSON.parse(permsStr)
    let menuId = null
    for (const perm of perms) {
      if (menuPath && perm.path === menuPath) { menuId = perm.id; break }
      if (!menuPath && perm.id) { menuId = perm.id; break }
    }
    if (!menuId) {
      for (const perm of perms) {
        if (perm.id) { menuId = perm.id; break }
      }
    }
    if (!menuId || !btnPerms[menuId]) return false
    return btnPerms[menuId].includes(buttonKey)
  } catch { return false }
}

export const exportLeaveFormHTML = (row: any, department?: string) => {
  const getLeaveTypeCN = (t: string) => {
    const map: Record<string, string> = { 'sick': '病假', 'personal': '事假', 'annual': '年假', 'wedding': '婚假', 'maternity': '产假', 'funeral': '丧假', 'other': '其他' }
    return map[t] || t
  }

  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }

  const startDate = row.startDate || ''
  const endDate = row.endDate || ''
  const leaveType = getLeaveTypeCN(row.leaveType)
  const days = row.days || '-'
  const reason = row.reason || ''

  const yearS = startDate ? new Date(startDate).getFullYear() : ''
  const monthS = startDate ? new Date(startDate).getMonth() + 1 : ''
  const dayS = startDate ? new Date(startDate).getDate() : ''
  const yearE = endDate ? new Date(endDate).getFullYear() : ''
  const monthE = endDate ? new Date(endDate).getMonth() + 1 : ''
  const dayE = endDate ? new Date(endDate).getDate() : ''

  // 解析审批历史：从 result/approval_history 提取审批结果
  const normalize = (a: string) => {
    if (!a) return ''
    if (a === '同意' || a === 'agree' || a === 'approved' || a === '通过') return '批准'
    if (a === '拒绝' || a === 'reject' || a === 'rejected' || a === '驳回') return '拒绝'
    return a
  }
  let deptOpinion = ''
  let leaderOpinion = ''
  let deptName = ''
  let leaderName = ''
  const getNameOf = (h: any) => extractRealName(String(h.approverName || h.approver_name || h.approver || ''))
  // 1) 尝试 approval_history（结构化数组）
  try {
    const ah = row.approval_history
    if (ah) {
      const list = typeof ah === 'string' ? JSON.parse(ah) : ah
      if (Array.isArray(list) && list.length > 0) {
        // 按角色区分：第一个非总经理→部门意见；总经理→负责人审批
        const dept = list.find((h: any) => h.approverRole && !/总经理/.test(h.approverRole))
        if (dept) { deptOpinion = normalize(dept.action); deptName = getNameOf(dept) }
        const leader = list.find((h: any) => h.approverRole && /总经理/.test(h.approverRole))
        if (leader) { leaderOpinion = normalize(leader.action); leaderName = getNameOf(leader) }
        // 如果没分出来，第一个→部门，最后一个→负责人
        if (!deptOpinion && !leaderOpinion && list.length > 0) {
          deptOpinion = normalize(list[0].action)
          deptName = getNameOf(list[0])
          if (list.length > 1) {
            leaderOpinion = normalize(list[list.length - 1].action)
            leaderName = getNameOf(list[list.length - 1])
          }
        }
      }
    }
  } catch {}
  // 2) 回退使用 result 字段（"name:批准;name:批准" 格式）
  if (!deptOpinion && !leaderOpinion && row.result) {
    try {
      const items = String(row.result).split(';').filter(Boolean).map((s: string) => {
        const idx = s.indexOf(':')
        return idx > 0 ? { name: s.substring(0, idx).trim(), action: normalize(s.substring(idx + 1).trim()) } : null
      }).filter(Boolean)
      if (items.length > 0) {
        deptOpinion = items[0].action
        deptName = extractRealName(items[0].name)
      }
      if (items.length > 1) {
        leaderOpinion = items[items.length - 1].action
        leaderName = extractRealName(items[items.length - 1].name)
      }
    } catch {}
  }
  // 3) 最终回退：从 status 推断
  if (!deptOpinion && !leaderOpinion) {
    const s = String(row.status || '')
    const r = /approved|已批准/.test(s) ? '批准' : /rejected|已拒绝/.test(s) ? '拒绝' : ''
    if (r) { leaderOpinion = r }
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>请假单 #${row.id}</title>
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "楷体", "SimSun", "宋体", serif; color: #000; font-size: 22px; background: #fff; }
  .form-wrap { max-width: 1080px; margin: 16px auto; border: 3px solid #000; padding: 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  col.col-label { width: 16.66%; }
  col.col-value { width: 16.67%; }
  td { border: 2px solid #000; padding: 20px 24px; vertical-align: middle; min-height: 64px; }
  .title-row td { text-align: center; font-size: 38px; font-weight: bold; letter-spacing: 20px; padding: 20px 24px; border-bottom: none; font-family: "SimHei","黑体",sans-serif; min-height: 0; }
  .date-row td { text-align: right; padding: 20px 24px; font-size: 21px; letter-spacing: 2px; border-top: none; border-bottom: none; min-height: 0; }
  .label { text-align: center; white-space: nowrap; font-weight: bold; font-size: 22px; padding: 20px 24px; }
  .field-value { font-weight: normal; padding: 20px 24px; font-size: 22px; }
  .content-area { line-height: 1.6; padding: 20px 24px; font-size: 22px; }
  .approval-area { padding: 20px 24px; }
  .approval-result { color: #c00; font-weight: bold; font-size: 24px; }
  .approval-sign { text-align: right; font-size: 20px; color: #333; margin-top: 13px; }
  .print-hint { text-align: center; margin-top: 13px; font-size: 18px; color: #999; }
  @media print { .print-hint { display: none; } }
</style>
</head>
<body>
<div class="form-wrap">
  <table>
    <colgroup>
      <col class="col-label">
      <col class="col-value">
      <col class="col-value">
      <col class="col-label">
      <col class="col-value">
      <col class="col-value">
    </colgroup>
    <tr class="title-row">
      <td colspan="6">请 假 单</td>
    </tr>
    <tr class="date-row">
      <td colspan="6">${formatDateCN(new Date()) || '　年　月　日'}</td>
    </tr>
    <tr>
      <td class="label">姓名</td>
      <td class="field-value" colspan="2">${row.applicant || ''}</td>
      <td class="label">部门</td>
      <td class="field-value" colspan="2">${department || ''}</td>
    </tr>
    <tr>
      <td class="label">请假时间</td>
      <td class="field-value" colspan="5">
        ${yearS || '____'}年${monthS || '__'}月${dayS || '__'}日
        至 ${yearE || '____'}年${monthE || '__'}月${dayE || '__'}日
        ，共 <strong>${days}</strong> 天
      </td>
    </tr>
    <tr>
      <td class="label">请假原因</td>
      <td colspan="5" class="content-area">${reason || ''}</td>
    </tr>
    <tr>
      <td class="label">部门意见</td>
      <td class="approval-area" colspan="2">
        ${deptOpinion ? `<div class="approval-result">${deptOpinion}</div>` : ''}
        ${deptName ? `<div class="approval-sign">— ${deptName}</div>` : ''}
      </td>
      <td class="label">负责人<br>审批</td>
      <td class="approval-area" colspan="2">
        ${leaderOpinion ? `<div class="approval-result">${leaderOpinion}</div>` : ''}
        ${leaderName ? `<div class="approval-sign">— ${leaderName}</div>` : ''}
      </td>
    </tr>
    <tr>
      <td class="label">备注</td>
      <td colspan="5" class="approval-area"></td>
    </tr>
  </table>
</div>
<div class="print-hint">按 Ctrl+P 可导出为 PDF 打印</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) {
    w.document.title = `请假单_${row.applicant}_${formatDateCN(startDate)}`
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `请假单_${row.id}.html`
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
