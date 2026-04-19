<!-- APIs: GET /api/user/wallet/overview -> WalletOverviewVO{loginName,walletUserNo,walletName,walletBalance,walletStatus,bankCards[]}; GET /api/user/wallet/records?page&pageSize -> WalletTransactionVO{id,orderId,recordNo,content,status,channelResponse,amount,payMethod,orderNo,createTime}; no recharge/withdraw API scanned -->
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  CreditCard,
  LoaderCircle,
  RefreshCcw,
  WalletCards,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request, { ensureLoggedIn } from '@/utils/request'

const router = useRouter()
const PAGE_SIZE = 10

const loading = ref(false)
const page = ref(1)
const total = ref(0)
const records = ref([])

const overview = reactive({
  loginName: '',
  walletUserNo: '',
  walletName: '',
  walletBalance: 0,
  walletStatus: 0,
  bankCards: [],
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

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

const activeBankCardCount = computed(() =>
  Array.isArray(overview.bankCards) ? overview.bankCards.length : 0,
)

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
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '0.00'
  }

  return number.toFixed(2)
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

function normalizeRecord(record = {}) {
  return {
    id: record.id ?? null,
    orderId: record.orderId ?? null,
    recordNo: record.recordNo || '',
    content: record.content || '账单记录',
    status: Number(record.status ?? 0),
    channelResponse: record.channelResponse || '',
    amount: Number(record.amount ?? 0),
    payMethod: Number(record.payMethod ?? 0),
    orderNo: record.orderNo || '',
    createTime: record.createTime || '',
  }
}

function resolveRecordAmount(record) {
  if (record.status === 1) {
    return {
      label: `-${formatPrice(record.amount)}`,
      className: 'text-slate-900',
    }
  }

  if (record.status === 0) {
    return {
      label: `${formatPrice(record.amount)}`,
      className: 'text-slate-400',
    }
  }

  return {
    label: `${formatPrice(record.amount)}`,
    className: 'text-rose-500',
  }
}

function resolveRecordStatus(record) {
  if (record.status === 1) {
    return '支付成功'
  }
  if (record.status === 0) {
    return '待支付'
  }
  if (record.status === 2) {
    return '支付失败'
  }
  return '已关闭'
}

async function fetchOverview() {
  const { data } = await request.get('/user/wallet/overview')
  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '钱包概览加载失败')
  }

  Object.assign(overview, {
    loginName: data.data.loginName || '',
    walletUserNo: data.data.walletUserNo || '',
    walletName: data.data.walletName || '',
    walletBalance: data.data.walletBalance ?? 0,
    walletStatus: Number(data.data.walletStatus ?? 0),
    bankCards: Array.isArray(data.data.bankCards) ? data.data.bankCards : [],
  })
}

async function fetchRecords(targetPage = page.value) {
  const { data } = await request.get('/user/wallet/records', {
    params: {
      page: targetPage,
      pageSize: PAGE_SIZE,
    },
  })

  if (data?.code !== 1) {
    throw new Error(data?.msg || '账单明细加载失败')
  }

  const pageData = data?.data || {}
  records.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeRecord) : []
  total.value = Number(pageData.total || 0)
  page.value = targetPage
}

async function loadPage(targetPage = page.value) {
  loading.value = true
  try {
    await Promise.all([fetchOverview(), fetchRecords(targetPage)])
  } catch (error) {
    showToast(getErrorMessage(error, '虚拟钱包加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) {
    return
  }

  loadPage(targetPage)
}

onMounted(() => {
  if (!ensureLoggedIn({ source: 'user-wallet' })) {
    router.replace('/')
    return
  }

  loadPage()
})
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-sm">
      <div
        class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_40%),linear-gradient(135deg,#fff7ed_0%,#ffffff_62%,#f8fafc_100%)] p-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-orange-500 shadow-sm">
              <WalletCards class="h-3.5 w-3.5" />
              VIRTUAL WALLET
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-slate-500">当前余额</p>
              <h1 class="text-4xl font-black tracking-tight text-orange-500 sm:text-5xl">
                ￥{{ formatPrice(overview.walletBalance) }}
              </h1>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>{{ overview.walletName || overview.loginName || '未开通钱包' }}</span>
              <span v-if="overview.walletUserNo">钱包号 {{ overview.walletUserNo }}</span>
              <span>已绑卡 {{ activeBankCardCount }}</span>
            </div>
          </div>

          <div class="flex flex-col items-stretch gap-3 sm:items-end">
            <div
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              :class="
                overview.walletStatus === 1
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              "
            >
              <BadgeCheck v-if="overview.walletStatus === 1" class="h-3.5 w-3.5" />
              {{ overview.walletStatus === 1 ? '钱包可用' : '钱包未开通' }}
            </div>

            <Button
              variant="outline"
              class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
              :disabled="loading"
              @click="loadPage(page)"
            >
              <RefreshCcw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" />
              刷新
            </Button>
          </div>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">账户标识</p>
            <p class="mt-3 truncate text-sm font-semibold text-slate-900">
              {{ overview.loginName || '未获取到登录名' }}
            </p>
          </div>

          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">银行卡</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">{{ activeBankCardCount }} 张</p>
          </div>

          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">账户状态</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">
              {{ overview.walletStatus === 1 ? '正常' : '未开通' }}
            </p>
          </div>
        </div>
      </div>
    </Card>

    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-black tracking-tight text-slate-950">账单明细</h2>
          <p class="text-sm text-slate-400">仅展示后端真实支付流水</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4 pt-6">
        <div
          v-for="index in 5"
          :key="index"
          class="flex items-center justify-between rounded-[24px] border border-slate-100 bg-slate-50/70 px-5 py-4"
        >
          <div class="space-y-2">
            <div class="h-4 w-48 rounded bg-slate-200" />
            <div class="h-3 w-32 rounded bg-slate-100" />
          </div>
          <div class="h-5 w-20 rounded bg-slate-200" />
        </div>
      </div>

      <div v-else-if="records.length" class="divide-y divide-slate-100 pt-3">
        <div
          v-for="record in records"
          :key="record.id"
          class="flex flex-wrap items-center justify-between gap-4 py-4"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-slate-900">{{ record.content }}</p>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                {{ resolveRecordStatus(record) }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>{{ formatDate(record.createTime) }}</span>
              <span v-if="record.orderNo">订单号 {{ record.orderNo }}</span>
              <span v-if="record.recordNo">流水号 {{ record.recordNo }}</span>
            </div>
          </div>

          <div class="text-right">
            <p class="text-lg font-black tracking-tight" :class="resolveRecordAmount(record).className">
              {{ resolveRecordAmount(record).label }}
            </p>
            <p class="mt-1 text-xs text-slate-400">
              {{ record.payMethod === 2 ? '虚拟钱包' : record.payMethod === 1 ? '模拟支付' : '未知渠道' }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center"
      >
        <div
          class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300"
        >
          <CreditCard class="h-10 w-10" />
        </div>
        <div class="space-y-2">
          <p class="text-lg font-semibold text-slate-800">暂无账单明细</p>
          <p class="text-sm text-slate-400">完成首笔支付后会在这里展示</p>
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
