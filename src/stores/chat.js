import { defineStore } from 'pinia'
import { fetchChatSessionList, fetchChatUnreadCount } from '@/api/chat'
import { getStoredToken } from '@/utils/auth'

function resolveWsBaseUrl() {
  const explicit = import.meta.env.VITE_CHAT_WS_BASE_URL
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8080'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.hostname}:8080`
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    unreadTotal: 0,
    sessionList: [],
    currentSessionId: null,
    socket: null,
    socketConnected: false,
    lastIncomingMessage: null,
    reconnectTimer: null,
  }),
  actions: {
    normalizeAndSortSessions(list = []) {
      return [...list].sort((a, b) => {
        if (!a?.lastTime && !b?.lastTime) return 0
        if (!a?.lastTime) return 1
        if (!b?.lastTime) return -1
        return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      })
    },
    async refreshUnreadTotal() {
      const data = await fetchChatUnreadCount()
      this.unreadTotal = Number(data?.totalUnreadCount || 0)
      return this.unreadTotal
    },
    async refreshSessionList() {
      const list = await fetchChatSessionList()
      this.sessionList = this.normalizeAndSortSessions(list)
      return this.sessionList
    },
    setCurrentSessionId(sessionId) {
      this.currentSessionId = sessionId ? Number(sessionId) : null
    },
    updateSessionLocal(sessionId, patch) {
      const id = Number(sessionId)
      const index = this.sessionList.findIndex((item) => Number(item.sessionId) === id)
      if (index === -1) return
      this.sessionList[index] = {
        ...this.sessionList[index],
        ...patch,
      }
      this.sessionList = this.normalizeAndSortSessions(this.sessionList)
    },
    handleIncomingMessage(message) {
      const sessionId = Number(message?.sessionId)
      const index = this.sessionList.findIndex((item) => Number(item.sessionId) === sessionId)
      if (index >= 0) {
        const current = this.sessionList[index]
        const nextUnread =
          Number(this.currentSessionId) === sessionId || message?.mine
            ? Number(current.unreadCount || 0)
            : Number(current.unreadCount || 0) + 1
        this.sessionList[index] = {
          ...current,
          lastMsg: message?.content ?? current.lastMsg,
          lastTime: message?.createTime ?? current.lastTime,
          unreadCount: nextUnread,
        }
        this.sessionList = this.normalizeAndSortSessions(this.sessionList)
      } else {
        this.refreshSessionList().catch(() => {})
      }

      this.lastIncomingMessage = {
        ...message,
        __stamp: Date.now(),
      }
    },
    connectSocket() {
      if (this.socket || !getStoredToken()) return

      const token = encodeURIComponent(getStoredToken())
      const wsUrl = `${resolveWsBaseUrl()}/ws/chat?token=${token}`
      const socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        this.socketConnected = true
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          const eventName = payload?.event
          const data = payload?.data

          if (eventName === 'chat.unread') {
            this.unreadTotal = Number(data?.totalUnreadCount || 0)
            return
          }

          if (eventName === 'chat.message') {
            this.handleIncomingMessage(data)
          }
        } catch {
          // Ignore non-JSON message
        }
      }

      socket.onclose = () => {
        this.socket = null
        this.socketConnected = false
        if (getStoredToken()) {
          this.reconnectTimer = setTimeout(() => {
            this.connectSocket()
          }, 3000)
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      this.socket = socket
    },
    disconnectSocket() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
      this.socketConnected = false
    },
    reset() {
      this.unreadTotal = 0
      this.sessionList = []
      this.currentSessionId = null
      this.lastIncomingMessage = null
      this.disconnectSocket()
    },
  },
})
