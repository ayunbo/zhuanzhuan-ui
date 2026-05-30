<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ChevronDown, Clock3, LoaderCircle, Search, ShoppingBag } from 'lucide-vue-next'
import { fetchHotSearches, fetchSearchSuggestions } from '@/api/search'
import AuthDialog from '@/components/AuthDialog.vue'
import NotifyDebugPanel from '@/components/notify/NotifyDebugPanel.vue'
import TopNotifyCapsule from '@/components/notify/TopNotifyCapsule.vue'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/stores/chat'
import { useNotifyStore } from '@/stores/notify'
import { getNoticeActionText, resolveNoticeTargetRoute } from '@/utils/notify/target'
import {
  buildSearchAssistFallback,
  getFallbackHotSearchKeywords,
} from '@/utils/search'
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  ensureLoggedIn,
  getAuthUser,
  isLoggedIn as checkLoggedIn,
  openLoginDialog,
  validateAuthSession,
} from '@/utils/request'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const notifyStore = useNotifyStore()

const searchKeyword = ref('')
const searchHotKeywords = ref([])
const searchSuggestions = ref([])
const searchAssistVisible = ref(false)
const isSuggestionLoading = ref(false)
const isHotSearchLoading = ref(false)
const hasHotSearchLoadFinished = ref(false)
const hideChrome = computed(() => route.meta.hideChrome === true)
const showNavbarSearch = computed(() => route.meta.showNavbarSearch !== false)
const isLoggedIn = ref(checkLoggedIn())
const currentUser = ref(getDisplayUser())
const isUserMenuOpen = ref(false)
const notifyCapsuleVisible = ref(false)
const notifyCapsuleVersion = ref(0)
const notifyCapsuleNotice = ref(null)
const notifyCapsuleActionText = computed(() => getNoticeActionText(notifyCapsuleNotice.value))
const showNotifyDebugPanel = computed(
  () => import.meta.env.DEV || import.meta.env.VITE_ENABLE_NOTIFY_DEBUG_PANEL === 'true',
)
const displaySearchSuggestions = computed(() =>
  isSuggestionLoading.value
    ? []
    : searchSuggestions.value.length > 0
      ? searchSuggestions.value
      : buildSearchAssistFallback(searchKeyword.value, 8),
)
const displayHotSearchKeywords = computed(() =>
  isHotSearchLoading.value
    ? []
    : searchHotKeywords.value.length > 0
      ? searchHotKeywords.value
      : getFallbackHotSearchKeywords(8),
)

let searchAssistCloseTimer = null
let searchAssistLookupTimer = null
let hotSearchRequestId = 0
let suggestionRequestId = 0

const menuItems = [
  { key: 'bought', label: '我买到的', path: '/user/bought' },
  { key: 'sold', label: '我卖出的', path: '/user/sold' },
  { key: 'favorites', label: '我的收藏', path: '/user/favorites' },
  { key: 'logout', label: '退出登录' },
]

let userMenuCloseTimer = null

function getDisplayUser() {
  const authUser = getAuthUser()

  return {
    name: authUser?.name || '未登录',
    campus: authUser?.studentNo || '点击登录',
    avatar: authUser?.name?.slice(0, 1)?.toUpperCase() || '校',
    avatarSrc: authUser?.avatar || '',
  }
}

function syncAuthState() {
  isLoggedIn.value = checkLoggedIn()
  currentUser.value = getDisplayUser()

  if (!isLoggedIn.value) {
    closeUserMenu()
  }

  bootstrapMessageState()
}

async function bootstrapMessageState() {
  if (!isLoggedIn.value) {
    notifyCapsuleVisible.value = false
    chatStore.reset()
    notifyStore.reset()
    return
  }

  chatStore.connectSocket()

  await Promise.allSettled([
    chatStore.refreshUnreadTotal(),
    chatStore.refreshSessionList(),
    notifyStore.refreshUnreadTotal(),
    notifyStore.refreshSessionSummary(),
  ])
}

async function validateGlobalSession(openDialogOnFail = false) {
  if (!checkLoggedIn()) {
    syncAuthState()
    return
  }

  await validateAuthSession({ openDialogOnFail })
  syncAuthState()
}

function handleSearch() {
  const keyword = searchKeyword.value.trim()
  closeSearchAssist()
  router.push({
    path: '/search',
    query: keyword ? { keyword } : {},
  })
}

function normalizeSearchKeywordList(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => Boolean(item)),
    ),
  )
}

