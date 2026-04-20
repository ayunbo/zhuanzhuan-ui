import { AUTH_STORAGE_KEYS } from '@/constants/auth'

const CURRENT_AUTH_STORAGE_KEYS = {
  token: 'zhuanzhuan-user-token',
  user: 'zhuanzhuan-user-info',
}

function readStorageValue(...keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) {
      return value
    }
  }

  return ''
}

function safeParseUser(rawUser) {
  if (!rawUser) {
    return null
  }

  try {
    const parsed = JSON.parse(rawUser)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

export function getStoredToken() {
  return readStorageValue(CURRENT_AUTH_STORAGE_KEYS.token, AUTH_STORAGE_KEYS.token)
}

export function getStoredUser() {
  return safeParseUser(readStorageValue(CURRENT_AUTH_STORAGE_KEYS.user, AUTH_STORAGE_KEYS.user))
}

export function setStoredAuth(loginInfo) {
  if (!loginInfo?.token) {
    clearStoredAuth()
    return
  }

  const normalizedUser = {
    id: loginInfo.id ?? null,
    studentNo: loginInfo.studentNo ?? '',
    name: loginInfo.name ?? '',
    role: loginInfo.role ?? null,
    avatar: loginInfo.avatar ?? '',
  }

  const userPayload = JSON.stringify(normalizedUser)

  localStorage.setItem(CURRENT_AUTH_STORAGE_KEYS.token, loginInfo.token)
  localStorage.setItem(CURRENT_AUTH_STORAGE_KEYS.user, userPayload)
  localStorage.setItem(AUTH_STORAGE_KEYS.token, loginInfo.token)
  localStorage.setItem(AUTH_STORAGE_KEYS.user, userPayload)
}

export function clearStoredAuth() {
  localStorage.removeItem(CURRENT_AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(CURRENT_AUTH_STORAGE_KEYS.user)
  localStorage.removeItem(AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(AUTH_STORAGE_KEYS.user)
}
