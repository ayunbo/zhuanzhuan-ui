import request from '@/utils/request'

export function fetchPublicGoodsPage(params) {
  return request({
    url: '/user/goods/page',
    method: 'get',
    params,
  })
}

export function fetchPublicGoodsById(id) {
  return request({
    url: `/user/goods/${id}`,
    method: 'get',
  })
}

export function fetchSellerSpace(sellerId) {
  return request({
    url: `/user/goods/seller/${sellerId}`,
    method: 'get',
  })
}

export function fetchSellerGoodsPage(params) {
  return request({
    url: '/user/seller/goods/page',
    method: 'get',
    params,
  })
}

export function fetchSellerGoodsById(id) {
  return request({
    url: `/user/seller/goods/${id}`,
    method: 'get',
  })
}

export function createSellerGoods(data) {
  return request({
    url: '/user/seller/goods',
    method: 'post',
    data,
  })
}

export function updateSellerGoods(id, data) {
  return request({
    url: `/user/seller/goods/${id}`,
    method: 'put',
    data,
  })
}

export function submitSellerGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/submit`,
    method: 'put',
  })
}

export function onShelfSellerGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/on-shelf`,
    method: 'put',
  })
}

export function offShelfSellerGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/off-shelf`,
    method: 'put',
  })
}

export function markSoldSellerGoods(id) {
  return request({
    url: `/user/seller/goods/${id}/sold`,
    method: 'put',
  })
}

export function deleteSellerGoods(id) {
  return request({
    url: `/user/seller/goods/${id}`,
    method: 'delete',
  })
}
