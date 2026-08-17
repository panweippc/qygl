import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/styles/variables.css'
import App from './App.vue'
import router from './router'
import { initSocket } from './services/socket'
import { startIdleDetector } from './utils/idle-detector'

// 全局 fetch 包装：自动为 /api 请求携带 JWT token（覆盖散落在各组件中的原生 fetch 调用）
if (!(window as any).__qygl_fetch_wrapped__) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem('token')
    if (token) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.startsWith('/api')) {
        const headers = new Headers(init?.headers)
        headers.set('Authorization', `Bearer ${token}`)
        return originalFetch(input, { ...init, headers })
      }
    }
    return originalFetch(input, init)
  }
  ;(window as any).__qygl_fetch_wrapped__ = true
}

// ===== 前端错误信息脱敏（生产环境）=====
// 目标：避免 console 输出泄露敏感信息（token、完整接口地址、内部错误详情）
const isProd = import.meta.env.PROD
if (isProd) {
  // 生产环境屏蔽低级别调试日志（console.log/info/debug）
  // 保留 error/warn（便于排查），但对其内容做脱敏
  const noop = () => {}
  // 仅当尚未脱敏时执行
  if (!(window as any).__qygl_security_console__) {
    ;(window as any).__qygl_security_console__ = true
    // 屏蔽 debug/info/log（生产不输出调试信息，减少信息暴露）
    console.debug = noop
    console.info = noop

    // 脱敏函数：隐藏 token、敏感路径中的令牌、内部错误细节
    const sanitize = (args: any[]) =>
      args.map(a => {
        try {
          if (typeof a === 'string') {
            return a
              .replace(/([Bb]earer\s+)[A-Za-z0-9._-]+/g, '$1***')      // 隐藏 token
              .replace(/(token[=:]\s*)[A-Za-z0-9._-]+/g, '$1***')      // 隐藏 token 参数
              .replace(/(\w+@)/g, '$1***')                               // 邮箱局部脱敏
              .replace(/\bhttps?:\/\/[^\s"']+/g, (u) => {              // 隐藏完整 URL 中的查询串
                try { const url = new URL(u); url.search = ''; return url.toString(); } catch { return '/api/***'; }
              })
          }
          if (a instanceof Error) {
            // 错误对象：只保留 message，隐藏 stack
            return new Error(`[脱敏] ${a.message}`)
          }
        } catch (e) { /* 忽略 */ }
        return a
      })

    const origError = console.error.bind(console)
    console.error = (...args: any[]) => origError(...sanitize(args))
  }
}

// 启动应用
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')

// 应用启动时若已有 token（如刷新页面），建立 Socket 连接以维持单设备登录
const hasToken = !!localStorage.getItem('token')
if (hasToken) {
  initSocket()
  // E8: 会话空闲超时自动登出（已登录才启用）
  startIdleDetector()
}
