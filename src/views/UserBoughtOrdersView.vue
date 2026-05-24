<!-- API: GET /api/user/order/page?page&pageSize&type=1&status=0|1|2|3|4; POST /api/user/order/cancel/{id}; POST /api/user/order/complete/{id}; POST /api/user/report; seller avatar fallback: GET /api/user/goods/seller/{sellerId}; status: 0待付款 1已支付 2交易成功 3已取消 4超时关闭 -->
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronDown,
  CreditCard,
  LoaderCircle,
  MessageSquareWarning,
  PackageOpen,
  RefreshCcw,
  Store,
  Trash2,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import request, { ensureLoggedIn } from '@/utils/request'

const router = useRouter()
const PAGE_SIZE = 6

const loading = ref(false)
const actionLoadingId = ref(null)
const page = ref(1)
const total = ref(0)
const orders = ref([])
const activeStatus = ref('all')
const complaintDialogVisible = ref(false)
const complaintSubmitting = ref(false)
const complaintOrder = ref(null)

const sellerAvatarMap = reactive({})
const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})
const complaintForm = reactive({
  reasonType: '卖家未按约定交易',
  description: '',
})

const statusTabs = [
  { key: 'all', label: '全部', status: null },
  { key: '0', label: '待付款', status: 0 },
  { key: '1', label: '已支付', status: 1 },
  { key: '2', label: '交易成功', status: 2 },
  { key: '3', label: '已取消', status: 3 },
  { key: '4', label: '超时关闭', status: 4 },
]

const complaintReasonOptions = [
  '卖家未按约定交易',
  '商品与描述不符',
  '售后沟通不友好',
  '疑似欺诈或违规交易',
]

const totalPages = computed(() => {
  const count = Math.ceil(total.value / PAGE_SIZE)
  return count > 0 ? count : 1
})

const visiblePages = computed(() => {
  const current = page.value
  const last = totalPages.value

  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)

  if (start > 2) {
    pages.push('ellipsis-left')
  }

  for (let value = start; value <= end; value += 1) {
    pages.push(value)
  }

  if (end < last - 1) {
    pages.push('ellipsis-right')
  }

  pages.push(last)
  return pages
})

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2400)
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusMeta(status) {
  if (status === 0) {
    return {
      label: '待付款',
      className: 'text-orange-500',
    }
  }

  if (status === 1) {
    return {
      label: '已支付',
      className: 'text-sky-600',
    }
  }

  if (status === 2) {
    return {
      label: '交易成功',
      className: 'text-slate-700',
    }
  }

  if (status === 3) {
    return {
      label: '已取消',
      className: 'text-slate-400',
    }
  }

  return {
    label: '超时关闭',
    className: 'text-slate-400',
  }
}

function normalizeOrder(record = {}) {
  const status = Number(record.status ?? 0)
  const sellerId = Number(record.sellerId ?? 0) || null

  return {
    id: record.id ?? null,
    orderNo: record.orderNo || '',
    goodsId: record.goodsId ?? null,
    sellerId,
    amount: record.amount ?? record.goodsPrice ?? 0,
    goodsTitle: record.goodsTitle || '未命名商品',
    goodsCover: record.goodsCover || '',
    goodsPrice: record.goodsPrice ?? 0,
    sellerName: record.sellerName || '校园卖家',
    sellerAvatar: sellerAvatarMap[sellerId] || '',
    meetLocation: record.meetLocation || '与卖家沟通约定地点',
    meetTime: record.meetTime || '',
    createTime: record.createTime || '',
    status,
    statusLabel: getStatusMeta(status).label,
  }
}

