import { io, Socket } from 'socket.io-client'

// 全局 Socket.IO 单例
let socket: Socket | null = null

/**
 * 建立 Socket.IO 连接（多端共存：按设备类型维度）
 * - 携带当前 token 连接，后端校验 token 后建立
 * - 监听 kickedOut 事件：同类型设备（pc/pc 或 mobile/mobile）在其他地方登录时，本设备被强制下线
 * 说明：socket 仅用于实时通知与在线状态；PC 与手机为不同设备类型，可同时在线。
 * 连接地址使用页面同源（window.location.origin），由前端 nginx 反代 /socket.io，
 * 避免 HTTPS 页面下直连 http://:3005 产生的混合内容（mixed content）拦截。
 */
// 设备类型：优先读入口显式声明（移动端入口会置 window.__APP_DEVICE__='mobile'），否则按 UA 推断
function resolveDeviceType(): string {
  if ((window as any).__APP_DEVICE__) return (window as any).__APP_DEVICE__
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'pc'
}

export function initSocket(): Socket | null {
  const token = localStorage.getItem('token')
  if (!token) return null

  // 已存在连接则复用
  if (socket && socket.connected) return socket

  // 连接地址：
  // - 开发环境（vite dev 3003 / 3004）直连后端 3005，避免 vite proxy 改写 Origin 导致 socket.io CORS 拒绝握手
  // - 生产环境走页面同源，由 nginx 反代 /socket.io 到后端 3005（支持 HTTPS）
  const isDev = /^(http|https):\/\/(localhost|127\.0\.0\.1):(3003|3004)$/.test(window.location.origin)
  const endpoint = isDev ? 'http://localhost:3005' : window.location.origin

  socket = io(endpoint, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000
  })

  socket.on('connect', () => {
    console.log('[socket] 已连接:', socket?.id)
    // 连接建立后，告知后端当前登录用户与设备类型（在线状态 + 按设备维度互踢）
    const username = localStorage.getItem('username')
    const userId = localStorage.getItem('userId')
    const deviceType = resolveDeviceType()
    if (username) {
      socket?.emit('setUserLogin', { username, deviceType })
      if (userId) socket?.emit('setEmployeeId', userId)
    }
  })

  socket.on('connect_error', (err: any) => {
    console.error('[socket] 连接失败:', err?.message || err)
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
