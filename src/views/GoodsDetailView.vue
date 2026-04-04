<!-- 商品详情 API: GET /api/user/goods/{id}; 核心字段: id, sellerId, sellerName, sellerAvatar, sellerCampus, sellerScoreAvg, sellerReviewCount, categoryId, categoryName, title, detail, price, oldPrice, quality, location, status, statusDesc, cover, viewCount, favoriteCount, publishTime, images[{ url, sort, isCover }] -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck,
  Heart,
  LoaderCircle,
  MessageCircle,
  ShoppingBag,
  Star,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import request, { ensureLoggedIn } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const sellerDialogOpen = ref(false)
const selectedImageIndex = ref(0)

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
const detailLines = computed(() =>
  detail.detail
    ? detail.detail.split(/\r?\n/).filter((line) => line.trim())
    : ['卖家暂未补充更多描述。'],
)

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
    1: '明显使用痕迹',
    2: '成色一般',
    3: '成色不错',
    4: '成色很好',
    5: '几乎全新',
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
  } catch (error) {
    showToast(getErrorMessage(error, '商品详情加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function selectImage(index) {
  selectedImageIndex.value = index
}

function openSellerDialog() {
  sellerDialogOpen.value = true
}

function handleChat() {
  if (!ensureLoggedIn({ source: 'goods-detail-chat' })) {
    return
  }
  showToast('聊天功能开发中')
}

function handleBuyNow() {
  if (!ensureLoggedIn({ source: 'goods-detail-buy' })) {
    return
  }
  showToast('立即购买功能开发中')
}

function handleFavorite() {
  if (!ensureLoggedIn({ source: 'goods-detail-favorite' })) {
    return
  }
  showToast('收藏功能开发中')
}

watch(
  () => route.params.id,
  () => {
    fetchDetail()
  },
)

onMounted(() => {
  fetchDetail()
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
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
          @click="openSellerDialog"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Avatar
              size="lg"
              :src="detail.sellerAvatar"
              :fallback="detail.sellerName?.slice(0, 1) || '卖'"
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
                <span>{{ detail.sellerCampus || '校园内卖家' }}</span>
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
              class="flex min-h-[560px] items-center justify-center overflow-hidden rounded-[28px] bg-slate-50"
            >
              <img
                v-if="currentImage"
                :src="currentImage"
                :alt="detail.title"
                class="h-full max-h-[560px] w-full object-contain"
              />
              <div v-else class="text-sm text-slate-400">暂无图片</div>
            </div>
          </div>

          <div class="flex min-h-[560px] flex-col rounded-[28px] bg-white p-1">
            <div class="space-y-4">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-4xl font-black tracking-tight text-brand-500">
                        ¥{{ formatPrice(detail.price) }}
                      </p>
                      <p v-if="detail.oldPrice" class="text-base text-slate-400 line-through">
                        ¥{{ formatPrice(detail.oldPrice) }}
                      </p>
                    </div>
                  </div>

                  <div class="shrink-0 text-right">
                    <p class="text-sm font-semibold text-slate-900">{{ qualityLabel }}</p>
                    <p class="mt-2 text-sm text-slate-400">
                      {{ detail.favoriteCount || 0 }}人收藏 | {{ detail.viewCount || 0 }}浏览
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
                  <span>面交地点</span>
                  <span class="font-medium text-slate-700">{{ detail.location || '校园面交' }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span>发布时间</span>
                  <span class="font-medium text-slate-700">{{ publishTimeLabel }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="grid min-w-0 flex-1 grid-cols-2 overflow-hidden rounded-full">
                  <button
                    type="button"
                    class="flex h-12 items-center justify-center gap-2 bg-[#ffe55c] px-4 text-base font-bold text-slate-900 transition hover:bg-[#ffdf40]"
                    @click="handleChat"
                  >
                    <MessageCircle class="h-4 w-4" />
                    聊一聊
                  </button>
                  <button
                    type="button"
                    class="flex h-12 items-center justify-center gap-2 bg-slate-800 px-4 text-base font-bold text-white transition hover:bg-slate-700"
                    @click="handleBuyNow"
                  >
                    <ShoppingBag class="h-4 w-4" />
                    立即购买
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  class="h-12 shrink-0 justify-center rounded-full px-6 text-base font-bold"
                  @click="handleFavorite"
                >
                  <Heart class="h-4 w-4" />
                  收藏
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <Dialog :open="sellerDialogOpen" @update:open="(value) => (sellerDialogOpen = value)">
      <DialogContent class="max-w-[420px]">
        <DialogHeader>
          <DialogTitle class="text-2xl font-black tracking-tight text-slate-950">
            卖家主页开发中
          </DialogTitle>
        </DialogHeader>
        <div class="space-y-4 pt-2">
          <div class="flex items-center gap-4 rounded-[24px] bg-slate-50 px-4 py-4">
            <Avatar
              size="lg"
              :src="detail.sellerAvatar"
              :fallback="detail.sellerName?.slice(0, 1) || '卖'"
            />
            <div class="min-w-0">
              <p class="truncate text-base font-bold text-slate-950">
                {{ detail.sellerName || '校园卖家' }}
              </p>
              <p class="mt-1 text-sm text-slate-500">{{ detail.sellerCampus || '校园内卖家' }}</p>
            </div>
          </div>
          <p class="text-sm leading-7 text-slate-500">
            卖家主页、更多在售商品与信用详情正在开发中，当前可先通过“聊一聊”与卖家沟通。
          </p>
        </div>
      </DialogContent>
    </Dialog>

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
  </section>
</template>
