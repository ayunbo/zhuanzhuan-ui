<!-- API: GET /api/user/seller/goods/page; actions: DELETE /api/user/seller/goods/{id}, PUT /api/user/seller/goods/{id}/submit, PUT /api/user/seller/goods/{id}/off-shelf, PUT /api/user/seller/goods/{id}/on-shelf; status: 0草稿 1审核中 2已拒绝 3在售 4锁定 5已售出 6已下架 -->
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PackageOpen, RefreshCcw } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request from '@/utils/request'

const router = useRouter()
const PAGE_SIZE = 12

const loading = ref(false)
const page = ref(1)
const total = ref(0)
const items = ref([])

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

  for (let index = start; index <= end; index += 1) {
    pages.push(index)
  }

  if (end < last - 1) {
    pages.push('ellipsis-right')
  }

  pages.push(last)
  return pages
})

function showToast(message, type = 'error') {
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

function normalizeItem(record = {}) {
  return {
    id: record.id ?? null,
    title: record.title || '未命名商品',
    detail: record.detail || '',
    price: record.price,
    oldPrice: record.oldPrice,
    quality: record.quality || '',
    location: record.location || '校内面交',
    status: Number(record.status ?? 0),
    statusDesc: record.statusDesc || '',
    cover: record.cover || '',
    reason: record.reason || '',
    viewCount: Number(record.viewCount || 0),
    favoriteCount: Number(record.favoriteCount || 0),
    publishTime: record.publishTime || '',
    updateTime: record.updateTime || '',
    categoryName: record.categoryName || '',
  }
}

function updateItemInList(goodsId, updater) {
  items.value = items.value.map((entry) => {
    if (entry.id !== goodsId) {
      return entry
    }

    return typeof updater === 'function' ? updater(entry) : { ...entry, ...updater }
  })
}

function getQualityLabel(value) {
  const quality = Number(value)

  if (quality === 5) return '95新'
  if (quality === 4) return '9成新'
  if (quality === 3) return '8成新'
  if (quality === 2) return '7成新'
  if (quality === 1) return '6成新及以下'
  return ''
}

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '0'
  }

  return number % 1 === 0 ? String(number) : number.toFixed(2)
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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isSold(item) {
  return item.status === 5
}

function canOpenDetail(item) {
  return item.status !== 1 && item.status !== 0
}

function resolveStatusBadge(item) {
  if (item.status === 1) {
    return { label: '审核中', className: 'bg-orange-500/90 text-white hover:bg-orange-500/90' }
  }

  if (item.status === 2) {
    return { label: '已拒绝', className: 'bg-rose-500/90 text-white hover:bg-rose-500/90' }
  }

  if (item.status === 6) {
    return { label: '已下架', className: 'bg-slate-900/80 text-white hover:bg-slate-900/80' }
  }

  if (item.status === 4) {
    return { label: '锁定中', className: 'bg-amber-500/90 text-white hover:bg-amber-500/90' }
  }

  if (item.status === 0) {
    return { label: '草稿箱', className: 'bg-slate-500/80 text-white hover:bg-slate-500/80' }
  }

  return null
}

async function fetchPublishedItems(targetPage = page.value) {
  loading.value = true

  try {
    const { data } = await request.get('/user/seller/goods/page', {
      params: {
        page: targetPage,
        pageSize: PAGE_SIZE,
      },
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '商品加载失败')
    }

    const pageData = data?.data || {}
    items.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeItem) : []
    total.value = Number(pageData.total || 0)
    page.value = targetPage
  } catch (error) {
    showToast(getErrorMessage(error, '商品加载失败'))
  } finally {
    loading.value = false
  }
}

function openGoodsDetail(item) {
  if (!item?.id || !canOpenDetail(item)) {
    return
  }

  router.push(`/goods/${item.id}`)
}

function goToEdit(item) {
  if (!item?.id) {
    return
  }

  router.push({
    path: '/publish',
    query: {
      id: String(item.id),
    },
  })
}

async function deleteItem(item) {
  if (!item?.id) {
    return
  }

  if (!window.confirm(`确认删除“${item.title || '该商品'}”吗？`)) {
    return
  }

  try {
    const { data } = await request.delete(`/user/seller/goods/${item.id}`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '删除失败')
    }

    showToast('删除成功', 'success')
    items.value = items.value.filter((entry) => entry.id !== item.id)
    total.value = Math.max(0, total.value - 1)
  } catch (error) {
    showToast(getErrorMessage(error, '删除失败'))
  }
}

async function offShelfItem(item) {
  if (!item?.id) {
    return
  }

  try {
    const { data } = await request.put(`/user/seller/goods/${item.id}/off-shelf`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '下架失败')
    }

    showToast('下架成功', 'success')
    updateItemInList(item.id, (entry) => ({
      ...entry,
      status: 6,
      statusDesc: '已下架',
    }))
  } catch (error) {
    showToast(getErrorMessage(error, '下架失败'))
  }
}

