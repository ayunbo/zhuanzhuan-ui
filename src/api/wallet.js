import request from '@/utils/request'

function unwrapBusinessResponse(response, fallbackMessage) {
  const payload = response?.data
  if (payload?.code !== 1) {
    throw new Error(payload?.msg || fallbackMessage)
  }

  return payload?.data ?? null
}

export async function launchVirtualWalletPay(orderId) {
  const response = await request({
    url: `/user/pay/virtual-wallet/${orderId}`,
    method: 'post',
  })

  return unwrapBusinessResponse(response, '初始化虚拟钱包支付失败')
}

export async function fetchWalletPageInfo(params) {
  const response = await request({
    url: '/wallet/page/info',
    method: 'get',
    params,
  })

  return unwrapBusinessResponse(response, '加载钱包支付信息失败')
}

export async function confirmVirtualWalletPay(data) {
  const response = await request({
    url: '/wallet/page/confirm',
    method: 'post',
    data,
  })

  return unwrapBusinessResponse(response, '虚拟钱包支付失败')
}

export async function fetchVirtualWalletPayStatus(orderId) {
  const response = await request({
    url: `/user/pay/status/${orderId}`,
    method: 'get',
  })

  return unwrapBusinessResponse(response, '查询支付状态失败')
}

export async function fetchWalletOverview() {
  const response = await request({
    url: '/user/wallet/overview',
    method: 'get',
  })

  return unwrapBusinessResponse(response, '加载钱包概览失败')
}

export async function fetchWalletRecords(params) {
  const response = await request({
    url: '/user/wallet/records',
    method: 'get',
    params,
  })

  return unwrapBusinessResponse(response, '加载钱包账单失败')
}

export async function openWalletAccount(data) {
  const response = await request({
    url: '/user/wallet/open',
    method: 'post',
    data,
  })

  return unwrapBusinessResponse(response, '开通钱包失败')
}

export async function bindWalletBankCard(data) {
  const response = await request({
    url: '/user/wallet/bank-card',
    method: 'post',
    data,
  })

  return unwrapBusinessResponse(response, '绑定银行卡失败')
}

export async function setDefaultWalletBankCard(bankCardId) {
  const response = await request({
    url: `/user/wallet/bank-card/default/${bankCardId}`,
    method: 'put',
  })

  return unwrapBusinessResponse(response, '设置默认银行卡失败')
}
