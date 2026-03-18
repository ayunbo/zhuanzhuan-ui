import request from '@/utils/request'

export function initChatSession(data) {
  return request({
    url: '/user/chat/session/init',
    method: 'POST',
    data,
  })
}

export function fetchChatSessionList() {
  return request({
    url: '/user/chat/session/list',
    method: 'GET',
  })
}

export function fetchChatMessageList(params) {
  return request({
    url: '/user/chat/message/list',
    method: 'GET',
    params,
  })
}

export function sendChatMessage(data) {
  return request({
    url: '/user/chat/message/send',
    method: 'POST',
    data,
  })
}

export function markChatSessionRead(data) {
  return request({
    url: '/user/chat/session/read',
    method: 'PATCH',
    data,
  })
}

export function fetchChatUnreadCount() {
  return request({
    url: '/user/chat/unread/count',
    method: 'GET',
  })
}
