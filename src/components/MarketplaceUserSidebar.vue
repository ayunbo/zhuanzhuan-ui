<script setup>
import { CollectionTag, Goods, Postcard, Star, Tickets, User } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  activeKey: {
    type: String,
    default: 'profile',
  },
})

const router = useRouter()

const menuSections = computed(() => [
  {
    title: '我的闲置',
    items: [
      { key: 'profile', label: '个人主页', icon: User, action: () => router.push('/profile') },
      { key: 'published', label: '我发布的', icon: Goods, action: () => router.push('/seller/goods') },
      {
        key: 'bought',
        label: '我买到的',
        icon: Tickets,
        action: () => router.push({ path: '/my-order', query: { type: 'buy' } }),
      },
      {
        key: 'sold',
        label: '我卖出的',
        icon: CollectionTag,
        action: () => router.push({ path: '/my-order', query: { type: 'sell' } }),
      },
    ],
  },
  {
    title: '账户设置',
    items: [
      { key: 'favorites', label: '我的收藏', icon: Star, action: () => router.push('/favorites') },
      { key: 'seller-auth', label: '卖家认证', icon: Postcard, action: () => router.push('/seller-auth') },
    ],
  },
])
</script>

<template>
  <aside class="sidebar">
    <div v-for="section in menuSections" :key="section.title" class="sidebar-section">
      <div class="section-title">{{ section.title }}</div>

      <button
        v-for="item in section.items"
        :key="item.key"
        type="button"
        class="menu-item"
        :class="{ 'is-active': activeKey === item.key }"
        @click="item.action"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: grid;
  gap: 18px;
}

.sidebar-section {
  display: grid;
  gap: 10px;
}

.section-title {
  padding: 0 4px;
  color: var(--zz-text-light);
  font-size: 13px;
  font-weight: 700;
}

.menu-item {
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--zz-text);
  cursor: pointer;
  transition: all 0.18s ease;
}

.menu-item:hover {
  background: #fafafa;
}

.menu-item.is-active {
  background: #f6f6f6;
  font-weight: 700;
}
</style>