function clearSearchAssistTimers() {
  if (searchAssistCloseTimer) {
    window.clearTimeout(searchAssistCloseTimer)
    searchAssistCloseTimer = null
  }

  if (searchAssistLookupTimer) {
    window.clearTimeout(searchAssistLookupTimer)
    searchAssistLookupTimer = null
  }
}

function closeSearchAssist() {
  clearSearchAssistTimers()
  searchAssistVisible.value = false
  suggestionRequestId += 1
  hotSearchRequestId += 1
}

function openSearchAssist() {
  clearSearchAssistTimers()
  searchAssistVisible.value = true

  const keyword = searchKeyword.value.trim()
  if (keyword) {
    scheduleSearchAssistLookup(keyword)
  } else if (!hasLoadedHotSearches()) {
    void loadHotSearches()
  }
}

function hasLoadedHotSearches() {
  return hasHotSearchLoadFinished.value || isHotSearchLoading.value || searchHotKeywords.value.length > 0
}

function scheduleSearchAssistLookup(keyword = searchKeyword.value) {
  const trimmed = keyword.trim()
  clearSearchAssistTimers()

  if (!trimmed) {
    searchSuggestions.value = []
    void loadHotSearches()
    return
  }

  searchAssistLookupTimer = window.setTimeout(() => {
    void loadSearchSuggestions(trimmed)
  }, 180)
}

async function loadHotSearches() {
  if (isHotSearchLoading.value) {
    return
  }

  const requestId = ++hotSearchRequestId
  isHotSearchLoading.value = true

  try {
    const data = await fetchHotSearches(8)
    if (requestId !== hotSearchRequestId) {
      return
    }

    searchHotKeywords.value = normalizeSearchKeywordList(data)
  } catch (error) {
    if (requestId === hotSearchRequestId) {
      searchHotKeywords.value = []
    }
    console.warn('热门搜索加载失败', error)
  } finally {
    if (requestId === hotSearchRequestId) {
      isHotSearchLoading.value = false
      hasHotSearchLoadFinished.value = true
    }
  }
}

async function loadSearchSuggestions(keyword) {
  if (!keyword) {
    searchSuggestions.value = []
    return
  }

  const requestId = ++suggestionRequestId
  isSuggestionLoading.value = true

  try {
    const data = await fetchSearchSuggestions(keyword, 8)
    if (requestId !== suggestionRequestId) {
      return
    }

    searchSuggestions.value = normalizeSearchKeywordList(data)
  } catch (error) {
    if (requestId === suggestionRequestId) {
      searchSuggestions.value = []
    }
    console.warn('联想词加载失败', error)
  } finally {
    if (requestId === suggestionRequestId) {
      isSuggestionLoading.value = false
    }
  }
}

function applySearchTerm(term) {
  const keyword = typeof term === 'string' ? term.trim() : ''
  if (!keyword) {
    return
  }

  searchKeyword.value = keyword
  closeSearchAssist()
  router.push({
    path: '/search',
    query: { keyword },
  })
}

function handleSearchInputFocus() {
  openSearchAssist()
}

function handleSearchInputBlur() {
  if (searchAssistCloseTimer) {
    window.clearTimeout(searchAssistCloseTimer)
  }

  searchAssistCloseTimer = window.setTimeout(() => {
    searchAssistVisible.value = false
  }, 150)
}

function openSearchHistory() {
  if (!ensureLoggedIn({ source: 'navbar-search-history' })) {
    return
  }

  closeSearchAssist()
  router.push('/user/search-history')
}

function openAuthDialog() {
  openLoginDialog({ source: 'navbar-avatar-click' })
}

function openUserMenu() {
  if (!isLoggedIn.value) {
    return
  }

  if (userMenuCloseTimer) {
    window.clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }

  isUserMenuOpen.value = true
}

function handleUserClick() {
  if (!ensureLoggedIn({ source: 'navbar-user-center' })) {
    return
  }

  closeUserMenu()
  router.push('/user')
}

function closeUserMenu() {
  if (userMenuCloseTimer) {
    window.clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }

  isUserMenuOpen.value = false
}

function scheduleCloseUserMenu() {
  if (!isLoggedIn.value) {
    return
  }

  if (userMenuCloseTimer) {
    window.clearTimeout(userMenuCloseTimer)
  }

  userMenuCloseTimer = window.setTimeout(() => {
    isUserMenuOpen.value = false
    userMenuCloseTimer = null
  }, 120)
}

