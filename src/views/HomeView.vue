<script setup>
// Category API: GET /user/category/tree -> data:[{ id, parentId, name, level, sort, status, children }]
// Goods API: GET /user/goods (or /user/goods/page) -> data:{ total, records:[{ id, sellerId, categoryId, categoryName, title, price, oldPrice, quality, location, status, statusDesc, cover, viewCount, favoriteCount, sellerName, sellerAvatar, publishTime }] }
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Bike,
  BookOpen,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  MonitorSmartphone,
  Package,
  Plus,
  ShieldCheck,
  Shirt,
  Sparkles,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request, {
  AUTH_CHANGED_EVENT,
  ensureLoggedIn,
  getAuthUser,
  isLoggedIn as checkLoggedIn,
  openLoginDialog,
} from '@/utils/request'

const router = useRouter()

const PAGE_SIZE = 18

const categories = ref([])
const activeMegaMenuId = ref(null)
const activeCategoryMode = ref('all')
const activeRootCategoryId = ref(null)
const activeExactCategoryId = ref(null)
const products = ref([])
const page = ref(1)
const total = ref(0)
const isLoadingCategories = ref(false)
const isLoadingProducts = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const loadAnchor = ref(null)
const isLoggedIn = ref(checkLoggedIn())
const currentUser = ref(getDisplayUser())

let observer

const categoryMap = computed(() => {
  const map = new Map()

  function walk(nodes, parent = null, root = null, path = []) {
    nodes.forEach((node) => {
      const currentRoot = root || node
      const currentPath = [...path, node.name]
      const normalized = {
        ...node,
        parent,
        rootId: currentRoot.id,
        pathNames: currentPath,
        children: Array.isArray(node.children) ? node.children : [],
      }

      map.set(node.id, normalized)
      walk(normalized.children, normalized, currentRoot, currentPath)
    })
  }

  walk(categories.value)
  return map
})

const rootCategories = computed(() => categories.value)
const featuredCategories = computed(() => rootCategories.value)
const level1Tabs = computed(() => [
  { key: 'all', label: '全部', mode: 'all', id: null },
  ...rootCategories.value.map((item) => ({
    key: `root-${item.id}`,
    label: item.name,
    mode: 'root',
    id: item.id,
  })),
])

const activeMegaCategory = computed(
  () => categoryMap.value.get(activeMegaMenuId.value) || null,
)

const activeCategoryTitle = computed(() => {
  if (activeCategoryMode.value === 'exact' && activeExactCategoryId.value) {
    return categoryMap.value.get(activeExactCategoryId.value)?.name || '全部'
  }

  if (activeCategoryMode.value === 'root' && activeRootCategoryId.value) {
    return categoryMap.value.get(activeRootCategoryId.value)?.name || '全部'
  }

  return '全部'
})

const visibleProducts = computed(() => {
  if (activeCategoryMode.value !== 'root' || !activeRootCategoryId.value) {
    return products.value
  }

  return products.value.filter((product) => {
    const category = categoryMap.value.get(product.categoryId)
    return category?.rootId === activeRootCategoryId.value
  })
})

const heroVerifyAction = {
  label: '快速认证',
  desc: '完成身份认证，获得更多交易权限',
  icon: ShieldCheck,
  accent: 'bg-emerald-50 text-emerald-700',
}

function getDisplayUser() {
  const authUser = getAuthUser()
  return {
    name: authUser?.name || '同学',
    studentNo: authUser?.studentNo || '登录后查看订单与收藏',
    avatar: authUser?.name?.slice(0, 1) || '校',
  }
}

function syncAuthState() {
  isLoggedIn.value = checkLoggedIn()
  currentUser.value = getDisplayUser()
}

function getCategoryIcon(id) {
  const iconMap = {
    digital: MonitorSmartphone,
    fashion: Shirt,
    books: BookOpen,
    transport: Bike,
    dorm: Package,
  }

  return iconMap[id] || Sparkles
}

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
    status: record.status,
    statusDesc: record.statusDesc,
    cover: record.cover || '',
    viewCount: record.viewCount || 0,
    favoriteCount: record.favoriteCount || 0,
    sellerName: record.sellerName || `卖家${record.sellerId ?? ''}`,
    sellerAvatar: record.sellerAvatar || '',
    publishTime: record.publishTime || '',
  }
}

