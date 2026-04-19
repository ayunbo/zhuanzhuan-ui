<!-- APIs: GET /api/user/goods/{id} -> UserGoodsDetailVO{id,title,price,location,cover,status,statusDesc}; POST /api/user/order/submit -> OrderSubmitDTO{goodsId,meetLocation,meetTime,remark}; success returns orderId -->
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoaderCircle, MapPin, MessageSquareText, ReceiptText, Store } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import request, { ensureLoggedIn } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const meetingChoice = ref('discuss')

const goods = reactive({
  id: null,
  title: '',
  price: 0,
  location: '',
  cover: '',
  status: null,
  statusDesc: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const hasSellerLocation = computed(() => Boolean(goods.location?.trim()))
const totalPrice = computed(() => formatPrice(goods.price))
const finalMeetLocation = computed(() =>
  meetingChoice.value === 'seller-location' && hasSellerLocation.value
    ? goods.location.trim()
    : '与卖家沟通约定交易地点',
)
const canSubmit = computed(
  () => !submitting.value && !loading.value && goods.id && Number(goods.status) === 3,
)

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
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

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function applyGoodsDetail(data = {}) {
  goods.id = data.id ?? null
  goods.title = data.title ?? ''
  goods.price = data.price ?? 0
  goods.location = data.location ?? ''
  goods.cover = data.cover ?? ''
  goods.status = data.status ?? null
  goods.statusDesc = data.statusDesc ?? ''

  meetingChoice.value = goods.location?.trim() ? 'seller-location' : 'discuss'
}

async function fetchGoodsDetail() {
  const goodsId = route.params.id
  if (!goodsId) {
    router.replace('/')
    return
  }

  loading.value = true
  try {
    const { data } = await request.get(`/user/goods/${goodsId}`)

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '商品信息加载失败')
    }

    applyGoodsDetail(data.data)

    if (Number(goods.status) !== 3) {
      showToast(goods.statusDesc || '当前商品暂不可下单', 'error')
      window.setTimeout(() => {
        router.replace(`/goods/${goodsId}`)
      }, 900)
    }
  } catch (error) {
    showToast(getErrorMessage(error, '商品信息加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function submitOrder() {
  if (!ensureLoggedIn({ source: 'order-checkout-submit' })) {
    return
  }

  if (!canSubmit.value) {
    showToast(goods.statusDesc || '当前商品暂不可下单', 'error')
    return
  }

  submitting.value = true
  try {
    const payload = {
      goodsId: goods.id,
      meetLocation: finalMeetLocation.value,
      meetTime: null,
      remark: '',
    }

    const { data } = await request.post('/user/order/submit', payload)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '下单失败')
    }

    const orderId = data?.data
    if (!orderId) {
      throw new Error('订单创建成功，但未获取到订单编号')
    }

    router.push(`/payment/${orderId}`)
  } catch (error) {
    showToast(getErrorMessage(error, '下单失败'), 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchGoodsDetail()
})
</script>

<template>
  <section class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div class="space-y-6">
          <Card class="border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
            <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <MapPin class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-950">交易地点</h2>
                <p class="text-sm text-slate-500">按本次校园面交方式确认</p>
              </div>
            </div>

            <div v-if="loading" class="flex min-h-[180px] items-center justify-center">
              <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm text-slate-500">
                <LoaderCircle class="h-4 w-4 animate-spin" />
                正在加载订单信息
              </div>
            </div>

            <RadioGroup
              v-else
              v-model="meetingChoice"
              class="mt-5"
            >
              <label
                v-if="hasSellerLocation"
                class="flex cursor-pointer items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-brand-200 hover:bg-brand-50/40"
                :class="meetingChoice === 'seller-location' ? 'border-brand-300 bg-brand-50/70' : ''"
              >
                <RadioGroupItem value="seller-location" class="mt-1" />
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-950">卖家指定地点</span>
                    <span class="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">推荐</span>
                  </div>
                  <p class="text-sm leading-6 text-slate-600">{{ goods.location }}</p>
                </div>
              </label>

              <label
                class="flex cursor-pointer items-start gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-brand-200 hover:bg-brand-50/40"
                :class="meetingChoice === 'discuss' ? 'border-brand-300 bg-brand-50/70' : ''"
              >
                <RadioGroupItem value="discuss" class="mt-1" />
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-950">单独沟通</span>
                  </div>
                  <p class="text-sm leading-6 text-slate-600">与卖家在线沟通约定交易地点</p>
                </div>
              </label>
            </RadioGroup>
          </Card>

          <Card class="border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
            <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ReceiptText class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-950">订单信息</h2>
                <p class="text-sm text-slate-500">确认本次购买商品</p>
              </div>
            </div>

            <div
              v-if="loading"
              class="mt-5 flex min-h-[160px] items-center justify-center rounded-[24px] bg-slate-50"
            >
              <LoaderCircle class="h-5 w-5 animate-spin text-slate-400" />
            </div>

            <div
              v-else
              class="mt-5 flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center"
            >
              <div class="h-28 w-28 shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                <img
                  v-if="goods.cover"
                  :src="goods.cover"
                  :alt="goods.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                  <Store class="h-8 w-8" />
                </div>
              </div>

              <div class="min-w-0 flex-1 space-y-3">
                <p class="line-clamp-2 text-base font-semibold leading-7 text-slate-950">
                  {{ goods.title || '未命名商品' }}
                </p>
                <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span class="rounded-full bg-white px-3 py-1">校园面交</span>
                  <span v-if="goods.statusDesc">{{ goods.statusDesc }}</span>
                </div>
              </div>

              <div class="shrink-0 text-left sm:text-right">
                <p class="text-sm text-slate-400">单价</p>
                <p class="mt-2 text-2xl font-bold text-brand-600">￥{{ totalPrice }}</p>
              </div>
            </div>
          </Card>
        </div>

        <div class="lg:sticky lg:top-24">
          <Card class="border border-slate-200/80 bg-white p-6 shadow-sm">
            <div class="border-b border-slate-100 pb-4">
              <h2 class="text-lg font-bold text-slate-950">价格明细</h2>
            </div>

            <div class="space-y-4 py-5 text-sm text-slate-600">
              <div class="flex items-center justify-between gap-4">
                <span>商品总价</span>
                <span class="font-semibold text-slate-900">￥{{ totalPrice }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span>运费</span>
                <span class="font-semibold text-slate-900">￥0.00</span>
              </div>
              <div class="flex items-center justify-between gap-4 rounded-[20px] bg-slate-50 px-4 py-4">
                <span class="text-base font-semibold text-slate-900">合计</span>
                <span class="text-3xl font-black tracking-tight text-brand-600">￥{{ totalPrice }}</span>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-[20px] bg-amber-50/70 px-4 py-4 text-sm text-slate-600">
                <div class="flex items-start gap-3">
                  <MessageSquareText class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>{{ finalMeetLocation }}</p>
                </div>
              </div>

              <Button
                size="lg"
                class="h-12 w-full rounded-2xl bg-brand-500 text-base font-bold text-white hover:bg-brand-600"
                :disabled="!canSubmit"
                @click="submitOrder"
              >
                <LoaderCircle v-if="submitting" class="h-4 w-4 animate-spin" />
                {{ submitting ? '提交中...' : '确认购买' }}
              </Button>
            </div>
          </Card>
        </div>
      </div>
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
