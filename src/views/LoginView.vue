<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const router = useRouter()
const account = ref('')
const password = ref('')
const showPassword = ref(false)

function handleClose() {
  router.push('/')
}

function handleLogin() {
  console.log('密码登录', {
    account: account.value,
    password: password.value,
  })
  window.alert('登录功能暂未接入')
}
</script>

<template>
  <section class="relative min-h-screen overflow-hidden bg-[#f7f8fc]">
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_18%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
    />
    <div class="absolute left-10 top-8 h-20 w-20 rounded-full bg-brand-300/50 blur-3xl" />
    <div class="absolute right-16 top-10 h-24 w-24 rounded-full bg-yellow-200/70 blur-3xl" />

    <div class="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        class="w-full max-w-[560px] rounded-[36px] border border-white/80 bg-white/96 px-7 py-8 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.38)] backdrop-blur sm:px-10 sm:py-10"
      >
        <div class="mb-8 flex items-center justify-between">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-[20px] bg-brand-500 text-2xl font-black text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)]"
          >
            校
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand-200 hover:text-brand-600"
            @click="handleClose"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mb-8 text-center">
          <h1 class="text-[38px] font-black tracking-tight text-slate-950">密码登录</h1>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <Input
            v-model="account"
            type="text"
            placeholder="请输入手机号 / 学号"
            class="h-16 rounded-[22px] border-white bg-slate-100/90 px-6 text-lg shadow-none focus:bg-white"
          />

          <div class="relative">
            <Input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="h-16 rounded-[22px] border-white bg-slate-100/90 px-6 pr-16 text-lg shadow-none focus:bg-white"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="!showPassword" class="h-5 w-5" />
              <EyeOff v-else class="h-5 w-5" />
            </button>
          </div>

          <Button type="submit" class="h-16 w-full rounded-[22px] text-2xl font-black">
            登录
          </Button>
        </form>
      </div>
    </div>
  </section>
</template>
