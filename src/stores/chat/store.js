import { defineStore } from 'pinia'
import { fetchChatSessionList, fetchChatUnreadCount } from '@/api/chat/service'
import { getStoredToken } from '@/utils/auth'
import { createChatSocket } from '@/utils/chat/socket'

const RECONNECT_DELAY_MS = 3000

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    unreadTotal: 0,
    sessionList: [],
    currentSessionId: null,
    socket: null,
    socketStatus: 'idle',
    socketError: '',
    lastIncomingMessage: null,
    lastReadReceipt: null,
    reconnectTimer: null,
    shouldReconnect: true,
  }),
  getters: {
    socketConnected: (state) => state.socketStatus === 'connected',
    socketConnecting: (state) => state.socketStatus === 'connecting',
  },
  actions: {
    normalizeAndSortSessions(list = []) {
      return [...list].sort((a, b) => {
        if (!a?.lastTime && !b?.lastTime) return 0
        if (!a?.lastTime) return 1
        if (!b?.lastTime) return -1
        return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      })
    },
    clearReconnectTimer() {
      if (!this.reconnectTimer) return
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    },
    async refreshUnreadTotal() {
      const data = await fetchChatUnreadCount()
      this.unreadTotal = normalizeNumber(data?.totalUnreadCount)
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
    handleUnreadEvent(payload) {
      this.unreadTotal = normalizeNumber(payload?.totalUnreadCount)
    },
    handleIncomingMessage(message) {
      const sessionId = Number(message?.sessionId)
      const index = this.sessionList.findIndex((item) => Number(item.sessionId) === sessionId)

      if (index >= 0) {
        const current = this.sessionList[index]
        const isActiveSession = Number(this.currentSessionId) === sessionId
        const nextUnread = isActiveSession || message?.mine
          ? normalizeNumber(current.unreadCount)
          : normalizeNumber(current.unreadCount) + 1

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
    handleReadEvent(payload) {
      this.lastReadReceipt = {
        ...payload,
        __stamp: Date.now(),
      }
    },
    handleSocketMessage(event) {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.event === 'chat.unread') {
          this.handleUnreadEvent(payload.data)
          return
        }

        if (payload?.event === 'chat.message') {
          this.handleIncomingMessage(payload.data)
          return
        }

        if (payload?.event === 'chat.read') {
          this.handleReadEvent(payload.data)
        }
      } catch {
        // Ignore malformed socket messages.
      }
    },
    scheduleReconnect() {
      if (!this.shouldReconnect || !getStoredToken()) return
      if (this.reconnectTimer) return

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connectSocket()
      }, RECONNECT_DELAY_MS)
    },
    connectSocket() {
      if (this.socket || this.socketStatus === 'connecting' || !getStoredToken()) return

      this.shouldReconnect = true
      this.socketStatus = 'connecting'
      this.socketError = ''
      this.clearReconnectTimer()

      const socket = createChatSocket()
      if (!socket) {
        this.socketStatus = 'idle'
        return
      }

      socket.onopen = () => {
        this.socketStatus = 'connected'
        this.socketError = ''
        this.socket = socket
      }

      socket.onmessage = (event) => {
        this.handleSocketMessage(event)
      }

      socket.onerror = () => {
        this.socketError = 'chat-websocket-error'
      }

      socket.onclose = () => {
        if (this.socket === socket) {
          this.socket = null
        }

        this.socketStatus = getStoredToken() && this.shouldReconnect ? 'disconnected' : 'idle'
        this.scheduleReconnect()
      }

      this.socket = socket
    },
    disconnectSocket() {
      this.shouldReconnect = false
      this.clearReconnectTimer()

      if (this.socket) {
        const current = this.socket
        this.socket = null
        current.close()
      }

      this.socketStatus = 'idle'
      this.socketError = ''
    },
    reset() {
      this.unreadTotal = 0
      this.sessionList = []
      this.currentSessionId = null
      this.lastIncomingMessage = null
      this.lastReadReceipt = null
      this.disconnectSocket()
    },
  },
})
