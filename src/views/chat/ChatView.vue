<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell, ChatDotRound } from '@element-plus/icons-vue'
import {
  fetchChatMessageList,
  initChatSession,
  markChatSessionRead,
  sendChatMessage,
} from '@/api/chat'
import {
  fetchNoticeMessageList,
  markAllNoticesRead as requestMarkAllNoticesRead,
  markNoticeRead as requestMarkNoticeRead,
} from '@/api/notify'
import NoticeSessionPanel from '@/components/notify/NoticeSessionPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNotifyStore } from '@/stores/notify'
import {
  createNoticeVirtualSession,
  isNoticeSessionKey,
  sortMixedSessionList,
} from '@/utils/notify/session'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()
const notifyStore = useNotifyStore()

const loadingSessions = ref(false)
const loadingMessages = ref(false)
const loadingNotices = ref(false)
const sending = ref(false)
const markingAllNotices = ref(false)
const markingNoticeIds = ref([])
const activeSessionId = ref(null)
const messageList = ref([])
const noticeList = ref([])
const inputText = ref('')
const messageScrollRef = ref(null)

const chatSessionList = computed(() => chatStore.sessionList)
const noticeSession = computed(() =>
  createNoticeVirtualSession(notifyStore.sessionSummary, notifyStore.unreadTotal),
)
const sessionList = computed(() => sortMixedSessionList([noticeSession.value, ...chatSessionList.value]))
const unreadTotal = computed(() => chatStore.unreadTotal + notifyStore.unreadTotal)
const isNoticeSessionActive = computed(() => isNoticeSessionKey(activeSessionId.value))
const activeSession = computed(() =>
  sessionList.value.find((item) => String(item.sessionId) === String(activeSessionId.value)),
)
const activeSessionSubtitle = computed(() =>
  isNoticeSessionActive.value ? '系统通知会话' : activeSession.value?.goodsTitle || '商品咨询',
)

