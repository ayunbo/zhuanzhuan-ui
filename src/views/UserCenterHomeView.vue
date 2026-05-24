<!-- 用户资料 API: GET /api/user/profile; 商品 API: GET /api/user/seller/goods/page; 评价 API: GET /api/user/review/seller/{sellerId} -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Package,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSellerReviewPage } from '@/api/review'
import { formatCurrency, formatDateTime } from '@/utils/format'
import request, {
  AUTH_CHANGED_EVENT,
  getAuthUser,
  getToken,
  isLoggedIn as checkLoggedIn,
  setAuthSession,
} from '@/utils/request'

const router = useRouter()

const GOODS_PAGE_SIZE = 6
const REVIEW_PAGE_SIZE = 5

const PANEL_OPTIONS = [
  { key: 'goods', label: '宝贝' },
  { key: 'reviews', label: '信用及评价' },
]

const loading = ref(false)
const goodsLoading = ref(false)
const reviewsLoading = ref(false)
const activePanel = ref('reviews')
const activeReviewFilter = ref(0)

const profile = reactive({
  id: null,
  studentNo: '',
  name: '',
  phone: '',
  avatar: '',
  role: null,
  status: null,
  campus: '',
  intro: '',
  scoreAvg: null,
  reviewCount: 0,
  createTime: '',
  updateTime: '',
})

const goodsPager = reactive({
  page: 1,
  total: 0,
})