async function onShelfItem(item) {
  if (!item?.id) {
    return
  }

  try {
    const { data } = await request.put(`/user/seller/goods/${item.id}/on-shelf`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '上架失败')
    }

    showToast('重新上架成功', 'success')
    updateItemInList(item.id, (entry) => ({
      ...entry,
      status: 3,
      statusDesc: '在售',
      publishTime: new Date().toISOString(),
    }))
  } catch (error) {
    showToast(getErrorMessage(error, '上架失败'))
  }
}

async function submitItem(item) {
  if (!item?.id) {
    return
  }

  try {
    const { data } = await request.put(`/user/seller/goods/${item.id}/submit`)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '提交审核失败')
    }

    showToast('提交审核成功', 'success')
    updateItemInList(item.id, (entry) => ({
      ...entry,
      status: 1,
      statusDesc: '审核中',
      reason: '',
      publishTime: '',
    }))
  } catch (error) {
    showToast(getErrorMessage(error, '提交审核失败'))
  }
}

function canEdit(item) {
  return [0, 2, 3, 6].includes(item.status)
}

function canDelete(item) {
  return [0, 2, 5, 6].includes(item.status)
}

function canSubmit(item) {
  return [0, 2].includes(item.status)
}

function canOffShelf(item) {
  return item.status === 3
}

function canOnShelf(item) {
  return item.status === 6
}

function actionButtons(item) {
  const buttons = []

  if (canEdit(item)) {
    buttons.push({ key: 'edit', label: '编辑', variant: 'outline', action: goToEdit })
  }

  if (canSubmit(item)) {
    buttons.push({ key: 'submit', label: '提交审核', variant: 'primary', action: submitItem })
  }

  if (canOffShelf(item)) {
    buttons.push({ key: 'off-shelf', label: '下架', variant: 'outline', action: offShelfItem })
  }

  if (canOnShelf(item)) {
    buttons.push({ key: 'on-shelf', label: '上架', variant: 'outline', action: onShelfItem })
  }

  if (canDelete(item)) {
    buttons.push({ key: 'delete', label: '删除', variant: 'danger', action: deleteItem })
  }

  return buttons.slice(0, 3)
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) {
    return
  }

  fetchPublishedItems(targetPage)
}

onMounted(() => {
  fetchPublishedItems()
})
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-black tracking-tight text-slate-950">我发布的</h1>
          <p class="text-sm text-slate-400">共 {{ total }} 件</p>
        </div>

        <Button
          variant="outline"
          class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
          :disabled="loading"
          @click="fetchPublishedItems(page)"
        >
          <RefreshCcw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          刷新
        </Button>
      </div>

      <div
        v-if="loading"
        class="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
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
            <div class="flex gap-2 pt-1">
              <div class="h-8 flex-1 rounded-full bg-slate-100" />
              <div class="h-8 flex-1 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="items.length"
        class="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <article
          v-for="item in items"
          :key="item.id"
          class="group overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
        >
          <button
            type="button"
            class="block w-full text-left"
            :class="canOpenDetail(item) ? 'cursor-pointer' : 'cursor-default'"
            @click="openGoodsDetail(item)"
          >
            <div class="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
              <img
                v-if="item.cover"
                :src="item.cover"
                :alt="item.title"
                class="h-full w-full object-cover transition duration-500"
                :class="canOpenDetail(item) ? 'group-hover:scale-[1.03]' : ''"
              />
              <div v-else class="flex h-full w-full items-center justify-center bg-slate-100">
                <PackageOpen class="h-10 w-10 text-slate-300" />
              </div>

              <div v-if="isSold(item)" class="absolute inset-0 bg-slate-950/28" />

              <div
                v-if="isSold(item)"
                class="absolute inset-0 flex items-center justify-center"
              >
                <div
                  class="rotate-[-14deg] rounded-full border-[3px] border-white/90 px-6 py-2 text-xl font-black tracking-[0.18em] text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.7)]"
                >
                  卖掉了
                </div>
              </div>

              <Badge
                v-else-if="resolveStatusBadge(item)"
                class="absolute left-3 top-3 border-0 shadow-sm"
                :class="resolveStatusBadge(item)?.className"
              >
                {{ resolveStatusBadge(item)?.label }}
              </Badge>
            </div>

            <div class="space-y-3 p-3">
              <div class="min-w-0 space-y-2">
                <div class="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
                  <p class="truncate">{{ item.categoryName || '未分类' }}</p>
                  <p class="shrink-0">{{ item.location }}</p>
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
                  <p v-if="item.oldPrice" class="text-xs text-slate-400 line-through">
                    ￥{{ formatPrice(item.oldPrice) }}
                  </p>
                </div>
              </div>
            </div>
          </button>

          <div class="border-t border-slate-100 px-3 py-3">
            <div class="flex items-center gap-1.5">
              <button
                v-for="action in actionButtons(item)"
                :key="action.key"
                type="button"
                class="h-8 min-w-0 flex-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap"
                :class="
                  action.variant === 'primary'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : action.variant === 'danger'
                      ? 'border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                "
                @click.stop="action.action(item)"
              >
                {{ action.label }}
              </button>
            </div>
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
          <p class="text-lg font-semibold text-slate-800">还没有发布商品</p>
          <p class="text-sm text-slate-400">去发布你的第一件闲置吧</p>
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
        class="fixed bottom-6 right-6 z-[140] rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-950'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>
