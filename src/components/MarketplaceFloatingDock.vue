<script setup>
import { ChatDotRound, Iphone, MessageBox, Plus, Service } from '@element-plus/icons-vue'

defineProps({
  loggedIn: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['publish', 'messages', 'service', 'app'])
</script>

<template>
  <aside class="dock">
    <button type="button" class="dock-item dock-item--primary" @click="$emit('publish')">
      <el-icon><Plus /></el-icon>
      <span>发闲置</span>
    </button>

    <button type="button" class="dock-item" @click="$emit('messages')">
      <el-icon><MessageBox /></el-icon>
      <span>{{ loggedIn ? '消息' : '登录' }}</span>
    </button>

    <button type="button" class="dock-item" @click="$emit('app')">
      <el-icon><Iphone /></el-icon>
      <span>APP</span>
    </button>

    <button type="button" class="dock-item" @click="$emit('service')">
      <el-icon><Service /></el-icon>
      <span>客服</span>
    </button>

    <button type="button" class="dock-item" @click="$emit('service')">
      <el-icon><ChatDotRound /></el-icon>
      <span>反馈</span>
    </button>
  </aside>
</template>

<style scoped>
.dock {
  position: fixed;
  top: 220px;
  right: 14px;
  z-index: 30;
  display: grid;
  gap: 10px;
}

.dock-item {
  width: 68px;
  min-height: 68px;
  padding: 10px 8px;
  border: 1px solid var(--zz-border);
  border-radius: 24px;
  background: #fff;
  box-shadow: var(--zz-shadow-sm);
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8px;
  color: var(--zz-text-secondary);
  cursor: pointer;
  transition: all 0.18s ease;
}

.dock-item:hover {
  transform: translateX(-2px);
  color: var(--zz-black);
}

.dock-item span {
  font-size: 12px;
  line-height: 1;
}

.dock-item--primary {
  background: var(--zz-yellow);
  border-color: transparent;
  color: var(--zz-black);
}

@media (max-width: 1100px) {
  .dock {
    display: none;
  }
}
</style>
