<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'
import { clearBrowseHistory, deleteBrowseHistory, fetchBrowseHistoryArchive } from '@/api/history'
import { GOODS_STATUS, GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { formatCurrency, formatDateTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const archives = ref([])

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

function statusText(item) {
  if (item?.statusDesc) {
    return item.statusDesc
  }
  return GOODS_STATUS_LABEL_MAP[item?.status] || '未知状态'
}

function isSold(item) {
  return Number(item?.status) === GOODS_STATUS.SOLD
}

function goDetail(item) {
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
  loading.value = true
  try {
    const data = await fetchBrowseHistoryArchive()
    archives.value = Array.isArray(data) ? data : []
  } catch (error) {
    archives.value = []
    ElMessage.error(error.message || '浏览历史加载失败')
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
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteBrowseHistory(item.historyId)
    removeItemFromView(item.historyId)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    if (error?.message) {
      ElMessage.error(error.message)
    }
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
    ElMessage.success('已清空浏览历史')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    if (error?.message) {
      ElMessage.error(error.message)
    }
  }
}

onMounted(loadArchives)
</script>

<template>
  <div class="history-page zz-page">
    <section class="history-banner zz-card">
      <div class="banner-copy">
        <p>BROWSING HISTORY</p>
        <h1>浏览历史</h1>
      </div>

      <div class="banner-meta">
        <article v-for="item in summaryMetrics" :key="item.label" class="banner-stat">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <div class="history-layout zz-two-column">
      <aside class="history-side">
        <MarketplaceUserSidebar activeKey="history" />
      </aside>

      <main class="history-main">
        <section class="toolbar zz-white-panel">
          <el-button @click="loadArchives">刷新</el-button>
          <el-button type="danger" plain :disabled="!totalCount" @click="handleClearAll">一键清空</el-button>
        </section>

        <section class="list-panel zz-white-panel" v-loading="loading">
          <div v-if="archives.length" class="archive-list">
            <article v-for="archive in archives" :key="archive.dateKey" class="archive-section">
              <header class="archive-head">
                <h3>{{ archive.dateLabel }}</h3>
                <span>{{ archive.items?.length || 0 }} 条记录</span>
              </header>

              <div class="archive-items">
                <article v-for="item in archive.items" :key="item.historyId" class="history-item">
                  <div class="cover-wrap" @click="goDetail(item)">
                    <img v-if="item.cover" :src="item.cover" :alt="item.title || '商品封面'" />
                    <div v-else class="cover-empty">暂无封面</div>
                    <span v-if="isSold(item)" class="sold-tag">已售出</span>
                  </div>

                  <div class="item-copy">
                    <div class="item-head">
                      <h4>{{ item.title || '商品不可用' }}</h4>
                      <el-tag :type="isSold(item) ? 'info' : 'success'" round>{{ statusText(item) }}</el-tag>
                    </div>

                    <p class="price">{{ formatCurrency(item.price) }}</p>

                    <div class="meta-row">
                      <span>浏览时间：{{ formatDateTime(item.browseTime) }}</span>
                      <span>浏览次数：{{ item.browseCount ?? 0 }}</span>
                    </div>
                    <div class="meta-row">
                      <span>成色：{{ item.quality ?? '-' }}</span>
                      <span>地点：{{ item.location || '-' }}</span>
                    </div>

                    <div class="item-actions">
                      <el-button type="primary" @click="goDetail(item)">查看详情</el-button>
                      <el-button plain type="danger" @click="handleDelete(item)">删除记录</el-button>
                    </div>
                  </div>
                </article>
              </div>
            </article>
          </div>

          <MarketplaceEmptyState
            v-else-if="!loading"
            title="暂无浏览历史"
            description="去逛逛商品，浏览记录会自动出现在这里。"
            action-text="去逛商品"
            @action="router.push('/goods')"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  display: grid;
  gap: 16px;
}

.history-banner {
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 16px;
  align-items: end;
}

.banner-copy {
  display: grid;
  gap: 8px;
}

.banner-copy p {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--zz-text-light);
}

.banner-copy h1 {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.1;
  color: var(--zz-black);
}

.banner-copy span {
  color: var(--zz-text-secondary);
  line-height: 1.65;
}

.banner-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.banner-stat {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  display: grid;
  gap: 6px;
}

.banner-stat span {
  font-size: 12px;
  color: var(--zz-text-light);
}

.banner-stat strong {
  font-size: 16px;
  color: var(--zz-black);
}

.history-layout {
  align-items: start;
}

.history-side {
  position: sticky;
  top: 146px;
}

.history-main {
  display: grid;
  gap: 12px;
}

.toolbar,
.list-panel {
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.archive-list {
  display: grid;
  gap: 16px;
}

.archive-section {
  display: grid;
  gap: 10px;
}

.archive-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.archive-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--zz-black);
}

.archive-head span {
  color: var(--zz-text-light);
  font-size: 13px;
}

.archive-items {
  display: grid;
  gap: 12px;
}

.history-item {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 16px;
}

.cover-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: #f2f2f2;
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
  color: var(--zz-text-light);
  font-size: 13px;
}

.sold-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 12px;
}

.item-copy {
  display: grid;
  gap: 10px;
}

.item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.item-head h4 {
  margin: 0;
  font-size: 18px;
  color: var(--zz-black);
}

.price {
  color: #ff5a26;
  font-size: 26px;
  font-weight: 700;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.item-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .history-banner {
    grid-template-columns: 1fr;
  }

  .history-side {
    position: static;
  }
}

@media (max-width: 760px) {
  .history-item {
    grid-template-columns: 1fr;
  }

  .banner-meta {
    grid-template-columns: 1fr;
  }
}
</style>
