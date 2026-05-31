<!-- 商品详情 API: GET /api/user/goods/{id}; 核心字段: id, sellerId, sellerName, sellerAvatar, sellerCampus, sellerScoreAvg, sellerReviewCount, categoryId, categoryName, title, detail, price, oldPrice, quality, location, status, statusDesc, cover, viewCount, favoriteCount, publishTime, images[{ url, sort, isCover }] -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck,
  Flag,
  Heart,
  LoaderCircle,
  MessageCircle,
  ShoppingBag,
  Star,
  X,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { initChatSession } from '@/api/chat'
import { recordBrowseHistory } from '@/api/history'
import { getGoodsReviewPage } from '@/api/review'
import request, { AUTH_CHANGED_EVENT, ensureLoggedIn, getAuthUser, isLoggedIn } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const selectedImageIndex = ref(0)
const favoriteLoading = ref(false)
const isFavorited = ref(false)
const reportDialogVisible = ref(false)
const reportSubmitting = ref(false)
const browseRecordLoading = ref(false)
const reviewsLoading = ref(false)
const chatOpening = ref(false)
const reviewRecords = ref([])

const reviewPager = reactive({
  page: 1,
  pageSize: 5,
  total: 0,
})

const detail = reactive({
  id: null,
  sellerId: null,
  sellerName: '',
  sellerAvatar: '',
  sellerCampus: '',
  sellerScoreAvg: null,
  sellerReviewCount: 0,
  categoryId: null,
  categoryName: '',
  title: '',
  detail: '',
  price: '',
  oldPrice: '',
  quality: null,
  location: '',
  status: null,
  statusDesc: '',
  cover: '',
  viewCount: 0,
  favoriteCount: 0,
  publishTime: '',
  images: [],
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const reportForm = reactive({
  reasonType: '商品信息虚假',
  description: '',
})

const reportReasonOptions = [
  '商品信息虚假',
  '疑似违禁或违规商品',
  '价格或交易方式异常',
  '盗图或冒用他人信息',
  '其他问题',
]

const galleryImages = computed(() => {
  const fromImages = Array.isArray(detail.images)
    ? detail.images
        .slice()
        .sort((a, b) => {
          const coverDiff = Number(b?.isCover || 0) - Number(a?.isCover || 0)
          if (coverDiff !== 0) {
            return coverDiff
          }
          return Number(a?.sort || 0) - Number(b?.sort || 0)
        })
        .map((item) => item?.url)
        .filter(Boolean)
        .map((url, index) => ({
          id: `${url}-${index}`,
          url,
        }))
    : []

  if (fromImages.length) {
    return fromImages
  }

  if (detail.cover) {
    return [{ id: `cover-${detail.id || 'default'}`, url: detail.cover }]
  }

  return []
})

const currentImage = computed(() => galleryImages.value[selectedImageIndex.value]?.url || '')
const qualityLabel = computed(() => mapQualityLabel(detail.quality))
const sellerScoreLabel = computed(() => {
  const score = Number(detail.sellerScoreAvg)
  if (Number.isNaN(score)) {
    return '暂无评分'
  }
  return score.toFixed(1)
})
const publishTimeLabel = computed(() => formatDateTime(detail.publishTime))
const reviewPageLabel = computed(() => `第 ${reviewPager.page} 页 / 共 ${Math.max(1, Math.ceil(reviewPager.total / reviewPager.pageSize))} 页`)
const detailLines = computed(() =>
  detail.detail
    ? detail.detail.split(/\r?\n/).filter((line) => line.trim())
    : ['卖家暂未补充更多商品描述。'],
)
const isOnSale = computed(() => Number(detail.status) === 3)
const isSold = computed(() => Number(detail.status) === 5)
const buyButtonText = computed(() => {
  if (isSold.value) {
    return '已售出'
  }

  if (!isOnSale.value) {
    return detail.statusDesc || '暂不可购买'
  }

  return '立即购买'
})

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

function mapQualityLabel(value) {
  const qualityMap = {
    1: '成色较差',
    2: '成色一般',
    3: '成色良好',
    4: '成色很新',
    5: '近乎全新',
  }

  return qualityMap[value] || '成色未知'
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function formatDateTime(value) {
  if (!value) {
    return '刚刚发布'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚发布'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function parseImageUrls(images) {
  if (!images) {
    return []
  }

  return String(images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getReviewImages(review) {
  return parseImageUrls(review?.images)
}

function getReviewerName(review) {
  if (review?.reviewerName) {
    return review.reviewerName
  }
  return review?.anonymous === 1 ? '匿名买家' : '买家'
}

function reviewLevelText(score) {
  const value = Number(score || 0)
  if (value >= 5) return '好评'
  if (value >= 3) return '中评'
  return '差评'
}

function reviewLevelClass(score) {
  const value = Number(score || 0)
  if (value >= 5) return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
  if (value >= 3) return 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
  return 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
}

function applyDetail(data = {}) {
  detail.id = data.id ?? null
  detail.sellerId = data.sellerId ?? null
  detail.sellerName = data.sellerName ?? ''
  detail.sellerAvatar = data.sellerAvatar ?? ''
  detail.sellerCampus = data.sellerCampus ?? ''
  detail.sellerScoreAvg = data.sellerScoreAvg ?? null
  detail.sellerReviewCount = data.sellerReviewCount ?? 0
  detail.categoryId = data.categoryId ?? null
  detail.categoryName = data.categoryName ?? ''
  detail.title = data.title ?? ''
  detail.detail = data.detail ?? ''
  detail.price = data.price ?? ''
  detail.oldPrice = data.oldPrice ?? ''
  detail.quality = data.quality ?? null
  detail.location = data.location ?? ''
  detail.status = data.status ?? null
  detail.statusDesc = data.statusDesc ?? ''
  detail.cover = data.cover ?? ''
  detail.viewCount = data.viewCount ?? 0
  detail.favoriteCount = data.favoriteCount ?? 0
  detail.publishTime = data.publishTime ?? ''
  detail.images = Array.isArray(data.images) ? data.images : []
}

async function fetchDetail() {
  const goodsId = route.params.id
  if (!goodsId) {
    router.replace('/')
    return
  }

  loading.value = true

  try {
    const { data } = await request.get(`/user/goods/${goodsId}`)

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '商品详情加载失败')
    }

    applyDetail(data.data)
    selectedImageIndex.value = 0
    await Promise.all([recordCurrentBrowseHistory(), syncFavoriteStatus(), loadGoodsReviews()])
  } catch (error) {
    showToast(getErrorMessage(error, '商品详情加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function loadGoodsReviews() {
  if (!detail.id) {
    reviewRecords.value = []
    reviewPager.total = 0
    return
  }

  reviewsLoading.value = true
  try {
    const data = await getGoodsReviewPage(detail.id, {
      page: reviewPager.page,
      pageSize: reviewPager.pageSize,
    })
    reviewRecords.value = Array.isArray(data?.records) ? data.records : []
    reviewPager.total = Number(data?.total || 0)
  } catch (error) {
    reviewPager.total = 0
    showToast(getErrorMessage(error, '商品评价加载失败'), 'error')
  } finally {
    reviewsLoading.value = false
  }
}

async function recordCurrentBrowseHistory() {
  if (!detail.id || !isLoggedIn() || browseRecordLoading.value) {
    return
  }

  browseRecordLoading.value = true
  try {
    await recordBrowseHistory(detail.id)
  } catch {
    // Ignore history write failures so they do not block the detail page.
  } finally {
    browseRecordLoading.value = false
  }
}

async function syncFavoriteStatus() {
  if (!detail.id || !isLoggedIn()) {
    isFavorited.value = false
    return
  }

  try {
    const { data } = await request.get(`/user/favorites/${detail.id}/status`, {
      skipAuthRedirect: true,
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '收藏状态加载失败')
    }

    isFavorited.value = Boolean(data.data?.favorited)
  } catch (error) {
    isFavorited.value = false
    if (error?.response?.status !== 401) {
      showToast(getErrorMessage(error, '收藏状态加载失败'), 'error')
    }
  }
}

function selectImage(index) {
  selectedImageIndex.value = index
}

function openSellerSpace() {
  if (!detail.sellerId) {
    return
  }

  router.push(`/seller/${detail.sellerId}`)
}

async function handleChat() {
  if (!ensureLoggedIn({ source: 'goods-detail-chat' })) {
    return
  }
  if (chatOpening.value) {
    return
  }
  if (!detail.id || !detail.sellerId) {
    showToast('商品或卖家信息缺失，暂时无法发起聊天', 'error')
    return
  }

  const currentUser = getAuthUser()
  const buyerId = Number(currentUser?.id)
  const sellerId = Number(detail.sellerId)

  if (!buyerId) {
    showToast('请先登录后再联系卖家', 'error')
    return
  }
  if (buyerId === sellerId) {
    showToast('不能和自己发布的商品发起聊天', 'error')
    return
  }

  chatOpening.value = true
  try {
    const session = await initChatSession({
      goodsId: Number(detail.id),
      sellerId,
      buyerId,
    })
    const sessionId = Number(session?.sessionId || 0)

    if (!sessionId) {
      throw new Error('服务端未返回聊天会话')
    }

    router.push({
      path: '/chat',
      query: {
        sessionId: String(sessionId),
      },
    })
  } catch (error) {
    showToast(getErrorMessage(error, '聊天会话打开失败'), 'error')
  } finally {
    chatOpening.value = false
  }
}

function handleBuyNow() {
  if (!ensureLoggedIn({ source: 'goods-detail-buy' })) {
    return
  }
  if (!isOnSale.value) {
    showToast(isSold.value ? '商品已售出' : detail.statusDesc || '当前商品暂不可购买', 'error')
    return
  }
  if (!detail.id) {
    return
  }
  router.push(`/checkout/${detail.id}`)
}

function handleFavorite() {
  if (!ensureLoggedIn({ source: 'goods-detail-favorite' })) {
    return
  }
  if (!detail.id || favoriteLoading.value) {
    return
  }

  window.clearTimeout(handleFavorite.timer)
  handleFavorite.timer = window.setTimeout(async () => {
    favoriteLoading.value = true

    try {
      const method = isFavorited.value ? 'delete' : 'post'
      const actionText = isFavorited.value ? '取消收藏' : '加入收藏'
      const { data } = await request[method](`/user/favorites/${detail.id}`)

      if (data?.code !== 1) {
        throw new Error(data?.msg || `${actionText}失败`)
      }

      isFavorited.value = Boolean(data.data?.favorited)
      detail.favoriteCount = Number(data.data?.favoriteCount ?? detail.favoriteCount ?? 0)
      showToast(isFavorited.value ? '已加入收藏' : '已取消收藏')
    } catch (error) {
      showToast(getErrorMessage(error, isFavorited.value ? '取消收藏失败' : '加入收藏失败'), 'error')
    } finally {
      favoriteLoading.value = false
    }
  }, 180)
}

function openReportDialog() {
  if (!ensureLoggedIn({ source: 'goods-detail-report' })) {
    return
  }
  if (!detail.id) {
    showToast('商品信息缺失，暂时无法举报', 'error')
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
      targetType: 1,
      targetId: detail.id,
      reason,
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '举报提交失败')
    }

    showToast('举报已提交，管理员会尽快处理')
    reportDialogVisible.value = false
    reportForm.reasonType = '商品信息虚假'
    reportForm.description = ''
  } catch (error) {
    showToast(getErrorMessage(error, '举报提交失败'), 'error')
  } finally {
    reportSubmitting.value = false
  }
}

function handleAuthChanged() {
  syncFavoriteStatus()
}

function changeReviewPage(step) {
  const nextPage = reviewPager.page + step
  const maxPage = Math.max(1, Math.ceil(reviewPager.total / reviewPager.pageSize))

  if (nextPage < 1 || nextPage > maxPage || nextPage === reviewPager.page) {
    return
  }

  reviewPager.page = nextPage
  loadGoodsReviews()
}

watch(
  () => route.params.id,
  () => {
    reviewPager.page = 1
    reviewPager.total = 0
    fetchDetail()
  },
)

onMounted(() => {
  fetchDetail()
  window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
  window.clearTimeout(handleFavorite.timer)
  window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})
</script>

<template>
  <section class="bg-slate-50 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-[1480px] flex-col gap-4">
      <Card class="border border-slate-200/80 bg-white px-4 py-2 shadow-sm sm:px-5">
        <div v-if="loading" class="flex min-h-16 items-center justify-center">
          <div
            class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-500"
          >
            <LoaderCircle class="h-4 w-4 animate-spin" />
            正在加载卖家信息
          </div>
        </div>

        <button
          v-else
          type="button"
          class="flex w-full items-center justify-between gap-4 rounded-[20px] border border-transparent bg-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-white"
          @click="openSellerSpace"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Avatar
              size="lg"
              :src="detail.sellerAvatar"
              :fallback="detail.sellerName?.slice(0, 1) || 'S'"
            />
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-base font-black text-slate-950">
                  {{ detail.sellerName || '校园卖家' }}
                </p>
                <Badge variant="success">
                  <BadgeCheck class="mr-1 h-3.5 w-3.5" />
                  信用 {{ sellerScoreLabel }}
                </Badge>
              </div>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{{ detail.sellerCampus || '校内卖家' }}</span>
                <span>累计评价 {{ detail.sellerReviewCount || 0 }}</span>
              </div>
            </div>
          </div>

          <Badge variant="outline">卖家主页</Badge>
        </button>
      </Card>

      <Card class="border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div v-if="loading" class="flex min-h-[560px] items-center justify-center">
          <div
            class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-500"
          >
            <LoaderCircle class="h-4 w-4 animate-spin" />
            正在加载商品详情
          </div>
        </div>

        <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <div class="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)]">
            <div
              class="flex max-h-[560px] gap-3 overflow-x-auto lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1"
            >
              <button
                v-for="(image, index) in galleryImages"
                :key="image.id"
                type="button"
                class="h-[74px] w-[74px] shrink-0 overflow-hidden rounded-2xl border bg-slate-50 transition"
                :class="
                  selectedImageIndex === index
                    ? 'border-brand-400 shadow-[0_14px_30px_-18px_rgba(249,115,22,0.85)]'
                    : 'border-slate-200 hover:border-slate-300'
                "
                @click="selectImage(index)"
              >
                <img :src="image.url" :alt="detail.title" class="h-full w-full object-cover" />
              </button>
            </div>

            <div
              class="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-[28px] bg-slate-50"
            >
              <img
                v-if="currentImage"
                :src="currentImage"
                :alt="detail.title"
                class="h-full max-h-[560px] w-full object-contain"
              />
              <div v-else class="text-sm text-slate-400">暂无图片</div>
              <div v-if="isSold" class="absolute inset-0 bg-slate-950/20" />
              <div v-if="isSold" class="absolute inset-0 flex items-center justify-center">
                <div
                  class="-rotate-12 rounded-full border-4 border-white/90 px-9 py-4 text-3xl font-black tracking-[0.18em] text-white shadow-[0_14px_40px_-18px_rgba(15,23,42,0.5)]"
                >
                  已售出
                </div>
              </div>
            </div>
          </div>

          <div class="flex min-h-[560px] flex-col rounded-[28px] bg-white p-1">
            <div class="space-y-4">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-4xl font-black tracking-tight text-brand-500">
                        ￥{{ formatPrice(detail.price) }}
                      </p>
                      <p v-if="detail.oldPrice" class="text-base text-slate-400 line-through">
                        ￥{{ formatPrice(detail.oldPrice) }}
                      </p>
                    </div>
                  </div>

                  <div class="shrink-0 text-right">
                    <p class="text-sm font-semibold text-slate-900">{{ qualityLabel }}</p>
                    <p class="mt-2 text-sm text-slate-400">
                      {{ detail.favoriteCount || 0 }}人收藏 | {{ detail.viewCount || 0 }}次浏览
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <h1 class="text-[22px] font-bold leading-snug text-slate-950">
                  {{ detail.title || '未命名商品' }}
                </h1>
                <div class="text-sm leading-6 text-slate-600">
                  <p
                    v-for="(line, index) in detailLines"
                    :key="`${line}-${index}`"
                    class="whitespace-pre-wrap"
                  >
                    {{ line }}
                  </p>
                </div>
              </div>

              <div
                class="grid gap-3 rounded-[24px] border border-slate-100 bg-white p-4 text-sm text-slate-500"
              >
                <div class="flex items-center justify-between gap-4">
                  <span>交易地点</span>
                  <span class="font-medium text-slate-700">{{ detail.location || '校内当面交易' }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span>发布时间</span>
                  <span class="font-medium text-slate-700">{{ publishTimeLabel }}</span>
                </div>
              </div>

              <div class="space-y-3">
                <div class="grid min-w-0 grid-cols-2 overflow-hidden rounded-full">
                  <button
                    type="button"
                    class="flex h-12 items-center justify-center gap-2 bg-[#ffe55c] px-4 text-base font-bold text-slate-900 transition hover:bg-[#ffdf40] disabled:cursor-wait disabled:bg-slate-200 disabled:text-slate-500"
                    :disabled="chatOpening"
                    @click="handleChat"
                  >
                    <LoaderCircle v-if="chatOpening" class="h-4 w-4 animate-spin" />
                    <MessageCircle v-else class="h-4 w-4" />
                    {{ chatOpening ? '打开中' : '聊一聊' }}
                  </button>
                  <button
                    type="button"
                    class="flex h-12 items-center justify-center gap-2 px-4 text-base font-bold text-white transition"
                    :class="
                      isOnSale
                        ? 'bg-slate-800 hover:bg-slate-700'
                        : 'cursor-not-allowed bg-slate-300 text-slate-500'
                    "
                    :disabled="!isOnSale"
                    @click="handleBuyNow"
                  >
                    <ShoppingBag class="h-4 w-4" />
                    {{ buyButtonText }}
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <Button
                    :variant="isFavorited ? 'default' : 'outline'"
                    size="lg"
                    class="h-11 justify-center rounded-full px-5 text-sm font-bold"
                    :class="
                      isFavorited
                        ? 'border border-brand-500 bg-brand-500 text-white hover:bg-brand-600'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-600'
                    "
                    :disabled="favoriteLoading"
                    @click="handleFavorite"
                  >
                    <Heart class="h-4 w-4" :class="isFavorited ? 'fill-current' : ''" />
                    {{ favoriteLoading ? '处理中' : isFavorited ? '已收藏' : '收藏' }}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    class="h-11 justify-center rounded-full border border-rose-100 bg-white px-5 text-sm font-bold text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                    @click="openReportDialog"
                  >
                    <Flag class="h-4 w-4" />
                    举报
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card class="border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">买家评价</p>
            <h2 class="text-2xl font-black tracking-tight text-slate-950">商品评价</h2>
            <p class="text-sm text-slate-500">
              这里展示的是该商品已完成订单的买家评价，默认按最新时间排序。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline">共 {{ reviewPager.total || 0 }} 条</Badge>
            <Badge variant="success">卖家累计 {{ detail.sellerReviewCount || 0 }} 条</Badge>
          </div>
        </div>

        <div v-if="reviewsLoading" class="flex min-h-[220px] items-center justify-center">
          <div
            class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-500"
          >
            <LoaderCircle class="h-4 w-4 animate-spin" />
            正在加载商品评价
          </div>
        </div>

        <div v-else-if="reviewRecords.length" class="space-y-4 pt-5">
          <article
            v-for="review in reviewRecords"
            :key="review.id"
            class="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.32)] sm:p-5"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 items-center gap-3">
                <Avatar
                  size="lg"
                  :src="review.reviewerAvatar"
                  :fallback="getReviewerName(review).slice(0, 1)"
                />
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-sm font-bold text-slate-900">
                      {{ getReviewerName(review) }}
                    </p>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="reviewLevelClass(review.score)"
                    >
                      {{ reviewLevelText(review.score) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-1 text-slate-400">
                    <Star
                      v-for="starIndex in 5"
                      :key="`${review.id}-${starIndex}`"
                      class="h-4 w-4"
                      :class="starIndex <= Number(review.score || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'"
                    />
                    <span class="ml-1 text-xs font-medium text-slate-500">{{ Number(review.score || 0).toFixed(1) }}</span>
                  </div>
                </div>
              </div>

              <p class="shrink-0 text-xs text-slate-400">
                {{ formatDateTime(review.createTime) }}
              </p>
            </div>

            <p class="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {{ review.content || '该买家未填写文字评价。' }}
            </p>

            <div
              v-if="getReviewImages(review).length"
              class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              <div
                v-for="(image, imageIndex) in getReviewImages(review)"
                :key="`${review.id}-image-${imageIndex}`"
                class="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <img
                  :src="image"
                  :alt="`${getReviewerName(review)}的评价图片${imageIndex + 1}`"
                  class="h-28 w-full object-cover"
                />
              </div>
            </div>
          </article>

          <div
            v-if="reviewPager.total > reviewPager.pageSize"
            class="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">{{ reviewPageLabel }}</p>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="reviewPager.page <= 1 || reviewsLoading"
                @click="changeReviewPage(-1)"
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="reviewPager.page >= Math.max(1, Math.ceil(reviewPager.total / reviewPager.pageSize)) || reviewsLoading"
                @click="changeReviewPage(1)"
              >
                下一页
              </Button>
            </div>
          </div>
        </div>

        <div v-else class="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
          <div class="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
            暂无评价
          </div>
          <p class="max-w-md text-sm leading-6 text-slate-500">
            该商品暂时还没有买家评价，完成交易后的评价会显示在这里。
          </p>
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
        class="fixed bottom-6 right-6 z-[140] rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        <span class="inline-flex items-center gap-2">
          <Star v-if="toast.type !== 'error'" class="h-4 w-4" />
          {{ toast.message }}
        </span>
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
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
        @click.self="closeReportDialog"
      >
        <section
          class="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)]"
        >
          <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div class="space-y-1">
              <h2 class="text-xl font-black text-slate-950">举报商品</h2>
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
                placeholder="例如：图片和描述不符、疑似违禁品、要求线下转账等"
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