async function hydrateSellerAvatars(list) {
  const sellerIds = [...new Set(list.map((item) => item.sellerId).filter(Boolean))]
  const missingIds = sellerIds.filter((sellerId) => !sellerAvatarMap[sellerId])

  if (!missingIds.length) {
    orders.value = list.map((item) => ({
      ...item,
      sellerAvatar: sellerAvatarMap[item.sellerId] || '',
    }))
    return
  }

  const results = await Promise.allSettled(
    missingIds.map((sellerId) => request.get(`/user/goods/seller/${sellerId}`)),
  )

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      return
    }

    const payload = result.value?.data
    if (payload?.code !== 1 || !payload?.data) {
      return
    }

    sellerAvatarMap[missingIds[index]] = payload.data.sellerAvatar || ''
  })

  orders.value = list.map((item) => ({
    ...item,
    sellerAvatar: sellerAvatarMap[item.sellerId] || '',
  }))
}

async function fetchOrders(targetPage = page.value) {
  loading.value = true

  try {
    const currentTab = statusTabs.find((tab) => tab.key === activeStatus.value)
    const { data } = await request.get('/user/order/page', {
      params: {
        page: targetPage,
        pageSize: PAGE_SIZE,
        type: 1,
        status: currentTab?.status ?? undefined,
      },
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '订单加载失败')
    }

    const pageData = data?.data || {}
    const records = Array.isArray(pageData.records) ? pageData.records.map(normalizeOrder) : []

    total.value = Number(pageData.total || 0)
    page.value = targetPage
    await hydrateSellerAvatars(records)
  } catch (error) {
    showToast(getErrorMessage(error, '订单加载失败'), 'error')
    orders.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function selectTab(tabKey) {
  if (activeStatus.value === tabKey) {
    return
  }

  activeStatus.value = tabKey
  page.value = 1
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) {
    return
  }

  fetchOrders(targetPage)
}

function updateOrderInList(orderId, updater) {
  orders.value = orders.value.map((item) => {
    if (item.id !== orderId) {
      return item
    }

    return typeof updater === 'function' ? updater(item) : { ...item, ...updater }
  })
}

function syncOrderAfterStatusChange(orderId, nextStatus) {
  if (activeStatus.value !== 'all' && activeStatus.value !== String(nextStatus)) {
    orders.value = orders.value.filter((item) => item.id !== orderId)
    total.value = Math.max(0, total.value - 1)
    return
  }

  updateOrderInList(orderId, (item) => ({
    ...item,
    status: nextStatus,
    statusLabel: getStatusMeta(nextStatus).label,
  }))
}

function openGoodsDetail(order) {
  if (!order?.goodsId) {
    return
  }

  router.push(`/goods/${order.goodsId}`)
}

function goToPayment(order) {
  if (!order?.id) {
    return
  }

  router.push(`/payment/${order.id}`)
}

async function cancelOrder(order) {
  if (!order?.id) {
    return
  }

  actionLoadingId.value = `cancel-${order.id}`
  try {
    const { data } = await request.post(`/user/order/cancel/${order.id}`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '取消订单失败')
    }

    showToast('订单已取消')
    syncOrderAfterStatusChange(order.id, 3)
  } catch (error) {
    showToast(getErrorMessage(error, '取消订单失败'), 'error')
  } finally {
    actionLoadingId.value = null
  }
}

async function completeOrder(order) {
  if (!order?.id) {
    return
  }

  actionLoadingId.value = `complete-${order.id}`
  try {
    const { data } = await request.post(`/user/order/complete/${order.id}`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '确认收货失败')
    }

    showToast('确认收货成功')
    syncOrderAfterStatusChange(order.id, 2)
  } catch (error) {
    showToast(getErrorMessage(error, '确认收货失败'), 'error')
  } finally {
    actionLoadingId.value = null
  }
}

function reportSeller(order) {
  if (!order?.sellerId) {
    showToast('卖家信息缺失，暂时无法投诉', 'error')
    return
  }

  complaintOrder.value = order
  complaintForm.reasonType = '卖家未按约定交易'
  complaintForm.description = ''
  complaintDialogVisible.value = true
}

function closeComplaintDialog() {
  if (complaintSubmitting.value) {
    return
  }

  complaintDialogVisible.value = false
  complaintOrder.value = null
  complaintForm.description = ''
}

