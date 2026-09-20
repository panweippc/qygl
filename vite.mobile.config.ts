import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 移动端独立构建配置（与 PC 端 index.html 解耦，产物输出到 dist_mobile）
// 复用同一套 src/services/api.ts 与权限逻辑，仅 UI 层为移动专属。
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'mobile-index-fallback',
      configureServer(server) {
        // dev 模式下，所有「非资源、非 vite 内部请求」都回落到移动端入口 index.mobile.html。
        // 否则移动路由（/login、/todo、/mine）会回落到 PC 的 index.html，导致移动 app 错乱、点击无响应。
        server.middlewares.use((req, res, next) => {
          const raw = req.url || ''
          const url = raw.split('?')[0]
          // 代理路径（API / 上传 / socket）直接放行，交给 vite proxy 转发到后端 3005，
          // 否则会被下面改写成 index.mobile.html，导致 /api 请求落到前端而非后端。
          if (url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/socket.io')) {
            return next()
          }
          const isViteInternal =
            url.startsWith('/@') ||
            url.startsWith('/node_modules') ||
            url.startsWith('/__') ||
            url.startsWith('/@vite')
          const hasExt = /\.[a-zA-Z0-9]+$/.test(url)
          if (!isViteInternal && !hasExt && url !== '/index.mobile.html') {
            req.url = '/index.mobile.html'
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false)
  },
  server: {
    host: '0.0.0.0',
    port: 3004,
    proxy: {
      '/api': { target: 'http://localhost:3005', changeOrigin: true, secure: false },
      '/uploads': { target: 'http://localhost:3005', changeOrigin: true, secure: false },
      '/socket.io': { target: 'http://localhost:3005', changeOrigin: false, secure: false, ws: true }
    }
  },
  build: {
    outDir: 'dist_mobile',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.mobile.html')
    }
  }
})
