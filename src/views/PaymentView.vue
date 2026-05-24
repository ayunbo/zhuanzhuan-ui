<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CreditCard,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  TimerReset,
  Wallet,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  confirmVirtualWalletPay,
  fetchVirtualWalletPayStatus,
  fetchWalletPageInfo,
  launchVirtualWalletPay,
} from '@/api/wallet'
import request, { ensureLoggedIn, getAuthUser } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const PAY_STATUS_PENDING = 0
const PAY_STATUS_SUCCESS = 1
const ORDER_STATUS_PENDING_PAY = 0
const ORDER_STATUS_PAID = 1
const ORDER_STATUS_COMPLETED = 2
const ORDER_STATUS_CANCELLED = 3
const ORDER_STATUS_CLOSED = 4

const loading = ref(false)
const refreshing = ref(false)
const walletLoading = ref(false)
const submitting = ref(false)

const paymentMethod = ref('wallet')
const walletChannel = ref('balance')
const payPassword = ref('')
const selectedBankCardId = ref('')
const countdownMs = ref(0)
const walletError = ref('')
const expiredSyncTriggered = ref(false)

const payStatus = reactive({
  orderId: null,
  payId: null,
  payNo: '',
  requestNo: '',
  method: null,
  payStatus: null,
  orderStatus: null,
  expireTime: '',
  payTime: '',
})

const orderDetail = reactive({
  id: null,
  orderNo: '',
  amount: 0,
  goodsTitle: '',
  goodsCover: '',
})