function buildComplaintReason() {
  const description = complaintForm.description.trim()
  const order = complaintOrder.value
  const orderText = order?.orderNo || order?.id || ''
  const reason = description
    ? `${complaintForm.reasonType}：${description}`
    : complaintForm.reasonType

  return orderText ? `订单投诉 ${orderText}：${reason}` : reason
}

async function submitComplaint() {
  const order = complaintOrder.value
  if (!order?.sellerId) {
    showToast('卖家信息缺失，暂时无法投诉', 'error')
    return
  }
  if (!complaintForm.reasonType && !complaintForm.description.trim()) {
    showToast('请选择或填写投诉原因', 'error')
    return
  }

  complaintSubmitting.value = true
  actionLoadingId.value = `report-${order.id}`
  try {
    const { data } = await request.post('/user/report', {
      targetType: 2,
      targetId: order.sellerId,
      reason: buildComplaintReason(),
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '投诉提交失败')
    }

    showToast('投诉已提交')
    complaintDialogVisible.value = false
    complaintOrder.value = null
    complaintForm.description = ''
  } catch (error) {
    showToast(getErrorMessage(error, '投诉提交失败'), 'error')
  } finally {
    complaintSubmitting.value = false
    actionLoadingId.value = null
  }
}

function deleteOrder(order) {
  if (!order?.id) {
    return
  }

  showToast('当前后端未提供删除订单接口')
}

function handleEvaluate(order) {
  if (!order?.id) {
    showToast('订单信息缺失，暂时无法评价', 'error')
    return
  }

  router.push({
    path: '/order/review',
    query: {
      orderId: String(order.id),
    },
  })
}

function getPrimaryAction(order) {
  if (order.status === 0) {
    return {
      key: 'pay',
      label: '去支付',
      icon: CreditCard,
      className: 'bg-orange-500 text-white hover:bg-orange-600',
      loadingKey: null,
      handler: goToPayment,
    }
  }

  if (order.status === 1) {
    return {
      key: 'complete',
      label: '确认收货',
      icon: PackageOpen,
      className: 'bg-slate-950 text-white hover:bg-slate-800',
      loadingKey: `complete-${order.id}`,
      handler: completeOrder,
    }
  }

  if (order.status === 2) {
    return {
      key: 'evaluate',
      label: '去评价',
      icon: MessageSquareWarning,
      className: 'bg-slate-950 text-white hover:bg-slate-800',
      loadingKey: null,
      handler: handleEvaluate,
    }
  }

  return {
    key: 'browse',
    label: '查看商品',
    icon: Store,
    className: 'bg-slate-950 text-white hover:bg-slate-800',
    loadingKey: null,
    handler: openGoodsDetail,
  }
}

function getSecondaryActions(order) {
  const actions = []

  if (order.status === 0) {
    actions.push({
      key: 'cancel',
      label: '取消订单',
      className: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      loadingKey: `cancel-${order.id}`,
      handler: cancelOrder,
    })
  } else if (order.goodsId) {
    actions.push({
      key: 'detail',
      label: '商品详情',
      className: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      loadingKey: null,
      handler: openGoodsDetail,
    })
  }

  return actions
}

watch(
  () => activeStatus.value,
  () => {
    fetchOrders(1)
  },
)

