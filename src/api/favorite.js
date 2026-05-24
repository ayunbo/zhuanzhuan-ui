import request from '@/utils/request'

export function collectGoods(goodsId) {
  return request({
    url: `/user/favorites/${goodsId}`,
    method: 'post',
  })
}

export function cancelCollectGoods(goodsId) {
  return request({
    url: `/user/favorites/${goodsId}`,
    method: 'delete',
  })
}

export function fetchFavoriteStatus(goodsId) {
  return request({
    url: `/user/favorites/${goodsId}/status`,
    method: 'get',
  })
}

export function fetchFavoritePage(params) {
  return request({
    url: '/user/favorites/page',
    method: 'get',
    params,
  })
}
