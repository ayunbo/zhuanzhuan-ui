<!-- APIs: GET /api/user/goods/seller/:sellerId -> SellerSpaceVO{sellerId,sellerName,sellerAvatar,sellerCampus,sellerIntro,sellerScoreAvg,sellerReviewCount,onSaleCount,soldCount}; GET /api/user/goods?page&pageSize&sellerId&status -> UserGoodsPageVO; seller goods sort: fixed publish_time desc only; seller goods status filter: 3在售 5已售出; scanned review API: GET /api/user/review/seller/:sellerId?page&pageSize&scoreType -->
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck,
  ChevronDown,
  Flag,
  Heart,
  LoaderCircle,
  MapPin,
  PackageOpen,
  Star,
  X,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import request, { ensureLoggedIn } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const PAGE_SIZE = 15

const loadingProfile = ref(false)
const loadingGoods = ref(false)
const loadingReviews = ref(false)
const page = ref(1)
const total = ref(0)
const activeTab = ref('goods')
const activeFilter = ref('latest')
const sortLabel = ref('最新发布')
const goods = ref([])
const reportDialogVisible = ref(false)
const reportSubmitting = ref(false)

const seller = reactive({
  sellerId: null,
  sellerName: '',
  sellerAvatar: '',
  sellerCampus: '',
  sellerIntro: '',
  sellerScoreAvg: null,
  sellerReviewCount: 0,
  onSaleCount: 0,
  soldCount: 0,
})

const reviewStats = reactive({
  totalCount: 0,
  goodCount: 0,
  neutralCount: 0,
  badCount: 0,
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const reportForm = reactive({
  reasonType: '商家信息不实',
  description: '',
})

const reportReasonOptions = [
  '商家信息不实',
  '疑似欺诈或诱导转账',
  '交易态度恶劣',
  '发布违规商品',
  '其他问题',
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

  if (start > 2) pages.push('left-ellipsis')
  for (let value = start; value <= end; value += 1) pages.push(value)
  if (end < last - 1) pages.push('right-ellipsis')
  pages.push(last)
  return pages
})

const sellerId = computed(() => {
  const value = Number(route.params.id)
  return Number.isFinite(value) && value > 0 ? value : null
})

const sellerScoreLabel = computed(() => {
  const score = Number(seller.sellerScoreAvg)
  return Number.isNaN(score) ? '暂无评分' : score.toFixed(1)
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

function normalizeGoods(record = {}) {
  return {
    id: record.id ?? null,
    sellerId: record.sellerId ?? null,
    categoryId: record.categoryId ?? null,
    categoryName: record.categoryName || '未分类',
    title: record.title || '未命名商品',
    price: record.price,
    oldPrice: record.oldPrice,
    quality: record.quality,
    location: record.location || '校内面交',
    status: Number(record.status ?? 3),
    statusDesc: record.statusDesc || '',
    cover: record.cover || '',
    viewCount: Number(record.viewCount || 0),
    favoriteCount: Number(record.favoriteCount || 0),
    sellerName: record.sellerName || seller.sellerName || '校园卖家',
    sellerAvatar: record.sellerAvatar || seller.sellerAvatar || '',
    publishTime: record.publishTime || '',
  }
}

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number % 1 === 0 ? String(number) : number.toFixed(2)
}

function isSold(item) {
  return item.status === 5
}

async function fetchSellerProfile() {
  if (!sellerId.value) return

  loadingProfile.value = true
  try {
    const { data } = await request.get(`/user/goods/seller/${sellerId.value}`)
    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '卖家信息加载失败')
    }

    Object.assign(seller, {
      sellerId: data.data.sellerId ?? null,
      sellerName: data.data.sellerName || '',
      sellerAvatar: data.data.sellerAvatar || '',
      sellerCampus: data.data.sellerCampus || '',
      sellerIntro: data.data.sellerIntro || '',
      sellerScoreAvg: data.data.sellerScoreAvg ?? null,
      sellerReviewCount: data.data.sellerReviewCount ?? 0,
      onSaleCount: Number(data.data.onSaleCount || 0),
      soldCount: Number(data.data.soldCount || 0),
    })
  } catch (error) {
    showToast(getErrorMessage(error, '卖家信息加载失败'), 'error')
  } finally {
    loadingProfile.value = false
  }
}