function formatSessionTime(time) {
  if (!time) return ''
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()

  if (isSameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMessageTime(time) {
  if (!time) return ''
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatMessageDate(time) {
  if (!time) return ''
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function showDateDivider(index) {
  if (index === 0) return true
  const current = formatMessageDate(messageList.value[index]?.createTime)
  const prev = formatMessageDate(messageList.value[index - 1]?.createTime)
  return current !== prev
}

function readStatusText(msg) {
  if (!msg?.mine) return ''
  return Number(msg.readStatus) === 1 ? '已读' : '未读'
}

function applyReadReceipt(receipt) {
  if (!receipt) return
  if (Number(receipt.sessionId) !== Number(activeSessionId.value)) return

  const targetIds = new Set((receipt.messageIds || []).map((id) => Number(id)))
  if (!targetIds.size) return

  messageList.value = messageList.value.map((item) => {
    if (!item?.mine) return item
    if (!targetIds.has(Number(item.id))) return item

    return {
      ...item,
      readStatus: 1,
      readTime: receipt.readTime || item.readTime,
    }
  })
}

function applyNoticeReadLocal(ids, readTime = new Date().toISOString()) {
  const targetIds = new Set((ids || []).map((id) => Number(id)))
  if (!targetIds.size) return

  let changedCount = 0
  noticeList.value = noticeList.value.map((item) => {
    if (!targetIds.has(Number(item.id)) || Number(item.readStatus) === 1) {
      return item
    }

    changedCount += 1
    return {
      ...item,
      readStatus: 1,
      readTime,
    }
  })

  if (changedCount > 0) {
    notifyStore.decreaseUnreadLocal(changedCount)
  }
}

function scrollToBottom() {
  if (!messageScrollRef.value) return
  const wrapRef = messageScrollRef.value.wrapRef
  if (!wrapRef) return
  messageScrollRef.value.setScrollTop(wrapRef.scrollHeight)
}

async function markCurrentSessionRead(sessionId) {
  if (!sessionId) return

  const target = chatSessionList.value.find((item) => Number(item.sessionId) === Number(sessionId))
  const unread = Number(target?.unreadCount || 0)

  await markChatSessionRead({ sessionId: Number(sessionId) })
  chatStore.updateSessionLocal(sessionId, { unreadCount: 0 })

  if (unread > 0) {
    await chatStore.refreshUnreadTotal()
  }
}

async function loadMessages(sessionId) {
  if (!sessionId) {
    messageList.value = []
    return
  }

  loadingMessages.value = true
  try {
    const list = await fetchChatMessageList({
      sessionId: Number(sessionId),
      pageNo: 1,
      pageSize: 100,
    })
    messageList.value = [...list].reverse()
    await nextTick()
    scrollToBottom()
  } finally {
    loadingMessages.value = false
  }
}

async function loadNoticeMessages() {
  loadingNotices.value = true
  try {
    const list = await fetchNoticeMessageList({
      pageNo: 1,
      pageSize: 100,
    })
    noticeList.value = [...list].reverse()
  } finally {
    loadingNotices.value = false
  }
}

async function activateSession(session) {
  if (!session) return

  activeSessionId.value = session.sessionId

  if (isNoticeSessionKey(session.sessionId)) {
    chatStore.setCurrentSessionId(null)
    messageList.value = []
    await loadNoticeMessages()
    return
  }

  const sessionId = Number(session.sessionId)
  chatStore.setCurrentSessionId(sessionId)
  await loadMessages(sessionId)
  await markCurrentSessionRead(sessionId)
}

async function handleSessionClick(session) {
  try {
    await activateSession(session)
  } catch (error) {
    ElMessage.error(error?.message || '会话加载失败')
  }
}

async function initSessionFromRouteQuery() {
  const goodsId = Number(route.query.goodsId)
  const sellerId = Number(route.query.sellerId)
  const buyerId = Number(route.query.buyerId || authStore.user.id)

  if (!goodsId || !sellerId || !buyerId) return null

  const session = await initChatSession({
    goodsId,
    sellerId,
    buyerId,
  })

  return Number(session?.sessionId || 0) || null
}

async function setupSessions() {
  loadingSessions.value = true
  try {
    const initializedId = await initSessionFromRouteQuery()
    await Promise.allSettled([
      chatStore.refreshSessionList(),
      notifyStore.refreshSessionSummary(),
    ])

    const querySessionKey = route.query.sessionKey
    const querySessionId = Number(route.query.sessionId)

    let nextSession = null

    if (querySessionKey && isNoticeSessionKey(querySessionKey)) {
      nextSession = noticeSession.value
    } else if (initializedId) {
      nextSession = chatSessionList.value.find((item) => Number(item.sessionId) === initializedId) || null
    } else if (querySessionId) {
      nextSession = chatSessionList.value.find((item) => Number(item.sessionId) === querySessionId) || null
    } else {
      nextSession = chatSessionList.value[0] || noticeSession.value || null
    }

    if (nextSession) {
      await activateSession(nextSession)
    } else {
      chatStore.setCurrentSessionId(null)
      messageList.value = []
      noticeList.value = []
    }
  } finally {
    loadingSessions.value = false
  }
}

async function sendTextMessage() {
  const content = inputText.value.trim()
  if (!content || sending.value || isNoticeSessionActive.value) return

  if (!activeSessionId.value) {
    ElMessage.warning('请先选择会话')
    return
  }

  sending.value = true
  try {
    const sent = await sendChatMessage({
      sessionId: Number(activeSessionId.value),
      content,
    })

    if (!sent?.id) {
      throw new Error('发送失败：服务端未返回消息 ID')
    }

    if (!messageList.value.some((item) => Number(item.id) === Number(sent.id))) {
      messageList.value.push(sent)
    }

    chatStore.updateSessionLocal(activeSessionId.value, {
      lastMsg: sent.content || content,
      lastTime: sent.createTime || new Date().toISOString(),
    })

    inputText.value = ''
    await nextTick()
    scrollToBottom()
  } catch (error) {
    ElMessage.error(error?.message || '发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

async function handleNoticeRead(noticeId) {
  const targetId = Number(noticeId)
  if (!targetId || markingNoticeIds.value.includes(targetId)) return

  markingNoticeIds.value = [...markingNoticeIds.value, targetId]
  try {
    await requestMarkNoticeRead({ noticeId: targetId })
    applyNoticeReadLocal([targetId])
  } catch (error) {
    ElMessage.error(error?.message || '通知已读失败')
  } finally {
    markingNoticeIds.value = markingNoticeIds.value.filter((id) => id !== targetId)
  }
}

async function handleReadAllNotices() {
  const unreadIds = noticeList.value
    .filter((item) => Number(item.readStatus) !== 1)
    .map((item) => Number(item.id))

  if (!unreadIds.length || markingAllNotices.value) return

  markingAllNotices.value = true
  try {
    await requestMarkAllNoticesRead()
    applyNoticeReadLocal(unreadIds)
  } catch (error) {
    ElMessage.error(error?.message || '全部已读失败')
  } finally {
    markingAllNotices.value = false
  }
}

watch(
  () => chatStore.lastIncomingMessage?.__stamp,
  async () => {
    const incoming = chatStore.lastIncomingMessage
    if (!incoming || isNoticeSessionActive.value) return
    if (Number(incoming.sessionId) !== Number(activeSessionId.value)) return
    if (messageList.value.some((item) => Number(item.id) === Number(incoming.id))) return

    messageList.value.push(incoming)
    await nextTick()
    scrollToBottom()

    if (!incoming.mine) {
      await markCurrentSessionRead(activeSessionId.value)
    }
  },
)

watch(
  () => chatStore.lastReadReceipt?.__stamp,
  () => {
    applyReadReceipt(chatStore.lastReadReceipt)
  },
)

onMounted(async () => {
  try {
    chatStore.connectSocket()
    await Promise.allSettled([
      chatStore.refreshUnreadTotal(),
      notifyStore.refreshUnreadTotal(),
    ])
    await setupSessions()
  } catch (error) {
    ElMessage.error(error?.message || '聊天页面初始化失败')
  }
})

onUnmounted(() => {
  chatStore.setCurrentSessionId(null)
})
</script>

<template>
  <div class="chat-page">
    <aside class="session-panel">
      <div class="session-panel-header">
        <h2>消息</h2>
        <el-badge :value="unreadTotal" :max="99" :hidden="unreadTotal <= 0" />
      </div>

      <div v-if="loadingSessions" class="session-loading">正在加载会话...</div>
      <div v-else-if="!sessionList.length" class="session-empty">暂时没有消息记录</div>

      <el-scrollbar v-else class="session-list-scroll" always>
        <div class="session-list">
          <button
            v-for="item in sessionList"
            :key="item.sessionId"
            type="button"
            class="session-item"
            :class="{
              active: String(item.sessionId) === String(activeSessionId),
              'notice-session': isNoticeSessionKey(item.sessionId),
            }"
            @click="handleSessionClick(item)"
          >
            <el-avatar :size="44" :src="isNoticeSessionKey(item.sessionId) ? '' : item.targetUserAvatar">
              <el-icon>
                <component :is="isNoticeSessionKey(item.sessionId) ? Bell : ChatDotRound" />
              </el-icon>
            </el-avatar>
            <div class="session-meta">
              <div class="meta-top">
                <span class="name">{{ item.targetUserName || '用户' }}</span>
                <span class="time">{{ formatSessionTime(item.lastTime) }}</span>
              </div>
              <div class="meta-middle">{{ item.goodsTitle || '系统通知' }}</div>
              <div class="meta-bottom">
                <span class="last-msg">{{ item.lastMsg || '开始聊天吧' }}</span>
                <span v-if="Number(item.unreadCount) > 0" class="unread-pill">
                  {{ Number(item.unreadCount) > 99 ? '99+' : item.unreadCount }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </el-scrollbar>
    </aside>

    <section class="chat-panel">
      <template v-if="activeSession">
        <header class="chat-header">
          <div class="target">
            <el-avatar :size="34" :src="isNoticeSessionActive ? '' : activeSession.targetUserAvatar">
              <el-icon>
                <component :is="isNoticeSessionActive ? Bell : ChatDotRound" />
              </el-icon>
            </el-avatar>
            <div class="target-text">
              <h3>{{ activeSession.targetUserName || '聊天对象' }}</h3>
              <p>{{ activeSessionSubtitle }}</p>
            </div>
          </div>
        </header>

        <NoticeSessionPanel
          v-if="isNoticeSessionActive"
          :loading="loadingNotices"
          :notice-list="noticeList"
          :marking-all="markingAllNotices"
          :marking-ids="markingNoticeIds"
          @read-all="handleReadAllNotices"
          @read-notice="handleNoticeRead"
        />

        <template v-else>
          <div class="message-wrap">
            <div v-if="loadingMessages" class="message-loading">正在加载消息...</div>

            <el-scrollbar v-else ref="messageScrollRef" class="message-scroll" always>
              <div v-if="!messageList.length" class="message-empty">暂无消息，开始聊天吧</div>

              <div v-else class="message-list">
                <template v-for="(msg, index) in messageList" :key="msg.id">
                  <div v-if="showDateDivider(index)" class="date-divider">
                    <span>{{ formatMessageDate(msg.createTime) }}</span>
                  </div>

                  <div class="msg-row" :class="{ mine: Boolean(msg.mine) }">
                    <div class="msg-bubble">
                      <p>{{ msg.content }}</p>
                    </div>
                  </div>

                  <div class="msg-meta" :class="{ mine: Boolean(msg.mine) }">
                    <span class="msg-time">{{ formatMessageTime(msg.createTime) }}</span>
                    <span v-if="msg.mine" class="msg-read">{{ readStatusText(msg) }}</span>
                  </div>
                </template>
              </div>
            </el-scrollbar>
          </div>

          <footer class="composer">
            <textarea
              v-model="inputText"
              maxlength="1000"
              placeholder="输入消息，按 Enter 发送"
              @keydown.enter.exact.prevent="sendTextMessage"
            />
            <el-button type="primary" :loading="sending" @click="sendTextMessage">发送</el-button>
          </footer>
        </template>
      </template>

      <div v-else class="chat-placeholder">请选择一个会话开始查看</div>
    </section>
  </div>
</template>

<style scoped>
.chat-page {
  height: calc(100vh - 100px);
  min-height: 620px;
  display: grid;
  grid-template-columns: 320px 1fr;
  border: 1px solid #e7ebf2;
  border-radius: 20px;
  overflow: hidden;
  background: #f4f7fc;
}

.session-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #ffffff;
  border-right: 1px solid #e9eef8;
}

.session-panel-header {
  height: 72px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef2f9;
}

.session-panel-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2a44;
}

.session-loading,
.session-empty {
  padding: 24px 18px;
  color: #75839b;
  font-size: 14px;
}

.session-list-scroll {
  flex: 1;
  min-height: 0;
}

.session-list-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.session-list-scroll :deep(.el-scrollbar__bar.is-vertical) {
  width: 10px;
  right: 2px;
}

.session-list-scroll :deep(.el-scrollbar__thumb) {
  background-color: rgba(148, 160, 182, 0.55);
  border-radius: 999px;
}

.session-list {
  padding: 8px;
}

.session-item {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
}

.session-item:hover {
  background: #f4f8ff;
}

.session-item.active {
  background: #eaf2ff;
}

.session-item.notice-session {
  background: linear-gradient(180deg, #fffaf0 0%, #fff7e6 100%);
}

.session-item.notice-session:hover,
.session-item.notice-session.active {
  background: linear-gradient(180deg, #fff5d9 0%, #ffeec4 100%);
}

.session-meta {
  flex: 1;
  min-width: 0;
}

.meta-top,
.meta-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.meta-top .name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2a44;
}

.meta-top .time {
  color: #8fa0bc;
  font-size: 12px;
}

.meta-middle {
  margin-top: 4px;
  color: #60708d;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-msg {
  margin-top: 6px;
  color: #7f8da6;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-pill {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  padding: 0 6px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.chat-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7f9fe;
}

.chat-header {
  height: 72px;
  border-bottom: 1px solid #e8edf6;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #ffffff;
}

.target {
  display: flex;
  align-items: center;
  gap: 10px;
}

.target-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2a44;
}

.target-text p {
  margin: 4px 0 0;
  color: #6d7d98;
  font-size: 12px;
}

.message-wrap {
  flex: 1;
  min-height: 0;
  padding: 18px 20px;
}

.message-loading {
  color: #75839b;
  font-size: 14px;
}

.message-scroll {
  height: 100%;
  border-radius: 12px;
}

.message-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.message-scroll :deep(.el-scrollbar__bar.is-vertical) {
  width: 10px;
  right: 0;
}

.message-scroll :deep(.el-scrollbar__thumb) {
  background-color: rgba(148, 160, 182, 0.55);
  border-radius: 999px;
}

.message-empty {
  text-align: center;
  color: #8a99b0;
  margin-top: 24px;
}

.message-list {
  min-height: 100%;
  padding-right: 8px;
}

.date-divider {
  display: flex;
  justify-content: center;
  margin: 8px 0 10px;
}

.date-divider span {
  font-size: 12px;
  color: #8a99b0;
  background: #eef2fa;
  border-radius: 999px;
  padding: 2px 10px;
}

.msg-row {
  display: flex;
  margin-bottom: 4px;
}

.msg-row.mine {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: min(68%, 640px);
  background: #ffffff;
  border: 1px solid #e4eaf6;
  border-radius: 14px;
  padding: 10px 12px;
}

.msg-row.mine .msg-bubble {
  background: #dce9ff;
  border-color: #c7dbff;
}

.msg-bubble p {
  margin: 0;
  color: #2d3c58;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  color: #8a99b0;
  font-size: 12px;
}

.msg-meta.mine {
  justify-content: flex-end;
}

.composer {
  border-top: 1px solid #e8edf6;
  background: #ffffff;
  padding: 16px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.composer textarea {
  flex: 1;
  min-height: 110px;
  max-height: 280px;
  border: 1px solid #d8e1ef;
  border-radius: 12px;
  padding: 12px 14px;
  outline: none;
  resize: vertical;
  font: inherit;
  line-height: 1.6;
}

.composer textarea:focus {
  border-color: #79a8ff;
  box-shadow: 0 0 0 2px rgba(44, 123, 255, 0.15);
}

.chat-placeholder {
  margin: auto;
  color: #8392ab;
  font-size: 16px;
}

@media (max-width: 960px) {
  .chat-page {
    grid-template-columns: 1fr;
    height: calc(100vh - 90px);
  }

  .session-panel {
    border-right: none;
    border-bottom: 1px solid #e9eef8;
    max-height: 40vh;
  }
}
</style>
