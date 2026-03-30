<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowRight, MessageCircle, Plus } from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const spotlightCategories = [
  { name: '二手书籍', subtitle: '教材 / 考研 / 课外读物', accent: 'text-amber-700 bg-amber-50' },
  { name: '数码 3C', subtitle: '耳机 / 平板 / 配件', accent: 'text-sky-700 bg-sky-50' },
  { name: '宿舍好物', subtitle: '收纳 / 台灯 / 小家电', accent: 'text-emerald-700 bg-emerald-50' },
  { name: '交通代步', subtitle: '自行车 / 滑板 / 头盔', accent: 'text-violet-700 bg-violet-50' },
  { name: '美妆服饰', subtitle: '穿搭 / 护肤 / 香氛', accent: 'text-rose-700 bg-rose-50' },
  { name: '文创周边', subtitle: '手账 / 摆件 / 盲盒', accent: 'text-orange-700 bg-orange-50' },
]

const categoryTabs = ['全部', '二手书籍', '数码3C', '宿舍好物', '交通代步', '美妆服饰', '文创周边']

const titleSeeds = {
  二手书籍: [
    '线性代数笔记超全版',
    '考研英语词汇红宝书',
    '离散数学教材带习题解',
    'C++ 程序设计基础',
  ],
  数码3C: ['95 新降噪耳机', '平板保护壳套装', '机械键盘青轴', '二手显示器支架'],
  宿舍好物: ['宿舍收纳推车', '可调光护眼台灯', '小型煮面锅', '床边折叠置物架'],
  交通代步: ['校园代步自行车', '长板练习板', '九成新骑行头盔', '电动车雨披'],
  美妆服饰: ['奶白色针织开衫', '闲置香水小样合集', '校园通勤帆布包', '防晒帽'],
  文创周边: ['手账胶带福袋', '演唱会应援周边', '校园限定徽章', '桌面解压摆件'],
}

const sellerSeeds = ['林夏', '周予安', '许知远', '姜柠', '温枝', '沈听澜', '顾言', '宋时微']
const campusTags = ['宿舍楼下', '图书馆旁', '食堂门口', '东门快取', '南区自提', '学院路口']
const distanceTags = ['5分钟前', '12分钟前', '30分钟前', '1小时前', '2小时前', '今天发布']
const coverTones = [
  'from-amber-200 via-orange-100 to-white',
  'from-sky-200 via-cyan-100 to-white',
  'from-emerald-200 via-teal-100 to-white',
  'from-rose-200 via-pink-100 to-white',
  'from-violet-200 via-fuchsia-100 to-white',
  'from-yellow-200 via-amber-100 to-white',
]

const activeCategory = ref('全部')
const products = ref(createInitialProducts())
const page = ref(1)
const maxPage = 4
const isLoadingMore = ref(false)
const hasMore = ref(true)
const loadAnchor = ref(null)

let observer
let loadTimer

const visibleProducts = computed(() => {
  if (activeCategory.value === '全部') {
    return products.value
  }

  return products.value.filter((product) => product.category === activeCategory.value)
})

function createProduct(pageIndex, itemIndex) {
  const categoryPool = categoryTabs.slice(1)
  const category = categoryPool[(pageIndex * 3 + itemIndex) % categoryPool.length]
  const titles = titleSeeds[category]
  const sellerName = sellerSeeds[(pageIndex + itemIndex) % sellerSeeds.length]
  const tone = coverTones[(pageIndex + itemIndex) % coverTones.length]
  const title = titles[itemIndex % titles.length]
  const price = 18 + ((pageIndex * 7 + itemIndex) % 15) * 12 + (itemIndex % 3) * 0.9

  return {
    id: `${pageIndex}-${itemIndex}`,
    title,
    price: price.toFixed(price % 1 === 0 ? 0 : 1),
    category,
    sellerName,
    sellerAvatar: sellerName.slice(0, 1),
    coverLabel: category,
    coverTone: tone,
    campusTag: campusTags[(pageIndex + itemIndex) % campusTags.length],
    distanceText: distanceTags[(pageIndex * 2 + itemIndex) % distanceTags.length],
  }
}

function createInitialProducts() {
  return Array.from({ length: 12 }, (_, index) => createProduct(0, index))
}

function createNextPage(pageIndex) {
  return Array.from({ length: 8 }, (_, index) => createProduct(pageIndex, index))
}

function selectCategory(category) {
  activeCategory.value = category
}

function handleQuickAction(label) {
  console.log(`快捷操作点击: ${label}`)
  window.alert(`${label} 功能暂未开放`)
}

function loadMoreProducts() {
  if (isLoadingMore.value || !hasMore.value) {
    return
  }

  isLoadingMore.value = true
  loadTimer = window.setTimeout(() => {
    if (page.value >= maxPage) {
      hasMore.value = false
      isLoadingMore.value = false
      return
    }

    products.value.push(...createNextPage(page.value))
    page.value += 1
    isLoadingMore.value = false

    if (page.value >= maxPage) {
      hasMore.value = false
    }
  }, 900)
}

