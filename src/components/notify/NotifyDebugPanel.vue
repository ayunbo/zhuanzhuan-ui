<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, CloseBold, Promotion, SetUp } from '@element-plus/icons-vue'
import { publishMockNotice } from '@/api/notify'
import { useChatStore } from '@/stores/chat'
import { useNotifyStore } from '@/stores/notify'
import { getAuthUser } from '@/utils/request'

const SCENE_PRESETS = [
  {
    key: 'seller_auth_result',
    label: '卖家认证审核结果',
    title: '卖家认证审核结果',
    content: '你的卖家认证审核已完成，请查看最新结果。',
    bizId: 10001,
  },
  {
    key: 'goods_audit_result',
    label: '商品审核结果',
    title: '商品审核结果',
    content: '你发布的商品审核状态已更新，请及时查看。',
    bizId: 20001,
  },
  {
    key: 'order_status_change',
    label: '订单状态变化',
    title: '订单状态更新',
    content: '你的订单状态已更新，请查看最新进度。',
    bizId: 20260401001,
  },
  {
    key: 'report_result',
    label: '举报处理结果',
    title: '举报处理结果',
    content: '你提交的举报已经处理完成，请查看处理结果。',
    bizId: 30001,
  },
  {
    key: 'chat_message_notice',
    label: '聊天消息通知',
    title: '聊天消息提醒',
    content: '你有一条新的聊天消息，请及时查看。',
    bizId: 950001,
  },
]

const chatStore = useChatStore()
const notifyStore = useNotifyStore()
const authUser = getAuthUser()

const expanded = ref(false)
const publishing = ref(false)
const responsePayload = ref(null)
const form = reactive({
  receiverUserId: authUser?.id ? String(authUser.id) : '',
  bizId: String(SCENE_PRESETS[0].bizId),
  scene: SCENE_PRESETS[0].key,
  title: SCENE_PRESETS[0].title,
  content: SCENE_PRESETS[0].content,
})

const responsePreview = computed(() =>
  responsePayload.value ? JSON.stringify(responsePayload.value, null, 2) : '',
)

const socketStatusText = computed(() => {
  if (chatStore.socketStatus === 'connected') return '已连接'
  if (chatStore.socketStatus === 'connecting') return '连接中'
  if (chatStore.socketStatus === 'disconnected') return '已断开'
  return '空闲'
})

const socketStatusClass = computed(() => {
  if (chatStore.socketStatus === 'connected') return 'ok'
  if (chatStore.socketStatus === 'connecting') return 'pending'
  if (chatStore.socketStatus === 'disconnected') return 'warn'
  return ''
})

const lastNoticeText = computed(() => {
  const notice = notifyStore.lastIncomingNotice
  if (!notice) return '暂无'
  return `#${notice.id || '-'} ${notice.title || '系统通知'}`
})

const lastUnreadText = computed(() => {
  const event = notifyStore.lastUnreadEvent
  if (!event) return '暂无'
  return `${event.totalUnreadCount}`
})

