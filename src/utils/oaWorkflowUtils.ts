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

export const getDetailFields = (item: any, type: string, currentUsername: string) => {
  const fields: Record<string, Record<string, string>> = {
    leave: {
      '申请人': item.applicant || currentUsername,
      '请假类型': item.leaveType,
      '开始日期': item.startDate,
      '结束日期': item.endDate,
      '请假天数': item.days + '天',
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
      '出差天数': item.days + '天',
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
