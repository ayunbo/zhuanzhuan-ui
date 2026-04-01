import request from '@/utils/request'

export function fetchNoticeSessionSummary() {
  return request({
    url: '/user/notice/session/summary',
    method: 'GET',
  })
}

export function fetchNoticeMessageList(params) {
  return request({
    url: '/user/notice/message/list',
    method: 'GET',
    params,
  })
}

export function fetchNoticeUnreadCount() {
  return request({
    url: '/user/notice/unread/count',
    method: 'GET',
  })
}

export function markNoticeRead(data) {
  return request({
    url: '/user/notice/read',
    method: 'PATCH',
    data,
  })
}

export function markAllNoticesRead() {
  return request({
    url: '/user/notice/read-all',
    method: 'POST',
  })
}

export function publishMockNotice(data) {
  return request({
    url: '/user/notice/mock/publish',
    method: 'POST',
    data,
  })
}