function formatStamp(stamp) {
  if (!stamp) return '暂无'
  const date = new Date(stamp)
  if (Number.isNaN(date.getTime())) return '暂无'

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds(),
  ).padStart(2, '0')}`
}

function applyPreset(sceneKey) {
  const preset = SCENE_PRESETS.find((item) => item.key === sceneKey)
  if (!preset) return

  form.scene = preset.key
  form.title = preset.title
  form.content = preset.content
  form.bizId = String(preset.bizId)

  if (!form.receiverUserId) {
    const currentUser = getAuthUser()
    form.receiverUserId = currentUser?.id ? String(currentUser.id) : ''
  }
}

async function handlePublish() {
  if (!form.receiverUserId || !form.bizId || !form.scene) {
    ElMessage.warning('请先填写 receiverUserId、bizId 和 scene')
    return
  }

  publishing.value = true
  try {
    const payload = {
      receiverUserId: Number(form.receiverUserId),
      bizId: Number(form.bizId),
      scene: form.scene,
    }

    if (form.title.trim()) {
      payload.title = form.title.trim()
    }

    if (form.content.trim()) {
      payload.content = form.content.trim()
    }

    const result = await publishMockNotice(payload)
    responsePayload.value = result
    ElMessage.success('通知 mock 发布成功，观察顶部弹窗和 WS 状态')
  } catch (error) {
    responsePayload.value = {
      error: error?.message || '通知 mock 发布失败',
    }
    ElMessage.error(error?.message || '通知 mock 发布失败')
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="notify-dev-entry">
      <button type="button" class="entry-button" @click="expanded = !expanded">
        <el-icon><SetUp /></el-icon>
        <span>通知调试</span>
      </button>
    </div>

    <transition name="panel-slide">
      <aside v-if="expanded" class="notify-dev-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Notify Mock Panel</p>
            <h3>通知调试面板</h3>
            <p class="subtitle">调用 POST /user/notice/mock/publish，验证实时推送闭环。</p>
          </div>
          <button type="button" class="close-button" @click="expanded = false">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>

        <div class="status-grid">
          <div class="status-card">
            <span class="status-label">WebSocket</span>
            <strong :class="socketStatusClass">{{ socketStatusText }}</strong>
          </div>
          <div class="status-card">
            <span class="status-label">通知未读</span>
            <strong>{{ notifyStore.unreadTotal }}</strong>
          </div>
          <div class="status-card wide">
            <span class="status-label">最近 notice.message</span>
            <strong>{{ lastNoticeText }}</strong>
            <small>{{ formatStamp(notifyStore.lastIncomingNotice?.__stamp) }}</small>
          </div>
          <div class="status-card">
            <span class="status-label">最近 notice.unread</span>
            <strong>{{ lastUnreadText }}</strong>
            <small>{{ formatStamp(notifyStore.lastUnreadEvent?.__stamp) }}</small>
          </div>
        </div>

        <div class="preset-list">
          <button
            v-for="preset in SCENE_PRESETS"
            :key="preset.key"
            type="button"
            class="preset-chip"
            :class="{ active: form.scene === preset.key }"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>receiverUserId</span>
            <input v-model="form.receiverUserId" type="number" placeholder="接收用户 ID" />
          </label>

          <label class="field">
            <span>bizId</span>
            <input v-model="form.bizId" type="number" placeholder="业务主键" />
          </label>

          <label class="field field-full">
            <span>scene</span>
            <select v-model="form.scene" @change="applyPreset(form.scene)">
              <option v-for="preset in SCENE_PRESETS" :key="preset.key" :value="preset.key">
                {{ preset.key }}
              </option>
            </select>
          </label>

          <label class="field field-full">
            <span>title</span>
            <input v-model="form.title" type="text" placeholder="可选，不填则由后端补默认文案" />
          </label>

          <label class="field field-full">
            <span>content</span>
            <textarea
              v-model="form.content"
              rows="4"
              placeholder="可选，不填则由后端补默认文案"
            />
          </label>
        </div>

        <div class="panel-actions">
          <el-button type="primary" :icon="Promotion" :loading="publishing" @click="handlePublish">
            推送
          </el-button>
          <el-button plain :icon="Bell" @click="applyPreset(form.scene)">重置当前场景</el-button>
        </div>

        <div class="response-block">
          <div class="response-head">
            <span>响应结果</span>
          </div>
          <pre>{{ responsePreview || '暂无请求结果' }}</pre>
        </div>
      </aside>
    </transition>
  </Teleport>
</template>

<style scoped>
.notify-dev-entry {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2150;
}

.entry-button {
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 999px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #1f2937;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 239, 218, 0.7), transparent 38%),
    linear-gradient(105deg, #fffdf9 0%, #fff8ef 42%, #f5fbff 100%);
  box-shadow: 0 16px 34px rgba(95, 121, 153, 0.16);
  font-size: 13px;
  font-weight: 800;
}

.notify-dev-panel {
  position: fixed;
  right: 20px;
  bottom: 84px;
  z-index: 2150;
  width: min(92vw, 460px);
  max-height: min(78vh, 820px);
  overflow: auto;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 64px rgba(15, 23, 42, 0.16);
  padding: 18px;
  backdrop-filter: blur(18px);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #f97316;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.panel-header h3 {
  margin: 0;
  color: #13233c;
  font-size: 19px;
  font-weight: 900;
}

.subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.close-button {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: #f2f5fa;
  color: #55657d;
}

.status-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.status-card {
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-card.wide {
  grid-column: 1 / -1;
}

.status-label {
  color: #708099;
  font-size: 12px;
}

.status-card strong {
  color: #183153;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.status-card strong.ok {
  color: #15803d;
}

.status-card strong.pending {
  color: #ca8a04;
}

.status-card strong.warn {
  color: #dc2626;
}

.status-card small {
  color: #8a98ac;
  font-size: 11px;
}

.preset-list {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  border: 1px solid #d7e2f1;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  color: #31425f;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}

.preset-chip.active {
  border-color: rgba(249, 115, 22, 0.32);
  background: #fff7ed;
  color: #c2410c;
}

.form-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  color: #5e6d84;
  font-size: 12px;
  font-weight: 800;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid #d7e2f1;
  border-radius: 12px;
  padding: 10px 12px;
  outline: none;
  font: inherit;
  color: #1b2d49;
  background: #fff;
}

.field textarea {
  resize: vertical;
  min-height: 92px;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #fb923c;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.12);
}

.field-full {
  grid-column: 1 / -1;
}

.panel-actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.response-block {
  margin-top: 16px;
  border-radius: 16px;
  background: #0f1726;
  color: #dbeafe;
  overflow: hidden;
}

.response-head {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(207, 224, 255, 0.12);
  font-size: 12px;
  font-weight: 800;
}

.response-block pre {
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.22s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 768px) {
  .notify-dev-entry {
    right: 12px;
    bottom: 12px;
  }

  .notify-dev-panel {
    right: 12px;
    bottom: 72px;
    width: calc(100vw - 24px);
    max-height: 74vh;
    padding: 14px;
  }

  .status-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .status-card.wide {
    grid-column: auto;
  }

  .panel-actions {
    flex-wrap: wrap;
  }
}
</style>
