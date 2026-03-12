import request from '@/utils/request'
import { OSS_UPLOAD_CATEGORY } from '@/constants/upload'

/**
 * 买家登录
 */
export function buyerLogin(data) {
  return request({
    url: '/user/login/buyer',
    method: 'POST',
    data,
  })
}

/**
 * 卖家登录
 */
export function sellerLogin(data) {
  return request({
    url: '/user/login/seller',
    method: 'POST',
    data,
  })
}

/**
 * 统一登录逻辑
 * 优先通过买家通道登录，如有报错则自动尝试卖家通道
 */
export async function unifiedLogin(data) {
  try {
    return await buyerLogin(data)
  } catch (err) {
    // 如果买家通道失败，尝试卖家通道（后端可能做了严格区分）
    console.warn('Buyer login failed, trying seller channel...', err)
    return await sellerLogin(data)
  }
}

/**
 * 用户注册
 */
export function registerUser(data) {
  return request({
    url: '/user/register',
    method: 'POST',
    data,
  })
}

/**
 * 查询当前用户资料
 */
export function fetchCurrentUserProfile() {
  return request({
    url: '/user/profile',
    method: 'GET',
  })
}

/**
 * 修改当前用户资料
 */
export function updateCurrentUserProfile(data) {
  return request({
    url: '/user/profile',
    method: 'PUT',
    data,
  })
}

/**
 * 注销当前用户
 */
export function deleteCurrentUserProfile() {
  return request({
    url: '/user/profile',
    method: 'DELETE',
  })
}

/**
 * 提交卖家认证申请
 */
export function submitSellerAuth(data) {
  return request({
    url: '/user/seller-auth/apply',
    method: 'POST',
    data,
  })
}

/**
 * 获取卖家认证结果
 */
export function fetchSellerAuthResult() {
  return request({
    url: '/user/seller-auth/result',
    method: 'GET',
  })
}

/**
 * 获取卖家门户信息
 */
export function fetchSellerPortal() {
  return request({
    url: '/user/seller-auth/portal',
    method: 'GET',
  })
}

/**
 * 上传文件
 */
export function uploadUserFile(file, category = OSS_UPLOAD_CATEGORY.COMMON) {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/user/upload',
    method: 'POST',
    data: formData,
    params: { category },
  })
}
