import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'fallback-system',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || ''
          if (url === '/system' || url.startsWith('/system?')) {
            const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
            return
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
  server: {
    host: '0.0.0.0',
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    rollupOptions: {
      external: ['mysql2', 'mysql2/promise', 'node:buffer']
    }
  }
})