const walletInfo = reactive({
  orderId: null,
  requestNo: '',
  loginName: '',
  walletUserNo: '',
  walletName: '',
  amount: 0,
  walletBalance: 0,
  bankCards: [],
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

let countdownTimer = null

const currentUser = computed(() => getAuthUser() || {})
const orderId = computed(() => Number(route.params.orderId || 0) || null)
const amountValue = computed(() => Number(walletInfo.amount || orderDetail.amount || 0))
const amountLabel = computed(() => formatPrice(amountValue.value))
const canUseWallet = computed(() => Boolean(currentUser.value?.studentNo))
const hasBankCards = computed(() => Array.isArray(walletInfo.bankCards) && walletInfo.bankCards.length > 0)
const selectedBankCard = computed(() =>
  walletInfo.bankCards.find((card) => String(card.id) === String(selectedBankCardId.value)) || null,
)
const walletBalanceEnough = computed(() => Number(walletInfo.walletBalance || 0) >= amountValue.value)
const selectedBankCardEnough = computed(
  () => Number(selectedBankCard.value?.balance || 0) >= amountValue.value,
)
const isPendingStatus = computed(
  () =>
    Number(payStatus.payStatus) === PAY_STATUS_PENDING &&
    Number(payStatus.orderStatus) === ORDER_STATUS_PENDING_PAY,
)
const isPaid = computed(
  () =>
    Number(payStatus.payStatus) === PAY_STATUS_SUCCESS ||
    [ORDER_STATUS_PAID, ORDER_STATUS_COMPLETED].includes(Number(payStatus.orderStatus)),
)
const isClosed = computed(() =>
  [ORDER_STATUS_CANCELLED, ORDER_STATUS_CLOSED].includes(Number(payStatus.orderStatus)),
)
const isExpired = computed(() => isPendingStatus.value && countdownMs.value <= 0)
const walletPayReady = computed(() => {
  if (paymentMethod.value !== 'wallet') {
    return true
  }

  if (!canUseWallet.value || !payPassword.value.trim()) {
    return false
  }

  if (walletChannel.value === 'bank-card') {
    return hasBankCards.value && Boolean(selectedBankCardId.value) && selectedBankCardEnough.value
  }

  return walletBalanceEnough.value
})
const payDisabledReason = computed(() => {
  if (loading.value || refreshing.value) {
    return '支付信息加载中，请稍候'
  }
  if (submitting.value) {
    return '支付处理中，请稍候'
  }
  if (isPaid.value) {
    return '当前订单已支付成功'
  }
  if (isClosed.value) {
    return '当前订单已关闭，无法继续支付'
  }
  if (isExpired.value) {
    return '当前订单支付时间已到，请刷新状态'
  }
  if (!isPendingStatus.value) {
    return '当前订单状态不可支付'
  }
  if (paymentMethod.value !== 'wallet') {
    return ''
  }
  if (!canUseWallet.value) {
    return '当前账号缺少钱包登录名，请重新登录后再试'
  }
  if (walletLoading.value) {
    return '钱包信息加载中，请稍候'
  }
  if (walletError.value) {
    return walletError.value
  }
  if (!payPassword.value.trim()) {
    return '请输入支付密码'
  }
  if (walletChannel.value === 'bank-card' && !hasBankCards.value) {
    return '当前钱包账户未绑定可用银行卡'
  }
  if (walletChannel.value === 'bank-card' && !selectedBankCardId.value) {
    return '请选择一张银行卡'
  }
  if (walletChannel.value === 'bank-card' && !selectedBankCardEnough.value) {
    return '所选银行卡余额不足'
  }
  if (walletChannel.value === 'balance' && !walletBalanceEnough.value) {
    return '钱包余额不足，请切换到银行卡支付'
  }

  return ''
})
const canSubmit = computed(() => !payDisabledReason.value)
const payButtonLabel = computed(() => {
  if (submitting.value) {
    return '支付处理中...'
  }
  if (isPaid.value) {
    return '订单已支付'
  }
  if (isClosed.value) {
    return '订单已关闭'
  }
  if (isExpired.value) {
    return '订单已超时'
  }

  return `确认支付 ￥${amountLabel.value}`
})
const countdownLabel = computed(() => {
  if (isPaid.value) {
    return Number(payStatus.orderStatus) === ORDER_STATUS_COMPLETED ? '订单已完成' : '支付成功，等待确认收货'
  }
  if (Number(payStatus.orderStatus) === ORDER_STATUS_CANCELLED) {
    return '订单已取消'
  }
  if (Number(payStatus.orderStatus) === ORDER_STATUS_CLOSED) {
    return '订单已超时关闭'
  }
  if (!countdownMs.value || countdownMs.value <= 0) {
    return '订单支付时间已到，请刷新状态'
  }

  const totalSeconds = Math.floor(countdownMs.value / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `请在 ${minutes}:${seconds} 内完成支付`
})
const footerHint = computed(() => {
  if (isPaid.value) {
    return '支付成功后订单已经进入后续交易流程，你可以在我的订单里继续跟进。'
  }
  if (isClosed.value) {
    return '该订单已经关闭，若还想购买，可以联系卖家重新下单。'
  }
  if (isExpired.value) {
    return '支付倒计时已结束，系统会在状态同步后关闭订单。'
  }
  if (paymentMethod.value === 'mock') {
    return '当前为测试支付网关，支付成功后会直接更新订单状态。'
  }
  if (walletChannel.value === 'bank-card' && hasBankCards.value) {
    return '将从你选择的绑定银行卡中扣款，支付密码会在提交时由后端校验。'
  }
  return '将优先使用校园虚拟钱包余额支付，余额不足时可以切换到已绑定银行卡。'
})

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function resolveOrderStatusLabel(status) {
  if (Number(status) === ORDER_STATUS_PENDING_PAY) {
    return '待支付'
  }
  if (Number(status) === ORDER_STATUS_PAID) {
    return '待收货'
  }
  if (Number(status) === ORDER_STATUS_COMPLETED) {
    return '交易完成'
  }
  if (Number(status) === ORDER_STATUS_CANCELLED) {
    return '已取消'
  }
  if (Number(status) === ORDER_STATUS_CLOSED) {
    return '超时关闭'
  }
  return '状态未知'
}

function resolvePayStatusLabel(status) {
  if (Number(status) === PAY_STATUS_PENDING) {
    return '待支付'
  }
  if (Number(status) === PAY_STATUS_SUCCESS) {
    return '已支付'
  }
  return '状态未知'
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2600)
}

function resetWalletInfo() {
  Object.assign(walletInfo, {
    orderId: null,
    requestNo: '',
    loginName: '',
    walletUserNo: '',
    walletName: '',
    amount: 0,
    walletBalance: 0,
    bankCards: [],
  })
  selectedBankCardId.value = ''
}

function applyPayStatus(data = {}) {
  Object.assign(payStatus, {
    orderId: data.orderId ?? null,
    payId: data.payId ?? null,
    payNo: data.payNo ?? '',
    requestNo: data.requestNo ?? '',
    method: data.method ?? null,
    payStatus: data.payStatus ?? null,
    orderStatus: data.orderStatus ?? null,
    expireTime: data.expireTime ?? '',
    payTime: data.payTime ?? '',
  })
}

function applyOrderDetail(data = {}) {
  Object.assign(orderDetail, {
    id: data.id ?? null,
    orderNo: data.orderNo ?? '',
    amount: data.amount ?? data.goodsPrice ?? 0,
    goodsTitle: data.goodsTitle ?? '',
    goodsCover: data.goodsCover ?? '',
  })
}

function applyWalletInfo(data = {}) {
  Object.assign(walletInfo, {
    orderId: data.orderId ?? null,
    requestNo: data.requestNo ?? '',
    loginName: data.loginName ?? '',
    walletUserNo: data.walletUserNo ?? '',
    walletName: data.walletName ?? '',
    amount: data.amount ?? 0,
    walletBalance: data.walletBalance ?? 0,
    bankCards: Array.isArray(data.bankCards) ? data.bankCards : [],
  })

  const defaultCard =
    walletInfo.bankCards.find((card) => Number(card.isDefault) === 1) || walletInfo.bankCards[0] || null
  selectedBankCardId.value = defaultCard ? String(defaultCard.id) : ''
  if (walletChannel.value === 'bank-card' && !defaultCard) {
    walletChannel.value = 'balance'
  }
}

function updateCountdown() {
  if (!payStatus.expireTime) {
    countdownMs.value = 0
    return
  }

  const expireTime = new Date(payStatus.expireTime).getTime()
  if (Number.isNaN(expireTime)) {
    countdownMs.value = 0
    return
  }

  countdownMs.value = Math.max(expireTime - Date.now(), 0)
}

function startCountdown() {
  stopCountdown()
  updateCountdown()
  countdownTimer = window.setInterval(updateCountdown, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

async function fetchPayStatus() {
  const { data } = await request.get(`/user/pay/status/${orderId.value}`)
  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '支付状态加载失败')
  }

  return data.data
}

async function fetchOrderDetail() {
  const { data } = await request.get(`/user/order/detail/${orderId.value}`)
  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '订单信息加载失败')
  }

  return data.data
}