function handleMenuClick(item) {
  closeUserMenu()

  if (item.key === 'logout') {
    notifyCapsuleVisible.value = false
    chatStore.reset()
    notifyStore.reset()
    clearAuthSession()
    return
  }

  if (!ensureLoggedIn({ source: `menu-${item.key}` })) {
    return
  }

  if (item.path) {
    router.push(item.path)
    return
  }

  router.push('/user')
}

function handleOrderClick() {
  if (!ensureLoggedIn({ source: 'order-entry' })) {
    return
  }

  router.push('/user/bought')
}

function formatNotifyTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function handleNotifyCapsuleAction() {
  const target = resolveNoticeTargetRoute(notifyCapsuleNotice.value)

  if (target) {
    router.push(target)
  } else {
    router.push({ path: '/chat', query: { sessionKey: 'system-notice' } })
  }

  notifyCapsuleVisible.value = false
}

function handleNotifyCapsuleClose() {
  notifyCapsuleVisible.value = false
}

function handleWindowFocus() {
  validateGlobalSession(false)
}

onMounted(() => {
  window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
  window.addEventListener('focus', handleWindowFocus)
  validateGlobalSession(false)
  void loadHotSearches()
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState)
  window.removeEventListener('focus', handleWindowFocus)

  if (userMenuCloseTimer) {
    window.clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }

  clearSearchAssistTimers()
  chatStore.disconnectSocket()
})

watch(
  () => route.query.keyword,
  (keyword) => {
    searchKeyword.value = typeof keyword === 'string' ? keyword : ''
  },
  { immediate: true },
)

watch(searchKeyword, (keyword) => {
  if (!showNavbarSearch.value || !searchAssistVisible.value) {
    return
  }

  const trimmed = keyword.trim()
  if (!trimmed) {
    searchSuggestions.value = []
    void loadHotSearches()
    return
  }

  scheduleSearchAssistLookup(trimmed)
})

watch(
  () => route.fullPath,
  () => {
    validateGlobalSession(false)
    closeSearchAssist()
  },
)

watch(
  () => notifyStore.lastIncomingNotice?.__stamp,
  () => {
    const notice = notifyStore.lastIncomingNotice
    if (!notice || !isLoggedIn.value) return

    notifyCapsuleNotice.value = notice
    notifyCapsuleVersion.value += 1
    notifyCapsuleVisible.value = true
  },
)
</script>