async function fetchGoods() {
  if (!sellerId.value) return

  loadingGoods.value = true
  try {
    const { data } = await request.get('/user/goods', {
      params: {
        page: page.value,
        pageSize: PAGE_SIZE,
        sellerId: sellerId.value,
        status:
          activeFilter.value === 'onSale'
            ? 3
            : activeFilter.value === 'sold'
              ? 5
              : undefined,
      },
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '卖家商品加载失败')
    }

    const pageData = data?.data || {}
    goods.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeGoods) : []
    total.value = Number(pageData.total || 0)
  } catch (error) {
    showToast(getErrorMessage(error, '卖家商品加载失败'), 'error')
  } finally {
    loadingGoods.value = false
  }
}

async function fetchReviewStats() {
  if (!sellerId.value) return

  loadingReviews.value = true
  try {
    const { data } = await request.get(`/user/review/seller/${sellerId.value}`, {
      params: {
        page: 1,
        pageSize: 10,
        scoreType: 0,
      },
    })

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '评价数据加载失败')
    }

    Object.assign(reviewStats, data.data.stats || {})
  } catch (error) {
    showToast(getErrorMessage(error, '评价数据加载失败'), 'error')
  } finally {
    loadingReviews.value = false
  }
}

function handleFollow() {
  showToast('关注功能开发中，敬请期待')
}

function openReportDialog() {
  if (!ensureLoggedIn({ source: 'seller-profile-report' })) {
    return
  }
  if (!seller.sellerId) {
    showToast('商家信息缺失，暂时无法举报', 'error')
    return
  }

  reportDialogVisible.value = true
}

function closeReportDialog() {
  if (reportSubmitting.value) {
    return
  }

  reportDialogVisible.value = false
}

function buildReportReason() {
  const description = reportForm.description.trim()
  if (!description) {
    return reportForm.reasonType
  }

  return `${reportForm.reasonType}：${description}`
}

async function submitReport() {
  if (reportSubmitting.value) {
    return
  }

  const reason = buildReportReason()
  if (!reason.trim()) {
    showToast('请选择或填写举报原因', 'error')
    return
  }

  reportSubmitting.value = true
  try {
    const { data } = await request.post('/user/report', {
      targetType: 2,
      targetId: seller.sellerId,
      reason,
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '举报提交失败')
    }

    showToast('举报已提交，管理员会尽快处理')
    reportDialogVisible.value = false
    reportForm.reasonType = '商家信息不实'
    reportForm.description = ''
  } catch (error) {
    showToast(getErrorMessage(error, '举报提交失败'), 'error')
  } finally {
    reportSubmitting.value = false
  }
}

function selectFilter(filter) {
  if (activeFilter.value === filter) return
  activeFilter.value = filter
  page.value = 1
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) return
  page.value = targetPage
}

function openGoodsDetail(goodsId) {
  router.push(`/goods/${goodsId}`)
}

watch(
  () => [sellerId.value, activeFilter.value, page.value],
  () => {
    fetchGoods()
  },
  { immediate: true },
)

watch(
  () => [sellerId.value, activeTab.value],
  () => {
    if (activeTab.value === 'credit') {
      fetchReviewStats()
    }
  },
)

onMounted(() => {
  fetchSellerProfile()
})
</script>

