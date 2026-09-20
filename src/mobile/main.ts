import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'
import { initSocket } from '@/services/socket'
import './styles.css'

// 声明本端为移动端，socket 层据此走「设备类型维度」互踢（PC 与手机可同时在线）
;(window as any).__APP_DEVICE__ = 'mobile'

// 全局 fetch 包装：复用 PC 端视图时，其内部原生 fetch /api 请求自动携带 JWT token
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

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')

// 已有 token 则建立 socket（用于实时通知 + 在线状态）
if (localStorage.getItem('token')) {
  initSocket()
}
