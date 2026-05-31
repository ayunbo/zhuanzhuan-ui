<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { BellFilled, CloseBold } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '系统通知',
  },
  message: {
    type: String,
    default: '',
  },
  tag: {
    type: String,
    default: '系统通知',
  },
  time: {
    type: String,
    default: '',
  },
  actionText: {
    type: String,
    default: '',
  },
  version: {
    type: Number,
    default: 0,
  },
  autoHideMs: {
    type: Number,
    default: 4200,
  },
})

const emit = defineEmits(['action', 'close'])

let timerId = null

function clearHideTimer() {
  if (!timerId) return
  window.clearTimeout(timerId)
  timerId = null
}

function startHideTimer() {
  clearHideTimer()
  if (!props.visible || props.autoHideMs <= 0) return

  timerId = window.setTimeout(() => {
    emit('close')
  }, props.autoHideMs)
}

watch(
  () => [props.visible, props.version],
  ([visible]) => {
    if (!visible) {
      clearHideTimer()
      return
    }
    startHideTimer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearHideTimer()
})
</script>

<template>
  <Teleport to="body">
    <transition name="notify-drop">
      <div v-if="visible" class="notify-capsule-shell">
        <div class="notify-capsule">
          <div class="capsule-accent">
            <el-icon><BellFilled /></el-icon>
          </div>

          <div class="capsule-copy">
            <div class="copy-top">
              <span class="tag">{{ tag }}</span>
              <span v-if="time" class="time">{{ time }}</span>
            </div>
            <h4>{{ title }}</h4>
            <p>{{ message }}</p>
            <button
              v-if="actionText"
              type="button"
              class="action-btn"
              @click="$emit('action')"
            >
              {{ actionText }}
            </button>
          </div>

          <button type="button" class="close-btn" @click="$emit('close')">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.notify-capsule-shell {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 2200;
  width: min(90vw, 360px);
  pointer-events: none;
}

.notify-capsule {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 34px 1fr 24px;
  align-items: start;
  gap: 10px;
  border-radius: 14px;
  padding: 10px 12px 10px 10px;
  background:
    radial-gradient(circle at 14% 18%, rgba(255, 239, 218, 0.42), transparent 38%),
    radial-gradient(circle at 76% 18%, rgba(236, 246, 255, 0.7), transparent 44%),
    linear-gradient(105deg, #fffdf9 0%, #fff8ef 35%, #fbfcfb 60%, #f5fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.72);
  box-shadow:
    0 16px 32px rgba(95, 121, 153, 0.12),
    0 8px 16px rgba(148, 93, 52, 0.045);
}

.capsule-accent {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #c08a61;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.9), transparent 42%),
    linear-gradient(145deg, #fffaf5 0%, #ffedd7 58%, #eef7ff 100%);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 20px rgba(95, 121, 153, 0.08);
  font-size: 16px;
}

.copy-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.tag {
  border-radius: 999px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.78);
  color: #9b755b;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255, 235, 211, 0.76);
}

.time {
  color: #7c8a9a;
  font-size: 11px;
  white-space: nowrap;
}

.capsule-copy h4 {
  margin: 0;
  color: #334155;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 800;
}

.capsule-copy p {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.action-btn {
  margin-top: 8px;
  border: none;
  border-radius: 999px;
  padding: 6px 11px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.82);
  color: #9b755b;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255, 235, 211, 0.82);
  box-shadow: 0 8px 16px rgba(95, 121, 153, 0.075);
}

.action-btn:hover {
  filter: brightness(1.08);
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #94a3b8;
  background: transparent;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.62);
}

.notify-drop-enter-active,
.notify-drop-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.notify-drop-enter-from,
.notify-drop-leave-to {
  opacity: 0;
  transform: translate(18px, -8px);
}

@media (max-width: 768px) {
  .notify-capsule-shell {
    top: 10px;
    right: 10px;
    width: calc(100vw - 20px);
  }

  .notify-capsule {
    grid-template-columns: 32px 1fr 24px;
    gap: 9px;
    padding: 10px;
  }

  .capsule-accent {
    width: 32px;
    height: 32px;
  }

  .copy-top {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
