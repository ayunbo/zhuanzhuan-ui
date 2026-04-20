import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '聊天请求失败')
  }

  return payload
}

function chatRequest(config) {
  return request(config).then(unwrapResponse)
}

export function initChatSession(data) {
  return chatRequest({
    url: '/user/chat/session/init',
    method: 'POST',
    data,
  })
}

export function fetchChatSessionList() {
  return chatRequest({
    url: '/user/chat/session/list',
    method: 'GET',
  })
}

export function fetchChatMessageList(params) {
  return chatRequest({
    url: '/user/chat/message/list',
    method: 'GET',
    params,
  })
}

export function sendChatMessage(data) {
  return chatRequest({
    url: '/user/chat/message/send',
    method: 'POST',
    data,
  })
}

export function markChatSessionRead(data) {
  return chatRequest({
    url: '/user/chat/session/read',
    method: 'PATCH',
    data,
  })
}

export function fetchChatUnreadCount() {
  return chatRequest({
    url: '/user/chat/unread/count',
    method: 'GET',
  })
}