<template>
  <div class="min-h-screen">
    <header
      v-if="!hideChrome"
      class="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/88 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5 lg:px-8"
        :class="showNavbarSearch ? '' : 'lg:justify-between'"
      >
        <button
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-transparent bg-transparent p-1 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
          @click="router.push('/')"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-base font-bold text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)]"
          >
            赚赚
          </div>
          <div>
            <p class="text-base font-black tracking-[0.16em] text-slate-950">校园二手物品交易平台</p>
            <p class="text-xs text-slate-500">Campus Reuse Marketplace</p>
          </div>
        </button>

        <form
          v-if="showNavbarSearch"
          class="relative flex flex-1 items-center gap-2 lg:mx-auto lg:max-w-3xl"
          @submit.prevent="handleSearch"
        >
          <Input
            v-model="searchKeyword"
            type="search"
            placeholder="搜教材、耳机、宿舍好物"
            class="h-11 flex-1 border-white bg-slate-50/90 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.55)]"
            @focus="handleSearchInputFocus"
            @blur="handleSearchInputBlur"
          />
          <Button type="submit" size="lg" class="h-11 shrink-0 px-5">
            <Search class="h-4 w-4" />
            搜索
          </Button>
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-2 opacity-0"
          >
            <div
              v-if="searchAssistVisible && showNavbarSearch"
              class="absolute left-0 right-0 top-full z-[80] pt-3"
            >
              <div
                class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_-44px_rgba(15,23,42,0.45)]"
              >
                <div v-if="searchKeyword.trim()" class="border-b border-slate-100 px-4 py-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <Search class="h-4 w-4 text-brand-500" />
                      <p class="text-sm font-semibold text-slate-900">联想搜索</p>
                    </div>
                    <span v-if="isSuggestionLoading" class="text-xs text-slate-400">搜索中...</span>
                  </div>

                  <div class="mt-3 space-y-1">
                    <button
                      v-for="item in displaySearchSuggestions"
                      :key="item"
                      type="button"
                      class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-brand-700"
                      @mousedown.prevent="applySearchTerm(item)"
                    >
                      <span class="truncate">{{ item }}</span>
                      <Search class="h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                  </div>
                </div>

                <div class="px-4 py-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <Clock3 class="h-4 w-4 text-brand-500" />
                      <p class="text-sm font-semibold text-slate-900">热门搜索</p>
                    </div>
                    <button
                      type="button"
                      class="text-xs font-medium text-brand-600 transition hover:text-brand-700"
                      @mousedown.prevent="openSearchHistory"
                    >
                      搜索历史
                    </button>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      v-for="item in displayHotSearchKeywords"
                      :key="item"
                      type="button"
                      class="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      @mousedown.prevent="applySearchTerm(item)"
                    >
                      {{ item }}
                    </button>

                    <div v-if="isHotSearchLoading" class="flex items-center gap-2 text-sm text-slate-400">
                      <LoaderCircle class="h-4 w-4 animate-spin" />
                      热门搜索加载中...
                    </div>
                    <div v-else-if="!displayHotSearchKeywords.length" class="text-sm text-slate-400">
                      暂无热门搜索
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </form>

        <div class="flex items-center justify-between gap-3 lg:justify-end">
          <div
            v-if="isLoggedIn"
            class="relative hidden sm:block"
            @mouseenter="openUserMenu"
            @mouseleave="scheduleCloseUserMenu"
          >
            <button
              type="button"
              class="flex h-12 items-center gap-3 rounded-full border border-transparent bg-transparent px-4 transition-colors hover:border-slate-200 hover:bg-slate-50"
              :class="isUserMenuOpen ? 'border-slate-200 bg-slate-50' : ''"
              @click="handleUserClick"
            >
              <Avatar size="md" :src="currentUser.avatarSrc" :fallback="currentUser.avatar" />
              <div class="flex flex-col justify-center text-left">
                <p class="text-[15px] font-semibold leading-none text-slate-900">
                  {{ currentUser.name }}
                </p>
                <p class="mt-1 text-xs text-slate-500">{{ currentUser.campus }}</p>
              </div>
              <ChevronDown
                class="h-4 w-4 text-slate-400 transition"
                :class="isUserMenuOpen ? 'rotate-180' : ''"
              />
            </button>

            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="translate-y-1 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="translate-y-1 opacity-0"
            >
              <div
                v-show="isUserMenuOpen"
                class="absolute right-0 top-full z-[70] w-48 pt-3"
                @mouseenter="openUserMenu"
                @mouseleave="scheduleCloseUserMenu"
              >
                <div
                  class="rounded-3xl border border-slate-200 bg-white/96 p-2 text-left shadow-[0_24px_70px_-26px_rgba(15,23,42,0.28)] backdrop-blur"
                >
                  <button
                    v-for="item in menuItems"
                    :key="item.key"
                    type="button"
                    class="flex w-full cursor-pointer items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                    @click="handleMenuClick(item)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <button
            v-else
            type="button"
            class="hidden h-12 items-center gap-3 rounded-full border border-transparent bg-transparent px-4 transition-colors hover:border-slate-200 hover:bg-slate-50 sm:flex"
            @click="openAuthDialog"
          >
            <Avatar size="md" :src="currentUser.avatarSrc" :fallback="currentUser.avatar" />
            <div class="flex flex-col justify-center text-left">
              <p class="text-[15px] font-semibold leading-none text-slate-900">
                {{ currentUser.name }}
              </p>
              <p class="mt-1 text-xs text-slate-500">{{ currentUser.campus }}</p>
            </div>
            <ChevronDown class="h-4 w-4 text-slate-400 transition" />
          </button>

          <Button
            variant="ghost"
            class="h-12 rounded-full border border-transparent px-5 text-base font-semibold text-slate-700 hover:border-slate-200 hover:bg-slate-50"
            @click="handleOrderClick"
          >
            <ShoppingBag class="h-4 w-4" />
            订单
          </Button>
        </div>
      </div>
    </header>

    <main :class="hideChrome ? 'min-h-screen' : 'pt-32 sm:pt-28 lg:pt-20'">
      <RouterView />
    </main>

    <AuthDialog />
    <NotifyDebugPanel v-if="showNotifyDebugPanel" />
    <TopNotifyCapsule
      :visible="notifyCapsuleVisible"
      :title="notifyCapsuleNotice?.title || '系统通知'"
      :message="notifyCapsuleNotice?.content || ''"
      tag="系统通知"
      :time="formatNotifyTime(notifyCapsuleNotice?.createTime)"
      :action-text="notifyCapsuleActionText"
      :version="notifyCapsuleVersion"
      @action="handleNotifyCapsuleAction"
      @close="handleNotifyCapsuleClose"
    />
  </div>
</template>
