<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Bike,
  BookOpen,
  ChevronRight,
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
import {
  AUTH_CHANGED_EVENT,
  ensureLoggedIn,
  getAuthUser,
  isLoggedIn as checkLoggedIn,
  openLoginDialog,
} from '@/utils/request'

const router = useRouter()

const categoryTree = [
  {
    id: 'digital',
    name: '手机数码',
    accent: 'text-sky-700 bg-sky-50',
    subtitle: '耳机 / 平板 / 配件 / 电脑设备',
    children: [
      {
        id: 'phone',
        name: '手机通讯',
        children: [
          { id: 'iphone', name: 'iPhone' },
          { id: 'android', name: '安卓手机' },
          { id: 'cases', name: '手机壳膜' },
          { id: 'charger', name: '充电器' },
        ],
      },
      {
        id: 'audio',
        name: '音频设备',
        children: [
          { id: 'headphone', name: '耳机' },
          { id: 'speaker', name: '音箱' },
          { id: 'microphone', name: '麦克风' },
          { id: 'dac', name: '解码器' },
        ],
      },
      {
        id: 'computer',
        name: '电脑外设',
        children: [
          { id: 'keyboard', name: '键盘' },
          { id: 'mouse', name: '鼠标' },
          { id: 'display', name: '显示器' },
          { id: 'tablet', name: '平板' },
        ],
      },
    ],
  },
  {
    id: 'fashion',
    name: '服饰鞋包',
    accent: 'text-rose-700 bg-rose-50',
    subtitle: '穿搭 / 鞋履 / 包袋 / 配饰',
    children: [
      {
        id: 'tops',
        name: '上装外套',
        children: [
          { id: 'hoodie', name: '卫衣' },
          { id: 'shirt', name: '衬衫' },
          { id: 'coat', name: '外套' },
          { id: 'knitwear', name: '针织衫' },
        ],
      },
      {
        id: 'shoes',
        name: '鞋履箱包',
        children: [
          { id: 'sneaker', name: '运动鞋' },
          { id: 'leather', name: '皮鞋' },
          { id: 'backpack', name: '双肩包' },
          { id: 'tote', name: '托特包' },
        ],
      },
      {
        id: 'accessory',
        name: '饰品配件',
        children: [
          { id: 'watch', name: '手表' },
          { id: 'hat', name: '帽子' },
          { id: 'belt', name: '腰带' },
          { id: 'jewelry', name: '饰品' },
        ],
      },
    ],
  },
  {
    id: 'books',
    name: '图书教材',
    accent: 'text-amber-700 bg-amber-50',
    subtitle: '教材 / 考研 / 课外读物 / 讲义',
    children: [
      {
        id: 'textbooks',
        name: '教材教辅',
        children: [
          { id: 'math', name: '高数线代' },
          { id: 'english', name: '大学英语' },
          { id: 'physics', name: '大学物理' },
          { id: 'programming', name: '编程教材' },
        ],
      },
      {
        id: 'exam',
        name: '考研考公',
        children: [
          { id: 'politics', name: '政治' },
          { id: 'vocabulary', name: '词汇' },
          { id: 'specialized', name: '专业课' },
          { id: 'interview', name: '面试题' },
        ],
      },
      {
        id: 'reading',
        name: '课外阅读',
        children: [
          { id: 'novel', name: '小说' },
          { id: 'history', name: '历史' },
          { id: 'business', name: '经管' },
          { id: 'art', name: '艺术设计' },
        ],
      },
    ],
  },
  {
    id: 'transport',
    name: '交通代步',
    accent: 'text-violet-700 bg-violet-50',
    subtitle: '自行车 / 滑板 / 头盔 / 配件',
    children: [
      {
        id: 'bike',
        name: '自行车',
        children: [
          { id: 'commute-bike', name: '通勤车' },
          { id: 'mountain-bike', name: '山地车' },
          { id: 'repair', name: '维修工具' },
          { id: 'lock', name: '车锁' },
        ],
      },
      {
        id: 'board',
        name: '滑板轮滑',
        children: [
          { id: 'longboard', name: '长板' },
          { id: 'skateboard', name: '双翘板' },
          { id: 'roller', name: '轮滑' },
          { id: 'protection', name: '护具' },
        ],
      },
      {
        id: 'electric',
        name: '电动出行',
        children: [
          { id: 'battery', name: '电瓶' },
          { id: 'raincoat', name: '雨披' },
          { id: 'basket', name: '车筐' },
          { id: 'helmet', name: '头盔' },
        ],
      },
    ],
  },
  {
    id: 'dorm',
    name: '宿舍好物',
    accent: 'text-emerald-700 bg-emerald-50',
    subtitle: '收纳 / 台灯 / 小家电 / 寝具',
    children: [
      {
        id: 'storage',
        name: '收纳整理',
        children: [
          { id: 'box', name: '收纳箱' },
          { id: 'rack', name: '置物架' },
          { id: 'hanger', name: '衣架' },
          { id: 'desk-organizer', name: '桌面收纳' },
        ],
      },
      {
        id: 'appliance',
        name: '宿舍电器',
        children: [
          { id: 'lamp', name: '台灯' },
          { id: 'fan', name: '小风扇' },
          { id: 'cooker', name: '小锅' },
          { id: 'humidifier', name: '加湿器' },
        ],
      },
      {
        id: 'bedding',
        name: '寝居用品',
        children: [
          { id: 'mattress', name: '床垫' },
          { id: 'pillow', name: '枕头' },
          { id: 'blanket', name: '毛毯' },
          { id: 'curtain', name: '床帘' },
        ],
      },
    ],
  },
]

