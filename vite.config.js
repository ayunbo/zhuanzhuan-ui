import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173, // 前端本地启动的端口
    proxy: {
      // 这里的 '/api' 是一个拦截标识。
      // 当你用 Axios 请求以 /api 开头的地址时，就会触发代理
      '/api': {
        target: 'http://localhost:8080', // 你的 Spring Boot 后端真实地址
        changeOrigin: true, // 允许跨域（必须开启）

        // 路径重写：这步非常关键！
        // 如果你的后端接口是 /user/login，前端请求时写的是 /api/user/login
        // 代理服务器会在转发前，把 '/api' 替换成空字符串
        // 最终发送给后端的真实路径就变回了 http://localhost:8080/user/login
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
