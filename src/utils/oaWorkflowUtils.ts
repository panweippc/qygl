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
      '目的地': item.destination,
      '出差类型': item.tripType,
      '出差天数': formatDays(item.days),
      '预估费用': '¥' + item.estimatedCost,
      '提交时间': item.submitDate
    },
    entertainment: {
      '申请人': item.applicant || currentUsername,
      '客户名称': item.guestName,
      '招待人数': item.guestCount + '人',
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

export const exportLeaveFormHTML = (row: any) => {
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
  const approver = row.approver || ''
  const status = row.status || ''
  const resultChain = row.result || ''
  const comment = row.comment || ''

  const statusCN: Record<string, string> = { '审批中': '审批中', '待审批': '待审批', '已批准': '✓ 已批准', '已拒绝': '✗ 已拒绝', '已取消': '已取消', 'approved': '✓ 已批准', 'rejected': '✗ 已拒绝' }

  const resultLines = resultChain
    ? resultChain.split('\n').filter((l: string) => l.trim()).map((l: string) => `<div class="result-line">${l}</div>`).join('')
    : ''

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>请假申请单 #${row.id}</title>
<style>
  @page { margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "宋体", serif; color: #333; padding: 20px; }
  .form-container { max-width: 700px; margin: 0 auto; border: 2px solid #333; padding: 30px 35px; }
  .company-name { text-align: center; font-size: 14px; color: #666; margin-bottom: 4px; letter-spacing: 2px; }
  .form-title { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 4px; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #333; }
  .info-row { display: flex; margin-bottom: 12px; line-height: 1.8; }
  .info-label { width: 100px; font-weight: bold; flex-shrink: 0; }
  .info-value { flex: 1; border-bottom: 1px solid #999; padding: 0 8px; min-height: 28px; }
  .reason-box { border: 1px solid #999; padding: 10px; min-height: 80px; margin-top: 4px; line-height: 1.8; }
  .status-badge { display: inline-block; padding: 4px 16px; border-radius: 3px; font-weight: bold; font-size: 14px; }
  .status-badge.approved { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
  .status-badge.rejected { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
  .status-badge.pending { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
  .section-title { font-size: 15px; font-weight: bold; margin: 20px 0 10px; padding-left: 8px; border-left: 3px solid #333; }
  .result-box { background: #fafafa; border: 1px solid #ddd; padding: 10px; margin-top: 4px; line-height: 1.8; }
  .result-line { padding: 2px 0; }
  .footer-row { display: flex; justify-content: space-between; margin-top: 35px; }
  .sign-line { width: 200px; }
  .sign-line .label { font-size: 12px; color: #999; }
  .sign-line .line { border-bottom: 1px solid #333; height: 28px; margin-top: 2px; }
  .print-hint { text-align: center; margin-top: 20px; font-size: 12px; color: #ccc; }
  @media print { .print-hint { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="form-container">
  <div class="company-name">宏友软件</div>
  <div class="form-title">请 假 申 请 单</div>

  <div class="info-row">
    <span class="info-label">编　　号：</span>
    <span class="info-value">${row.id}</span>
  </div>
  <div class="info-row">
    <span class="info-label">申 请 人：</span>
    <span class="info-value">${row.applicant || ''}</span>
  </div>
  <div class="info-row">
    <span class="info-label">请假类型：</span>
    <span class="info-value">${leaveType}</span>
  </div>
  <div class="info-row">
    <span class="info-label">开始日期：</span>
    <span class="info-value">${formatDateCN(startDate)}</span>
  </div>
  <div class="info-row">
    <span class="info-label">结束日期：</span>
    <span class="info-value">${formatDateCN(endDate)}</span>
  </div>
  <div class="info-row">
    <span class="info-label">请假天数：</span>
    <span class="info-value">${days} 天</span>
  </div>
  <div class="info-row">
    <span class="info-label">审批状态：</span>
    <span class="info-value"><span class="status-badge ${status === '已批准' || status === 'approved' ? 'approved' : status === '已拒绝' || status === 'rejected' ? 'rejected' : 'pending'}">${statusCN[status] || status}</span></span>
  </div>
  <div class="info-row" style="align-items:flex-start;">
    <span class="info-label">请假原因：</span>
    <div class="info-value" style="border:none;padding:0;"><div class="reason-box">${reason || '无'}</div></div>
  </div>

  <div class="section-title">审批记录</div>
  <div class="result-box">
    ${resultLines || '<div style="color:#999">暂无审批记录</div>'}
    ${comment ? '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #ddd"><strong>审批意见：</strong>' + comment + '</div>' : ''}
  </div>

  <div class="section-title">提交信息</div>
  <div class="info-row">
    <span class="info-label">审批人：</span>
    <span class="info-value">${approver || '未指定'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">提交时间：</span>
    <span class="info-value">${row.submitDate || ''}</span>
  </div>

  <div class="footer-row">
    <div class="sign-line">
      <div class="label">申请人签字</div>
      <div class="line"></div>
    </div>
    <div class="sign-line">
      <div class="label">审批人签字</div>
      <div class="line"></div>
    </div>
    <div class="sign-line">
      <div class="label">日期</div>
      <div class="line"></div>
    </div>
  </div>
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