const reviewPager = reactive({
  page: 1,
  total: 0,
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const goodsItems = ref([])
const reviewRecords = ref([])
const reviewStats = ref(createEmptyReviewStats())

const displayName = computed(() => profile.name || profile.studentNo || '校园同学')
const displayCampus = computed(() => profile.campus || '暂未填写校区')
const displayIntro = computed(() => profile.intro || '这个同学还没有留下个性签名。')
const displayScore = computed(() => {
  if (profile.scoreAvg === null || profile.scoreAvg === undefined || profile.scoreAvg === '') {
    return '暂无评分'
  }

  const scoreNumber = Number(profile.scoreAvg)
  return Number.isNaN(scoreNumber) ? '暂无评分' : scoreNumber.toFixed(1)
})
const numericScore = computed(() => {
  const scoreNumber = Number(profile.scoreAvg)
  return Number.isNaN(scoreNumber) ? 0 : scoreNumber
})
const scoreBadge = computed(() => {
  const scoreNumber = numericScore.value

  if (scoreNumber >= 4.8) {
    return '信用极佳'
  }

  if (scoreNumber >= 4.3) {
    return '信用优秀'
  }

  if (Number(profile.reviewCount || 0) > 0) {
    return '信用稳定'
  }

  return '校园实名用户'
})
const roleText = computed(() => (Number(profile.role) === 2 ? '认证卖家' : '普通用户'))
const statusText = computed(() => (Number(profile.status) === 1 ? '账号正常' : '状态受限'))
const joinedText = computed(() => formatDate(profile.createTime))

const goodsTotalPages = computed(() => Math.max(1, Math.ceil(goodsPager.total / GOODS_PAGE_SIZE)))
const reviewTotalPages = computed(() => Math.max(1, Math.ceil(reviewPager.total / REVIEW_PAGE_SIZE)))

const reviewFilterTabs = computed(() => [
  { key: 0, label: '全部评价', count: Number(reviewStats.value.totalCount || 0) },
  { key: 1, label: '好评', count: Number(reviewStats.value.goodCount || 0) },
  { key: 2, label: '中评', count: Number(reviewStats.value.neutralCount || 0) },
  { key: 3, label: '差评', count: Number(reviewStats.value.badCount || 0) },
])

const starStats = computed(() => {
  const total = Number(reviewStats.value.totalCount || 0)
  const rows = [
    { score: 5, label: '5 星', count: Number(reviewStats.value.score5Count || 0) },
    { score: 4, label: '4 星', count: Number(reviewStats.value.score4Count || 0) },
    { score: 3, label: '3 星', count: Number(reviewStats.value.score3Count || 0) },
    { score: 2, label: '2 星', count: Number(reviewStats.value.score2Count || 0) },
    { score: 1, label: '1 星', count: Number(reviewStats.value.score1Count || 0) },
  ]

  return rows.map((item) => ({
    ...item,
    ratio: total > 0 ? Number(((item.count / total) * 100).toFixed(2)) : 0,
  }))
})

function createEmptyReviewStats() {
  return {
    totalCount: 0,
    goodCount: 0,
    neutralCount: 0,
    badCount: 0,
    score5Count: 0,
    score4Count: 0,
    score3Count: 0,
    score2Count: 0,
    score1Count: 0,
  }
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

function formatDate(value) {
  if (!value) {
    return '刚刚加入'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚加入'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatPercent(value) {
  const ratio = Number(value)
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return '0%'
  }
  if (ratio >= 99.95) {
    return '100%'
  }
  return `${ratio.toFixed(ratio < 10 ? 1 : 0)}%`
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

function reviewLevelBadgeVariant(score) {
  const value = Number(score || 0)
  if (value >= 5) return 'success'
  if (value >= 3) return 'warning'
  return 'secondary'
}

function normalizeGoods(record = {}) {
  return {
    id: record.id ?? null,
    title: record.title || '未命名商品',
    cover: record.cover || '',
    categoryName: record.categoryName || '未分类',
    location: record.location || '校内面交',
    price: record.price,
    status: Number(record.status ?? 0),
    statusDesc: record.statusDesc || '',
    favoriteCount: Number(record.favoriteCount || 0),
    viewCount: Number(record.viewCount || 0),
    publishTime: record.publishTime || '',
  }
}

function applyProfile(data = {}) {
  profile.id = data.id ?? null
  profile.studentNo = data.studentNo ?? ''
  profile.name = data.name ?? ''
  profile.phone = data.phone ?? ''
  profile.avatar = data.avatar ?? ''
  profile.role = data.role ?? null
  profile.status = data.status ?? null
  profile.campus = data.campus ?? ''
  profile.intro = data.intro ?? ''
  profile.scoreAvg = data.scoreAvg ?? null
  profile.reviewCount = data.reviewCount ?? 0
  profile.createTime = data.createTime ?? ''
  profile.updateTime = data.updateTime ?? ''
}

function syncAuthCache() {
  const existing = getAuthUser() || {}
  const token = getToken()

  if (!token) {
    return
  }

  setAuthSession(
    {
      ...existing,
      token,
      studentNo: profile.studentNo || existing.studentNo || '',
      name: profile.name || profile.studentNo || existing.name || '',
      avatar: profile.avatar || '',
    },
    { notify: false },
  )
}

async function fetchPublishedGoods(targetPage = goodsPager.page) {
  if (!profile.id) {
    goodsItems.value = []
    goodsPager.total = 0
    return
  }

  goodsLoading.value = true
  try {
    const { data } = await request.get('/user/seller/goods/page', {
      params: {
        page: targetPage,
        pageSize: GOODS_PAGE_SIZE,
      },
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '商品加载失败')
    }

    const pageData = data?.data || {}
    goodsItems.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeGoods) : []
    goodsPager.page = targetPage
    goodsPager.total = Number(pageData.total || 0)
  } catch (error) {
    goodsItems.value = []
    goodsPager.total = 0
    showToast(getErrorMessage(error, '商品加载失败'), 'error')
  } finally {
    goodsLoading.value = false
  }
}

async function fetchSellerReviews(targetPage = reviewPager.page) {
  if (!profile.id) {
    reviewRecords.value = []
    reviewPager.total = 0
    reviewStats.value = createEmptyReviewStats()
    return
  }

  reviewsLoading.value = true
  try {
    const data = await getSellerReviewPage(profile.id, {
      page: targetPage,
      pageSize: REVIEW_PAGE_SIZE,
      scoreType: activeReviewFilter.value,
    })

    reviewRecords.value = Array.isArray(data?.records) ? data.records : []
    reviewPager.page = targetPage
    reviewPager.total = Number(data?.total || 0)
    reviewStats.value = {
      ...createEmptyReviewStats(),
      ...(data?.stats || {}),
    }
  } catch (error) {
    reviewRecords.value = []
    reviewPager.total = 0
    reviewStats.value = createEmptyReviewStats()
    showToast(getErrorMessage(error, '评价加载失败'), 'error')
  } finally {
    reviewsLoading.value = false
  }
}

async function fetchProfile() {
  loading.value = true

  try {
    const { data } = await request.get('/user/profile')

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '个人资料加载失败')
    }

    applyProfile(data.data)
    syncAuthCache()
    await Promise.allSettled([fetchPublishedGoods(1), fetchSellerReviews(1)])
  } catch (error) {
    showToast(getErrorMessage(error, '个人资料加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function changePanel(panelKey) {
  if (panelKey === activePanel.value) {
    return
  }
  activePanel.value = panelKey
}

function changeGoodsPage(step) {
  const nextPage = goodsPager.page + step
  if (nextPage < 1 || nextPage > goodsTotalPages.value || nextPage === goodsPager.page) {
    return
  }
  fetchPublishedGoods(nextPage)
}

function changeReviewPage(step) {
  const nextPage = reviewPager.page + step
  if (nextPage < 1 || nextPage > reviewTotalPages.value || nextPage === reviewPager.page) {
    return
  }
  fetchSellerReviews(nextPage)
}

function changeReviewFilter(filterKey) {
  if (filterKey === activeReviewFilter.value) {
    return
  }

  activeReviewFilter.value = filterKey
  fetchSellerReviews(1)
}

function openGoodsDetail(goodsId) {
  if (!goodsId) {
    return
  }
  router.push(`/goods/${goodsId}`)
}

function goToPublishedGoods() {
  router.push('/user/published')
}

function goToProfileSettings() {
  router.push('/user/profile')
}

function refreshCurrentPanel() {
  if (activePanel.value === 'goods') {
    fetchPublishedGoods(goodsPager.page)
    return
  }
  fetchSellerReviews(reviewPager.page)
}

function handleAuthChanged() {
  if (!checkLoggedIn()) {
    return
  }
  fetchProfile()
}

onMounted(() => {
  fetchProfile()
  window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
  window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-sm">
      <div class="bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] px-7 py-7">
        <div v-if="loading" class="flex min-h-[250px] items-center justify-center">
          <div
            class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500"
          >
            <LoaderCircle class="h-4 w-4 animate-spin" />
            正在加载个人资料
          </div>
        </div>

        <div v-else class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div class="flex items-start gap-5">
            <div class="rounded-[28px] bg-white/70 p-2 shadow-[0_24px_50px_-36px_rgba(249,115,22,0.75)]">
              <Avatar
                size="lg"
                :src="profile.avatar"
                :fallback="displayName.slice(0, 1)"
                :alt="displayName"
              />
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-black tracking-tight text-slate-950">
                    {{ displayName }}
                  </h1>
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    <ShieldCheck class="h-3.5 w-3.5" />
                    {{ scoreBadge }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span class="inline-flex items-center gap-1.5">
                    <GraduationCap class="h-4 w-4" />
                    学号 {{ profile.studentNo || '未绑定' }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <MapPin class="h-4 w-4" />
                    {{ displayCampus }}
                  </span>
                  <span>评分 {{ displayScore }}</span>
                  <span>评价 {{ profile.reviewCount || 0 }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <Star class="h-3.5 w-3.5 text-amber-500" />
                  {{ roleText }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <BadgeCheck class="h-3.5 w-3.5 text-sky-500" />
                  {{ statusText }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <Sparkles class="h-3.5 w-3.5 text-brand-500" />
                  加入于 {{ joinedText }}
                </span>
              </div>

              <div
                class="max-w-2xl rounded-3xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_14px_35px_-28px_rgba(15,23,42,0.35)]"
              >
                {{ displayIntro }}
              </div>
            </div>
          </div>

          <Button variant="secondary" @click="goToProfileSettings">编辑资料</Button>
        </div>
      </div>
    </Card>

    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-sm">
      <div
        class="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <button
            v-for="panel in PANEL_OPTIONS"
            :key="panel.key"
            type="button"
            class="rounded-full px-4 py-2 transition"
            :class="
              activePanel === panel.key
                ? 'bg-slate-950 text-white shadow-[0_14px_35px_-24px_rgba(15,23,42,0.55)]'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            "
            @click="changePanel(panel.key)"
          >
            {{ panel.label }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Badge v-if="activePanel === 'goods'" variant="outline">共 {{ goodsPager.total || 0 }} 件商品</Badge>
          <Badge v-else variant="outline">累计 {{ profile.reviewCount || 0 }} 条评价</Badge>
          <Button variant="outline" size="sm" :disabled="goodsLoading || reviewsLoading" @click="refreshCurrentPanel">
            <RefreshCcw
              class="h-4 w-4"
              :class="goodsLoading || reviewsLoading ? 'animate-spin' : ''"
            />
            刷新
          </Button>
        </div>
      </div>

      <div v-if="activePanel === 'goods'" class="pt-6">
        <div v-if="goodsLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="index in GOODS_PAGE_SIZE"
            :key="index"
            class="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
          >
            <div class="aspect-[1.15] bg-slate-100" />
            <div class="space-y-3 p-4">
              <div class="h-4 rounded bg-slate-100" />
              <div class="h-4 w-1/2 rounded bg-slate-100" />
              <div class="h-10 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>

        <div v-else-if="goodsItems.length" class="space-y-5">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="item in goodsItems"
              :key="item.id"
              class="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)]"
            >
              <button type="button" class="block w-full text-left" @click="openGoodsDetail(item.id)">
                <div class="relative aspect-[1.12] overflow-hidden bg-slate-100">
                  <img
                    v-if="item.cover"
                    :src="item.cover"
                    :alt="item.title"
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
                    <Package class="h-11 w-11" />
                  </div>

                  <div class="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">{{ item.categoryName }}</Badge>
                    <Badge variant="outline">{{ item.statusDesc || '已发布' }}</Badge>
                  </div>
                </div>

                <div class="space-y-3 p-4">
                  <div class="space-y-2">
                    <h3 class="line-clamp-2 min-h-[3.5rem] text-base font-bold text-slate-900">
                      {{ item.title }}
                    </h3>
                    <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{{ item.location }}</span>
                      <span>{{ formatDateTime(item.publishTime) }}</span>
                    </div>
                  </div>

                  <div class="flex items-end justify-between gap-3">
                    <div>
                      <p class="text-xl font-black text-brand-600">{{ formatCurrency(item.price) }}</p>
                      <p class="text-xs text-slate-400">
                        {{ item.viewCount }} 次浏览 · {{ item.favoriteCount }} 次收藏
                      </p>
                    </div>
                    <span class="text-xs font-medium text-slate-500">查看详情</span>
                  </div>
                </div>
              </button>
            </article>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" size="sm" @click="goToPublishedGoods">前往完整商品管理</Button>

            <div
              v-if="goodsPager.total > GOODS_PAGE_SIZE"
              class="flex items-center gap-3 self-end text-sm text-slate-500"
            >
              <p>第 {{ goodsPager.page }} / {{ goodsTotalPages }} 页</p>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  :disabled="goodsPager.page <= 1 || goodsLoading"
                  @click="changeGoodsPage(-1)"
                >
                  <ChevronLeft class="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  :disabled="goodsPager.page >= goodsTotalPages || goodsLoading"
                  @click="changeGoodsPage(1)"
                >
                  <ChevronRight class="h-4 w-4" />
                </Button>
              </div>
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
            <Package class="h-10 w-10" />
          </div>
          <div class="space-y-2">
            <p class="text-lg font-semibold text-slate-800">暂无商品</p>
            <p class="text-sm text-slate-400">你的闲置宝贝上架后会展示在这里</p>
          </div>
          <Button size="sm" @click="router.push('/publish')">去发布商品</Button>
        </div>
      </div>

      <div v-else class="space-y-6 pt-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-[26px] border border-orange-100 bg-orange-50/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">信用评分</p>
            <div class="mt-3 flex items-end gap-2">
              <strong class="text-4xl font-black text-slate-950">{{ displayScore }}</strong>
              <span class="pb-1 text-sm text-slate-400">/ 5.0</span>
            </div>
            <p class="mt-2 text-sm text-slate-500">{{ scoreBadge }}</p>
          </article>

          <article class="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">累计评价</p>
            <strong class="mt-3 block text-4xl font-black text-slate-950">{{ profile.reviewCount || 0 }}</strong>
            <p class="mt-2 text-sm text-slate-500">系统已聚合你发布商品的买家评价</p>
          </article>

          <article class="rounded-[26px] border border-emerald-100 bg-emerald-50/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">好评数</p>
            <strong class="mt-3 block text-4xl font-black text-slate-950">{{ reviewStats.goodCount || 0 }}</strong>
            <p class="mt-2 text-sm text-slate-500">5 星评价数量</p>
          </article>

          <article class="rounded-[26px] border border-amber-100 bg-amber-50/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">中差评</p>
            <strong class="mt-3 block text-4xl font-black text-slate-950">
              {{ (reviewStats.neutralCount || 0) + (reviewStats.badCount || 0) }}
            </strong>
            <p class="mt-2 text-sm text-slate-500">3 星及以下评价数量</p>
          </article>
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <section class="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <div class="flex items-center gap-2">
              <MessageSquareText class="h-5 w-5 text-brand-500" />
              <h2 class="text-lg font-black text-slate-950">评分分布</h2>
            </div>

            <div class="mt-5 space-y-4">
              <article
                v-for="item in starStats"
                :key="item.score"
                class="grid grid-cols-[44px_minmax(0,1fr)] gap-3"
              >
                <span class="text-sm font-medium text-slate-500">{{ item.label }}</span>
                <div class="space-y-2">
                  <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                    <span
                      class="block h-full rounded-full bg-[linear-gradient(90deg,#ffd166_0%,#f97316_100%)]"
                      :style="{ width: `${item.ratio}%` }"
                    />
                  </div>
                  <p class="text-xs text-slate-400">{{ item.count }} 条 · {{ formatPercent(item.ratio) }}</p>
                </div>
              </article>
            </div>
          </section>

          <section class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="tab in reviewFilterTabs"
                :key="tab.key"
                type="button"
                class="rounded-full px-4 py-2 text-sm font-semibold transition"
                :class="
                  activeReviewFilter === tab.key
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                "
                @click="changeReviewFilter(tab.key)"
              >
                {{ tab.label }}（{{ tab.count }}）
              </button>
            </div>

            <div v-if="reviewsLoading" class="space-y-4">
              <div
                v-for="index in REVIEW_PAGE_SIZE"
                :key="index"
                class="rounded-[24px] border border-slate-200 bg-white p-5"
              >
                <div class="h-5 w-1/3 rounded bg-slate-100" />
                <div class="mt-4 h-4 rounded bg-slate-100" />
                <div class="mt-2 h-4 w-5/6 rounded bg-slate-100" />
                <div class="mt-4 flex gap-2">
                  <div class="h-16 w-16 rounded-2xl bg-slate-100" />
                  <div class="h-16 w-16 rounded-2xl bg-slate-100" />
                </div>
              </div>
            </div>

            <div v-else-if="reviewRecords.length" class="space-y-4">
              <article
                v-for="review in reviewRecords"
                :key="review.id"
                class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="flex min-w-0 items-start gap-4">
                    <button
                      type="button"
                      class="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-slate-100"
                      @click="openGoodsDetail(review.goodsId)"
                    >
                      <img
                        v-if="review.goodsCover"
                        :src="review.goodsCover"
                        :alt="review.goodsTitle || '商品封面'"
                        class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
                        <Package class="h-8 w-8" />
                      </div>
                    </button>

                    <div class="min-w-0 space-y-3">
                      <div class="space-y-2">
                        <button
                          type="button"
                          class="line-clamp-2 text-left text-lg font-black text-slate-950 transition hover:text-brand-600"
                          @click="openGoodsDetail(review.goodsId)"
                        >
                          {{ review.goodsTitle || `商品 #${review.goodsId || '-'}` }}
                        </button>

                        <div class="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span class="inline-flex items-center gap-2">
                            <Avatar
                              size="sm"
                              :src="review.reviewerAvatar"
                              :fallback="getReviewerName(review).slice(0, 1)"
                              :alt="getReviewerName(review)"
                            />
                            {{ getReviewerName(review) }}
                          </span>
                          <span>{{ formatDateTime(review.createTime) }}</span>
                        </div>
                      </div>

                      <p class="text-sm leading-7 text-slate-600">
                        {{ review.content || '该买家未填写文字评价。' }}
                      </p>

                      <div
                        v-if="getReviewImages(review).length"
                        class="flex flex-wrap gap-2"
                      >
                        <img
                          v-for="(image, imageIndex) in getReviewImages(review)"
                          :key="`${review.id}-${imageIndex}`"
                          :src="image"
                          :alt="`${getReviewerName(review)}的评价图片${imageIndex + 1}`"
                          class="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="flex shrink-0 items-center gap-2">
                    <Badge :variant="reviewLevelBadgeVariant(review.score)">
                      {{ reviewLevelText(review.score) }}
                    </Badge>
                    <div class="text-right">
                      <p class="text-xl font-black text-slate-950">{{ Number(review.score || 0).toFixed(1) }}</p>
                      <p class="text-xs text-slate-400">买家评分</p>
                    </div>
                  </div>
                </div>
              </article>

              <div
                v-if="reviewPager.total > REVIEW_PAGE_SIZE"
                class="flex items-center justify-end gap-3 text-sm text-slate-500"
              >
                <p>第 {{ reviewPager.page }} / {{ reviewTotalPages }} 页</p>
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    :disabled="reviewPager.page <= 1 || reviewsLoading"
                    @click="changeReviewPage(-1)"
                  >
                    <ChevronLeft class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    :disabled="reviewPager.page >= reviewTotalPages || reviewsLoading"
                    @click="changeReviewPage(1)"
                  >
                    <ChevronRight class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 text-center"
            >
              <div
                class="flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm"
              >
                <MessageSquareText class="h-10 w-10" />
              </div>
              <div class="space-y-2">
                <p class="text-lg font-semibold text-slate-800">暂无评价</p>
                <p class="text-sm text-slate-400">买家完成交易后的评价会显示在这里</p>
              </div>
            </div>
          </section>
        </div>
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
        class="fixed bottom-6 right-6 z-[140] rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>
