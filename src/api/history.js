import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '浏览历史请求失败')
  }

  return payload
}

function historyRequest(config) {
  return request(config).then(unwrapResponse)
}

export function recordBrowseHistory(goodsId) {
  return historyRequest({
    url: `/user/history/${goodsId}`,
    method: 'post',
  })
}

export function fetchBrowseHistoryArchive(params) {
  return historyRequest({
    url: '/user/history/archive',
    method: 'get',
    params,
  })
}

export function deleteBrowseHistory(historyId) {
  return historyRequest({
    url: `/user/history/${historyId}`,
    method: 'delete',
  })
}

export function clearBrowseHistory() {
  return historyRequest({
    url: '/user/history/clear',
    method: 'delete',
  })
}
