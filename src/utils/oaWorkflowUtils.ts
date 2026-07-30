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

export const getDetailFields = (item: any, type: string, currentUsername: string) => {
  const fields: Record<string, Record<string, string>> = {
    leave: {
      '申请人': item.applicant || currentUsername,
      '请假类型': item.leaveType,
      '开始日期': item.startDate,
      '结束日期': item.endDate,
      '请假天数': formatDays(item.days),
      '请假原因': item.reason,
      '审批人': item.approver || '待分配',
      '提交时间': item.submitDate
    },
    reimbursement: {
      '申请人': item.applicant || currentUsername,
      '报销类型': item.reimburseType,
      '报销金额': '¥' + item.amount,
      '报销日期': item.reimburseDate,
      '报销事由': item.reason,
      '审批人': item.approver || '待分配',
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
      '审批人': item.approver || '待分配',
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
      '审批人': item.approver || '待分配',
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
      '审批人': item.approver || '待分配',
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
  const resultEntries = (row.result || '').split(';').filter(Boolean).map((entry: string) => {
    const idx = entry.indexOf(':')
    return idx > 0 ? { name: entry.substring(0, idx).trim(), action: entry.substring(idx + 1).trim() } : null
  }).filter(Boolean)
  const commentEntries = (row.comment || '').split('\n---\n').filter(Boolean).map((entry: string) => {
    const idx = entry.indexOf(':')
    return idx > 0 ? { name: entry.substring(0, idx).trim(), text: entry.substring(idx + 1).trim() } : { name: '', text: entry.trim() }
  })
  const totalCols = 1 + resultColspan + commentColspan

  if (resultEntries.length === 0) {
    return `<tr><td colspan="${totalCols}" style="padding:6px 10px;border:1px solid #000;text-align:center;color:#999;">（暂无审批记录）</td></tr>`
  }

  // 收集所有审批意见文本用于备注
  const allComments = commentEntries.map(c => c.text).filter(Boolean)
  const remarkText = allComments.length > 0 ? allComments.join('；') : ''

  const buildRow = (r: any) => {
    const matchComment = commentEntries.find((c: any) => c.name === r.name)
    const actionText = r.action === '批准' ? '✓ 批准' : r.action === '拒绝' ? '✗ 拒绝' : r.action
    return `<tr><td style="padding:6px 10px;border:1px solid #000;">${r.name}</td><td colspan="${resultColspan}" style="padding:6px 10px;border:1px solid #000;">${actionText}</td><td colspan="${commentColspan}" style="padding:6px 10px;border:1px solid #000;">${matchComment ? matchComment.text : ''}</td></tr>`
  }

  const headerRow = (label: string) =>
    `<tr class="approve-header"><td>${label}</td><td colspan="${resultColspan}" style="padding:6px 10px;border:1px solid #000;background:#eaeaea;font-weight:bold;text-align:center;">审批结果</td><td colspan="${commentColspan}" style="padding:6px 10px;border:1px solid #000;background:#eaeaea;font-weight:bold;text-align:center;">审批意见</td></tr>`

  let html = ''
  if (resultEntries.length > 1) {
    // 多审批人: 第一位显示"部门审批人"表头
    html += headerRow('部门审批人')
    html += buildRow(resultEntries[0])
    // 其余显示"审批人"表头
    html += headerRow('审批人')
    for (let i = 1; i < resultEntries.length; i++) {
      html += buildRow(resultEntries[i])
    }
  } else {
    // 单个审批人: 显示"审批人"表头
    html += headerRow('审批人')
    html += buildRow(resultEntries[0])
  }
  // 备注行
  html += `<tr><td style="padding:6px 10px;border:1px solid #000;font-weight:bold;background:#f5f5f5;">备注</td><td colspan="${totalCols - 1}" style="padding:6px 10px;border:1px solid #000;">${remarkText}</td></tr>`
  return html
}

export const exportBusinessTripFormHTML = (row: any, department?: string) => {
  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }
  const applicant = row.applicant || ''
  const destination = row.destination || ''
  const tripType = row.tripType || ''
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
  const approveRows = buildApproveRows(row, 2, 1)

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
  ${approveRows}
  <tr>
    <td class="label">部门意见</td>
    <td colspan="3" style="min-height:30px;">　</td>
  </tr>
  <tr>
    <td class="label">负责人意见</td>
    <td colspan="3" style="min-height:30px;">　</td>
  </tr>
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

export const exportEntertainmentFormHTML = (row: any, department?: string) => {
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
  const approveRows = buildApproveRows(row, 2, 1)
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
  <tr class="approve-header">
    <td>审批人</td>
    <td colspan="2">审批结果</td>
    <td>审批意见</td>
  </tr>
  ${approveRows}
  <tr>
    <td class="label">部门负责人签字</td>
    <td colspan="3" style="height:36px;">　</td>
  </tr>
  <tr>
    <td class="label">财务负责人签字</td>
    <td colspan="3" style="height:36px;">　</td>
  </tr>
  <tr>
    <td class="label">总经理签字</td>
    <td colspan="3" style="height:36px;">　</td>
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

export const exportReimbursementFormHTML = (row: any, department?: string) => {
  const formatDateCN = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }
  const formatDateShort = (d: any) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  const reimburseType = row.reimburseType || ''
  const reason = row.reason || ''
  const amount = row.amount || ''
  const reimburseDate = formatDateCN(row.reimburseDate)
  const reimburseDateShort = formatDateShort(row.reimburseDate)
  const approver = row.approver || ''
  const comment = row.comment || ''

  const isTravel = /差旅|出差/.test(reimburseType)
  const title = isTravel ? '差 旅 费 报 销 单' : '报 销 单'

  const approveRows = buildApproveRows(row, 2, 2)

  const travelDetailsTable = isTravel ? `
  <tr>
    <td colspan="5" style="padding:8px 10px;border:1px solid #000;font-weight:bold;background:#f5f5f5;">报 销 明 细</td>
  </tr>
  <tr style="background:#fafafa;">
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;font-weight:bold;width:15%;">日　期</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;font-weight:bold;width:18%;">起　点</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;font-weight:bold;width:18%;">终　点</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;font-weight:bold;width:33%;">交通费 / 住宿费 / 其他费用</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;font-weight:bold;width:16%;">合　计</td>
  </tr>
  <tr>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;">${reimburseDateShort || '　'}</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:right;">　</td>
  </tr>
  <tr>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:right;">　</td>
  </tr>
  <tr>
    <td style="padding:6px 10px;border:1px solid #000;text-align:center;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;">　</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:right;">　</td>
  </tr>
  <tr>
    <td colspan="4" style="padding:6px 10px;border:1px solid #000;text-align:right;font-weight:bold;background:#fafafa;">合　计　金　额</td>
    <td style="padding:6px 10px;border:1px solid #000;text-align:right;font-weight:bold;font-size:15px;color:#c00;">¥ ${amount}</td>
  </tr>` : `
  <tr>
    <td class="label">报销金额</td>
    <td colspan="4" style="padding:8px 10px;border:1px solid #000;font-size:16px;font-weight:bold;color:#c00;">¥ ${amount}</td>
  </tr>`

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title} #${row.id}</title>
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
  .reason-cell { min-height: 80px; line-height: 1.8; padding: 12px 10px; }
  .approve-header td { background: #eaeaea; font-weight: bold; text-align: center; padding: 6px 10px; }
  .print-hint { text-align: center; margin-top: 10px; font-size: 11px; color: #aaa; }
  @media print {
    .print-hint { display: none; }
    body { padding: 0; }
    .form-wrap { margin: 0 auto; }
  }
</style>
</head>
<body>
<div class="form-wrap">
<table>
  <tr><td colspan="5" class="company-cell">内蒙古宏友软件技术服务有限公司</td></tr>
  <tr><td colspan="5" class="title-cell">${title}</td></tr>
  <tr>
    <td class="label">单据编号</td>
    <td colspan="2">#${row.id || ''}</td>
    <td class="label">报销日期</td>
    <td>${reimburseDate || '　'}</td>
  </tr>
  <tr>
    <td class="label">报销人</td>
    <td colspan="2">${row.applicant || ''}</td>
    <td class="label">部　门</td>
    <td>${department || ''}</td>
  </tr>
  <tr>
    <td class="label">报销类型</td>
    <td colspan="4">${reimburseType || ''}</td>
  </tr>
  <tr>
    <td class="label">报销事由</td>
    <td colspan="4" class="reason-cell">${reason || '（未填写）'}</td>
  </tr>
  ${travelDetailsTable}
  ${approveRows}
  <tr>
    <td class="label">申请人签字</td>
    <td colspan="2" style="height:40px;">　</td>
    <td class="label">日　期</td>
    <td>　</td>
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
    w.document.title = `${title}_${row.applicant}_${reimburseDateShort}`
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

  const typeList = ['病假', '事假', '年假', '婚假', '产假', '丧假', '其他']

  const approveRows = buildApproveRows(row, 1, 2)

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>请假申请单 #${row.id}</title>
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "宋体", serif; color: #333; font-size: 14px; }
  .form-wrap { max-width: 750px; margin: 20px auto; border: 2px solid #000; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #000; padding: 8px 10px; vertical-align: middle; }
  .title-cell { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 6px; padding: 14px; }
  .company-cell { text-align: center; font-size: 12px; color: #666; padding: 4px; letter-spacing: 2px; border-bottom: none; }
  .label { font-weight: bold; white-space: nowrap; width: 90px; background: #f9f9f9; }
  .chk { display: inline-block; margin-right: 12px; }
  .chk-box { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; margin-right: 3px; vertical-align: middle; text-align: center; line-height: 14px; font-size: 12px; }
  .chk-on .chk-box { background: #333; color: #fff; }
  .chk-on .chk-box::after { content: "✓"; }
  .reason-cell { min-height: 60px; line-height: 1.6; }
  .print-hint { text-align: center; margin-top: 10px; font-size: 11px; color: #aaa; }
  .approve-header td { background: #f5f5f5; font-weight: bold; text-align: center; padding: 6px 10px; border: 1px solid #000; }
  @media print { .print-hint { display: none; } body { padding: 0; } .form-wrap { margin: 0 auto; } }
</style>
</head>
<body>
<div class="form-wrap">
<table>
  <tr><td colspan="4" class="company-cell">内蒙古宏友软件技术服务有限公司</td></tr>
  <tr><td colspan="4" class="title-cell">请 假 申 请 单<br/><span style="font-size:13px;font-weight:normal;letter-spacing:1px;color:#666;">${formatDateCN(startDate) || ''}</span></td></tr>
  <tr>
    <td class="label">申请人</td>
    <td>${row.applicant || ''}</td>
    <td class="label">部　门</td>
    <td>${department || ''}</td>
  </tr>
  <tr>
    <td class="label">请假类型</td>
    <td colspan="3">${typeList.map(t => `<span class="chk ${t === leaveType ? 'chk-on' : ''}"><span class="chk-box"></span>${t}</span>`).join('')}</td>
  </tr>
  <tr>
    <td class="label">请假时间</td>
    <td colspan="3">
      自 ${yearS ? yearS + '年' : '____年'}${monthS ? monthS + '月' : '__月'}${dayS ? dayS + '日' : '__日'}
      至 ${yearE ? yearE + '年' : '____年'}${monthE ? monthE + '月' : '__月'}${dayE ? dayE + '日' : '__日'}
      ，共 <strong>${days}</strong> 天
    </td>
  </tr>
  <tr>
    <td class="label">请假原因</td>
    <td colspan="3" class="reason-cell">${reason || '（未填写）'}</td>
  </tr>
  ${approveRows}
</table>
</div>
<div class="print-hint">按 Ctrl+P 可导出为 PDF 打印</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) {
    w.document.title = `请假申请单_${row.applicant}_${formatDateCN(startDate)}`
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `请假申请单_${row.id}.html`
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
