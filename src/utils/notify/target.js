export function resolveNoticeTargetRoute(notice) {
  const targetPage = String(notice?.targetPage || '').trim()
  const targetId = notice?.targetId ?? notice?.bizId ?? null

  switch (targetPage) {
    case 'sellerAuth':
      return { path: '/user/security' }
    case 'chat':
      return targetId
        ? { path: '/chat', query: { sessionId: String(targetId) } }
        : null
    case 'order':
      return targetId ? { path: `/order/detail/${targetId}` } : { path: '/user/bought' }
    case 'goodsAudit':
      return { path: '/user/published' }
    case 'report':
      return { path: '/user/reports' }
    default:
      return null
  }
}

export function getNoticeActionText(notice) {
  return notice?.targetPage ? '查看' : ''
}
