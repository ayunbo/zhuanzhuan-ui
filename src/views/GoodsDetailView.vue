<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceProductCard from '@/components/MarketplaceProductCard.vue'
import { fetchPublicGoodsById, fetchPublicGoodsPage } from '@/api/goods'
import { getGoodsReviewPage } from '@/api/review'
import { GOODS_STATUS, GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref(null)
const recommendGoods = ref([])
const activeImageIndex = ref(0)

const reviewLoading = ref(false)
const reviewRecords = ref([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewPageSize = ref(5)

const galleryImages = computed(() => {
  if (!detail.value) return []
  const list = []
  if (detail.value.cover) {
    list.push(detail.value.cover)
  }
  if (Array.isArray(detail.value.images)) {
    detail.value.images.forEach((item) => {
      if (typeof item === 'string' && item) list.push(item)
      if (item?.url) list.push(item.url)
    })
  }
  return [...new Set(list)]
})

const currentImage = computed(() => galleryImages.value[activeImageIndex.value] || '')
const priceText = computed(() => `楼${Number(detail.value?.price || 0).toFixed(2)}`)
const sellerName = computed(() => detail.value?.sellerName || '校园卖家')
const detailStatus = computed(() => Number(detail.value?.status))
const statusText = computed(() => {
  if (detail.value?.statusDesc) return detail.value.statusDesc
  return GOODS_STATUS_LABEL_MAP[detailStatus.value] || '未知状态'
})
const canOrder = computed(() => detailStatus.value === GOODS_STATUS.ON_SALE)

const sellingTags = computed(() => {
  const tags = []
  if (detail.value?.categoryName) tags.push(detail.value.categoryName)
  if (detail.value?.quality) tags.push(`成色 ${detail.value.quality}`)
  if (detail.value?.location) tags.push(detail.value.location)
  if (detail.value?.createTime) tags.push(formatDateTime(detail.value.createTime))
  return tags
})

function goBack() {
  router.push('/goods')
}

function goOrderDraft() {
  if (!detail.value?.id) return
  if (!canOrder.value) {
    ElMessage.warning(`当前商品状态为${statusText.value}，不可下单`)
    return
  }
  router.push({
    path: '/order/create',
    query: {
      goodsId: String(detail.value.id),
      goodsTitle: detail.value.title || '',
      goodsCover: detail.value.cover || '',
      amount: String(detail.value.price || ''),
      sellerName: sellerName.value,
      location: detail.value.location || '',
    },
  })
}

function goDetail(item) {
  if (!item?.id) return
  router.push(`/goods/${item.id}`)
}

function goSellerSpace() {
  if (!detail.value?.sellerId) return
  router.push({
    name: 'seller-space',
    params: {
      sellerId: String(detail.value.sellerId),
    },
    query: {
      name: detail.value.sellerName || '',
      avatar: detail.value.sellerAvatar || '',
      campus: detail.value.sellerCampus || '',
      scoreAvg: String(detail.value.sellerScoreAvg ?? ''),
      reviewCount: String(detail.value.sellerReviewCount ?? ''),
    },
  })
}

function parseImageUrls(images) {
  if (!images) return []
  return String(images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getReviewImages(review) {
  return parseImageUrls(review?.images)
}

function getReviewerName(review) {
  if (review?.reviewerName) return review.reviewerName
  return review?.anonymous === 1 ? '匿名用户' : '用户'
}

function reviewLevelText(score) {
  const value = Number(score || 0)
  if (value >= 5) return '好评'
  if (value >= 3) return '中评'
  return '差评'
}

function reviewLevelClass(score) {
  const value = Number(score || 0)
  if (value >= 5) return 'level-good'
  if (value >= 3) return 'level-neutral'
  return 'level-bad'
}

async function loadRecommend(categoryId, currentId) {
  try {
    const data = await fetchPublicGoodsPage({
      page: 1,
      pageSize: 8,
      sortBy: 'hot',
      ...(categoryId ? { categoryId } : {}),
    })
    recommendGoods.value = (data?.records || []).filter((item) => String(item.id) !== String(currentId)).slice(0, 5)
  } catch {
    recommendGoods.value = []
  }
}

async function loadReviews(goodsId) {
  if (!goodsId) {
    reviewRecords.value = []
    reviewTotal.value = 0
    return
  }

  reviewLoading.value = true
  try {
    const data = await getGoodsReviewPage(goodsId, {
      page: reviewPage.value,
      pageSize: reviewPageSize.value,
    })
    reviewRecords.value = data?.records || []
    reviewTotal.value = Number(data?.total || 0)
  } catch (error) {
    reviewRecords.value = []
    reviewTotal.value = 0
    ElMessage.error(error.message || '评价加载失败')
  } finally {
    reviewLoading.value = false
  }
}

async function onReviewPageChange(nextPage) {
  reviewPage.value = nextPage
  await loadReviews(detail.value?.id)
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    router.replace('/goods')
    return
  }

  loading.value = true
  try {
    detail.value = await fetchPublicGoodsById(id)
    activeImageIndex.value = 0
    reviewPage.value = 1
    await Promise.all([loadRecommend(detail.value?.categoryId, id), loadReviews(id)])
  } catch (error) {
    detail.value = null
    recommendGoods.value = []
    reviewRecords.value = []
    reviewTotal.value = 0
    ElMessage.error(error.message || '商品详情加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    loadDetail()
  },
)

onMounted(loadDetail)
</script>

<template>
  <div class="detail-page zz-page">
    <MarketplaceEmptyState
      v-if="!loading && !detail"
      title="商品不存在"
      description="当前商品详情无法展示，可能已下架或被删除。"
      action-text="返回商品广场"
      @action="goBack"
    />

    <template v-else-if="detail">
      <section class="seller-banner zz-white-panel">
        <div class="seller-banner__main">
          <button type="button" class="seller-avatar-btn" @click="goSellerSpace">
            <el-avatar :size="62" :src="detail.sellerAvatar || undefined">{{ sellerName.slice(0, 1) }}</el-avatar>
          </button>
          <div class="seller-copy">
            <h2>{{ sellerName }}</h2>
            <p>{{ detail.location || '校内当面交易' }} · 商品状态：{{ statusText }}</p>
            <p class="seller-score">
              卖家评分 {{ Number(detail.sellerScoreAvg || 0).toFixed(1) }} 分（{{ Number(detail.sellerReviewCount || 0) }} 条评价）
            </p>
          </div>
        </div>
        <div class="seller-banner__actions">
          <el-button @click="goSellerSpace">查看卖家空间</el-button>
          <el-button plain @click="goBack">返回列表</el-button>
        </div>
      </section>

      <section class="detail-main zz-white-panel">
        <div class="gallery-panel">
          <div class="gallery-main">
            <img v-if="currentImage" :src="currentImage" :alt="detail.title" />
            <div v-else class="gallery-empty">暂无图片</div>
          </div>

          <div class="gallery-thumbs">
            <button
              v-for="(item, index) in galleryImages"
              :key="`${item}-${index}`"
              type="button"
              class="thumb-item"
              :class="{ 'is-active': activeImageIndex === index }"
              @click="activeImageIndex = index"
            >
              <img :src="item" alt="缩略图" />
            </button>
          </div>
        </div>

        <aside class="summary-panel">
          <h1>{{ detail.title }}</h1>
          <div class="price-block">
            <strong>{{ priceText }}</strong>
            <span>校内交易，支持当面验货</span>
          </div>

          <div class="tag-row">
            <span v-for="tag in sellingTags" :key="tag" class="selling-tag">{{ tag }}</span>
          </div>

          <div class="desc-box">
            <h3>商品描述</h3>
            <p>{{ detail.detail || '卖家暂未补充详细描述。' }}</p>
          </div>

          <div class="meta-grid">
            <article>
              <span>浏览量</span>
              <strong>{{ detail.viewCount || 0 }}</strong>
            </article>
            <article>
              <span>收藏量</span>
              <strong>{{ detail.favoriteCount || 0 }}</strong>
            </article>
            <article>
              <span>分类</span>
              <strong>{{ detail.categoryName || '未分类' }}</strong>
            </article>
            <article>
              <span>成色</span>
              <strong>{{ detail.quality || '未填写' }}</strong>
            </article>
          </div>

          <div class="action-row">
            <el-button type="primary" :disabled="!canOrder" @click="goOrderDraft">
              {{ canOrder ? '立即下单' : '当前不可下单' }}
            </el-button>
            <el-button plain @click="router.push('/my-order')">查看订单中心</el-button>
          </div>
          <p v-if="!canOrder" class="order-tip">仅在售商品可下单，当前商品状态：{{ statusText }}</p>
        </aside>
      </section>

      <section class="review-panel zz-white-panel">
        <div class="section-head">
          <div>
            <h2>商品评价</h2>
            <p>仅展示已完成订单买家的真实评价。1-2 分为差评，3-4 分为中评，5 分为好评。</p>
          </div>
        </div>

        <div v-loading="reviewLoading" class="review-wrap">
          <div v-if="reviewRecords.length" class="review-list">
            <article v-for="item in reviewRecords" :key="item.id" class="review-item">
              <div class="review-head">
                <div class="review-user">
                  <el-avatar :size="40" :src="item.reviewerAvatar">{{ getReviewerName(item).slice(0, 1) }}</el-avatar>
                  <div class="review-user-copy">
                    <strong>{{ getReviewerName(item) }}</strong>
                    <span>{{ formatDateTime(item.createTime) }}</span>
                  </div>
                </div>
                <div class="review-score">
                  <el-rate :model-value="Number(item.score || 0)" disabled text-color="#ff9900" />
                  <span class="review-level" :class="reviewLevelClass(item.score)">
                    {{ reviewLevelText(item.score) }}
                  </span>
                </div>
              </div>

              <p class="review-content" :class="{ empty: !item.content }">
                {{ item.content || '该用户未填写文字评价。' }}
              </p>

              <div v-if="getReviewImages(item).length" class="review-images">
                <el-image
                  v-for="(url, index) in getReviewImages(item)"
                  :key="`${item.id}-${url}-${index}`"
                  :src="url"
                  :preview-src-list="getReviewImages(item)"
                  :initial-index="index"
                  fit="cover"
                  preview-teleported
                  class="review-thumb"
                />
              </div>
            </article>
          </div>

          <MarketplaceEmptyState
            v-else
            title="暂无评价"
            description="当前商品还没有评价记录，完成交易后买家可提交评价。"
          />
        </div>

        <el-pagination
          v-if="reviewTotal > reviewPageSize"
          class="review-pager"
          background
          layout="prev, pager, next"
          :current-page="reviewPage"
          :page-size="reviewPageSize"
          :total="reviewTotal"
          @current-change="onReviewPageChange"
        />
      </section>

      <section class="recommend-panel zz-white-panel">
        <div class="section-head">
          <div>
            <h2>为你推荐</h2>
            <p>同类商品继续逛，看看还有没有更合适的选择。</p>
          </div>
        </div>

        <div v-if="recommendGoods.length" class="recommend-grid">
          <MarketplaceProductCard
            v-for="item in recommendGoods"
            :key="item.id"
            :item="item"
            compact
            @click="goDetail"
          />
        </div>

        <MarketplaceEmptyState
          v-else
          title="暂无推荐商品"
          description="当前分类下的其他商品暂时不多，稍后再来看看。"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.seller-banner,
.detail-main,
.review-panel,
.recommend-panel {
  padding: 18px;
}

.seller-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.seller-banner__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.seller-avatar-btn {
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.seller-avatar-btn:hover {
  transform: translateY(-1px);
}

.seller-copy h2 {
  font-size: 30px;
  color: var(--zz-black);
}

.seller-copy p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
}

.seller-copy .seller-score {
  color: #5f6f7c;
}

.detail-main {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 22px;
}

.gallery-panel {
  display: grid;
  gap: 14px;
}

.gallery-main {
  border-radius: 24px;
  overflow: hidden;
  background: #f7f7f7;
  aspect-ratio: 1 / 1;
}

.gallery-main img,
.gallery-empty {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-empty {
  display: grid;
  place-items: center;
  color: var(--zz-text-light);
}

.gallery-thumbs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.thumb-item {
  padding: 0;
  border: 2px solid transparent;
  border-radius: 16px;
  overflow: hidden;
  background: #f7f7f7;
  cursor: pointer;
}

.thumb-item.is-active {
  border-color: var(--zz-yellow);
}

.thumb-item img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.summary-panel {
  display: grid;
  align-content: start;
  gap: 16px;
}

.summary-panel h1 {
  font-size: clamp(30px, 3vw, 42px);
  line-height: 1.15;
  color: var(--zz-black);
}

.price-block {
  padding: 18px 20px;
  border-radius: 22px;
  background: #fff7da;
  display: grid;
  gap: 8px;
}

.price-block strong {
  font-size: 44px;
  line-height: 1;
  color: #ff5a26;
}

.price-block span {
  color: var(--zz-text-secondary);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.selling-tag {
  padding: 8px 14px;
  border-radius: 999px;
  background: #f5f5f5;
  color: var(--zz-text);
  font-size: 14px;
}

.desc-box {
  padding: 18px;
  border: 1px solid var(--zz-border);
  border-radius: 22px;
  background: #fff;
  display: grid;
  gap: 10px;
}

.desc-box h3 {
  font-size: 20px;
}

.desc-box p {
  color: var(--zz-text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-grid article {
  padding: 16px;
  border-radius: 20px;
  background: #fafafa;
  border: 1px solid var(--zz-border);
}

.meta-grid span {
  display: block;
  color: var(--zz-text-light);
  font-size: 13px;
}

.meta-grid strong {
  display: block;
  margin-top: 8px;
  color: var(--zz-black);
  font-size: 20px;
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.order-tip {
  margin: -4px 0 0;
  color: #d14444;
  font-size: 13px;
}

.section-head h2 {
  font-size: 28px;
}

.section-head p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
}

.review-wrap {
  margin-top: 18px;
}

.review-list {
  display: grid;
  gap: 14px;
}

.review-item {
  padding: 16px;
  border: 1px solid var(--zz-border);
  border-radius: 18px;
  background: #fafafa;
  display: grid;
  gap: 10px;
}

.review-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.review-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-user-copy {
  display: grid;
  gap: 4px;
}

.review-user-copy strong {
  color: var(--zz-black);
  font-size: 15px;
}

.review-user-copy span {
  font-size: 12px;
  color: var(--zz-text-light);
}

.review-level {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.review-level.level-good {
  color: #1f9f59;
  background: #e9f8ef;
}

.review-level.level-neutral {
  color: #d07f21;
  background: #fff3e3;
}

.review-level.level-bad {
  color: #d14444;
  background: #ffeaea;
}

.review-content {
  margin: 0;
  color: var(--zz-text);
  line-height: 1.75;
  white-space: pre-wrap;
}

.review-content.empty {
  color: var(--zz-text-light);
}

.review-images {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.review-thumb {
  width: 88px;
  height: 88px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--zz-border);
}

.review-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.review-pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.recommend-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1320px) {
  .recommend-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .detail-main {
    grid-template-columns: 1fr;
  }

  .review-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-score {
    align-items: flex-start;
    flex-direction: column;
  }

  .recommend-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .seller-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .gallery-thumbs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .meta-grid,
  .recommend-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-pager {
    justify-content: center;
  }
}
</style>
