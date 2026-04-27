<script setup>
import { computed } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  noticeList: {
    type: Array,
    default: () => [],
  },
  markingAll: {
    type: Boolean,
    default: false,
  },
  markingIds: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['navigate', 'read-all', 'read-notice'])

const hasUnread = computed(() =>
  props.noticeList.some((item) => Number(item?.readStatus) !== 1),
)

function isMarking(id) {
  return props.markingIds.includes(Number(id))
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}`
}
</script>

<template>
  <div class="notice-panel">
    <div class="notice-toolbar">
      <div class="toolbar-copy">
        <h4>系统通知</h4>
        <p>展示交易流程中的平台消息，不支持回复。</p>
      </div>
      <el-button
        text
        :disabled="!hasUnread"
        :loading="markingAll"
        @click="$emit('read-all')"
      >
        全部已读
      </el-button>
    </div>

    <div v-if="loading" class="notice-state">正在加载通知...</div>
    <div v-else-if="!noticeList.length" class="notice-state">暂无系统通知</div>

    <el-scrollbar v-else class="notice-scroll" always>
      <div class="notice-list">
        <article
          v-for="notice in noticeList"
          :key="notice.id"
          class="notice-card"
          :class="{ unread: Number(notice.readStatus) !== 1 }"
        >
          <div class="card-head">
            <div>
              <h5>{{ notice.title || '系统通知' }}</h5>
              <p>{{ formatDateTime(notice.createTime) }}</p>
            </div>
            <span class="status-chip" :class="{ read: Number(notice.readStatus) === 1 }">
              {{ Number(notice.readStatus) === 1 ? '已读' : '未读' }}
            </span>
          </div>

          <div class="card-body">
            {{ notice.content || '暂无通知内容' }}
          </div>

          <div class="card-foot">
            <span v-if="notice.bizId" class="biz-hint">关联编号 #{{ notice.bizId }}</span>
            <div class="card-actions">
              <el-button
                v-if="notice.targetPage"
                size="small"
                @click="$emit('navigate', notice)"
              >
                查看
              </el-button>
              <el-button
                v-if="Number(notice.readStatus) !== 1"
                size="small"
                type="primary"
                plain
                :loading="isMarking(notice.id)"
                @click="$emit('read-notice', notice.id)"
              >
                标记已读
              </el-button>
              <span v-else class="read-time">
                {{ notice.readTime ? `已于 ${formatDateTime(notice.readTime)} 读过` : '已读' }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
.notice-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
}

.notice-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.toolbar-copy h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2a44;
}

.toolbar-copy p {
  margin: 6px 0 0;
  color: #7b879b;
  font-size: 13px;
}

.notice-state {
  padding: 24px;
  color: #75839b;
  font-size: 14px;
}

.notice-scroll {
  flex: 1;
  min-height: 0;
}

.notice-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 6px;
}

.notice-card {
  border-radius: 18px;
  border: 1px solid #e6ebf5;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  box-shadow: 0 12px 28px rgba(31, 42, 68, 0.06);
  padding: 18px 18px 16px;
}

.notice-card.unread {
  border-color: #ffd58a;
  background: linear-gradient(180deg, #fffdfa 0%, #fff6df 100%);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-head h5 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2a44;
}

.card-head p {
  margin: 6px 0 0;
  color: #7b879b;
  font-size: 12px;
}

.status-chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: #fff0cf;
  color: #b96b00;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-chip.read {
  background: #ecf5ff;
  color: #3a6edc;
}

.card-body {
  margin-top: 14px;
  color: #31425f;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.card-foot {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.biz-hint,
.read-time {
  color: #7b879b;
  font-size: 12px;
}

@media (max-width: 960px) {
  .notice-panel {
    padding: 16px;
  }

  .notice-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .card-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    flex-wrap: wrap;
  }
}
</style>
