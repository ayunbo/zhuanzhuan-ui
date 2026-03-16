<script setup>
import { computed } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'

const props = defineProps({
  unreadCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['click'])

const badgeText = computed(() => {
  if (props.unreadCount > 99) {
    return '99+'
  }

  return String(props.unreadCount)
})
</script>

<template>
  <button
    type="button"
    class="floating-message-capsule"
    aria-label="消息"
    @click="emit('click')"
  >
    <span v-if="unreadCount > 0" class="message-badge">{{ badgeText }}</span>
    <span class="icon-wrap">
      <el-icon><ChatDotRound /></el-icon>
    </span>
    <span class="label">消息</span>
  </button>
</template>

<style scoped>
.floating-message-capsule {
  position: fixed;
  right: 24px;
  top: 50%;
  width: 64px;
  min-height: 92px;
  padding: 14px 10px 12px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  z-index: 1200;
  transform: translateY(-50%);
  transition: box-shadow 0.2s ease, margin-top 0.2s ease;
}

.floating-message-capsule:hover {
  margin-top: -2px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
}

.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #111827;
}

.label {
  font-size: 14px;
  line-height: 1;
  font-weight: 600;
  color: #374151;
}

.message-badge {
  position: absolute;
  top: 8px;
  right: 6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  box-shadow: 0 6px 14px rgba(255, 77, 79, 0.28);
}

@media (max-width: 768px) {
  .floating-message-capsule {
    right: 16px;
    top: 50%;
    width: 58px;
    min-height: 84px;
    padding: 12px 8px 10px;
  }

  .icon-wrap {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }

  .label {
    font-size: 13px;
  }
}
</style>
