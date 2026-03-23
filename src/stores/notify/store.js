import { defineStore } from 'pinia'
import {
  fetchNoticeSessionSummary,
  fetchNoticeUnreadCount,
} from '@/api/notify/service'

const DEFAULT_SESSION_NAME = '系统通知'

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeSummary(summary, unreadTotal = 0) {
  return {
    sessionKey: summary?.sessionKey || 'system-notice',
    sessionName: summary?.sessionName || DEFAULT_SESSION_NAME,
    lastNoticeId: summary?.lastNoticeId ?? null,
    lastTitle: summary?.lastTitle || '系统消息',
    lastMsg: summary?.lastMsg || '',
    lastTime: summary?.lastTime || null,
    unreadCount: normalizeNumber(summary?.unreadCount ?? unreadTotal),
  }
}

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    unreadTotal: 0,
    sessionSummary: normalizeSummary(null, 0),
  }),
  actions: {
    async refreshUnreadTotal() {
      const data = await fetchNoticeUnreadCount()
      this.unreadTotal = normalizeNumber(data?.totalUnreadCount)
      this.sessionSummary = normalizeSummary(this.sessionSummary, this.unreadTotal)
      return this.unreadTotal
    },
    async refreshSessionSummary() {
      const data = await fetchNoticeSessionSummary()
      this.sessionSummary = normalizeSummary(data, this.unreadTotal)
      this.unreadTotal = normalizeNumber(data?.unreadCount ?? this.unreadTotal)
      this.sessionSummary = normalizeSummary(this.sessionSummary, this.unreadTotal)
      return this.sessionSummary
    },
    updateSummaryLocal(patch = {}) {
      this.sessionSummary = normalizeSummary(
        {
          ...this.sessionSummary,
          ...patch,
        },
        this.unreadTotal,
      )
    },
    decreaseUnreadLocal(delta = 1) {
      const nextUnread = Math.max(0, this.unreadTotal - normalizeNumber(delta))
      this.unreadTotal = nextUnread
      this.updateSummaryLocal({ unreadCount: nextUnread })
    },
    reset() {
      this.unreadTotal = 0
      this.sessionSummary = normalizeSummary(null, 0)
    },
  },
})
