<!-- APIs: GET /api/user/pay/status/{orderId} -> PayStatusVO{orderId,payId,payNo,requestNo,method,payStatus,orderStatus,expireTime,payTime}; GET /api/user/order/detail/{orderId} -> OrderDetailVO{orderNo,amount,goodsTitle,goodsCover}; POST /api/user/pay/mock -> PaySubmitDTO{orderId,requestNo}; POST /api/user/pay/virtual-wallet/{orderId}; GET /api/wallet/page/info?orderId&loginName; POST /api/wallet/page/confirm -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  TimerReset,
  Wallet,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import request, { ensureLoggedIn, getAuthUser } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const paymentMethod = ref('wallet')
const walletChannel = ref('balance')
const payPassword = ref('')
const countdownMs = ref(0)

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

const selectedBankCardId = ref(null)

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

let countdownTimer = null

const currentUser = computed(() => getAuthUser() || {})
const orderId = computed(() => Number(route.params.orderId || 0) || null)
const amountLabel = computed(() => formatPrice(orderDetail.amount))
const payButtonLabel = computed(() =>
  submitting.value ? '支付处理中...' : `确认支付 ￥${amountLabel.value}`,
)
const isPendingPayment = computed(
  () => Number(payStatus.payStatus) === 0 && Number(payStatus.orderStatus) === 0,
)
const countdownLabel = computed(() => {
  if (!countdownMs.value || countdownMs.value <= 0) {
    return '订单已超时，请重新下单'
  }

  const totalSeconds = Math.floor(countdownMs.value / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `订单提交成功，请在 ${minutes}:${seconds} 内完成支付`
})
const canUseWallet = computed(() => Boolean(currentUser.value?.studentNo))
const hasBankCards = computed(() => Array.isArray(walletInfo.bankCards) && walletInfo.bankCards.length > 0)
const walletPayReady = computed(() => {
  if (paymentMethod.value !== 'wallet') {
    return true
  }

  if (!canUseWallet.value || !payPassword.value.trim()) {
    return false
  }

  if (walletChannel.value === 'bank-card') {
    return Boolean(selectedBankCardId.value)
  }

  return true
})
const canSubmit = computed(
  () => !loading.value && !submitting.value && isPendingPayment.value && walletPayReady.value,
)

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
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

async function fetchBasePaymentInfo() {
  if (!orderId.value) {
    router.replace('/')
    return
  }

  loading.value = true
  try {
    const [payResponse, detailResponse] = await Promise.all([
      request.get(`/user/pay/status/${orderId.value}`),
      request.get(`/user/order/detail/${orderId.value}`),
    ])

    const payData = payResponse?.data
    const detailData = detailResponse?.data

    if (payData?.code !== 1 || !payData?.data) {
      throw new Error(payData?.msg || '支付信息加载失败')
    }
    if (detailData?.code !== 1 || !detailData?.data) {
      throw new Error(detailData?.msg || '订单信息加载失败')
    }

    Object.assign(payStatus, payData.data)
    Object.assign(orderDetail, {
      id: detailData.data.id ?? null,
      orderNo: detailData.data.orderNo ?? '',
      amount: detailData.data.amount ?? detailData.data.goodsPrice ?? 0,
      goodsTitle: detailData.data.goodsTitle ?? '',
      goodsCover: detailData.data.goodsCover ?? '',
    })

    startCountdown()

    if (canUseWallet.value) {
      await fetchWalletInfo()
    }
  } catch (error) {
    showToast(getErrorMessage(error, '支付信息加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function fetchWalletInfo() {
  if (!orderId.value || !canUseWallet.value) {
    return
  }

  const { data } = await request.get('/wallet/page/info', {
    params: {
      orderId: orderId.value,
      loginName: currentUser.value.studentNo,
    },
  })

  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '钱包信息加载失败')
  }

  Object.assign(walletInfo, {
    orderId: data.data.orderId ?? null,
    requestNo: data.data.requestNo ?? '',
    loginName: data.data.loginName ?? '',
    walletUserNo: data.data.walletUserNo ?? '',
    walletName: data.data.walletName ?? '',
    amount: data.data.amount ?? 0,
    walletBalance: data.data.walletBalance ?? 0,
    bankCards: Array.isArray(data.data.bankCards) ? data.data.bankCards : [],
  })

  const defaultCard = walletInfo.bankCards.find((card) => Number(card.isDefault) === 1)
  selectedBankCardId.value = defaultCard?.id ?? walletInfo.bankCards[0]?.id ?? null
}

async function refreshPayStatus() {
  const { data } = await request.get(`/user/pay/status/${orderId.value}`)

  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '支付状态刷新失败')
  }

  Object.assign(payStatus, data.data)
  updateCountdown()
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

  const launchResponse = await request.post(`/user/pay/virtual-wallet/${orderId.value}`)
  if (launchResponse?.data?.code !== 1 || !launchResponse?.data?.data) {
    throw new Error(launchResponse?.data?.msg || '虚拟钱包支付初始化失败')
  }

  const launchData = launchResponse.data.data
  walletInfo.requestNo = launchData.requestNo || walletInfo.requestNo || ''

  const { data } = await request.post('/wallet/page/confirm', {
    orderId: orderId.value,
    requestNo: walletInfo.requestNo,
    payChannel: walletChannel.value === 'bank-card' ? 2 : 1,
    bankCardId: walletChannel.value === 'bank-card' ? selectedBankCardId.value : null,
    loginName: currentUser.value.studentNo,
    payPassword: payPassword.value.trim(),
  })

  if (data?.code !== 1) {
    throw new Error(data?.msg || '虚拟钱包支付失败')
  }
}

