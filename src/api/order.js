import request from '@/utils/request'

export function getGoodsById(id) {
  return request({
    url: `/user/goods/${id}`,
    method: 'get',
  })
}

export function submitOrder(data) {
  return request({
    url: '/user/order/submit',
    method: 'post',
    data,
  })
}

export function getOrderPage(params) {
  return request({
    url: '/user/order/page',
    method: 'get',
    params,
  })
}

export function getOrderDetail(id) {
  return request({
    url: `/user/order/detail/${id}`,
    method: 'get',
  })
}

export function cancelOrder(id) {
  return request({
    url: `/user/order/cancel/${id}`,
    method: 'post',
  })
}

export function completeOrder(id) {
  return request({
    url: `/user/order/complete/${id}`,
    method: 'post',
  })
}

export function mockPay(data) {
  return request({
    url: '/user/pay/mock',
    method: 'post',
    data,
  })
}
