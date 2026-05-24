<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'
import { cancelCollectGoods, fetchFavoritePage } from '@/api/favorite'
import { GOODS_STATUS, GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { formatCurrency, formatDateTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const records = ref([])
const sortType = ref('desc')

const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const sortOptions = [
  {
    label: '按收藏时间从新到旧',
    value: 'desc',
  },
  {
    label: '按收藏时间从旧到新',
    value: 'asc',
  },
]

const pageSummary = computed(() => [
  {
    label: '收藏总数',
    value: `${pager.total} 条`,
  },
  {
    label: '排序方式',
    value: sortType.value === 'asc' ? '最早优先' : '最新优先',
  },
  {
    label: '当前页',
    value: `${pager.page}`,
  },
])

function isSold(item) {
  return Number(item?.status) === GOODS_STATUS.SOLD
}

function statusText(item) {
  if (item?.statusDesc) {
    return item.statusDesc
  }
  return GOODS_STATUS_LABEL_MAP[item?.status] || '未知状态'
}

function goDetail(item) {
  const goodsId = item?.goodsId || item?.id
  if (!goodsId) {
    return
  }
  router.push(`/goods/${goodsId}`)
}

async function loadFavorites() {
  loading.value = true
  try {
    const data = await fetchFavoritePage({
      page: pager.page,
      pageSize: pager.pageSize,
      sortType: sortType.value,
    })
    records.value = Array.isArray(data?.records) ? data.records : []
    pager.total = Number(data?.total || 0)
  } catch (error) {
    records.value = []
    pager.total = 0
    ElMessage.error(error.message || '收藏列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSortChange() {
  pager.page = 1
  loadFavorites()
}

function handlePageChange(nextPage) {
  pager.page = nextPage
  loadFavorites()
}

async function handleCancelFavorite(item) {
  const goodsId = item?.goodsId || item?.id
  if (!goodsId) {
    return
  }

  try {
    await ElMessageBox.confirm('确定取消收藏该商品吗？', '取消收藏', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await cancelCollectGoods(goodsId)
    ElMessage.success('已取消收藏')

    if (records.value.length === 1 && pager.page > 1) {
      pager.page -= 1
    }
    await loadFavorites()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    if (error?.message) {
      ElMessage.error(error.message)
    }
  }
}

onMounted(loadFavorites)
</script>

<template>
  <div class="favorite-page zz-page">
    <section class="favorite-banner zz-card">
      <div class="banner-copy">
        <p>MY FAVORITES</p>
        <h1>我的收藏</h1>
        <span>支持按收藏时间排序查看，已售出的商品会自动标记。</span>
      </div>

      <div class="banner-meta">
        <article v-for="item in pageSummary" :key="item.label" class="banner-stat">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <div class="favorite-layout zz-two-column">
      <aside class="favorite-side">
        <MarketplaceUserSidebar activeKey="favorites" />
      </aside>

      <main class="favorite-main">
        <section class="toolbar zz-white-panel">
          <el-select v-model="sortType" style="width: 220px" @change="handleSortChange">
            <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </section>

        <section class="list-panel zz-white-panel" v-loading="loading">
          <div v-if="records.length" class="favorite-list">
            <article v-for="item in records" :key="item.favoriteId || item.goodsId || item.id" class="favorite-item">
              <div class="cover-wrap" @click="goDetail(item)">
                <img v-if="item.cover" :src="item.cover" :alt="item.title || '商品封面'" />
                <div v-else class="cover-empty">暂无封面</div>
                <span v-if="isSold(item)" class="sold-tag">已售出</span>
              </div>

              <div class="item-copy">
                <div class="item-head">
                  <h3>{{ item.title || '商品已不可用' }}</h3>
                  <el-tag :type="isSold(item) ? 'info' : 'success'" round>{{ statusText(item) }}</el-tag>
                </div>

                <p class="price">{{ formatCurrency(item.price) }}</p>

                <div class="meta-row">
                  <span>卖家：{{ item.sellerName || '-' }}</span>
                  <span>地点：{{ item.location || '校内交易' }}</span>
                </div>
                <div class="meta-row">
                  <span>收藏时间：{{ formatDateTime(item.favoriteTime) }}</span>
                  <span>收藏量：{{ item.favoriteCount ?? 0 }}</span>
                </div>

                <div class="item-actions">
                  <el-button type="primary" @click="goDetail(item)">查看详情</el-button>
                  <el-button plain type="danger" @click="handleCancelFavorite(item)">取消收藏</el-button>
                </div>
              </div>
            </article>
          </div>

          <MarketplaceEmptyState
            v-else-if="!loading"
            title="暂无收藏"
            description="去商品广场逛逛，收藏你感兴趣的商品。"
            action-text="去逛商品"
            @action="router.push('/goods')"
          />
        </section>

        <div class="pager-wrap">
          <el-pagination
            v-if="pager.total > pager.pageSize"
            class="pager"
            background
            layout="prev, pager, next"
            :current-page="pager.page"
            :page-size="pager.pageSize"
            :total="pager.total"
            @current-change="handlePageChange"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.favorite-page {
  display: grid;
  gap: 16px;
}

.favorite-banner {
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

.favorite-layout {
  align-items: start;
}

.favorite-side {
  position: sticky;
  top: 146px;
}

.favorite-main {
  display: grid;
  gap: 12px;
}

.toolbar,
.list-panel {
  padding: 16px;
}

.favorite-list {
  display: grid;
  gap: 14px;
}

.favorite-item {
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

.item-head h3 {
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

.pager-wrap {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1080px) {
  .favorite-banner {
    grid-template-columns: 1fr;
  }

  .favorite-side {
    position: static;
  }
}

@media (max-width: 760px) {
  .favorite-item {
    grid-template-columns: 1fr;
  }

  .banner-meta {
    grid-template-columns: 1fr;
  }

  .pager-wrap {
    justify-content: center;
  }
}
</style>
