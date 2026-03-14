import request from '@/utils/request'

export function getGoodsList() {
  return request({
    url: '/user/goods/list',
    method: 'get',
  })
}

export function getGoodsById(id) {
  return request({
    url: `/user/goods/${id}`,
    method: 'get',
  })
}
