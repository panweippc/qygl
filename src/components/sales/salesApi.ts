/**
 * 销售四表统一请求封装
 * 为所有 fetch 自动补全 Authorization token，避免 401 返回 HTML 导致 JSON 解析失败
 */

function getToken() {
  return localStorage.getItem('token') || ''
}

export function salesFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  // 强制不走浏览器 HTTP 缓存：销售数据变更后立即重新拉取应拿到最新结果
  return fetch(url, { ...options, headers, cache: 'no-store' })
}

export async function salesFetchJSON<T = any>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; message?: string }> {
  const res = await salesFetch(url, options)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch (e: any) {
    // 后端返回 HTML（通常是 401/404）时给出更明确的错误
    if (text.trim().startsWith('<')) {
      throw new Error(`请求 ${url} 返回了 HTML 页面（状态 ${res.status}），请确认接口路径与登录状态`)
    }
    throw new Error(`解析响应失败: ${e.message}`)
  }
}


/**
 * 销售四表 Excel 导出
 * 浏览器支持 showSaveFilePicker 时先让用户选择保存位置/文件名，不支持则降级为默认下载。
 * 文件选择器必须在用户手势上下文中同步发起，所以先选位置再发请求。
 */
export interface SalesExportOptions {
  type: string
  filename: string
  filters?: Record<string, string>
}
export async function exportSalesExcel({ type, filename, filters = {} }: SalesExportOptions): Promise<{ ok: boolean; message?: string }> {
  const finalName = filename.endsWith('.xlsx') ? filename : filename + '.xlsx'
  const qs = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v) })
  const url = `/api/sales-four-tables/${type}/export${qs.toString() ? '?' + qs.toString() : ''}`
  const token = localStorage.getItem('token') || ''

  let writable: any = null
  const picker = (window as any).showSaveFilePicker
  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: finalName,
        types: [{ description: 'Excel 文件', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
      })
      writable = await handle.createWritable()
    } catch (e: any) {
      if (e?.name === 'AbortError') return { ok: false, message: '已取消' }
      writable = null
    }
  }

  try {
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' })
    if (!res.ok) {
      if (writable) { try { await writable.abort() } catch {} }
      return { ok: false, message: `导出失败（状态码 ${res.status}）` }
    }
    const blob = await res.blob()
    if (writable) {
      await writable.write(blob)
      await writable.close()
    } else {
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = finalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    }
    return { ok: true }
  } catch (e: any) {
    if (writable) { try { await writable.abort() } catch {} }
    return { ok: false, message: e.message || '导出失败' }
  }
}