function getProductCategoryLabel(product) {
  if (product.categoryId && categoryMap.value.has(product.categoryId)) {
    return categoryMap.value.get(product.categoryId).name
  }

  return product.categoryName || '未分类'
}

function getProductRootId(product) {
  if (!product.categoryId) {
    return null
  }

  return categoryMap.value.get(product.categoryId)?.rootId || null
}

function openMegaMenu(categoryId) {
  activeMegaMenuId.value = categoryId
}

function closeMegaMenu() {
  activeMegaMenuId.value = null
}

function handleUserShortcut() {
  if (isLoggedIn.value) {
    router.push('/user')
    return
  }

  openLoginDialog({ source: 'hero-user-card' })
}

function handleQuickAction(label) {
  if (label === '发闲置' || label === '发布闲置') {
    if (!ensureLoggedIn({ source: 'home-publish' })) {
      return
    }
    router.push('/publish')
    return
  }

  if (label === '快速认证') {
    if (!ensureLoggedIn({ source: 'home-verify' })) {
      return
    }
    window.alert('认证入口暂未开放')
    return
  }

  if (label === '消息' || label === '消息中心') {
    if (!ensureLoggedIn({ source: 'home-message' })) {
      return
    }
  }

  console.log(`快捷操作点击: ${label}`)
  window.alert(`${label} 功能暂未开放`)
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount % 1 === 0 ? String(amount) : amount.toFixed(2)
}

function setAllCategory() {
  activeCategoryMode.value = 'all'
  activeRootCategoryId.value = null
  activeExactCategoryId.value = null
}

function setRootCategory(rootId) {
  activeCategoryMode.value = 'root'
  activeRootCategoryId.value = rootId
  activeExactCategoryId.value = null
}

function setExactCategory(categoryId) {
  activeCategoryMode.value = 'exact'
  activeExactCategoryId.value = categoryId
  activeRootCategoryId.value = categoryMap.value.get(categoryId)?.rootId || null
}

function handleTabClick(tab) {
  if (tab.mode === 'all') {
    setAllCategory()
    return
  }

  setRootCategory(tab.id)
}

function handleLeafCategoryClick(categoryId) {
  setExactCategory(categoryId)
  closeMegaMenu()
}

function handleRootCategoryClick(categoryId) {
  setRootCategory(categoryId)
  closeMegaMenu()
}

function buildGoodsParams(targetPage) {
  const params = {
    page: targetPage,
    pageSize: PAGE_SIZE,
  }

  if (activeCategoryMode.value === 'exact' && activeExactCategoryId.value) {
    params.categoryId = activeExactCategoryId.value
  }

  return params
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
  } finally {
    isLoadingCategories.value = false
  }
}

async function fetchProducts({ reset = false } = {}) {
  const targetPage = reset ? 1 : page.value

  if (reset) {
    isLoadingProducts.value = true
    hasMore.value = true
  } else {
    if (isLoadingMore.value || !hasMore.value) {
      return
    }
    isLoadingMore.value = true
  }

  try {
    const response = await request.get('/user/goods', {
      params: buildGoodsParams(targetPage),
    })
    const payload = response.data

    if (payload?.code !== 1) {
      throw new Error(payload?.msg || '商品加载失败')
    }

    const pageData = payload.data || {}
    const records = Array.isArray(pageData.records) ? pageData.records.map(normalizeProduct) : []
    const nextTotal = Number(pageData.total || 0)

    total.value = nextTotal
    page.value = targetPage

    if (reset) {
      products.value = records
    } else {
      products.value.push(...records)
    }

    hasMore.value = products.value.length < nextTotal && records.length > 0
  } finally {
    isLoadingProducts.value = false
    isLoadingMore.value = false
  }
}

function loadMoreProducts() {
  if (isLoadingProducts.value || isLoadingMore.value || !hasMore.value) {
    return
  }

  page.value += 1
  fetchProducts()
}

