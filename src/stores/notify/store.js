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

function normalizeNoticeMessage(notice) {
  return {
    id: notice?.id ?? null,
    type: notice?.type ?? null,
    title: notice?.title || '系统通知',
    content: notice?.content || '',
    bizType: notice?.bizType ?? null,
    bizId: notice?.bizId ?? null,
    readStatus: normalizeNumber(notice?.readStatus),
    readTime: notice?.readTime || null,
    createTime: notice?.createTime || null,
    actionText: notice?.actionText || '',
    targetPage: notice?.targetPage || '',
    targetId: notice?.targetId ?? null,
  }
}

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    unreadTotal: 0,
    sessionSummary: normalizeSummary(null, 0),
    lastIncomingNotice: null,
    lastUnreadEvent: null,
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
    handleUnreadEvent(payload) {
      this.unreadTotal = normalizeNumber(payload?.totalUnreadCount)
      this.updateSummaryLocal({ unreadCount: this.unreadTotal })
      this.lastUnreadEvent = {
        totalUnreadCount: this.unreadTotal,
        __stamp: Date.now(),
      }
    },
    handleIncomingNotice(notice) {
      const normalizedNotice = normalizeNoticeMessage(notice)
      this.lastIncomingNotice = {
        ...normalizedNotice,
        __stamp: Date.now(),
      }

      this.updateSummaryLocal({
        lastNoticeId: normalizedNotice.id,
        lastTitle: normalizedNotice.title || '系统消息',
        lastMsg: normalizedNotice.content || normalizedNotice.title || '',
        lastTime: normalizedNotice.createTime || new Date().toISOString(),
      })
    },
    decreaseUnreadLocal(delta = 1) {
      const nextUnread = Math.max(0, this.unreadTotal - normalizeNumber(delta))
      this.unreadTotal = nextUnread
      this.updateSummaryLocal({ unreadCount: nextUnread })
    },
    reset() {
      this.unreadTotal = 0
      this.sessionSummary = normalizeSummary(null, 0)
      this.lastIncomingNotice = null
      this.lastUnreadEvent = null
    },
  },
})
