import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '通知请求失败')
  }

  return payload
}

function notifyRequest(config) {
  return request(config).then(unwrapResponse)
}

export function fetchNoticeSessionSummary() {
  return notifyRequest({
    url: '/user/notice/session/summary',
    method: 'GET',
  })
}

export function fetchNoticeMessageList(params) {
  return notifyRequest({
    url: '/user/notice/message/list',
    method: 'GET',
    params,
  })
}

export function fetchNoticeUnreadCount() {
  return notifyRequest({
    url: '/user/notice/unread/count',
    method: 'GET',
  })
}

export function markNoticeRead(data) {
  return notifyRequest({
    url: '/user/notice/read',
    method: 'PATCH',
    data,
  })
}

export function markAllNoticesRead() {
  return notifyRequest({
    url: '/user/notice/read-all',
    method: 'POST',
  })
}

export function publishMockNotice(data) {
  return notifyRequest({
    url: '/user/notice/mock/publish',
    method: 'POST',
    data,
  })
}
