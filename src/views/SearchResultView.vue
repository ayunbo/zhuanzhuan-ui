<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  Plus,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import request, { ensureLoggedIn } from '@/utils/request'
import {
  SEARCH_QUALITY_OPTIONS,
  SEARCH_SORT_OPTIONS,
  normalizeSearchSortBy,
} from '@/utils/search'

const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 18

const categories = ref([])
const products = ref([])
const total = ref(0)
const isLoadingCategories = ref(false)
const isLoadingProducts = ref(false)
const isCategoryPanelOpen = ref(false)
const priceError = ref('')
const categoryTriggerRef = ref(null)
const categoryPanelStyle = ref({})
const selectedCategoryName = ref('全部分类')

const searchParams = reactive({
  keyword: '',
  categoryId: '',
  quality: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  sellerId: '',
  status: 3,
  sortBy: 'time',
  page: 1,
  pageSize: PAGE_SIZE,
})

const categoryState = reactive({
  level1Id: null,
  level2Id: null,
  level3Id: null,
})

const categoryMap = computed(() => {
  const map = new Map()

  function walk(nodes, parent = null) {
    nodes.forEach((node) => {
      const normalized = {
        ...node,
        parent,
        children: Array.isArray(node.children) ? node.children : [],
      }

      map.set(node.id, normalized)
      walk(normalized.children, normalized)
    })
  }

  walk(categories.value)
  return map
})

const level1Categories = computed(() => categories.value)

const level2Categories = computed(() => {
  if (!categoryState.level1Id) {
    return []
  }

  return categoryMap.value.get(categoryState.level1Id)?.children || []
})

const level3Categories = computed(() => {
  if (!categoryState.level2Id) {
    return []
  }

  return categoryMap.value.get(categoryState.level2Id)?.children || []
})

const showLevel3 = computed(() => level3Categories.value.length > 0)

const showPriceConfirm = computed(
  () => Boolean(searchParams.minPrice.trim() || searchParams.maxPrice.trim()),
)

const totalPages = computed(() => {
  const count = Math.ceil(total.value / PAGE_SIZE)
  return count > 0 ? count : 1
})

