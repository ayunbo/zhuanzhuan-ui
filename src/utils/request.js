import axios from 'axios'

export const AUTH_TOKEN_KEY = 'zhuanzhuan-user-token'
export const AUTH_USER_KEY = 'zhuanzhuan-user-info'
export const OPEN_LOGIN_DIALOG_EVENT = 'zhuanzhuan:open-login-dialog'
export const AUTH_CHANGED_EVENT = 'zhuanzhuan:auth-changed'

let unauthorizedDialogOpened = false

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

export function setAuthSession(loginData, options = {}) {
  if (!loginData?.token) {
    return
  }

  const { notify = true } = options

  unauthorizedDialogOpened = false
  window.localStorage.setItem(AUTH_TOKEN_KEY, loginData.token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(loginData))

  if (notify) {
    notifyAuthChanged()
  }
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

function isAuthFailureMessage(message = '') {
  return /未登录|未登入|登录已过期|登入已过期|token|令牌|认证失败|请先登录/i.test(message)
}

function handleUnauthorized(payload = {}) {
  clearAuthSession()

  if (payload.openDialog === false) {
    return
  }

  if (unauthorizedDialogOpened) {
    return
  }

  unauthorizedDialogOpened = true
  openLoginDialog({
    reason: 'unauthorized',
    ...payload,
  })
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
  (response) => {
    const message = response?.data?.msg || ''
    if (response?.data?.code === 0 && isAuthFailureMessage(message) && getToken()) {
      handleUnauthorized({
        responseMessage: message,
        openDialog: response.config?.skipAuthRedirect ? false : true,
      })
    }

    return response
  },
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      handleUnauthorized({
        openDialog: error.config?.skipAuthRedirect ? false : true,
      })
    }

    return Promise.reject(error)
  },
)

export async function validateAuthSession(options = {}) {
  const { openDialogOnFail = false } = options
  const token = getToken()

  if (!token) {
    return false
  }

  try {
    const { data } = await request.get('/user/profile', {
      skipAuthRedirect: !openDialogOnFail,
    })

    if (data?.code !== 1 || !data?.data) {
      if (isAuthFailureMessage(data?.msg || '')) {
        handleUnauthorized({
          responseMessage: data?.msg || '',
          openDialog: openDialogOnFail,
        })
        return false
      }

      return false
    }

    const existing = getAuthUser() || {}
    setAuthSession(
      {
        ...existing,
        token,
        studentNo: data.data.studentNo ?? existing.studentNo ?? '',
        name: data.data.name ?? data.data.studentNo ?? existing.name ?? '',
        avatar: data.data.avatar ?? existing.avatar ?? '',
      },
      { notify: false },
    )

    return true
  } catch {
    return false
  }
}

export default request