function setupObserver() {
  if (!loadAnchor.value) {
    return
  }

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

onMounted(() => {
  setupObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (loadTimer) {
    window.clearTimeout(loadTimer)
  }
})
</script>

<template>
  <section class="relative px-4 pb-20 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-[1280px] flex-col gap-6">
      <Card class="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
        <div
          class="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_34%)]"
        />

        <div class="relative grid gap-8 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-brand-500">
                  热门分类
                </p>
                <h2 class="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                  附近同学都在这里捡漏
                </h2>
              </div>
              <button
                type="button"
                class="hidden items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-600 sm:inline-flex"
                @click="handleQuickAction('查看全部分类')"
              >
                查看全部
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="item in spotlightCategories"
                :key="item.name"
                type="button"
                class="group rounded-3xl border border-slate-200/80 bg-slate-50/85 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lg"
                @click="selectCategory(item.name === '数码 3C' ? '数码3C' : item.name)"
              >
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  :class="item.accent"
                >
                  {{ item.name }}
                </span>
                <p
                  class="mt-4 text-base font-bold text-slate-900 transition group-hover:text-brand-600"
                >
                  {{ item.subtitle }}
                </p>
                <p class="mt-1 text-sm text-slate-500">今日转手热度持续上升</p>
              </button>
            </div>
          </div>

          <div
            class="rounded-[30px] bg-slate-950 px-6 py-7 text-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.95)] sm:px-8"
          >
            <div
              class="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-brand-200"
            >
              WELCOME
            </div>
            <h1 class="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              欢迎来到校园二手平台，
              <br />
              发现身边的宝藏。
            </h1>
            <p class="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              从教材到耳机，从宿舍收纳到校园通勤，优先和同校同学安心交易，让闲置流转更快一点。
            </p>

            <div class="mt-6 flex flex-wrap gap-3">
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">实时热度</p>
                <p class="mt-2 text-2xl font-black text-white">1,286</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">同校发布</p>
                <p class="mt-2 text-2xl font-black text-white">324</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">担保面交</p>
                <p class="mt-2 text-2xl font-black text-white">98%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card class="overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div
          class="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.26em] text-brand-500">发现好物</p>
            <h2 class="mt-2 text-2xl font-black text-slate-950">校园内常用分类</h2>
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1">
            <Button
              v-for="category in categoryTabs"
              :key="category"
              size="sm"
              :variant="activeCategory === category ? 'default' : 'ghost'"
              class="shrink-0"
              :class="
                activeCategory === category
                  ? 'shadow-[0_14px_34px_-18px_rgba(249,115,22,0.9)]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              "
              @click="selectCategory(category)"
            >
              {{ category }}
            </Button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="group overflow-hidden rounded-[24px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.35)]"
          >
            <div
              class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br p-4"
              :class="product.coverTone"
            >
              <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.46),transparent_28%)]"
              />
              <div class="relative flex h-full flex-col justify-between">
                <div class="flex items-start justify-between gap-3">
                  <span
                    class="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {{ product.coverLabel }}
                  </span>
                  <span
                    class="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium text-white"
                  >
                    {{ product.distanceText }}
                  </span>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {{ product.campusTag }}
                  </p>
                  <p class="mt-2 max-w-[12rem] text-lg font-black leading-snug text-slate-900">
                    {{ product.title }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
                    {{ product.title }}
                  </h3>
                  <p class="mt-2 text-2xl font-black text-brand-600">￥{{ product.price }}</p>
                </div>
                <span
                  class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                >
                  同校
                </span>
              </div>

              <div class="flex items-center gap-3">
                <Avatar size="sm" :fallback="product.sellerAvatar" />
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ product.sellerName }}</p>
                  <p class="text-xs text-slate-500">已完成实名认证</p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div ref="loadAnchor" class="flex min-h-20 items-center justify-center pt-6">
          <p v-if="isLoadingMore" class="text-sm font-medium text-slate-500">加载中...</p>
          <p v-else-if="!hasMore" class="text-sm font-medium text-slate-400">已经到底了</p>
          <p v-else class="text-sm text-slate-400">继续下滑，发现更多闲置</p>
        </div>
      </Card>
    </div>

    <div
      class="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex xl:flex-col xl:items-center xl:gap-3"
    >
      <Button
        size="lg"
        class="h-14 rounded-3xl px-5 shadow-[0_22px_50px_-24px_rgba(249,115,22,0.92)]"
        @click="handleQuickAction('发闲置')"
      >
        <Plus class="h-5 w-5" />
        发闲置
      </Button>
      <button
        type="button"
        class="flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-brand-200 hover:text-brand-600"
        @click="handleQuickAction('消息')"
      >
        <MessageCircle class="h-5 w-5" />
      </button>
    </div>

    <div
      class="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-full border border-white/70 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur xl:hidden"
    >
      <Button class="flex-1 rounded-full" @click="handleQuickAction('发闲置')">
        <Plus class="h-4 w-4" />
        发闲置
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