function setupObserver() {
  if (!loadAnchor.value) {
    return
  }

  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries
      if (entry?.isIntersecting) {
        loadMoreProducts()
      }
    },
    {
      rootMargin: '320px 0px',
    },
  )

  observer.observe(loadAnchor.value)
}

watch(
  () => [activeCategoryMode.value, activeRootCategoryId.value, activeExactCategoryId.value],
  () => {
    fetchProducts({ reset: true })
  },
)

onMounted(async () => {
  window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
  await fetchCategories()
  await fetchProducts({ reset: true })
  setupObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState)
})
</script>

<template>
  <section class="relative px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
    <div class="mx-auto flex max-w-[1480px] flex-col gap-6">
      <Card class="relative overflow-hidden px-4 py-4 sm:px-5 xl:px-6 xl:py-5">
        <div
          class="grid gap-4 overflow-hidden xl:h-[360px] xl:grid-cols-[248px_minmax(0,1fr)_280px]"
        >
          <div class="relative h-full min-h-0" @mouseleave="closeMegaMenu">
            <div
              class="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/92 p-3 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.26)]"
            >

              <div v-if="isLoadingCategories" class="mt-3 flex-1 space-y-2">
                <div
                  v-for="index in 6"
                  :key="index"
                  class="h-14 rounded-[18px] bg-slate-100/80"
                />
              </div>

              <div v-else class="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
                <button
                  v-for="item in featuredCategories"
                  :key="item.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition"
                  :class="
                    activeMegaMenuId === item.id
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  "
                  @mouseenter="openMegaMenu(item.id)"
                >
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-2xl"
                    :class="item.accent"
                  >
                    <component :is="getCategoryIcon(item.id)" class="h-4 w-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold">{{ item.name }}</p>
                    <p class="mt-0.5 truncate text-xs text-slate-400">{{ item.subtitle }}</p>
                  </div>
                  <ChevronRight class="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </div>
            </div>

            <div
              v-if="activeMegaCategory"
              class="absolute left-[calc(100%-10px)] top-0 z-50 hidden h-full w-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_34px_90px_-42px_rgba(15,23,42,0.32)] xl:block"
              @mouseenter="openMegaMenu(activeMegaCategory.id)"
            >
              <div class="flex h-full min-h-0 flex-col">
                <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span
                      class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      :class="activeMegaCategory.accent"
                    >
                      {{ activeMegaCategory.name }}
                    </span>
                    <h4 class="mt-3 text-2xl font-black text-slate-950">
                      {{ activeMegaCategory.subtitle }}
                    </h4>
                  </div>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                    @click="handleRootCategoryClick(activeMegaCategory.id)"
                  >
                    查看全部
                    <ArrowRight class="h-3.5 w-3.5" />
                  </button>
                </div>

                <div class="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
                  <div
                    v-for="group in activeMegaCategory.children"
                    :key="group.id"
                    class="grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-b border-dashed border-slate-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ group.name }}</p>
                      <p class="mt-1 text-xs text-slate-400">校园热门小类</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                      <button
                        v-for="leaf in group.children.length ? group.children : [group]"
                        :key="leaf.id"
                        type="button"
                        class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        @click="handleLeafCategoryClick(leaf.id)"
                      >
                        {{ leaf.name }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex h-full min-h-0 flex-col">
            <div
              class="relative flex h-full min-h-0 overflow-hidden rounded-[30px] border border-slate-200/70 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_46%,#eff6ff_100%)] px-7 py-7 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.28)]"
            >
              <div class="absolute -right-12 top-8 h-44 w-44 rounded-full bg-orange-100/60 blur-3xl" />
              <div class="absolute bottom-0 right-14 h-40 w-40 rounded-full bg-sky-100/70 blur-3xl" />
              <div class="absolute right-24 top-6 h-24 w-24 rounded-full border border-white/70 bg-white/40 blur-2xl" />

              <div class="relative grid h-full w-full grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)] gap-6">
                <div class="flex h-full flex-col justify-between">
                  <div class="max-w-md space-y-8">

                    <div class="space-y-6">
                      <h2 class="text-[30px] font-black leading-tight text-slate-950">
                        欢迎来到二手物品交易平台<br>发现身边的宝藏
                      </h2>
                      <p class="text-sm leading-7 text-slate-600">
                        真实分类与商品数据已接入，浏览同校正在出售的闲置好物，快速找到你需要的那一件。
                      </p>
                    </div>
                  </div>

                  <div class="flex max-w-md flex-wrap gap-2.5">
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      {{ activeCategoryTitle }}
                    </span>
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      当前已加载 {{ visibleProducts.length }} 件
                    </span>
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      全站在售 {{ total }} 件
                    </span>
                  </div>
                </div>

                <div class="relative flex h-full items-center justify-center">
                  <div class="relative h-full w-full">
                    <div
                      class="absolute right-1 top-6 w-[178px] rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_28px_60px_-34px_rgba(249,115,22,0.45)] transition duration-500 hover:-translate-y-1 hover:rotate-0"
                      style="transform: rotate(8deg); transform-origin: center;"
                    >
                      <div class="rounded-[22px] bg-[linear-gradient(135deg,#fde68a_0%,#fef3c7_42%,#ffffff_100%)] p-4">
                        <div class="h-24 rounded-[18px] bg-white/60" />
                      </div>
                      <div class="mt-4 space-y-2">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
                          分类树
                        </p>
                        <p class="line-clamp-2 text-sm font-black text-slate-900">
                          一级二级三级分类实时渲染，导航与商品筛选同步联动
                        </p>
                      </div>
                    </div>

                    <div
                      class="absolute bottom-7 left-2 w-[190px] rounded-[26px] border border-white/80 bg-white/95 p-4 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)] transition duration-500 hover:-translate-y-1 hover:rotate-0"
                      style="transform: rotate(-7deg); transform-origin: center;"
                    >
                      <div class="rounded-[22px] bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_50%,#ffffff_100%)] p-4">
                        <div class="flex items-center justify-between">
                          <span class="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-sky-600">
                            商品流
                          </span>
                          <Sparkles class="h-4 w-4 text-sky-500" />
                        </div>
                        <div class="mt-4 h-20 rounded-[18px] bg-white/65" />
                      </div>
                      <div class="mt-4 flex items-center justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-black text-slate-900">无限滚动分页</p>
                          <p class="mt-1 text-xs text-slate-500">触底继续加载真实数据</p>
                        </div>
                        <div class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          在线
                        </div>
                      </div>
                    </div>

                    <div class="absolute right-10 top-1/2 h-14 w-14 -translate-y-1/2 rounded-full bg-white/75 shadow-lg backdrop-blur transition duration-500 hover:-translate-y-[55%]">
                      <div class="flex h-full w-full items-center justify-center">
                        <Package class="h-6 w-6 text-brand-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex h-full min-h-0 flex-col">
            <div
              class="flex h-full min-h-0 flex-col justify-center rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.22)]"
            >
              <button
                type="button"
                class="flex flex-col items-center rounded-[24px] px-4 py-3 text-center transition hover:bg-slate-50"
                @click="handleUserShortcut"
              >
                <Avatar
                  size="lg"
                  :fallback="currentUser.avatar"
                  class="h-20 w-20 text-2xl shadow-[0_18px_36px_-22px_rgba(249,115,22,0.75)]"
                />
                <div class="mt-5 min-w-0 space-y-2">
                  <p class="text-sm font-semibold text-slate-500">Hi,</p>
                  <p class="truncate text-xl font-black text-slate-950">{{ currentUser.name }}</p>
                  <p class="truncate text-xs text-slate-400">{{ currentUser.studentNo }}</p>
                </div>
              </button>

              <div class="mt-8">
                <button
                  type="button"
                  class="flex w-full items-center gap-4 rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#f0fdf4_100%)] px-5 py-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_22px_44px_-30px_rgba(16,185,129,0.6)]"
                  @click="handleQuickAction(heroVerifyAction.label)"
                >
                  <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    :class="heroVerifyAction.accent"
                  >
                    <component :is="heroVerifyAction.icon" class="h-5 w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-base font-black text-slate-900">{{ heroVerifyAction.label }}</p>
                    <p class="mt-1 truncate text-xs text-slate-500">{{ heroVerifyAction.desc }}</p>
                  </div>
                  <ArrowRight class="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card class="overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div
          class="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"
        >

          <div class="flex gap-2 overflow-x-auto pb-1">
            <Button
              v-for="tab in level1Tabs"
              :key="tab.key"
              size="sm"
              :variant="
                (tab.mode === 'all' && activeCategoryMode === 'all') ||
                (tab.mode === 'root' && activeCategoryMode === 'root' && activeRootCategoryId === tab.id)
                  ? 'default'
                  : 'ghost'
              "
              class="shrink-0"
              :class="
                (tab.mode === 'all' && activeCategoryMode === 'all') ||
                (tab.mode === 'root' && activeCategoryMode === 'root' && activeRootCategoryId === tab.id)
                  ? 'shadow-[0_14px_34px_-18px_rgba(249,115,22,0.9)]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              "
              @click="handleTabClick(tab)"
            >
              {{ tab.label }}
            </Button>
          </div>
        </div>

        <div
          v-if="isLoadingProducts && !products.length"
          class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
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
          v-else
          class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="group overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
          >
            <div
              class="aspect-square overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white"
            >
              <img
                v-if="product.cover"
                :src="product.cover"
                :alt="product.title"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>

            <div class="space-y-3 p-3">
              <div class="min-w-0 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-[11px] font-medium text-slate-500">
                    {{ getProductCategoryLabel(product) }}
                  </p>
                  <p class="truncate text-[11px] text-slate-400">{{ product.location }}</p>
                </div>
                <h3 class="truncate text-sm font-semibold text-slate-900">
                  {{ product.title }}
                </h3>
                <div class="flex items-center gap-2">
                  <p class="text-lg font-semibold text-brand-600">￥{{ formatPrice(product.price) }}</p>
                  <p
                    v-if="product.oldPrice"
                    class="text-xs text-slate-400 line-through"
                  >
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
                <div class="min-w-0 flex items-center">
                  <p class="truncate text-xs font-semibold text-slate-800">{{ product.sellerName }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div
          v-if="!isLoadingProducts && !visibleProducts.length"
          class="flex min-h-48 items-center justify-center text-sm text-slate-400"
        >
          当前分类下暂无商品
        </div>

        <div ref="loadAnchor" class="flex min-h-20 items-center justify-center pt-6">
          <p v-if="isLoadingMore" class="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <LoaderCircle class="h-4 w-4 animate-spin" />
            加载中...
          </p>
          <p v-else-if="!hasMore" class="text-sm font-medium text-slate-400">没有更多了</p>
          <p v-else class="text-sm text-slate-400">继续下滑，发现更多闲置</p>
        </div>
      </Card>
    </div>

    <div
      class="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex xl:flex-col xl:items-center xl:gap-3"
    >
      <Button
        size="icon"
        class="h-14 w-14 rounded-[28px] shadow-[0_22px_50px_-24px_rgba(249,115,22,0.92)]"
        @click="handleQuickAction('发闲置')"
      >
        <Plus class="h-5 w-5" />
      </Button>
      <button
        type="button"
        class="flex h-14 w-14 items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-700 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-brand-200 hover:text-brand-600"
        @click="handleQuickAction('消息')"
      >
        <MessageCircle class="h-5 w-5" />
      </button>
    </div>

    <div
      class="fixed inset-x-4 bottom-4 z-40 flex items-center justify-end gap-3 rounded-full border border-white/70 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur xl:hidden"
    >
      <Button size="icon" class="h-11 w-11 rounded-full" @click="handleQuickAction('发闲置')">
        <Plus class="h-4 w-4" />
      </Button>
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-brand-200 hover:text-brand-600"
        @click="handleQuickAction('消息')"
      >
        <MessageCircle class="h-5 w-5" />
      </button>
    </div>
  </section>
</template>
