import request from '@/utils/request'

function unwrapResponse(response) {
  const payload = response?.data ?? response

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (Number(payload.code) === 1) {
      return payload.data
    }

    throw new Error(payload.msg || payload.message || '评价请求失败')
  }

  return payload
}

function reviewRequest(config) {
  return request(config).then(unwrapResponse)
}

export function uploadReviewImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  return reviewRequest({
    url: '/user/review/upload',
    method: 'post',
    data: formData,
  })
}

export function submitReview(data) {
  return reviewRequest({
    url: '/user/review/submit',
    method: 'post',
    data,
  })
}

export function getOrderReview(orderId) {
  return reviewRequest({
    url: `/user/review/order/${orderId}`,
    method: 'get',
  })
}

export function getGoodsReviewPage(goodsId, params) {
  return reviewRequest({
    url: `/user/review/goods/${goodsId}`,
    method: 'get',
    params,
  })
}

export function getSellerReviewPage(sellerId, params) {
  return reviewRequest({
    url: `/user/review/seller/${sellerId}`,
    method: 'get',
    params,
  })
}
