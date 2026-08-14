import { io, Socket } from 'socket.io-client'

// 全局 Socket.IO 单例
let socket: Socket | null = null

/**
 * 建立 Socket.IO 连接（单设备登录机制）
 * - 携带当前 token 连接，后端校验 token 后建立
 * - 监听 kickedOut 事件：账号在其他设备登录时，本设备被强制下线
 * 说明：仅 HTTP 层的登录状态通过 JWT 校验；socket 连接用于"单设备"互踢。
 */
export function initSocket(): Socket | null {
  const token = localStorage.getItem('token')
  if (!token) return null

  // 已存在连接则复用
  if (socket && socket.connected) return socket

  const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
  const host = window.location.hostname
  const port = 3005

  socket = io(`${protocol}://${host}:${port}`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000
  })

  socket.on('connect', () => {
    // 连接建立后，告知后端当前登录用户（用于在线状态 + 单设备互踢）
    const username = localStorage.getItem('username')
    const userId = localStorage.getItem('userId')
    if (username) {
      socket?.emit('setUserLogin', username)
      if (userId) socket?.emit('setEmployeeId', userId)
    }
  })

  // 单设备登录：账号在其他设备登录，本设备被踢下线
  socket.on('kickedOut', (data: any) => {
    const msg = data?.message || '您的账号在其他设备登录，您已被强制下线'
    socket?.disconnect()
    socket = null
    // 清理登录态并跳转登录页
    localStorage.clear()
    ElMessageWarning(msg)
    setTimeout(() => {
      window.location.href = '/login'
    }, 1000)
  })

  socket.on('disconnect', () => {
    // 连接断开不清理登录态（可能是网络波动），仅标记
    console.log('[socket] 连接已断开')
  })

  return socket
}

// 简单的 message 提示（避免引入额外依赖循环）
function ElMessageWarning(msg: string) {
  // 动态引入 Element Plus 的 message，避免循环依赖
  import('element-plus').then(({ ElMessage }) => {
    ElMessage.error(msg)
  })
}

/**
 * 重新连接（登录成功后 token 已更新时调用）
 */
export function reinitSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  initSocket()
}

/**
 * 断开连接（退出登录时调用）
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
