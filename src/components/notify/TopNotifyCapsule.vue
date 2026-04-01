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
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2200;
  width: min(92vw, 560px);
  pointer-events: none;
}

.notify-capsule {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 44px 1fr 28px;
  align-items: start;
  gap: 14px;
  border-radius: 22px;
  padding: 14px 16px 14px 14px;
  background: linear-gradient(180deg, #fffef8 0%, #fff8e4 100%);
  border: 1px solid rgba(246, 191, 66, 0.55);
  box-shadow:
    0 24px 40px rgba(48, 34, 0, 0.16),
    0 8px 14px rgba(48, 34, 0, 0.08);
}

.capsule-accent {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #8a5200;
  background: radial-gradient(circle at 30% 30%, #fff5b8 0%, #ffd260 72%, #ffb114 100%);
  font-size: 20px;
}

.copy-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.tag {
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(255, 210, 96, 0.45);
  color: #8a5200;
  font-size: 12px;
  font-weight: 700;
}

.time {
  color: #876f45;
  font-size: 12px;
}

.capsule-copy h4 {
  margin: 0;
  color: #2d230e;
  font-size: 16px;
  font-weight: 800;
}

.capsule-copy p {
  margin: 6px 0 0;
  color: #5b4a25;
  font-size: 13px;
  line-height: 1.55;
}

.action-btn {
  margin-top: 10px;
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  background: #23201a;
  color: #fff9eb;
  font-size: 12px;
  font-weight: 700;
}

.action-btn:hover {
  filter: brightness(1.08);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #6f5b30;
  background: transparent;
}

.close-btn:hover {
  background: rgba(111, 91, 48, 0.08);
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
  transform: translateY(-18px);
}

@media (max-width: 768px) {
  .notify-capsule-shell {
    top: 10px;
    width: min(94vw, 560px);
  }

  .notify-capsule {
    grid-template-columns: 40px 1fr 24px;
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
  }

  .capsule-accent {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .copy-top {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
