<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

const route = useRoute()

const navGroups = computed(() => [
  {
    title: null,
    items: [{ label: '我的主页', to: '/user', exact: true }],
  },
  {
    title: '我的交易',
    items: [
      { label: '我发布的', to: '/user/published' },
      { label: '我卖出的', to: '/user/sold' },
      { label: '我买到的', to: '/user/bought' },
    ],
  },
  {
    title: null,
    items: [
      { label: '我的收藏', to: '/user/favorites' },
      { label: '浏览历史', to: '/history' },
    ],
  },
  {
    title: '账户设置',
    items: [
      { label: '个人资料', to: '/user/profile' },
      { label: '身份认证', to: '/user/security' },
      { label: '虚拟钱包', to: '/user/wallet' },
    ],
  },
])

function isActive(item) {
  if (item.exact) {
    return route.path === item.to
  }

  return route.path === item.to
}
</script>

<template>
  <section class="bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-[1480px] gap-6">
      <Card class="w-56 shrink-0 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
        <div class="space-y-5">
          <div
            v-for="(group, groupIndex) in navGroups"
            :key="`group-${groupIndex}`"
            class="space-y-2"
          >
            <p
              v-if="group.title"
              class="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
            >
              {{ group.title }}
            </p>

            <div class="space-y-1">
              <RouterLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition"
                :class="
                  isActive(item)
                    ? 'bg-slate-950 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.6)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                "
              >
                <span>{{ item.label }}</span>
                <ChevronRight class="h-4 w-4 opacity-60" />
              </RouterLink>
            </div>
          </div>
        </div>
      </Card>

      <div class="min-w-0 flex-1">
        <RouterView />
      </div>
    </div>
  </section>
</template>
