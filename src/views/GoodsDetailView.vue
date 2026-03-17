<template>
  <div class="page" v-if="goodsInfo">
    <div class="detail-container">
      <div class="left">
        <div class="image-wrapper">
          <img :src="goodsInfo.cover" class="cover" />
          <div v-if="goodsInfo.status !== 3" class="sold-mask">已售出</div>
        </div>
      </div>

      <div class="right">
        <h1 class="title">{{ goodsInfo.title }}</h1>
        <div class="price">￥{{ goodsInfo.price }}</div>

        <div class="meta-list">
          <div class="meta-item">
            <span class="label">交易地点</span>
            <span class="value">{{ goodsInfo.location }}</span>
          </div>
          <div class="meta-item">
            <span class="label">商品状态</span>
            <span :class="goodsInfo.status === 3 ? 'on-sale' : 'sold-text'">
              {{ formatStatus(goodsInfo.status) }}
            </span>
          </div>
        </div>

        <div class="action-box">
          <button
            class="order-btn"
            :disabled="goodsInfo.status !== 3"
            @click="goCreateOrder"
          >
            {{ goodsInfo.status === 3 ? '去下单' : '商品已售出' }}
          </button>
        </div>
      </div>
    </div>

    <div class="review-panel">
      <div class="review-header">
        <h2>商品评价</h2>
        <span>共 {{ reviewTotal }} 条</span>
      </div>

      <div v-if="reviewLoading" class="review-empty">评价加载中...</div>
      <div v-else-if="reviewList.length === 0" class="review-empty">暂无评价</div>

      <div v-else class="review-list">
        <article v-for="item in reviewList" :key="item.id" class="review-card">
          <div class="review-top">
            <strong>{{ displayReviewerName(item) }}</strong>
            <span>{{ item.createTime || '--' }}</span>
          </div>
          <p class="review-score">评分：{{ item.score }} 分</p>
          <p class="review-content">{{ item.content || '该用户未填写评价内容' }}</p>
          <div v-if="parseReviewImages(item.images).length" class="review-images">
            <el-image
              v-for="(url, index) in parseReviewImages(item.images)"
              :key="`${item.id}-${index}`"
              :src="url"
              :preview-src-list="parseReviewImages(item.images)"
              :initial-index="index"
              fit="cover"
              preview-teleported
              class="review-thumb"
            />
          </div>
        </article>
      </div>

      <div v-if="reviewTotal > reviewQuery.pageSize" class="review-pagination">
        <button :disabled="reviewQuery.page <= 1" @click="prevReviewPage">上一页</button>
        <span>第 {{ reviewQuery.page }} 页</span>
        <button :disabled="reviewQuery.page * reviewQuery.pageSize >= reviewTotal" @click="nextReviewPage">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsById } from '@/api/goods'
import { getGoodsReviewPage } from '@/api/review'

const route = useRoute()
const router = useRouter()

const goodsInfo = ref(null)
const reviewLoading = ref(false)
const reviewList = ref([])
const reviewTotal = ref(0)

const reviewQuery = ref({
  page: 1,
  pageSize: 10,
})

const formatStatus = (status) => {
  if (status === 3) return '在售'
  if (status === 4) return '已锁定'
  if (status === 5) return '已售出'
  return '未知状态'
}

const parseReviewImages = (images) => {
  if (!images) return []
  return String(images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const displayReviewerName = (item) => {
  if (Number(item?.anonymous) === 1) {
    return '匿名'
  }
  return item?.reviewerName || '未知用户'
}

const loadGoods = async () => {
  const id = Number(route.params.id)
  const res = await getGoodsById(id)
  goodsInfo.value = res?.data?.data ?? res?.data ?? res
}

const loadReviews = async () => {
  const goodsId = Number(route.params.id)
  reviewLoading.value = true
  try {
    const data = await getGoodsReviewPage(goodsId, {
      page: reviewQuery.value.page,
      pageSize: reviewQuery.value.pageSize,
    })
    reviewList.value = data?.records || []
    reviewTotal.value = data?.total || 0
  } catch {
    reviewList.value = []
    reviewTotal.value = 0
  } finally {
    reviewLoading.value = false
  }
}

const prevReviewPage = async () => {
  if (reviewQuery.value.page <= 1) return
  reviewQuery.value.page -= 1
  await loadReviews()
}

const nextReviewPage = async () => {
  if (reviewQuery.value.page * reviewQuery.value.pageSize >= reviewTotal.value) return
  reviewQuery.value.page += 1
  await loadReviews()
}

const goCreateOrder = () => {
  if (!goodsInfo.value || goodsInfo.value.status !== 3) {
    alert('商品已售出')
    return
  }

  router.push({
    path: '/order/create',
    query: {
      goodsId: goodsInfo.value.id,
    },
  })
}

onMounted(async () => {
  await loadGoods()
  await loadReviews()
})
</script>

<style scoped>
.page {
  padding: 28px;
  background: #f7f8fa;
  min-height: 100vh;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 36px;
}

.left {
  width: 460px;
}

.image-wrapper {
  position: relative;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.cover {
  width: 100%;
  display: block;
}

.sold-mask {
  position: absolute;
  top: 18px;
  right: 18px;
  background: rgba(0, 0, 0, 0.68);
  color: #fff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.right {
  flex: 1;
}

.title {
  margin: 4px 0 18px;
  font-size: 36px;
  font-weight: 700;
  color: #222;
}

.price {
  font-size: 42px;
  color: #e4393c;
  font-weight: 700;
  margin-bottom: 22px;
}

.meta-list {
  background: #fff;
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  margin-bottom: 22px;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.label {
  width: 90px;
  color: #888;
  font-size: 15px;
}

.value {
  color: #333;
  font-size: 15px;
}

.on-sale {
  color: #67c23a;
  font-weight: 600;
}

.sold-text {
  color: #e4393c;
  font-weight: 600;
}

.action-box {
  margin-top: 24px;
}

.order-btn {
  min-width: 180px;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff, #2f7df6);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.order-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

.review-panel {
  max-width: 1200px;
  margin: 20px auto 0;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.review-header h2 {
  margin: 0;
  font-size: 24px;
}

.review-empty {
  color: #777;
  padding: 12px 0;
}

.review-list {
  display: grid;
  gap: 10px;
}

.review-card {
  border: 1px solid #eceef3;
  border-radius: 12px;
  padding: 12px;
}

.review-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.review-top strong {
  color: #1f2937;
}

.review-top span {
  color: #6b7280;
  font-size: 13px;
}

.review-score {
  color: #b45309;
  margin: 8px 0 4px;
}

.review-content {
  color: #374151;
  margin: 0;
}

.review-images {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-thumb {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.review-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.review-pagination {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.review-pagination button {
  height: 34px;
  border: none;
  border-radius: 8px;
  padding: 0 12px;
  background: #409eff;
  color: #fff;
  cursor: pointer;
}

.review-pagination button:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .detail-container {
    flex-direction: column;
  }

  .left {
    width: 100%;
  }
}
</style>