async function submitPayment() {
  if (!ensureLoggedIn({ source: 'payment-submit' })) {
    return
  }

  if (!canSubmit.value) {
    if (!isPendingPayment.value) {
      showToast('当前订单不可支付', 'error')
      return
    }
    showToast('请先完善支付信息', 'error')
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

    if (Number(payStatus.payStatus) !== 1) {
      throw new Error('支付状态未更新成功，请稍后刷新重试')
    }

    showToast('支付成功！')
    window.setTimeout(() => {
      router.replace('/user/bought')
    }, 1000)
  } catch (error) {
    showToast(getErrorMessage(error, '支付失败'), 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!ensureLoggedIn({ source: 'payment-page' })) {
    router.replace('/')
    return
  }

  fetchBasePaymentInfo()
})

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <section class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
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

          <div v-if="loading" class="flex min-h-[220px] items-center justify-center">
            <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm text-slate-500">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              正在加载支付信息
            </div>
          </div>

          <template v-else>
            <div class="space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h2 class="text-lg font-bold text-slate-950">选择支付方式</h2>
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
                      {{ canUseWallet ? '使用校园虚拟钱包或绑定银行卡完成支付' : '当前账号缺少钱包登录名，请重新登录后再试' }}
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
                      <span class="text-sm font-semibold text-slate-950">模拟支付测试网关</span>
                    </div>
                    <p class="text-sm text-slate-600">开发联调使用，支付成功后将直接更新订单状态</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div
              v-if="paymentMethod === 'wallet'"
              class="space-y-5 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5"
            >
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
                  <p class="mt-2 text-sm font-semibold text-slate-900">
                    ￥{{ formatPrice(walletInfo.walletBalance) }}
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
                      <p class="text-xs text-slate-500">优先从校园钱包余额扣款</p>
                    </div>
                  </label>

                  <label
                    class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-brand-200"
                    :class="walletChannel === 'bank-card' ? 'border-brand-300 bg-brand-50/50' : ''"
                  >
                    <RadioGroupItem value="bank-card" class="mt-1" />
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-slate-950">绑定银行卡</p>
                      <p class="text-xs text-slate-500">从已绑定银行卡中选择扣款</p>
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
                    :class="selectedBankCardId === card.id ? 'border-brand-300 bg-brand-50/50' : ''"
                  >
                    <RadioGroupItem :value="card.id" class="mt-1" />
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
                <p v-if="!hasBankCards" class="text-sm text-slate-500">暂无可用银行卡，请改用钱包余额支付。</p>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-semibold text-slate-900" for="payPassword">支付密码</label>
                <Input
                  id="payPassword"
                  v-model="payPassword"
                  type="password"
                  placeholder="输入钱包支付密码"
                  class="h-12 rounded-2xl border-slate-200 bg-white px-4"
                />
              </div>
            </div>

            <div class="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
              <div class="flex items-center justify-between text-sm text-slate-600">
                <span>待支付金额</span>
                <span class="font-semibold text-slate-900">￥{{ amountLabel }}</span>
              </div>
              <div class="flex items-center justify-between text-sm text-slate-600">
                <span>支付状态</span>
                <span class="font-semibold text-slate-900">
                  {{ Number(payStatus.payStatus) === 0 ? '待支付' : Number(payStatus.payStatus) === 1 ? '已支付' : '状态异常' }}
                </span>
              </div>
              <Button
                size="lg"
                class="h-12 w-full rounded-2xl bg-brand-500 text-lg font-bold text-white hover:bg-brand-600"
                :disabled="!canSubmit"
                @click="submitPayment"
              >
                <LoaderCircle v-if="submitting" class="h-5 w-5 animate-spin" />
                {{ payButtonLabel }}
              </Button>
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
