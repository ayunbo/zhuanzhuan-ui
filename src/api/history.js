import request from '@/utils/request'

export function recordBrowseHistory(goodsId) {
  return request({
    url: `/user/history/${goodsId}`,
    method: 'post',
  })
}

export function fetchBrowseHistoryArchive(params) {
  return request({
    url: '/user/history/archive',
    method: 'get',
    params,
  })
}

export function deleteBrowseHistory(historyId) {
  return request({
    url: `/user/history/${historyId}`,
    method: 'delete',
  })
}

export function clearBrowseHistory() {
  return request({
    url: '/user/history/clear',
    method: 'delete',
  })
}
