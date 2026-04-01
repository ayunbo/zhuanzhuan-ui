<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
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
const searchKeyword = ref('')
const hideChrome = computed(() => route.meta.hideChrome === true)
const isLoggedIn = ref(checkLoggedIn())
const currentUser = ref(getDisplayUser())
const isUserMenuOpen = ref(false)

const menuItems = ['我买到的', '我卖出的', '我的收藏', '退出登录']

let userMenuCloseTimer = null

function getDisplayUser() {
  const authUser = getAuthUser()
  return {
    name: authUser?.name || '未登录',
    campus: authUser?.studentNo || '点击登录',
    avatar: authUser?.name?.slice(0, 1)?.toUpperCase() || '校',
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
  const keyword = searchKeyword.value.trim() || '全部商品'
  console.log(`搜索校园二手商品: ${keyword}`)
  window.alert(`搜索功能演示：${keyword}`)
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

  if (item === '退出登录') {
    clearAuthSession()
    return
  }

  if (!ensureLoggedIn({ source: `menu-${item}` })) {
    return
  }

  console.log(`用户菜单点击: ${item}`)
  window.alert(`${item} 功能暂未接入`)
}

function handleOrderClick() {
  if (!ensureLoggedIn({ source: 'order-entry' })) {
    return
  }

  console.log('订单入口点击')
  window.alert('订单页面暂未开放')
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
</script>

<template>
  <div class="min-h-screen">
    <header
      v-if="!hideChrome"
      class="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/88 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)]"
          >
            转转
          </div>
          <div>
            <p class="text-lg font-black tracking-[0.18em] text-slate-950">校园二手物品交易平台</p>
            <p class="text-xs text-slate-500">Campus Reuse Marketplace</p>
          </div>
        </div>

        <form
          class="flex flex-1 items-center gap-2 lg:mx-auto lg:max-w-3xl"
          @submit.prevent="handleSearch"
        >
          <Input
            v-model="searchKeyword"
            type="search"
            placeholder="搜教材、耳机、宿舍好物"
            class="h-12 flex-1 border-white bg-slate-50/90 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.55)]"
          />
          <Button type="submit" size="lg" class="h-12 shrink-0 px-5">
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
              class="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.35)] transition hover:border-brand-200 hover:shadow-md"
              :class="isUserMenuOpen ? 'border-brand-200 shadow-md' : ''"
            >
              <Avatar size="md" :fallback="currentUser.avatar" />
              <div class="text-left">
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
                    :key="item"
                    type="button"
                    class="flex w-full cursor-pointer items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                    @click="handleMenuClick(item)"
                  >
                    {{ item }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <button
            v-else
            type="button"
            class="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.35)] transition hover:bg-slate-50 hover:border-brand-200 hover:shadow-md sm:flex"
            @click="openAuthDialog"
          >
            <Avatar size="md" :fallback="currentUser.avatar" />
            <div class="text-left">
              <p class="text-[15px] font-semibold leading-none text-slate-900">
                {{ currentUser.name }}
              </p>
              <p class="mt-1 text-xs text-slate-500">{{ currentUser.campus }}</p>
            </div>
            <ChevronDown class="h-4 w-4 text-slate-400 transition" />
          </button>

          <Button
            variant="outline"
            size="sm"
            class="h-16 rounded-full border-slate-200 px-6 text-lg font-semibold text-slate-700 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.35)]"
            @click="handleOrderClick"
          >
            <ShoppingBag class="h-4 w-4" />
            订单
          </Button>
        </div>
      </div>
    </header>

    <main :class="hideChrome ? 'min-h-screen' : 'pt-36 sm:pt-32 lg:pt-24'">
      <RouterView />
    </main>

    <AuthDialog />
  </div>
</template>