const quickActions = [
  {
    id: 'verify',
    label: '快速认证',
    desc: '完成身份认证',
    icon: ShieldCheck,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'publish',
    label: '发布闲置',
    desc: '一键发布商品',
    icon: Sparkles,
    accent: 'bg-orange-50 text-orange-700',
  },
  {
    id: 'message',
    label: '消息中心',
    desc: '查看最新动态',
    icon: MessageCircle,
    accent: 'bg-sky-50 text-sky-700',
  },
]

const titleSeeds = {
  图书教材: [
    '线性代数笔记超全版',
    '考研英语词汇红宝书',
    '离散数学教材带习题解',
    'C++ 程序设计基础',
  ],
  手机数码: ['95新降噪耳机', '平板保护壳套装', '机械键盘青轴', '二手显示器支架'],
  宿舍好物: ['宿舍收纳推车', '可调光护眼台灯', '小型煮面锅', '床边折叠置物架'],
  交通代步: ['校园代步自行车', '长板练习款', '九成新骑行头盔', '电动车雨披'],
  服饰鞋包: ['奶白色针织开衫', '闲置香水小样合集', '校园通勤帆布包', '防晒帽'],
  文创周边: ['手帐胶带福袋', '演唱会应援周边', '校园限定徽章', '桌面解压摆件'],
}

const sellerSeeds = ['林夏', '周予安', '许知远', '姜柠', '温枝', '沈听澜', '顾言', '宋时微']
const campusTags = ['宿舍楼下', '图书馆旁', '食堂门口', '东门快取', '南区自提', '学院路口']
const coverTones = [
  'from-amber-200 via-orange-100 to-white',
  'from-sky-200 via-cyan-100 to-white',
  'from-emerald-200 via-teal-100 to-white',
  'from-rose-200 via-pink-100 to-white',
  'from-violet-200 via-fuchsia-100 to-white',
  'from-yellow-200 via-amber-100 to-white',
]

const level1Tabs = ['全部', ...categoryTree.map((item) => item.name)]

const activeCategory = ref('全部')
const activeMegaMenuId = ref('')
const products = ref(createInitialProducts())
const page = ref(1)
const maxPage = 4
const isLoadingMore = ref(false)
const hasMore = ref(true)
const loadAnchor = ref(null)
const isLoggedIn = ref(checkLoggedIn())
const currentUser = ref(getDisplayUser())

let observer
let loadTimer

const featuredCategories = computed(() => categoryTree.slice(0, 6))
const activeMegaCategory = computed(
  () => categoryTree.find((item) => item.id === activeMegaMenuId.value) || null,
)

const visibleProducts = computed(() => {
  if (activeCategory.value === '全部') {
    return products.value
  }

  return products.value.filter((product) => product.categoryPath.level1 === activeCategory.value)
})

