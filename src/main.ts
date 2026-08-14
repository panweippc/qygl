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
