<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock3, MapPin, Trash2 } from 'lucide-vue-next'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'
import { clearBrowseHistory, deleteBrowseHistory, fetchBrowseHistoryArchive } from '@/api/history'
import { GOODS_STATUS, GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { ensureLoggedIn } from '@/utils/request'
import { formatCurrency, formatDateTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const archives = ref([])

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const totalCount = computed(() =>
  archives.value.reduce((total, archive) => total + (Array.isArray(archive?.items) ? archive.items.length : 0), 0),
)

const latestBrowseTime = computed(() => {
  for (const archive of archives.value) {
    if (Array.isArray(archive?.items) && archive.items.length > 0) {
      return formatDateTime(archive.items[0].browseTime)
    }
  }
  return '-'
})

const summaryMetrics = computed(() => [
  {
    label: '历史总数',
    value: `${totalCount.value} 条`,
  },
  {
    label: '归档天数',
    value: `${archives.value.length} 天`,
  },
  {
    label: '最近浏览',
    value: latestBrowseTime.value,
  },
])

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2400)
}

function statusText(item) {
  if (item?.statusDesc) {
    return item.statusDesc
  }

  return GOODS_STATUS_LABEL_MAP[item?.status] || '状态未知'
}

function isSold(item) {
  return Number(item?.status) === GOODS_STATUS.SOLD
}

function openGoods(item) {
  if (!item?.goodsId) {
    return
  }

  router.push(`/goods/${item.goodsId}`)
}

function removeItemFromView(historyId) {
  archives.value = archives.value
    .map((archive) => ({
      ...archive,
      items: Array.isArray(archive.items)
        ? archive.items.filter((item) => String(item.historyId) !== String(historyId))
        : [],
    }))
    .filter((archive) => archive.items.length > 0)
}

async function loadArchives() {
  if (!ensureLoggedIn({ source: 'browse-history' })) {
    archives.value = []
    return
  }

  loading.value = true
  try {
    const data = await fetchBrowseHistoryArchive()
    archives.value = Array.isArray(data) ? data : []
  } catch (error) {
    archives.value = []
    ElMessage.error(getErrorMessage(error, '浏览历史加载失败'))
  } finally {
    loading.value = false
  }
}

