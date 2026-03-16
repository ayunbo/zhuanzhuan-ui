import request from '@/utils/request'

export function uploadReviewImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/user/review/upload',
    method: 'post',
    data: formData,
  })
}

export function submitReview(data) {
  return request({
    url: '/user/review/submit',
    method: 'post',
    data,
  })
}

export function getOrderReview(orderId) {
  return request({
    url: `/user/review/order/${orderId}`,
    method: 'get',
  })
}

export function getGoodsReviewPage(goodsId, params) {
  return request({
    url: `/user/review/goods/${goodsId}`,
    method: 'get',
    params,
  })
}
