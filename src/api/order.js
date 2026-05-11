import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '订单请求失败')
  }

  return payload
}

function orderRequest(config) {
  return request(config).then(unwrapResponse)
}

export function getGoodsById(id) {
  return orderRequest({
    url: `/user/goods/${id}`,
    method: 'get',
  })
}

export function submitOrder(data) {
  return orderRequest({
    url: '/user/order/submit',
    method: 'post',
    data,
  })
}

export function getOrderPage(params) {
  return orderRequest({
    url: '/user/order/page',
    method: 'get',
    params,
  })
}

export function getOrderDetail(id) {
  return orderRequest({
    url: `/user/order/detail/${id}`,
    method: 'get',
  })
}

export function cancelOrder(id) {
  return orderRequest({
    url: `/user/order/cancel/${id}`,
    method: 'post',
  })
}

export function completeOrder(id) {
  return orderRequest({
    url: `/user/order/complete/${id}`,
    method: 'post',
  })
}

export function mockPay(data) {
  return orderRequest({
    url: '/user/pay/mock',
    method: 'post',
    data,
  })
}