const visiblePageItems = computed(() => {
  const totalCount = totalPages.value
  const current = searchParams.page

  if (totalCount <= 7) {
    return Array.from({ length: totalCount }, (_, index) => index + 1)
  }

  const items = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(totalCount - 1, current + 1)

  if (start > 2) {
    items.push('left-ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }

  if (end < totalCount - 1) {
    items.push('right-ellipsis')
  }

  items.push(totalCount)
  return items
})

function normalizeCategoryNode(node) {
  return {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    level: node.level,
    sort: node.sort,
    status: node.status,
    children: Array.isArray(node.children) ? node.children.map(normalizeCategoryNode) : [],
  }
}

function normalizeProduct(record) {
  return {
    id: record.id,
    sellerId: record.sellerId,
    categoryId: record.categoryId,
    categoryName: record.categoryName || '未分类',
    title: record.title || '未命名商品',
    price: record.price,
    oldPrice: record.oldPrice,
    quality: record.quality,
    location: record.location || '校内面交',
    cover: record.cover || '',
    sellerName: record.sellerName || `卖家${record.sellerId ?? ''}`,
    sellerAvatar: record.sellerAvatar || '',
  }
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function isAmountValid(value) {
  return /^(\d+)(\.\d{1,2})?$/.test(value)
}

function validatePriceRange() {
  priceError.value = ''

  if (searchParams.minPrice && !isAmountValid(searchParams.minPrice)) {
    priceError.value = '最低价格式不正确'
    return false
  }

  if (searchParams.maxPrice && !isAmountValid(searchParams.maxPrice)) {
    priceError.value = '最高价格式不正确'
    return false
  }

  if (
    searchParams.minPrice &&
    searchParams.maxPrice &&
    Number(searchParams.minPrice) > Number(searchParams.maxPrice)
  ) {
    priceError.value = '最低价不能大于最高价'
    return false
  }

  return true
}

function syncSelectedCategoryState() {
  if (!searchParams.categoryId) {
    selectedCategoryName.value = '全部分类'
    categoryState.level1Id = null
    categoryState.level2Id = null
    categoryState.level3Id = null
    return
  }

  const current = categoryMap.value.get(searchParams.categoryId)
  if (!current) {
    selectedCategoryName.value = '全部分类'
    categoryState.level1Id = null
    categoryState.level2Id = null
    categoryState.level3Id = null
    return
  }

  selectedCategoryName.value = current.name

  const path = []
  let pointer = current

  while (pointer) {
    path.unshift(pointer)
    pointer = pointer.parent
  }

  categoryState.level1Id = path[0]?.id ?? null
  categoryState.level2Id = path[1]?.id ?? null
  categoryState.level3Id = path[2]?.id ?? null
}

function syncParamsFromRoute() {
  searchParams.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  searchParams.categoryId =
    typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  searchParams.minPrice =
    typeof route.query.minPrice === 'string' ? route.query.minPrice : ''
  searchParams.maxPrice =
    typeof route.query.maxPrice === 'string' ? route.query.maxPrice : ''
  searchParams.sellerId = typeof route.query.sellerId === 'string' ? route.query.sellerId : ''
  searchParams.quality = typeof route.query.quality === 'string' ? route.query.quality : ''
  searchParams.location = typeof route.query.location === 'string' ? route.query.location : ''
  searchParams.sortBy = normalizeSearchSortBy(route.query.sortBy)

  const currentPage = Number(route.query.page || 1)
  searchParams.page = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1
  searchParams.pageSize = PAGE_SIZE
  searchParams.status = 3

  syncSelectedCategoryState()
}

function buildRouteQuery() {
  const query = {}

  if (searchParams.keyword.trim()) {
    query.keyword = searchParams.keyword.trim()
  }

  if (searchParams.categoryId) {
    query.categoryId = searchParams.categoryId
  }

  if (searchParams.minPrice) {
    query.minPrice = searchParams.minPrice
  }

  if (searchParams.maxPrice) {
    query.maxPrice = searchParams.maxPrice
  }

  if (searchParams.sellerId) {
    query.sellerId = searchParams.sellerId
  }

  if (searchParams.quality) {
    query.quality = searchParams.quality
  }

  if (searchParams.location.trim()) {
    query.location = searchParams.location.trim()
  }

  if (searchParams.sortBy && searchParams.sortBy !== 'time') {
    query.sortBy = searchParams.sortBy
  }

  if (searchParams.page > 1) {
    query.page = String(searchParams.page)
  }

  return query
}

function buildRequestParams() {
  const params = {
    page: searchParams.page,
    pageSize: searchParams.pageSize,
    status: searchParams.status,
  }

  if (searchParams.keyword.trim()) {
    params.keyword = searchParams.keyword.trim()
  }

  if (searchParams.categoryId) {
    params.categoryId = Number(searchParams.categoryId)
  }

  if (searchParams.minPrice) {
    params.minPrice = Number(searchParams.minPrice)
  }

  if (searchParams.maxPrice) {
    params.maxPrice = Number(searchParams.maxPrice)
  }

  if (searchParams.sellerId) {
    params.sellerId = Number(searchParams.sellerId)
  }

  if (searchParams.quality) {
    params.quality = Number(searchParams.quality)
  }

  if (searchParams.location.trim()) {
    params.location = searchParams.location.trim()
  }

  if (searchParams.sortBy) {
    params.sortBy = normalizeSearchSortBy(searchParams.sortBy)
  }

  return params
}

async function replaceRouteQuery() {
  if (!validatePriceRange()) {
    return
  }

  await router.replace({
    path: '/search',
    query: buildRouteQuery(),
  })
}

function updateCategoryPanelPosition() {
  const trigger = categoryTriggerRef.value
  if (!trigger) {
    return
  }

  const rect = trigger.getBoundingClientRect()
  const panelWidth = showLevel3.value ? 144 + 160 + 192 : 144 + 160
  const left = Math.min(rect.left, window.innerWidth - panelWidth - 16)

  categoryPanelStyle.value = {
    top: `${rect.bottom + 10}px`,
    left: `${Math.max(16, left)}px`,
    width: `${panelWidth}px`,
  }
}

async function openCategoryPanel() {
  syncSelectedCategoryState()
  isCategoryPanelOpen.value = true
  await nextTick()
  updateCategoryPanelPosition()
}

function closeCategoryPanel() {
  isCategoryPanelOpen.value = false
}

function toggleCategoryPanel() {
  if (isCategoryPanelOpen.value) {
    closeCategoryPanel()
    return
  }

  openCategoryPanel()
}

function handleLevel1Click(node) {
  categoryState.level1Id = node.id
  categoryState.level2Id = null
  categoryState.level3Id = null
}

function handleLevel2Click(node) {
  categoryState.level2Id = node.id
  categoryState.level3Id = null

  if (!node.children?.length) {
    handleLeafSelect(node)
  }
}

function handleLeafSelect(node) {
  searchParams.categoryId = String(node.id)
  selectedCategoryName.value = node.name
  searchParams.page = 1
  closeCategoryPanel()
  replaceRouteQuery()
}

async function clearCategoryFilter() {
  searchParams.categoryId = ''
  selectedCategoryName.value = '全部分类'
  searchParams.page = 1
  closeCategoryPanel()
  await replaceRouteQuery()
}

async function handlePriceConfirm() {
  searchParams.page = 1
  await replaceRouteQuery()
}

async function handleLocationConfirm() {
  searchParams.page = 1
  await replaceRouteQuery()
}

async function handleSortChange(sortBy) {
  searchParams.sortBy = normalizeSearchSortBy(sortBy)
  searchParams.page = 1
  await replaceRouteQuery()
}

async function handleQualityChange(quality) {
  searchParams.quality = quality
  searchParams.page = 1
  await replaceRouteQuery()
}

async function goToPage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === searchParams.page) {
    return
  }

  searchParams.page = targetPage
  await replaceRouteQuery()
}

async function fetchCategories() {
  isLoadingCategories.value = true
  try {
    const response = await request.get('/user/category/tree')
    const payload = response.data

    if (payload?.code !== 1) {
      throw new Error(payload?.msg || '分类加载失败')
    }

    categories.value = Array.isArray(payload.data) ? payload.data.map(normalizeCategoryNode) : []
    syncSelectedCategoryState()
  } finally {
    isLoadingCategories.value = false
  }
}

async function fetchProducts() {
  isLoadingProducts.value = true
  try {
    const response = await request.get('/user/goods', {
      params: buildRequestParams(),
    })
    const payload = response.data

    if (payload?.code !== 1) {
      throw new Error(payload?.msg || '商品加载失败')
    }

    const pageData = payload.data || {}
    products.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeProduct) : []
    total.value = Number(pageData.total || 0)

    if (searchParams.page > totalPages.value && total.value > 0) {
      searchParams.page = totalPages.value
      await replaceRouteQuery()
    }
  } finally {
    isLoadingProducts.value = false
  }
}