async function fetchWalletInfo({ silent = false } = {}) {
  if (!orderId.value || !canUseWallet.value) {
    walletError.value = canUseWallet.value ? '' : '当前账号缺少钱包登录名，请重新登录后再试'
    resetWalletInfo()
    return
  }

  walletLoading.value = true
  walletError.value = ''
  try {
    const data = await fetchWalletPageInfo({
      orderId: orderId.value,
      loginName: currentUser.value.studentNo,
    })
    applyWalletInfo(data)
  } catch (error) {
    resetWalletInfo()
    walletError.value = getErrorMessage(error, '钱包信息加载失败')
    if (!silent) {
      showToast(walletError.value, 'error')
    }
  } finally {
    walletLoading.value = false
  }
}

async function refreshPayStatus() {
  const data = await fetchVirtualWalletPayStatus(orderId.value)
  applyPayStatus(data)

  if (isPendingStatus.value) {
    startCountdown()
  } else {
    stopCountdown()
    updateCountdown()
  }
}

async function loadPageData({ preserve = false } = {}) {
  if (!orderId.value) {
    router.replace('/')
    return
  }

  if (preserve) {
    refreshing.value = true
  } else {
    loading.value = true
  }

  try {
    const [nextPayStatus, nextOrderDetail] = await Promise.all([fetchPayStatus(), fetchOrderDetail()])

    applyPayStatus(nextPayStatus)
    applyOrderDetail(nextOrderDetail)

    expiredSyncTriggered.value = false
    if (isPendingStatus.value) {
      startCountdown()
      if (paymentMethod.value === 'wallet' || canUseWallet.value) {
        await fetchWalletInfo({ silent: true })
      }
    } else {
      stopCountdown()
      updateCountdown()
      walletError.value = ''
      resetWalletInfo()
    }
  } catch (error) {
    showToast(getErrorMessage(error, '支付信息加载失败'), 'error')
  } finally {
    if (preserve) {
      refreshing.value = false
    } else {
      loading.value = false
    }
  }
}