<template>
  <section class="bg-slate-50 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1480px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div class="space-y-6">
        <div class="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#fffdf5_0%,#ffffff_52%,#f8fafc_100%)] px-1 py-3 sm:px-1 sm:py-4">
          <div v-if="loadingProfile" class="flex min-h-[180px] items-center justify-center">
            <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm text-slate-500">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              正在加载卖家主页
            </div>
          </div>

          <div v-else class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-5">
              <Avatar
                size="lg"
                :src="seller.sellerAvatar"
                :fallback="seller.sellerName?.slice(0, 1) || '卖'"
                class="h-24 w-24 text-3xl shadow-[0_18px_36px_-24px_rgba(249,115,22,0.75)]"
              />

              <div class="min-w-0 space-y-4">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-[30px] font-black tracking-tight text-slate-950">
                      {{ seller.sellerName || '校园卖家' }}
                    </h1>
                    <Badge class="border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      <BadgeCheck class="mr-1 h-3.5 w-3.5" />
                      信用 {{ sellerScoreLabel }}
                    </Badge>
                  </div>

                  <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span class="inline-flex items-center gap-1.5">
                      <MapPin class="h-4 w-4" />
                      {{ seller.sellerCampus || '校园内卖家' }}
                    </span>
                    <span>在售 {{ seller.onSaleCount }}</span>
                    <span>已售出 {{ seller.soldCount }}</span>
                    <span>评价 {{ seller.sellerReviewCount || 0 }}</span>
                  </div>
                </div>

                <p class="max-w-2xl text-sm leading-7 text-slate-600">
                  {{ seller.sellerIntro || '卖家暂未补充更多描述。' }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <Button
                class="h-11 rounded-full bg-yellow-400 px-6 text-slate-950 shadow-[0_18px_40px_-26px_rgba(250,204,21,0.72)] hover:bg-yellow-500"
                @click="handleFollow"
              >
                <Heart class="mr-2 h-4 w-4" />
                关注
              </Button>

              <Button
                variant="outline"
                class="h-11 rounded-full border-rose-100 bg-white px-5 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                @click="openReportDialog"
              >
                <Flag class="mr-2 h-4 w-4" />
                举报
              </Button>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="flex items-center gap-8 border-b border-slate-100 pb-4 text-sm font-semibold">
            <button
              type="button"
              class="border-b-2 pb-3 transition"
              :class="
                activeTab === 'goods'
                  ? 'border-slate-950 text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              "
              @click="activeTab = 'goods'"
            >
              宝贝
            </button>
            <button
              type="button"
              class="border-b-2 pb-3 transition"
              :class="
                activeTab === 'credit'
                  ? 'border-slate-950 text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              "
              @click="activeTab = 'credit'"
            >
              信用及评价
            </button>
          </div>

          <template v-if="activeTab === 'goods'">
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 items-center gap-2 rounded-md bg-[#fce73d] px-4 text-sm font-semibold text-slate-900"
                :class="
                  activeFilter === 'latest'
                    ? 'bg-[#fce73d] text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                "
                @click="selectFilter('latest')"
              >
                {{ sortLabel }}
                <ChevronDown class="h-4 w-4 text-slate-900" />
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition"
                  :class="
                    activeFilter === 'onSale'
                      ? 'bg-[#fce73d] text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  "
                  @click="selectFilter('onSale')"
                >
                  在售{{ seller.onSaleCount }}
                </button>
                <button
                  type="button"
                  class="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition"
                  :class="
                    activeFilter === 'sold'
                      ? 'bg-[#fce73d] text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  "
                  @click="selectFilter('sold')"
                >
                  已售出{{ seller.soldCount }}
                </button>
              </div>
            </div>

            <div
              v-if="loadingGoods"
              class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <div
                v-for="index in PAGE_SIZE"
                :key="index"
                class="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
              >
                <div class="aspect-square bg-slate-100" />
                <div class="space-y-3 p-3">
                  <div class="h-3 rounded bg-slate-100" />
                  <div class="h-4 rounded bg-slate-100" />
                  <div class="h-4 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            </div>

            <div
              v-else-if="goods.length"
              class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <article
                v-for="item in goods"
                :key="item.id"
                class="group cursor-pointer overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
                @click="openGoodsDetail(item.id)"
              >
                <div class="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
                  <img
                    v-if="item.cover"
                    :src="item.cover"
                    :alt="item.title"
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center bg-slate-100">
                    <PackageOpen class="h-10 w-10 text-slate-300" />
                  </div>

                  <div v-if="isSold(item)" class="absolute inset-0 bg-slate-950/28" />
                  <div v-if="isSold(item)" class="absolute inset-0 flex items-center justify-center">
                    <div
                      class="rotate-[-14deg] rounded-full border-[3px] border-white/90 px-6 py-2 text-xl font-black tracking-[0.18em] text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.7)]"
                    >
                      卖掉了
                    </div>
                  </div>
                </div>

                <div class="space-y-3 p-3">
                  <div class="min-w-0 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <p class="truncate text-[11px] font-medium text-slate-500">
                        {{ item.categoryName }}
                      </p>
                      <p class="truncate text-[11px] text-slate-400">{{ item.location }}</p>
                    </div>
                    <h3
                      class="truncate text-sm font-semibold"
                      :class="isSold(item) ? 'text-slate-400' : 'text-slate-900'"
                    >
                      {{ item.title }}
                    </h3>
                    <div class="flex items-center gap-2">
                      <p
                        class="text-lg font-semibold"
                        :class="isSold(item) ? 'text-slate-400' : 'text-brand-600'"
                      >
                        ￥{{ formatPrice(item.price) }}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div
              v-else
              class="flex min-h-[340px] flex-col items-center justify-center gap-5 text-center"
            >
              <div class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                <PackageOpen class="h-10 w-10" />
              </div>
              <div class="space-y-2">
                <p class="text-lg font-semibold text-slate-800">暂无商品</p>
                <p class="text-sm text-slate-400">这个卖家暂时没有可展示的宝贝</p>
              </div>
            </div>

            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
                :disabled="page <= 1"
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
                  @click="changePage(entry)"
                >
                  {{ entry }}
                </Button>
              </template>

              <Button
                variant="outline"
                size="sm"
                class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
                :disabled="page >= totalPages"
                @click="changePage(page + 1)"
              >
                下一页
              </Button>
            </div>
          </template>

          <template v-else>
            <div
              v-if="loadingReviews"
              class="flex min-h-[360px] items-center justify-center"
            >
              <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm text-slate-500">
                <LoaderCircle class="h-4 w-4 animate-spin" />
                正在加载评价
              </div>
            </div>

            <div v-else class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div class="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm">
                    <Star class="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <p class="text-sm text-slate-500">信用评分</p>
                    <p class="text-2xl font-black text-slate-950">{{ sellerScoreLabel }}</p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">总评价</p>
                  <p class="mt-3 text-2xl font-black text-slate-950">{{ reviewStats.totalCount }}</p>
                </div>
                <div class="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">好评</p>
                  <p class="mt-3 text-2xl font-black text-emerald-600">{{ reviewStats.goodCount }}</p>
                </div>
                <div class="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">中评</p>
                  <p class="mt-3 text-2xl font-black text-amber-500">{{ reviewStats.neutralCount }}</p>
                </div>
                <div class="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">差评</p>
                  <p class="mt-3 text-2xl font-black text-rose-500">{{ reviewStats.badCount }}</p>
                </div>
              </div>
            </div>
          </template>
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

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="reportDialogVisible"
        class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
        @click.self="closeReportDialog"
      >
        <section
          class="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)]"
        >
          <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div class="space-y-1">
              <h2 class="text-xl font-black text-slate-950">举报商家</h2>
              <p class="text-sm leading-6 text-slate-500">
                请选择最接近的问题类型，补充的信息会帮助管理员更快判断。
              </p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              :disabled="reportSubmitting"
              @click="closeReportDialog"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="space-y-5 px-6 py-5">
            <div class="grid gap-2">
              <button
                v-for="option in reportReasonOptions"
                :key="option"
                type="button"
                class="flex min-h-11 items-center justify-between rounded-2xl border px-4 text-left text-sm font-semibold transition"
                :class="
                  reportForm.reasonType === option
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                "
                @click="reportForm.reasonType = option"
              >
                <span>{{ option }}</span>
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="reportForm.reasonType === option ? 'bg-rose-500' : 'bg-slate-200'"
                />
              </button>
            </div>

            <label class="block space-y-2">
              <span class="text-sm font-bold text-slate-800">补充说明</span>
              <textarea
                v-model="reportForm.description"
                maxlength="180"
                rows="4"
                class="w-full resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white"
                placeholder="例如：要求线下转账、辱骂骚扰、商家信息与实际不符等"
              />
              <span class="block text-right text-xs text-slate-400">
                {{ reportForm.description.length }}/180
              </span>
            </label>
          </div>

          <footer class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <Button
              variant="outline"
              class="rounded-full border-slate-200 px-5 text-slate-600"
              :disabled="reportSubmitting"
              @click="closeReportDialog"
            >
              取消
            </Button>
            <Button
              class="rounded-full bg-rose-500 px-6 text-white hover:bg-rose-600"
              :disabled="reportSubmitting"
              @click="submitReport"
            >
              {{ reportSubmitting ? '提交中' : '提交举报' }}
            </Button>
          </footer>
        </section>
      </div>
    </transition>
  </section>
</template>