onMounted(() => {
  if (!ensureLoggedIn({ source: 'user-bought-orders' })) {
    router.replace('/')
    return
  }

  fetchOrders()
})
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div class="flex flex-wrap items-center gap-6">
          <h1 class="text-2xl font-black tracking-tight text-slate-950">我买到的</h1>

          <div class="flex flex-wrap items-center gap-6 text-sm font-semibold">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              type="button"
              class="relative pb-3 transition"
              :class="
                activeStatus === tab.key
                  ? 'text-slate-950'
                  : 'text-slate-400 hover:text-slate-700'
              "
              @click="selectTab(tab.key)"
            >
              {{ tab.label }}
              <span
                class="absolute inset-x-0 bottom-0 h-0.5 rounded-full transition"
                :class="activeStatus === tab.key ? 'bg-orange-500' : 'bg-transparent'"
              />
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
          :disabled="loading"
          @click="fetchOrders(page)"
        >
          <RefreshCcw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          刷新
        </Button>
      </div>

      <div v-if="loading" class="space-y-4 pt-6">
        <div
          v-for="index in 3"
          :key="index"
          class="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-slate-100" />
              <div class="h-4 w-28 rounded bg-slate-100" />
            </div>
            <div class="h-4 w-20 rounded bg-slate-100" />
          </div>
          <div class="flex gap-4 px-5 py-5">
            <div class="aspect-square w-24 rounded-2xl bg-slate-100" />
            <div class="flex-1 space-y-3">
              <div class="h-4 w-3/4 rounded bg-slate-100" />
              <div class="h-4 w-1/2 rounded bg-slate-100" />
              <div class="h-5 w-24 rounded bg-slate-100" />
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <div class="h-9 w-24 rounded-full bg-slate-100" />
            <div class="h-9 w-24 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>

      <div v-else-if="orders.length" class="space-y-4 pt-6">
        <article
          v-for="order in orders"
          :key="order.id"
          class="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div class="flex min-w-0 items-center gap-3">
              <Avatar
                size="md"
                :src="order.sellerAvatar"
                :fallback="order.sellerName?.slice(0, 1) || '卖'"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ order.sellerName }}</p>
                <p class="truncate text-xs text-slate-400">订单号 {{ order.orderNo || order.id }}</p>
              </div>
            </div>

            <p class="text-sm font-semibold" :class="getStatusMeta(order.status).className">
              {{ order.statusLabel }}
            </p>
          </div>

          <div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start">
            <button
              type="button"
              class="group block w-full max-w-[112px] shrink-0 overflow-hidden rounded-[18px] bg-slate-100 text-left"
              @click="openGoodsDetail(order)"
            >
              <img
                v-if="order.goodsCover"
                :src="order.goodsCover"
                :alt="order.goodsTitle"
                class="aspect-square h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <div v-else class="flex aspect-square items-center justify-center text-slate-300">
                <PackageOpen class="h-8 w-8" />
              </div>
            </button>

            <div class="min-w-0 flex-1 space-y-3">
              <button
                type="button"
                class="block text-left"
                @click="openGoodsDetail(order)"
              >
                <h2 class="line-clamp-2 text-base font-semibold leading-7 text-slate-900">
                  {{ order.goodsTitle }}
                </h2>
              </button>

              <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span>面交地点：{{ order.meetLocation }}</span>
                <span v-if="order.meetTime">约定时间：{{ order.meetTime }}</span>
                <span>下单时间：{{ formatDate(order.createTime) }}</span>
              </div>

              <p class="text-2xl font-black tracking-tight text-orange-500">
                ￥{{ formatPrice(order.amount || order.goodsPrice) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button
              v-for="action in getSecondaryActions(order)"
              :key="action.key"
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition"
              :class="action.className"
              :disabled="Boolean(action.loadingKey) && actionLoadingId === action.loadingKey"
              @click="action.handler(order)"
            >
              <LoaderCircle
                v-if="action.loadingKey && actionLoadingId === action.loadingKey"
                class="mr-2 h-4 w-4 animate-spin"
              />
              {{ action.label }}
            </button>

            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition"
              :class="getPrimaryAction(order).className"
              :disabled="
                Boolean(getPrimaryAction(order).loadingKey) &&
                actionLoadingId === getPrimaryAction(order).loadingKey
              "
              @click="getPrimaryAction(order).handler(order)"
            >
              <LoaderCircle
                v-if="
                  Boolean(getPrimaryAction(order).loadingKey) &&
                  actionLoadingId === getPrimaryAction(order).loadingKey
                "
                class="mr-2 h-4 w-4 animate-spin"
              />
              <component
                :is="getPrimaryAction(order).icon"
                v-else
                class="mr-2 h-4 w-4"
              />
              {{ getPrimaryAction(order).label }}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  更多
                  <ChevronDown class="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" class="w-40">
                <DropdownMenuItem
                  class="gap-2 text-slate-600"
                  @select.prevent="deleteOrder(order)"
                >
                  <Trash2 class="h-4 w-4" />
                  删除订单
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="gap-2 text-rose-500 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-600"
                  @select.prevent="reportSeller(order)"
                >
                  <MessageSquareWarning class="h-4 w-4" />
                  投诉卖家
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </article>
      </div>

      <div
        v-else
        class="flex min-h-[420px] flex-col items-center justify-center gap-5 text-center"
      >
        <div
          class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300"
        >
          <PackageOpen class="h-10 w-10" />
        </div>
        <div class="space-y-2">
          <p class="text-lg font-semibold text-slate-800">还没有买到的订单</p>
          <p class="text-sm text-slate-400">去首页看看有没有喜欢的宝贝</p>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-8">
        <Button
          variant="outline"
          size="sm"
          class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
          :disabled="page <= 1 || loading"
          @click="changePage(page - 1)"
        >
          上一页
        </Button>

        <template v-for="entry in visiblePages" :key="entry">
          <span
            v-if="typeof entry === 'string'"
            class="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
          >
            ...
          </span>
          <Button
            v-else
            size="sm"
            :variant="entry === page ? 'default' : 'outline'"
            class="h-9 min-w-9 rounded-full px-3"
            :class="
              entry === page
                ? 'bg-slate-950 text-white hover:bg-slate-950'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            "
            :disabled="loading"
            @click="changePage(entry)"
          >
            {{ entry }}
          </Button>
        </template>

        <Button
          variant="outline"
          size="sm"
          class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
          :disabled="page >= totalPages || loading"
          @click="changePage(page + 1)"
        >
          下一页
        </Button>
      </div>
    </Card>

    <div
      v-if="complaintDialogVisible"
      class="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      @click.self="closeComplaintDialog"
    >
      <section class="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-38px_rgba(15,23,42,0.75)]">
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p class="text-xs font-semibold text-rose-500">投诉卖家</p>
            <h2 class="mt-1 text-xl font-black text-slate-950">
              {{ complaintOrder?.sellerName || '校园卖家' }}
            </h2>
            <p class="mt-1 text-sm text-slate-400">
              订单号 {{ complaintOrder?.orderNo || complaintOrder?.id || '-' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
            :disabled="complaintSubmitting"
            @click="closeComplaintDialog"
          >
            ×
          </button>
        </div>

        <div class="space-y-5 px-6 py-5">
          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-800">选择投诉原因</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="option in complaintReasonOptions"
                :key="option"
                type="button"
                class="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition"
                :class="
                  complaintForm.reasonType === option
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/60'
                "
                :disabled="complaintSubmitting"
                @click="complaintForm.reasonType = option"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="complaintForm.reasonType === option ? 'bg-rose-500' : 'bg-slate-200'"
                />
                {{ option }}
              </button>
            </div>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-800">补充说明</span>
            <textarea
              v-model="complaintForm.description"
              class="min-h-28 w-full resize-none rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
              maxlength="160"
              placeholder="可以补充交易经过、沟通问题或其他证据说明"
              :disabled="complaintSubmitting"
            />
            <span class="block text-right text-xs text-slate-400">
              {{ complaintForm.description.length }}/160
            </span>
          </label>

          <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            投诉会提交到平台举报处理中心，管理员可查看订单对应卖家信息并进行处理。
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button
            variant="outline"
            class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
            :disabled="complaintSubmitting"
            @click="closeComplaintDialog"
          >
            取消
          </Button>
          <Button
            class="rounded-full bg-rose-500 text-white hover:bg-rose-600"
            :disabled="complaintSubmitting"
            @click="submitComplaint"
          >
            <LoaderCircle v-if="complaintSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ complaintSubmitting ? '提交中' : '提交投诉' }}
          </Button>
        </div>
      </section>
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
  </div>
</template>
