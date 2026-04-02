<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Package } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

const route = useRoute()
const title = computed(() => route.meta.title || '个人中心')
</script>

<template>
  <Card class="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-sm">
    <div class="border-b border-slate-100 pb-4">
      <h1 class="text-2xl font-black tracking-tight text-slate-950">{{ title }}</h1>
    </div>

    <div class="flex min-h-[420px] flex-col items-center justify-center gap-5 text-center">
      <div
        class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <Package class="h-10 w-10" />
      </div>
      <div class="space-y-2">
        <p class="text-lg font-semibold text-slate-800">{{ title }}</p>
        <p class="text-sm text-slate-400">该板块内容稍后开放</p>
      </div>
    </div>
  </Card>
</template>
