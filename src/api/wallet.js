import request from '@/utils/request'

// 发起虚拟钱包支付，生成本次订单的钱包支付请求
export function launchVirtualWalletPay(orderId) {
  return request({
    url: `/user/pay/virtual-wallet/${orderId}`,
    method: 'post',
  })
}

// 加载钱包页展示信息：钱包余额、银行卡、订单金额等
export function fetchWalletPageInfo(params) {
  return request({
    url: '/wallet/page/info',
    method: 'get',
    params,
  })
}

// 确认虚拟钱包支付
export function confirmVirtualWalletPay(data) {
  return request({
    url: '/wallet/page/confirm',
    method: 'post',
    data,
  })
}

// 查询订单对应的支付状态，便于钱包页手动刷新
export function fetchVirtualWalletPayStatus(orderId) {
  return request({
    url: `/user/pay/status/${orderId}`,
    method: 'get',
  })
}
