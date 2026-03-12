import axios from 'axios'
import { clearStoredAuth, getStoredToken } from '@/utils/auth'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.token = token
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const payload = response.data

    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
      if (payload.code === 1) {
        return payload.data
      }
      return Promise.reject(new Error(payload.msg || '请求失败'))
    }

    return payload
  },
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth()
      return Promise.reject(new Error('未登录或登录已过期，请重新登录'))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }

    if (error.response?.data?.msg) {
      return Promise.reject(new Error(error.response.data.msg))
    }

    if (error instanceof Error) {
      return Promise.reject(error)
    }

    return Promise.reject(new Error('网络请求失败'))
  },
)

export default request
