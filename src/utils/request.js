import axios from 'axios'

export const AUTH_TOKEN_KEY = 'zhuanzhuan-user-token'
export const AUTH_USER_KEY = 'zhuanzhuan-user-info'
export const OPEN_LOGIN_DIALOG_EVENT = 'zhuanzhuan:open-login-dialog'
export const AUTH_CHANGED_EVENT = 'zhuanzhuan:auth-changed'

export function getToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export function getAuthUser() {
  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openLoginDialog(payload = {}) {
  window.dispatchEvent(
    new CustomEvent(OPEN_LOGIN_DIALOG_EVENT, {
      detail: payload,
    }),
  )
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function setAuthSession(loginData) {
  if (!loginData?.token) {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, loginData.token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(loginData))
  notifyAuthChanged()
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
  notifyAuthChanged()
}

export function isLoggedIn() {
  return Boolean(getToken())
}

export function ensureLoggedIn(payload = {}) {
  if (isLoggedIn()) {
    return true
  }

  openLoginDialog(payload)
  return false
}

const request = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession()
      openLoginDialog({
        reason: 'unauthorized',
      })
    }

    return Promise.reject(error)
  },
)

export default request