async function handleMockPay() {
  const { data } = await request.post('/user/pay/mock', {
    orderId: orderId.value,
    requestNo: payStatus.requestNo || walletInfo.requestNo || '',
  })

  if (data?.code !== 1) {
    throw new Error(data?.msg || '模拟支付失败')
  }
}

async function handleWalletPay() {
  if (!canUseWallet.value) {
    throw new Error('当前账号缺少钱包登录名，请重新登录后再试')
  }

  const launchData = await launchVirtualWalletPay(orderId.value)
  const requestNo = launchData?.requestNo || payStatus.requestNo || walletInfo.requestNo || ''
  if (!requestNo) {
    throw new Error('未获取到支付请求号，请刷新页面后重试')
  }

  payStatus.requestNo = requestNo
  walletInfo.requestNo = requestNo

  await confirmVirtualWalletPay({
    orderId: orderId.value,
    requestNo,
    payChannel: walletChannel.value === 'bank-card' ? 2 : 1,
    bankCardId: walletChannel.value === 'bank-card' ? Number(selectedBankCardId.value) : null,
    loginName: currentUser.value.studentNo,
    payPassword: payPassword.value.trim(),
  })
}

async function submitPayment() {
  if (!ensureLoggedIn({ source: 'payment-submit' })) {
    return
  }

  if (!canSubmit.value) {
    showToast(payDisabledReason.value || '请先完善支付信息', 'error')
    return
  }

  submitting.value = true
  try {
    if (paymentMethod.value === 'wallet') {
      await handleWalletPay()
    } else {
      await handleMockPay()
    }

    await refreshPayStatus()

    if (Number(payStatus.payStatus) !== PAY_STATUS_SUCCESS) {
      throw new Error('支付状态尚未成功更新，请刷新后重试')
    }

    if (paymentMethod.value === 'wallet') {
      payPassword.value = ''
      await fetchWalletInfo({ silent: true })
    }

    showToast('支付成功')
    window.setTimeout(() => {
      router.replace('/user/bought')
    }, 900)
  } catch (error) {
    const message = getErrorMessage(error, '支付失败')
    if (/超时|关闭|已支付|状态/.test(message)) {
      await loadPageData({ preserve: true }).catch(() => {})
    }
    showToast(message, 'error')
  } finally {
    submitting.value = false
  }
}

function goToBoughtOrders() {
  router.replace('/user/bought')
}

function goToWalletCenter() {
  router.push('/user/wallet')
}

function handleRefresh() {
  loadPageData({ preserve: true })
}

watch(
  () => walletChannel.value,
  (value) => {
    if (value === 'bank-card' && !hasBankCards.value) {
      walletChannel.value = 'balance'
    }
  },
)

watch(
  () => payStatus.expireTime,
  () => {
    expiredSyncTriggered.value = false
  },
)

watch(
  () => countdownMs.value,
  async (value) => {
    if (value > 0 || !isPendingStatus.value || expiredSyncTriggered.value) {
      return
    }

    expiredSyncTriggered.value = true
    try {
      await refreshPayStatus()
    } catch {
      // Ignore sync failures here and let the user refresh manually.
    }
  },
)

