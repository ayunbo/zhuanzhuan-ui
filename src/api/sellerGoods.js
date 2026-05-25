import request from '@/utils/request'

export function createGoodsDraft(data) {
  return request({
    url: '/user/seller/goods',
    method: 'post',
    data,
  })
}

export function updateGoodsDraft(id, data) {
  return request({
    url: `/user/seller/goods/${id}`,
    method: 'put',
    data,
  })
}

export function submitGoodsAudit(id) {
  return request({
    url: `/user/seller/goods/${id}/submit`,
    method: 'put',
  })
}

export function onShelfGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/on-shelf`,
    method: 'put',
  })
}

export function offShelfGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/off-shelf`,
    method: 'put',
  })
}

export function getSellerGoodsPage(params) {
  return request({
    url: '/user/seller/goods/page',
    method: 'get',
    params,
  })
}
