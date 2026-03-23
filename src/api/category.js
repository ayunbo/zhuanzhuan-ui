import request from '@/utils/request'

export function fetchCategoryTree() {
  return request({
    url: '/user/category/tree',
    method: 'get',
  })
}
