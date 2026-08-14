/**
 * 会话空闲超时检测
 * 用户长时间无操作（鼠标/键盘/触摸）时，自动登出，防止公共电脑上他人使用。
 * 默认空闲阈值 30 分钟。
 */
import { disconnectSocket } from '../services/socket'

let lastActivity = Date.now()
let timer: number | null = null
let enabled = false

const DEFAULT_TIMEOUT = 30 * 60 * 1000 // 30 分钟

const onActivity = () => {
  lastActivity = Date.now()
}

function checkIdle() {
  const now = Date.now()
  if (now - lastActivity >= DEFAULT_TIMEOUT) {
    // 空闲超时，自动登出
    stopIdleDetector()
    disconnectSocket()
    localStorage.clear()
    // 跳转登录页（带原因提示）
    const params = new URLSearchParams(window.location.search)
    params.set('reason', 'idle')
    window.location.href = '/login?reason=idle'
  }
}

/** 启用空闲检测 */
export function startIdleDetector(timeout = DEFAULT_TIMEOUT): void {
  if (enabled) return
  enabled = true
  lastActivity = Date.now()
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
  events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
  timer = window.setInterval(checkIdle, 60 * 1000) // 每分钟检查一次
}

/** 停止空闲检测（退出登录时） */
export function stopIdleDetector(): void {
  if (!enabled) return
  enabled = false
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
  events.forEach(ev => window.removeEventListener(ev, onActivity))
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
