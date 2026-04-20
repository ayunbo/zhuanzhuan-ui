<!-- 收藏 API: GET /api/user/favorites/page?page&pageSize&sortType, DELETE /api/user/favorites/{goodsId}; 返回字段: favoriteId, goodsId, sellerId, sellerName, title, price, cover, status, favoriteTime -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Heart, LoaderCircle, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request, { ensureLoggedIn } from '@/utils/request'

const router = useRouter()

const PAGE_SIZE = 12

const loading = ref(false)
const items = ref([])
const total = ref(0)
const removingId = ref(null)

const query = reactive({
  page: 1,
  pageSize: PAGE_SIZE,
  sortType: 'desc',
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

const visiblePageItems = computed(() => {
  const totalCount = totalPages.value
  const current = query.page

  if (totalCount <= 7) {
    return Array.from({ length: totalCount }, (_, index) => index + 1)
  }

  const itemsList = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(totalCount - 1, current + 1)

  if (start > 2) {
    itemsList.push('left-ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    itemsList.push(page)
  }

  if (end < totalCount - 1) {
    itemsList.push('right-ellipsis')
  }

  itemsList.push(totalCount)
  return itemsList
})

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
  }, 2400)
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function openGoods(goodsId) {
  if (!goodsId) {
    return
  }

  router.push(`/goods/${goodsId}`)
}

async function fetchFavorites() {
  if (!ensureLoggedIn({ source: 'user-favorites' })) {
    items.value = []
    total.value = 0
    return
  }

  loading.value = true

  try {
    const { data } = await request.get('/user/favorites/page', {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        sortType: query.sortType,
      },
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '收藏列表加载失败')
    }

    const pageData = data.data || {}
    items.value = Array.isArray(pageData.records) ? pageData.records : []
    total.value = Number(pageData.total || 0)
  } catch (error) {
    items.value = []
    total.value = 0
    showToast(getErrorMessage(error, '收藏列表加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function removeFavorite(goodsId) {
  if (!goodsId || removingId.value === goodsId) {
    return
  }

  removingId.value = goodsId

  try {
    const { data } = await request.delete(`/user/favorites/${goodsId}`)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '取消收藏失败')
    }

    items.value = items.value.filter((item) => item.goodsId !== goodsId)
    total.value = Math.max(0, total.value - 1)
    showToast('已取消收藏')

    if (!items.value.length && query.page > 1) {
      query.page -= 1
      await fetchFavorites()
    }
  } catch (error) {
    showToast(getErrorMessage(error, '取消收藏失败'), 'error')
  } finally {
    removingId.value = null
  }
}

async function goToPage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === query.page) {
    return
  }

  query.page = targetPage
  await fetchFavorites()
}

onMounted(() => {
  fetchFavorites()
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
})
</script>

<template>
  <section class="space-y-5">
    <Card class="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-black tracking-tight text-slate-950">我的收藏</h1>
        </div>
      </div>

      <div
        v-if="loading"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
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
        v-else-if="items.length"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <article
          v-for="item in items"
          :key="item.favoriteId || item.goodsId"
          class="group overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
        >
          <button
            type="button"
            class="relative block w-full text-left"
            @click="openGoods(item.goodsId)"
          >
            <div class="aspect-square overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
              <img
                v-if="item.cover"
                :src="item.cover"
                :alt="item.title"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
          </button>

          <div class="space-y-3 p-3">
            <button type="button" class="block w-full min-w-0 text-left" @click="openGoods(item.goodsId)">
              <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900">
                {{ item.title || '未命名商品' }}
              </h3>
              <div class="mt-2 flex items-center gap-2">
                <p class="text-lg font-semibold text-brand-600">￥{{ formatPrice(item.price) }}</p>
              </div>
              <p class="mt-2 truncate text-xs font-medium text-slate-500">
                {{ item.sellerName || '校园卖家' }}
              </p>
            </button>

            <Button
              variant="outline"
              size="sm"
              class="h-9 w-full rounded-xl border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500"
              :disabled="removingId === item.goodsId"
              @click="removeFavorite(item.goodsId)"
            >
              <Trash2 v-if="removingId !== item.goodsId" class="h-4 w-4" />
              <LoaderCircle v-else class="h-4 w-4 animate-spin" />
              {{ removingId === item.goodsId ? '处理中' : '取消收藏' }}
            </Button>
          </div>
        </article>
      </div>

      <div
        v-else
        class="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Heart class="h-7 w-7" />
        </div>
        <div class="space-y-1">
          <p class="text-base font-semibold text-slate-700">暂无收藏商品</p>
        </div>
      </div>

      <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-2 pt-8">
        <Button
          variant="outline"
          size="sm"
          class="h-9 w-9 rounded-full p-0"
          :disabled="query.page <= 1"
          @click="goToPage(query.page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>

        <template v-for="item in visiblePageItems" :key="item">
          <span
            v-if="typeof item === 'string'"
            class="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
          >
            ...
          </span>
          <Button
            v-else
            :variant="item === query.page ? 'default' : 'outline'"
            size="sm"
            class="h-9 min-w-9 rounded-full px-3"
            @click="goToPage(item)"
          >
            {{ item }}
          </Button>
        </template>

        <Button
          variant="outline"
          size="sm"
          class="h-9 w-9 rounded-full p-0"
          :disabled="query.page >= totalPages"
          @click="goToPage(query.page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
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
        class="fixed bottom-6 right-6 z-[140] rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </section>
</template>
