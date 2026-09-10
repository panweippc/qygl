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
  return fetch(url, { ...options, headers })
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
