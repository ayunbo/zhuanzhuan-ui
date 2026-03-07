import axios from 'axios'

// 创建一个 axios 实例
const request = axios.create({
  // 这里的 /api 会被 vite.config.js 中的代理拦截，转发到 localhost:8080
  baseURL: '/api',
  timeout: 5000, // 请求超时时间 5 秒
})

export default request
