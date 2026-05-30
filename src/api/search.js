import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '搜索请求失败')
  }

  return payload
}

function searchRequest(config) {
  return request(config).then(unwrapResponse)
}

export function fetchSearchSuggestions(keyword, limit = 8) {
  return searchRequest({
    url: '/user/search/suggest',
    method: 'get',
    params: { keyword, limit },
  })
}

export function fetchHotSearches(limit = 8) {
  return searchRequest({
    url: '/user/search/hot',
    method: 'get',
    params: { limit },
  })
}

export function fetchSearchHistoryArchive(params) {
  return searchRequest({
    url: '/user/search/history/archive',
    method: 'get',
    params,
  })
}

export function deleteSearchHistory(historyId) {
  return searchRequest({
    url: `/user/search/history/${historyId}`,
    method: 'delete',
  })
}

export function clearSearchHistory() {
  return searchRequest({
    url: '/user/search/history/clear',
    method: 'delete',
  })
}