function getDisplayUser() {
  const authUser = getAuthUser()
  return {
    name: authUser?.name || '同学',
    studentNo: authUser?.studentNo || '登录后查看订单与收藏',
    avatar: authUser?.name?.slice(0, 1)?.toLowerCase() || 'c',
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

function openMegaMenu(categoryId) {
  activeMegaMenuId.value = categoryId
}

function closeMegaMenu() {
  activeMegaMenuId.value = ''
}

function getDeepestCategoryLabel(product) {
  return (
    product?.categoryPath?.level3 ||
    product?.categoryPath?.level2 ||
    product?.categoryPath?.level1 ||
    ''
  )
}

function createProduct(pageIndex, itemIndex) {
  const categoryNode = categoryTree[(pageIndex * 3 + itemIndex) % categoryTree.length]
  const level2Node = categoryNode.children[(pageIndex + itemIndex) % categoryNode.children.length]
  const level3Node = level2Node.children[itemIndex % level2Node.children.length]
  const titles = titleSeeds[categoryNode.name] || titleSeeds.图书教材
  const sellerName = sellerSeeds[(pageIndex + itemIndex) % sellerSeeds.length]
  const tone = coverTones[(pageIndex + itemIndex) % coverTones.length]
  const title = titles[itemIndex % titles.length]
  const price = 18 + ((pageIndex * 7 + itemIndex) % 15) * 12 + (itemIndex % 3) * 0.9

  return {
    id: `${pageIndex}-${itemIndex}`,
    title,
    price: price.toFixed(price % 1 === 0 ? 0 : 1),
    categoryPath: {
      level1: categoryNode.name,
      level2: level2Node.name,
      level3: level3Node.name,
    },
    sellerName,
    sellerAvatar: sellerName.slice(0, 1),
    coverTone: tone,
    campusTag: campusTags[(pageIndex + itemIndex) % campusTags.length],
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

function handleUserShortcut() {
  if (isLoggedIn.value) {
    window.alert('个人中心暂未开放')
    return
  }

  openLoginDialog({ source: 'hero-user-card' })
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
  window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState)
  if (loadTimer) {
    window.clearTimeout(loadTimer)
  }
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
              <div class="rounded-[22px] bg-slate-50 px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">Campus Mall</p>
                <h3 class="mt-2 text-lg font-black text-slate-950">校园分类导航</h3>
              </div>

              <div class="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
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
                  <h4 class="mt-3 text-2xl font-black text-slate-950">{{ activeMegaCategory.subtitle }}</h4>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                  @click="selectCategory(activeMegaCategory.name)"
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
                      v-for="leaf in group.children"
                      :key="leaf.id"
                      type="button"
                      class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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
              class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-200/70 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_44%,#eff6ff_100%)] px-6 py-6 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.28)] xl:px-7 xl:py-6"
            >
              <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-200/50 blur-3xl" />
              <div class="absolute -bottom-16 right-12 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />

              <div class="relative flex h-full min-h-0 flex-col justify-between gap-5">
                <div>
                  <div class="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-brand-500 shadow-sm">
                    CAMPUS REUSE
                  </div>
                  <h2 class="mt-4 max-w-[13ch] text-[30px] font-black leading-[1.12] text-slate-950">
                    欢迎来到校园二手平台，发现身边的宝藏
                  </h2>
                  <p class="mt-3 max-w-[38ch] text-sm leading-6 text-slate-600">
                    同校闲置更安心，教材、耳机、宿舍好物和通勤装备都能在这里快速流转。
                  </p>
                </div>

                <div class="space-y-3">
                  <div class="flex flex-wrap gap-2">
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      平台担保面交
                    </span>
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      同校发布优先
                    </span>
                    <span class="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      热门闲置实时更新
                    </span>
                  </div>

                  <div class="flex items-center gap-3">
                    <Button class="rounded-full px-6" @click="handleQuickAction('发闲置')">发布闲置</Button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-brand-600"
                      @click="selectCategory('全部')"
                    >
                      去逛商品流
                      <ArrowRight class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex h-full min-h-0 flex-col gap-3">
            <div
              class="flex flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.22)]"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-[20px] p-1 text-left transition hover:bg-slate-50"
                @click="handleUserShortcut"
              >
                <Avatar size="md" :fallback="currentUser.avatar" />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-500">
                    {{ isLoggedIn ? 'Hi,' : 'Hi,' }}
                    <span class="ml-1 text-slate-950">{{ currentUser.name }}</span>
                  </p>
                  <p class="mt-1 truncate text-xs text-slate-400">{{ currentUser.studentNo }}</p>
                </div>
              </button>

              <div class="mt-3 rounded-[20px] bg-slate-50 px-4 py-3">
                <p class="text-sm font-semibold text-slate-900">
                  {{ isLoggedIn ? '欢迎回来，继续看看附近好物。' : '登录后可查看订单、收藏与消息。' }}
                </p>
                <p class="mt-2 text-xs leading-5 text-slate-500">
                  {{ isLoggedIn ? '校园交易动态会第一时间同步到你的消息中心。' : '一键登录即可使用发布、认证和消息功能。' }}
                </p>
              </div>
            </div>

            <div class="grid h-full flex-1 grid-cols-1 gap-3">
              <button
                v-for="item in quickActions"
                :key="item.id"
                type="button"
                class="flex min-h-0 items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-brand-200"
                @click="handleQuickAction(item.label)"
              >
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl" :class="item.accent">
                  <component :is="item.icon" class="h-[18px] w-[18px]" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-slate-900">{{ item.label }}</p>
                  <p class="mt-1 truncate text-xs text-slate-400">{{ item.desc }}</p>
                </div>
              </button>
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
              v-for="category in level1Tabs"
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

        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="group overflow-hidden rounded-[20px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]"
          >
            <div class="relative aspect-square overflow-hidden bg-gradient-to-br p-3" :class="product.coverTone">
              <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.46),transparent_28%)]"
              />

              <div class="relative flex h-full flex-col justify-between">
                <div class="flex items-start justify-end">
                  <span class="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {{ getDeepestCategoryLabel(product) }}
                  </span>
                </div>

                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {{ product.campusTag }}
                  </p>
                  <p class="mt-1.5 line-clamp-2 text-sm font-black leading-5 text-slate-900">
                    {{ product.title }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-3 p-3">
              <div class="min-w-0">
                <h3 class="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {{ product.title }}
                </h3>
                <p class="mt-1.5 text-lg font-black text-brand-600">￥{{ product.price }}</p>
              </div>

              <div class="flex items-center gap-2.5">
                <Avatar size="sm" :fallback="product.sellerAvatar" />
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-800">{{ product.sellerName }}</p>
                  <p class="truncate text-[11px] text-slate-500">{{ getDeepestCategoryLabel(product) }}</p>
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