async function handleDelete(item) {
  if (!item?.historyId) {
    return
  }

  try {
    await ElMessageBox.confirm('确定删除这条浏览记录吗？', '删除记录', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteBrowseHistory(item.historyId)
    removeItemFromView(item.historyId)
    showToast('删除成功')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(getErrorMessage(error, '删除失败'))
  }
}

async function handleClearAll() {
  if (!totalCount.value) {
    return
  }

  try {
    await ElMessageBox.confirm('确认清空全部浏览历史？该操作不可恢复。', '清空历史', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await clearBrowseHistory()
    archives.value = []
    showToast('已清空浏览历史')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(getErrorMessage(error, '清空失败'))
  }
}

onMounted(loadArchives)
</script>

<template>
  <section class="history-page">
    <div class="history-shell">
      <aside class="history-side">
        <UserCenterSidebar />
      </aside>

      <main class="history-main">
        <header class="history-hero">
          <div class="hero-copy">
            <p class="eyebrow">BROWSING HISTORY</p>
            <h1>浏览历史</h1>
            <span>你最近看过的商品会自动记录在这里，方便快速回看和继续比较。</span>
          </div>

          <div class="hero-stats">
            <article v-for="item in summaryMetrics" :key="item.label" class="hero-stat">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </header>

        <section class="toolbar">
          <div class="toolbar-copy">
            <h2>最近浏览</h2>
            <p>按日期归档展示，可单条删除，也可一键清空。</p>
          </div>

          <div class="toolbar-actions">
            <el-button @click="loadArchives">刷新</el-button>
            <el-button type="danger" plain :disabled="!totalCount" @click="handleClearAll">
              清空历史
            </el-button>
          </div>
        </section>

        <section v-loading="loading" class="history-panel">
          <div v-if="archives.length" class="archive-list">
            <article v-for="archive in archives" :key="archive.dateKey" class="archive-card">
              <header class="archive-head">
                <div>
                  <h3>{{ archive.dateLabel || archive.dateKey }}</h3>
                  <p>{{ archive.items?.length || 0 }} 条记录</p>
                </div>
              </header>

              <div class="history-grid">
                <article v-for="item in archive.items" :key="item.historyId" class="history-item">
                  <button type="button" class="cover-wrap" @click="openGoods(item)">
                    <img v-if="item.cover" :src="item.cover" :alt="item.title || '商品封面'" />
                    <div v-else class="cover-empty">暂无封面</div>
                    <span v-if="isSold(item)" class="sold-tag">已售出</span>
                  </button>

                  <div class="item-copy">
                    <div class="item-head">
                      <button type="button" class="item-title" @click="openGoods(item)">
                        {{ item.title || '商品已不可见' }}
                      </button>
                      <el-tag :type="isSold(item) ? 'info' : 'success'" round>
                        {{ statusText(item) }}
                      </el-tag>
                    </div>

                    <p class="price">{{ formatCurrency(item.price) }}</p>

                    <div class="meta-list">
                      <span class="meta-chip">
                        <Clock3 class="meta-icon" />
                        {{ formatDateTime(item.browseTime) }}
                      </span>
                      <span class="meta-chip">
                        浏览 {{ item.browseCount ?? 0 }} 次
                      </span>
                      <span class="meta-chip" v-if="item.location">
                        <MapPin class="meta-icon" />
                        {{ item.location }}
                      </span>
                      <span class="meta-chip">
                        成色 {{ item.quality ?? '-' }}
                      </span>
                    </div>

                    <div class="item-actions">
                      <el-button type="primary" @click="openGoods(item)">查看详情</el-button>
                      <el-button plain type="danger" @click="handleDelete(item)">
                        <Trash2 class="action-icon" />
                        删除记录
                      </el-button>
                    </div>
                  </div>
                </article>
              </div>
            </article>
          </div>

          <MarketplaceEmptyState
            v-else-if="!loading"
            title="暂无浏览历史"
            description="去看看感兴趣的商品，浏览记录会自动出现在这里。"
            action-text="去逛商品"
            @action="router.push('/')"
          />
        </section>
      </main>
    </div>

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="toast"
        :class="toast.type === 'error' ? 'toast-error' : 'toast-success'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </section>
</template>

<style scoped>
.history-page {
  background: #f8fafc;
  min-height: 100vh;
  padding: 24px 16px 32px;
}

.history-shell {
  max-width: 1480px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.history-side {
  position: sticky;
  top: 96px;
}

.history-main {
  display: grid;
  gap: 18px;
}

.history-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.18), transparent 28%),
    linear-gradient(135deg, #ffffff, #f8fafc);
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.25);
}

.hero-copy {
  display: grid;
  gap: 10px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #64748b;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.05;
  color: #0f172a;
}

.hero-copy span {
  max-width: 40em;
  color: #475569;
  line-height: 1.7;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat {
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  display: grid;
  gap: 8px;
}

.hero-stat span {
  font-size: 12px;
  color: #64748b;
}

.hero-stat strong {
  font-size: 18px;
  color: #0f172a;
}

.toolbar {
  padding: 20px 22px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.toolbar-copy h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.toolbar-copy p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.history-panel {
  min-height: 360px;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  background: #ffffff;
}

.archive-list {
  display: grid;
  gap: 18px;
}

.archive-card {
  display: grid;
  gap: 14px;
}

.archive-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.archive-head h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.archive-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.history-grid {
  display: grid;
  gap: 14px;
}

.history-item {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff, #fafafa);
}

.cover-wrap {
  position: relative;
  border: 0;
  border-radius: 16px;
  overflow: hidden;
  background: #f1f5f9;
  cursor: pointer;
  padding: 0;
  aspect-ratio: 1 / 1;
}

.cover-wrap img,
.cover-empty {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-empty {
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-size: 13px;
}

.sold-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  font-size: 12px;
}

.item-copy {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.item-title {
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  color: #0f172a;
  cursor: pointer;
}

.price {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #ea580c;
}

.meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

.meta-icon {
  width: 14px;
  height: 14px;
}

.item-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 160;
  padding: 12px 16px;
  border-radius: 18px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.35);
}

.toast-success {
  background: #0f172a;
}

.toast-error {
  background: #e11d48;
}

@media (max-width: 1180px) {
  .history-shell {
    grid-template-columns: 1fr;
  }

  .history-side {
    position: static;
  }
}

@media (max-width: 860px) {
  .history-hero {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .history-page {
    padding-left: 12px;
    padding-right: 12px;
  }

  .history-item {
    grid-template-columns: 1fr;
  }

  .item-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
