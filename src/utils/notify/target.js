export function resolveNoticeTargetRoute(notice) {
  const targetPage = String(notice?.targetPage || '').trim()
  const targetId = notice?.targetId ?? notice?.bizId ?? null

  switch (targetPage) {
    case 'sellerAuth':
      return { path: '/seller-auth' }
    case 'chat':
      return targetId
        ? { path: '/chat', query: { sessionId: String(targetId) } }
        : null
    case 'order':
    case 'goodsAudit':
    case 'report':
    default:
      return null
  }
}

export function getNoticeActionText(notice) {
  return notice?.targetPage ? '查看' : ''
}
