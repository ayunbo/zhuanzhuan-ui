<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ChevronDown, Search, ShoppingBag } from 'lucide-vue-next'
import AuthDialog from '@/components/AuthDialog.vue'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  ensureLoggedIn,
  getAuthUser,
  isLoggedIn as checkLoggedIn,
  openLoginDialog,
} from '@/utils/request'

const route = useRoute()
const router = useRouter()

const searchKeyword = ref('')
const hideChrome = computed(() => route.meta.hideChrome === true)
const showNavbarSearch = computed(() => route.meta.showNavbarSearch !== false)
const isLoggedIn = ref(checkLoggedIn())
const currentUser = ref(getDisplayUser())
const isUserMenuOpen = ref(false)

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
}

function handleSearch() {
  const keyword = searchKeyword.value.trim()
  router.push({
    path: '/search',
    query: keyword ? { keyword } : {},
  })
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

onMounted(() => {
  window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState)

  if (userMenuCloseTimer) {
    window.clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }
})

watch(
  () => route.query.keyword,
  (keyword) => {
    searchKeyword.value = typeof keyword === 'string' ? keyword : ''
  },
  { immediate: true },
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
            转转
          </div>
          <div>
            <p class="text-base font-black tracking-[0.16em] text-slate-950">校园二手物品交易平台</p>
            <p class="text-xs text-slate-500">Campus Reuse Marketplace</p>
          </div>
        </button>

        <form
          v-if="showNavbarSearch"
          class="flex flex-1 items-center gap-2 lg:mx-auto lg:max-w-3xl"
          @submit.prevent="handleSearch"
        >
          <Input
            v-model="searchKeyword"
            type="search"
            placeholder="搜教材、耳机、宿舍好物"
            class="h-11 flex-1 border-white bg-slate-50/90 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.55)]"
          />
          <Button type="submit" size="lg" class="h-11 shrink-0 px-5">
            <Search class="h-4 w-4" />
            搜索
          </Button>
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
  </div>
</template>