function handleQuickAction(type) {
  if (type === 'publish') {
    if (!ensureLoggedIn({ source: 'search-publish' })) {
      return
    }

    router.push('/publish')
    return
  }

  if (!ensureLoggedIn({ source: 'search-message' })) {
    return
  }

  window.alert('消息功能暂未开放')
}

function handleViewportChange() {
  if (isCategoryPanelOpen.value) {
    updateCategoryPanelPosition()
  }
}

function openGoodsDetail(goodsId) {
  router.push(`/goods/${goodsId}`)
}

watch(
  () => route.fullPath,
  async () => {
    syncParamsFromRoute()
    await fetchProducts()
  },
  { immediate: true },
)

watch(showLevel3, async () => {
  if (isCategoryPanelOpen.value) {
    await nextTick()
    updateCategoryPanelPosition()
  }
})

onMounted(() => {
  fetchCategories()
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  closeCategoryPanel()
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>

<template>
  <section class="bg-slate-50 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1480px]">
      <Card class="overflow-visible border border-slate-200/80 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div class="overflow-x-auto">
            <div class="flex min-w-max items-center gap-3">
              <div class="flex items-center gap-1">
                <span class="mr-1 text-sm font-medium text-slate-500">排序</span>
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-slate-100"
                >
                  最新发布
                </button>
              </div>

              <div class="h-5 w-px bg-slate-200" />

              <div class="flex items-center gap-1">
                <span class="mr-1 text-sm font-medium text-slate-500">分类</span>
                <button
                  ref="categoryTriggerRef"
                  type="button"
                  class="flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  @click="toggleCategoryPanel"
                >
                  <span>{{ selectedCategoryName }}</span>
                  <ChevronDown
                    class="h-4 w-4 text-slate-400 transition"
                    :class="isCategoryPanelOpen ? 'rotate-180' : ''"
                  />
                </button>
              </div>

              <div class="flex items-center gap-2">
                <div class="w-16 min-w-0 shrink-0">
                  <input
                    v-model="searchParams.minPrice"
                    type="text"
                    inputmode="decimal"
                    placeholder="最低价"
                    class="h-7 w-full rounded-sm border border-slate-300 bg-white px-1 text-center text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <span class="text-slate-400">-</span>
                <div class="w-16 min-w-0 shrink-0">
                  <input
                    v-model="searchParams.maxPrice"
                    type="text"
                    inputmode="decimal"
                    placeholder="最高价"
                    class="h-7 w-full rounded-sm border border-slate-300 bg-white px-1 text-center text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="translate-x-2 opacity-0"
                  enter-to-class="translate-x-0 opacity-100"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="translate-x-0 opacity-100"
                  leave-to-class="translate-x-2 opacity-0"
                >
                  <button
                    v-if="showPriceConfirm"
                    type="button"
                    class="h-7 shrink-0 whitespace-nowrap rounded-sm bg-orange-500 px-2.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                    @click="handlePriceConfirm"
                  >
                    确定
                  </button>
                </transition>
              </div>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-3">
            <div class="flex flex-wrap items-center gap-1">
              <span class="mr-1 text-sm font-medium text-slate-500">排序</span>
              <button
                v-for="item in SEARCH_SORT_OPTIONS"
                :key="item.value"
                type="button"
                class="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                :class="
                  searchParams.sortBy === item.value
                    ? 'bg-brand-500 text-white shadow-[0_10px_22px_-14px_rgba(249,115,22,0.9)]'
                    : 'text-slate-600 hover:bg-slate-100'
                "
                @click="handleSortChange(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-1">
              <span class="mr-1 text-sm font-medium text-slate-500">成色</span>
              <button
                v-for="item in SEARCH_QUALITY_OPTIONS"
                :key="item.value || 'all-quality'"
                type="button"
                class="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                :class="
                  searchParams.quality === item.value
                    ? 'bg-brand-500 text-white shadow-[0_10px_22px_-14px_rgba(249,115,22,0.9)]'
                    : 'text-slate-600 hover:bg-slate-100'
                "
                @click="handleQualityChange(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="mr-1 text-sm font-medium text-slate-500">位置</span>
              <div class="w-52 min-w-0 shrink-0">
                <Input
                  v-model="searchParams.location"
                  type="text"
                  placeholder="位置 / 校区"
                  class="h-9 border-slate-200 bg-white"
                  @keyup.enter="handleLocationConfirm"
                />
              </div>
              <Button type="button" size="sm" class="h-9 px-4" @click="handleLocationConfirm">
                确认
              </Button>
            </div>
          </div>

          <p v-if="priceError" class="pt-2 text-sm font-medium text-rose-500">
            {{ priceError }}
          </p>
        </div>

        <div class="px-4 py-5 sm:px-5 sm:py-6">
          <div
            v-if="isLoadingProducts"
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
            v-else-if="products.length"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            <article
              v-for="product in products"
              :key="product.id"
              class="group cursor-pointer overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
              @click="openGoodsDetail(product.id)"
            >
              <div class="aspect-square overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
                <img
                  v-if="product.cover"
                  :src="product.cover"
                  :alt="product.title"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>

              <div class="space-y-3 p-3">
                <div class="min-w-0 space-y-2">
                  <p class="truncate text-[11px] font-medium text-slate-500">
                    {{ product.categoryName }}
                  </p>
                  <h3 class="truncate text-sm font-semibold text-slate-900">
                    {{ product.title }}
                  </h3>
                  <div class="flex items-center gap-2">
                    <p class="text-lg font-semibold text-brand-600">￥{{ formatPrice(product.price) }}</p>
                    <p v-if="product.oldPrice" class="text-xs text-slate-400 line-through">
                      ￥{{ formatPrice(product.oldPrice) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2.5">
                  <Avatar
                    size="sm"
                    :src="product.sellerAvatar"
                    :fallback="product.sellerName?.slice(0, 1) || '卖'"
                  />
                  <p class="truncate text-xs font-semibold text-slate-800">{{ product.sellerName }}</p>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="flex min-h-[420px] items-center justify-center text-sm text-slate-400">
            暂无商品
          </div>

          <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-8">
            <Button
              variant="outline"
              size="sm"
              class="h-9 w-9 rounded-full p-0"
              :disabled="searchParams.page <= 1"
              @click="goToPage(searchParams.page - 1)"
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
                :variant="item === searchParams.page ? 'default' : 'outline'"
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
              :disabled="searchParams.page >= totalPages"
              @click="goToPage(searchParams.page + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>

          <div
            v-if="isLoadingCategories"
            class="flex items-center justify-center pt-6 text-sm text-slate-400"
          >
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            加载中...
          </div>
        </div>
      </Card>
    </div>

    <Teleport to="body">
      <div v-if="isCategoryPanelOpen" class="fixed inset-0 z-40" @click="closeCategoryPanel" />
      <div
        v-if="isCategoryPanelOpen"
        class="fixed z-50 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-md"
        :style="categoryPanelStyle"
      >
        <div class="flex flex-row items-start">
          <div class="w-36 shrink-0 border-r border-slate-100 p-2.5">
            <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              一级分类
            </div>
            <div class="space-y-1">
              <button
                v-for="item in level1Categories"
                :key="item.id"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition"
                :class="
                  categoryState.level1Id === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                "
                @click="handleLevel1Click(item)"
              >
                <span class="truncate">{{ item.name }}</span>
                <ChevronRight class="h-4 w-4 opacity-50" />
              </button>
            </div>
          </div>

          <div class="w-40 shrink-0 border-r border-slate-100 p-2.5">
            <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              二级分类
            </div>
            <div v-if="level2Categories.length" class="space-y-1">
              <button
                v-for="item in level2Categories"
                :key="item.id"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition"
                :class="
                  categoryState.level2Id === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : String(item.id) === searchParams.categoryId
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                "
                @click="handleLevel2Click(item)"
              >
                <span class="truncate">{{ item.name }}</span>
                <Check
                  v-if="String(item.id) === searchParams.categoryId && !item.children?.length"
                  class="h-4 w-4"
                />
                <ChevronRight
                  v-else-if="item.children?.length"
                  class="h-4 w-4 opacity-50"
                />
              </button>
            </div>
            <div v-else class="px-3 py-6 text-sm text-slate-400">请选择一级分类</div>
          </div>

          <div v-if="showLevel3" class="w-48 shrink-0 p-2.5">
            <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              三级分类
            </div>
            <div class="space-y-1">
              <button
                v-for="item in level3Categories"
                :key="item.id"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition"
                :class="
                  String(item.id) === searchParams.categoryId
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                "
                @click="handleLeafSelect(item)"
              >
                <span class="truncate">{{ item.name }}</span>
                <Check v-if="String(item.id) === searchParams.categoryId" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
          <span class="text-sm text-slate-500">{{ selectedCategoryName }}</span>
          <button
            type="button"
            class="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            @click="clearCategoryFilter"
          >
            清空
          </button>
        </div>
      </div>
    </Teleport>

    <div class="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex xl:flex-col xl:items-center xl:gap-3">
      <Button
        size="icon"
        class="h-14 w-14 rounded-[28px] shadow-[0_22px_50px_-24px_rgba(249,115,22,0.92)]"
        @click="handleQuickAction('publish')"
      >
        <Plus class="h-5 w-5" />
      </Button>
      <button
        type="button"
        class="flex h-14 w-14 items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-700 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-brand-200 hover:text-brand-600"
        @click="handleQuickAction('message')"
      >
        <MessageCircle class="h-5 w-5" />
      </button>
    </div>

    <div
      class="fixed inset-x-4 bottom-4 z-40 flex items-center justify-end gap-3 rounded-full border border-white/70 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur xl:hidden"
    >
      <Button size="icon" class="h-11 w-11 rounded-full" @click="handleQuickAction('publish')">
        <Plus class="h-4 w-4" />
      </Button>
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-brand-200 hover:text-brand-600"
        @click="handleQuickAction('message')"
      >
        <MessageCircle class="h-5 w-5" />
      </button>
    </div>
  </section>
</template>
