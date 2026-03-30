<script setup>
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import { ChevronDown, Search, ShoppingBag } from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const searchKeyword = ref('')

const currentUser = {
  name: '陈念',
  campus: '南苑校区',
  avatar: '陈',
}

const menuItems = ['我买到的', '我卖出的', '我的收藏', '退出登录']

function handleSearch() {
  const keyword = searchKeyword.value.trim() || '全部商品'
  console.log(`搜索校园二手商品: ${keyword}`)
  window.alert(`搜索功能演示：${keyword}`)
}

function handleMenuClick(item) {
  console.log(`用户菜单点击: ${item}`)
  window.alert(`${item} 功能暂未接入`)
}

function handleOrderClick() {
  console.log('订单入口点击')
  window.alert('订单页面暂未开放')
}
</script>

<template>
  <div class="min-h-screen">
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/88 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)]"
          >
            校
          </div>
          <div>
            <p class="text-lg font-black tracking-[0.18em] text-slate-950">校园二手平台</p>
            <p class="text-xs text-slate-500">Campus Reuse Marketplace</p>
          </div>
        </div>

        <form
          class="flex flex-1 items-center gap-2 lg:mx-auto lg:max-w-2xl"
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
          <div class="group relative hidden sm:block">
            <div
              class="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm transition group-hover:border-brand-200 group-hover:shadow-md"
            >
              <Avatar size="sm" :fallback="currentUser.avatar" />
              <div class="text-left">
                <p class="text-sm font-semibold text-slate-900">{{ currentUser.name }}</p>
                <p class="text-xs text-slate-500">{{ currentUser.campus }}</p>
              </div>
              <ChevronDown class="h-4 w-4 text-slate-400 transition group-hover:text-brand-500" />
            </div>

            <div
              class="pointer-events-none absolute right-0 top-full z-20 mt-3 w-48 translate-y-2 rounded-3xl border border-slate-200 bg-white/96 p-2 text-left opacity-0 shadow-[0_24px_70px_-26px_rgba(15,23,42,0.28)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
            >
              <button
                v-for="item in menuItems"
                :key="item"
                type="button"
                class="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                @click="handleMenuClick(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="h-11 px-4 text-slate-700"
            @click="handleOrderClick"
          >
            <ShoppingBag class="h-4 w-4" />
            订单
          </Button>
        </div>
      </div>
    </header>

    <main class="pt-36 sm:pt-32 lg:pt-24">
      <RouterView />
    </main>
  </div>
</template>
