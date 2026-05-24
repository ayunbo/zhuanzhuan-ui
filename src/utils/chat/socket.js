import { getStoredToken } from '@/utils/auth'

function trimTrailingSlash(value) {
  return value ? value.replace(/\/$/, '') : ''
}

function resolveSocketBaseUrl() {
  const explicit = trimTrailingSlash(import.meta.env.VITE_CHAT_WS_BASE_URL)
  if (explicit) {
    return explicit
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8080'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:8080`
    : window.location.host

  return `${protocol}//${host}`
}

export function createChatSocket() {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  return new WebSocket(`${resolveSocketBaseUrl()}/ws/chat?token=${encodeURIComponent(token)}`)
}
