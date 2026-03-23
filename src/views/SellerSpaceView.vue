<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceProductCard from '@/components/MarketplaceProductCard.vue'
import { fetchPublicGoodsPage, fetchSellerSpace } from '@/api/goods'

const SELLER_GOODS_TABS = [
  { key: 'onSale', label: '在售商品', status: 3 },
  { key: 'sold', label: '已售商品', status: 5 },
]

const route = useRoute()
const router = useRouter()

const sellerLoading = ref(false)
const goodsLoading = ref(false)
const seller = ref(createSellerDraftFromRoute())
const records = ref([])
const activeTab = ref('onSale')

const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const sellerId = computed(() => {
  const parsed = Number(route.params.sellerId)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const activeStatus = computed(() => {
  const current = SELLER_GOODS_TABS.find((item) => item.key === activeTab.value)
  return current ? current.status : 3
})

const sellerName = computed(() => seller.value?.sellerName || '校园卖家')
const sellerScore = computed(() => {
  const score = Number(seller.value?.sellerScoreAvg || 0)
  return Number.isFinite(score) ? score : 0
})
const sellerReviewCount = computed(() => Number(seller.value?.sellerReviewCount || 0))
const onSaleCount = computed(() => Number(seller.value?.onSaleCount || 0))
const soldCount = computed(() => Number(seller.value?.soldCount || 0))

function createSellerDraftFromRoute() {
  const score = Number(route.query.scoreAvg)
  const reviewCount = Number(route.query.reviewCount)
  return {
    sellerId: Number(route.params.sellerId || 0) || null,
    sellerName: typeof route.query.name === 'string' ? route.query.name : '',
    sellerAvatar: typeof route.query.avatar === 'string' ? route.query.avatar : '',
    sellerCampus: typeof route.query.campus === 'string' ? route.query.campus : '',
    sellerScoreAvg: Number.isFinite(score) ? score : 0,
    sellerReviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    onSaleCount: 0,
    soldCount: 0,
  }
}

function scoreLevelText(score) {
  const value = Number(score || 0)
  if (value >= 5) return '好评卖家'
  if (value >= 3) return '中评卖家'
  return '差评卖家'
}

function scoreLevelClass(score) {
  const value = Number(score || 0)
  if (value >= 5) return 'level-good'
  if (value >= 3) return 'level-neutral'
  return 'level-bad'
}

function toScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) {
    return '0.0'
  }
  return score.toFixed(1)
}

async function loadSellerSpace() {
  if (!sellerId.value) {
    ElMessage.warning('卖家编号无效')
    router.replace('/goods')
    return
  }

  sellerLoading.value = true
  try {
    const data = await fetchSellerSpace(sellerId.value)
    seller.value = {
      ...seller.value,
      ...data,
    }
  } catch (error) {
    ElMessage.error(error.message || '卖家信息加载失败')
  } finally {
    sellerLoading.value = false
  }
}

async function loadGoods() {
  if (!sellerId.value) {
    records.value = []
    pager.total = 0
    return
  }

  goodsLoading.value = true
  try {
    const data = await fetchPublicGoodsPage({
      page: pager.page,
      pageSize: pager.pageSize,
      sellerId: sellerId.value,
      status: activeStatus.value,
    })
    records.value = Array.isArray(data?.records) ? data.records : []
    pager.total = Number(data?.total || 0)
  } catch (error) {
    records.value = []
    pager.total = 0
    ElMessage.error(error.message || '卖家商品加载失败')
  } finally {
    goodsLoading.value = false
  }
}

function goGoodsDetail(item) {
  if (!item?.id) return
  router.push(`/goods/${item.id}`)
}

function goBack() {
  router.push('/goods')
}

function changeTab(tabKey) {
  if (tabKey === activeTab.value) {
    return
  }
  activeTab.value = tabKey
  pager.page = 1
  loadGoods()
}

function handlePageChange(page) {
  pager.page = page
  loadGoods()
}

function handleSizeChange(size) {
  pager.pageSize = size
  pager.page = 1
  loadGoods()
}

watch(
  () => route.params.sellerId,
  () => {
    seller.value = createSellerDraftFromRoute()
    activeTab.value = 'onSale'
    pager.page = 1
    pager.total = 0
    loadSellerSpace()
    loadGoods()
  },
)

onMounted(async () => {
  await loadSellerSpace()
  await loadGoods()
})
</script>

