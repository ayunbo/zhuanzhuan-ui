export const NOTICE_SESSION_KEY = 'system-notice'

function toTimestamp(value) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function isNoticeSessionKey(value) {
  return String(value || '') === NOTICE_SESSION_KEY
}

export function createNoticeVirtualSession(summary, unreadTotal = 0) {
  return {
    sessionId: NOTICE_SESSION_KEY,
    sessionKey: NOTICE_SESSION_KEY,
    sessionType: 'notice',
    targetUserName: summary?.sessionName || '系统通知',
    targetUserAvatar: '',
    goodsTitle: summary?.lastTitle || '系统消息',
    goodsCover: '',
    lastMsg: summary?.lastMsg || '暂无系统通知',
    lastTime: summary?.lastTime || null,
    unreadCount: Number(summary?.unreadCount ?? unreadTotal) || 0,
    lastNoticeId: summary?.lastNoticeId ?? null,
  }
}

export function sortMixedSessionList(list = []) {
  const filtered = list.filter(Boolean)
  const noticeSession = filtered.find(
    (item) => isNoticeSessionKey(item?.sessionId) || isNoticeSessionKey(item?.sessionKey),
  )
  const chatSessions = filtered
    .filter((item) => !(isNoticeSessionKey(item?.sessionId) || isNoticeSessionKey(item?.sessionKey)))
    .sort((a, b) => toTimestamp(b?.lastTime) - toTimestamp(a?.lastTime))

  return noticeSession ? [noticeSession, ...chatSessions] : chatSessions
}