onMounted(() => {
  if (!ensureLoggedIn({ source: 'payment-page' })) {
    router.replace('/')
    return
  }

  loadPageData()
})

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <section class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <Card class="border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div class="space-y-8">
          <div class="space-y-5 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <ShieldCheck class="h-6 w-6" />
            </div>
            <div class="space-y-2">
              <p class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                <TimerReset class="h-4 w-4" />
                {{ countdownLabel }}
              </p>
              <h1 class="text-4xl font-black tracking-tight text-brand-600 sm:text-5xl">
                ￥{{ amountLabel }}
              </h1>
              <p class="text-sm text-slate-400">订单编号：{{ orderDetail.orderNo || orderId }}</p>
            </div>
          </div>

          <div v-if="loading" class="flex min-h-[260px] items-center justify-center">
            <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm text-slate-500">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              正在加载支付信息
            </div>
          </div>

          <template v-else>
            <div class="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                  <img
                    v-if="orderDetail.goodsCover"
                    :src="orderDetail.goodsCover"
                    :alt="orderDetail.goodsTitle"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
                    <Wallet class="h-8 w-8" />
                  </div>
                </div>

                <div class="min-w-0 flex-1 space-y-3">
                  <h2 class="line-clamp-2 text-lg font-bold text-slate-950">
                    {{ orderDetail.goodsTitle || '当前订单商品' }}
                  </h2>
                  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span>订单状态：{{ resolveOrderStatusLabel(payStatus.orderStatus) }}</span>
                    <span>支付状态：{{ resolvePayStatusLabel(payStatus.payStatus) }}</span>
                    <span>创建的支付单号：{{ payStatus.payNo || '-' }}</span>
                  </div>
                </div>

                <div class="shrink-0 text-left sm:text-right">
                  <p class="text-sm text-slate-400">支付截止时间</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">
                    {{ formatDateTime(payStatus.expireTime) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 class="text-lg font-bold text-slate-950">选择支付方式</h2>
                <Button
                  variant="outline"
                  size="sm"
                  class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
                  :disabled="refreshing || submitting"
                  @click="handleRefresh"
                >
                  <RefreshCcw class="mr-2 h-4 w-4" :class="refreshing ? 'animate-spin' : ''" />
                  刷新状态
                </Button>
              </div>

              <RadioGroup v-model="paymentMethod" class="gap-4">
                <label
                  class="flex cursor-pointer items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-brand-200 hover:bg-brand-50/40"
                  :class="paymentMethod === 'wallet' ? 'border-brand-300 bg-brand-50/70' : ''"
                >
                  <RadioGroupItem value="wallet" class="mt-1" />
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-2">
                      <Wallet class="h-4 w-4 text-brand-600" />
                      <span class="text-sm font-semibold text-slate-950">校园虚拟钱包支付</span>
                      <span class="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">推荐</span>
                    </div>
                    <p class="text-sm text-slate-600">
                      {{ canUseWallet ? '支持钱包余额和已绑定银行卡两种扣款方式。' : '当前账号缺少钱包登录名，请重新登录后再试。' }}
                    </p>
                  </div>
                </label>

                <label
                  class="flex cursor-pointer items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-brand-200 hover:bg-brand-50/40"
                  :class="paymentMethod === 'mock' ? 'border-brand-300 bg-brand-50/70' : ''"
                >
                  <RadioGroupItem value="mock" class="mt-1" />
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-2">
                      <CreditCard class="h-4 w-4 text-slate-700" />
                      <span class="text-sm font-semibold text-slate-950">测试支付网关</span>
                    </div>
                    <p class="text-sm text-slate-600">用于联调和验收，支付成功后会直接更新订单状态。</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div
              v-if="paymentMethod === 'wallet'"
              class="space-y-5 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5"
            >
              <div v-if="walletLoading" class="flex items-center justify-center rounded-[20px] bg-white px-5 py-8 text-sm text-slate-500">
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                正在加载钱包信息
              </div>

              <div
                v-else-if="walletError"
                class="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600"
              >
                <p>{{ walletError }}</p>
                <Button
                  variant="outline"
                  size="sm"
                  class="mt-3 rounded-full border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                  :disabled="refreshing || submitting"
                  @click="fetchWalletInfo()"
                >
                  重新加载钱包信息
                </Button>
              </div>

              <template v-else>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="rounded-[20px] bg-white px-4 py-4">
                    <p class="text-xs font-medium tracking-[0.18em] text-slate-400">钱包账户</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">
                      {{ walletInfo.walletName || currentUser.name || '未命名账户' }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ walletInfo.loginName || currentUser.studentNo || '未获取到登录名' }}
                    </p>
                  </div>

                  <div class="rounded-[20px] bg-white px-4 py-4">
                    <p class="text-xs font-medium tracking-[0.18em] text-slate-400">钱包余额</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">￥{{ formatPrice(walletInfo.walletBalance) }}</p>
                    <p class="mt-1 text-xs" :class="walletBalanceEnough ? 'text-emerald-600' : 'text-amber-600'">
                      {{ walletBalanceEnough ? '余额充足，可直接付款' : '余额不足，可切换银行卡支付' }}
                    </p>
                  </div>
                </div>

                <div class="space-y-3">
                  <p class="text-sm font-semibold text-slate-900">扣款渠道</p>
                  <RadioGroup v-model="walletChannel" class="gap-3">
                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-brand-200"
                      :class="walletChannel === 'balance' ? 'border-brand-300 bg-brand-50/50' : ''"
                    >
                      <RadioGroupItem value="balance" class="mt-1" />
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-slate-950">钱包余额</p>
                        <p class="text-xs text-slate-500">直接从当前校园虚拟钱包账户扣款。</p>
                      </div>
                    </label>

                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-brand-200"
                      :class="walletChannel === 'bank-card' ? 'border-brand-300 bg-brand-50/50' : ''"
                    >
                      <RadioGroupItem value="bank-card" class="mt-1" />
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-slate-950">绑定银行卡</p>
                        <p class="text-xs text-slate-500">使用当前钱包账户下已绑定的银行卡完成扣款。</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <div v-if="walletChannel === 'bank-card'" class="space-y-3">
                  <p class="text-sm font-semibold text-slate-900">选择银行卡</p>
                  <RadioGroup v-model="selectedBankCardId" class="gap-3">
                    <label
                      v-for="card in walletInfo.bankCards"
                      :key="card.id"
                      class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-brand-200"
                      :class="selectedBankCardId === String(card.id) ? 'border-brand-300 bg-brand-50/50' : ''"
                    >
                      <RadioGroupItem :value="String(card.id)" class="mt-1" />
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-slate-950">{{ card.bankName }}</p>
                        <p class="text-xs text-slate-500">{{ card.cardNoMask }}</p>
                      </div>
                      <div class="ml-auto text-right">
                        <p class="text-xs text-slate-400">余额</p>
                        <p class="text-sm font-semibold text-slate-900">￥{{ formatPrice(card.balance) }}</p>
                      </div>
                    </label>
                  </RadioGroup>

                  <p v-if="!hasBankCards" class="text-sm text-slate-500">当前账户暂无可用银行卡，请改用钱包余额支付。</p>
                  <p
                    v-else-if="selectedBankCard && !selectedBankCardEnough"
                    class="text-sm text-amber-600"
                  >
                    当前选择的银行卡余额不足，请更换银行卡或切回钱包余额。
                  </p>
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-semibold text-slate-900" for="payPassword">支付密码</label>
                  <Input
                    id="payPassword"
                    v-model="payPassword"
                    type="password"
                    placeholder="请输入钱包支付密码"
                    class="h-12 rounded-2xl border-slate-200 bg-white px-4"
                  />
                </div>
              </template>
            </div>

            <div class="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
              <div class="flex items-center justify-between text-sm text-slate-600">
                <span>待支付金额</span>
                <span class="font-semibold text-slate-900">￥{{ amountLabel }}</span>
              </div>
              <div class="flex items-center justify-between text-sm text-slate-600">
                <span>订单状态</span>
                <span class="font-semibold text-slate-900">{{ resolveOrderStatusLabel(payStatus.orderStatus) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm text-slate-600">
                <span>支付状态</span>
                <span class="font-semibold text-slate-900">{{ resolvePayStatusLabel(payStatus.payStatus) }}</span>
              </div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  class="h-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 sm:flex-1"
                  :disabled="refreshing || submitting"
                  @click="handleRefresh"
                >
                  <RefreshCcw class="mr-2 h-4 w-4" :class="refreshing ? 'animate-spin' : ''" />
                  刷新
                </Button>

                <Button
                  v-if="isPaid || isClosed"
                  size="lg"
                  class="h-12 rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-slate-800 sm:flex-[1.4]"
                  @click="goToBoughtOrders"
                >
                  {{ isPaid ? '查看我的订单' : '返回订单列表' }}
                </Button>

                <Button
                  v-else
                  size="lg"
                  class="h-12 rounded-2xl bg-brand-500 text-base font-bold text-white hover:bg-brand-600 sm:flex-[1.4]"
                  :disabled="!canSubmit"
                  @click="submitPayment"
                >
                  <LoaderCircle v-if="submitting" class="mr-2 h-5 w-5 animate-spin" />
                  {{ payButtonLabel }}
                </Button>
              </div>
              <p class="text-xs leading-6 text-slate-400">{{ canSubmit ? footerHint : payDisabledReason || footerHint }}</p>
            </div>
          </template>
        </div>
      </Card>
    </div>

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-6 right-6 z-[160] rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-950'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </section>
</template>