<template>
  <div class="seller-space-page zz-page">
    <section v-loading="sellerLoading" class="seller-head zz-white-panel">
      <div class="seller-main">
        <el-avatar :size="76" :src="seller?.sellerAvatar || undefined">
          {{ sellerName.slice(0, 1) }}
        </el-avatar>
        <div class="seller-copy">
          <h1>{{ sellerName }}</h1>
          <p>{{ seller?.sellerCampus || '校内交易' }}</p>
          <p v-if="seller?.sellerIntro" class="intro">{{ seller.sellerIntro }}</p>
        </div>
      </div>

      <div class="seller-score">
        <div class="score-head">
          <strong>{{ toScore(sellerScore) }}</strong>
          <span>/ 5</span>
        </div>
        <el-rate :model-value="sellerScore" disabled allow-half text-color="#ff9900" />
        <div class="score-foot">
          <span>{{ sellerReviewCount }} 条评价</span>
          <span class="score-level" :class="scoreLevelClass(sellerScore)">{{ scoreLevelText(sellerScore) }}</span>
        </div>
      </div>

      <div class="seller-stats">
        <article>
          <span>在售商品</span>
          <strong>{{ onSaleCount }}</strong>
        </article>
        <article>
          <span>已售商品</span>
          <strong>{{ soldCount }}</strong>
        </article>
      </div>

      <div class="seller-actions">
        <el-button plain @click="goBack">返回广场</el-button>
      </div>
    </section>

    <section class="goods-board zz-white-panel">
      <div class="board-head">
        <div>
          <h2>卖家商品</h2>
          <p>点击商品可进入详情页查看对应商品评价。</p>
        </div>

        <div class="tab-row">
          <button
            v-for="tab in SELLER_GOODS_TABS"
            :key="tab.key"
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="changeTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div v-loading="goodsLoading" class="board-body">
        <div v-if="records.length" class="goods-grid">
          <MarketplaceProductCard
            v-for="item in records"
            :key="item.id"
            :item="item"
            @click="goGoodsDetail"
          />
        </div>

        <MarketplaceEmptyState
          v-else
          :title="activeTab === 'onSale' ? '暂无在售商品' : '暂无已售商品'"
          description="当前卖家在该状态下暂时没有可展示的商品。"
        />
      </div>

      <div class="pager-wrap">
        <el-pagination
          v-if="pager.total > pager.pageSize"
          v-model:current-page="pager.page"
          v-model:page-size="pager.pageSize"
          :total="pager.total"
          :page-sizes="[10, 20, 30]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.seller-head,
.goods-board {
  padding: 18px;
}

.seller-head {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) auto auto;
  gap: 14px;
  align-items: center;
}

.seller-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.seller-copy {
  display: grid;
  gap: 6px;
}

.seller-copy h1 {
  font-size: clamp(26px, 3vw, 34px);
  line-height: 1.1;
  color: var(--zz-black);
}

.seller-copy p {
  color: var(--zz-text-secondary);
}

.intro {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.seller-score {
  padding: 14px 16px;
  border: 1px solid var(--zz-border);
  border-radius: 18px;
  background: #fafafa;
  display: grid;
  gap: 8px;
}

.score-head {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-head strong {
  font-size: 34px;
  line-height: 1;
  color: #ff7d45;
}

.score-head span {
  color: var(--zz-text-light);
}

.score-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.score-level {
  font-weight: 700;
}

.score-level.level-good {
  color: #24a860;
}

.score-level.level-neutral {
  color: #e88c2c;
}

.score-level.level-bad {
  color: #df4e4e;
}

.seller-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.seller-stats article {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--zz-border);
  background: #fff;
  display: grid;
  gap: 6px;
}

.seller-stats span {
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.seller-stats strong {
  font-size: 24px;
  line-height: 1;
  color: var(--zz-black);
}

.board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.board-head h2 {
  font-size: 28px;
  color: var(--zz-black);
}

.board-head p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
}

.tab-row {
  display: inline-flex;
  border-radius: 999px;
  background: #f5f5f5;
  padding: 4px;
}

.tab-btn {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--zz-text-secondary);
  cursor: pointer;
  transition: all 0.18s ease;
}

.tab-btn.active {
  background: var(--zz-yellow);
  color: var(--zz-black);
  font-weight: 700;
}

.board-body {
  margin-top: 14px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.pager-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1400px) {
  .goods-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .seller-head {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .board-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .goods-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .goods-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pager-wrap {
    justify-content: center;
  }
}
</style>
