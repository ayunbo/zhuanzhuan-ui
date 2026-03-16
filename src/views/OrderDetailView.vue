<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cancelOrder, completeOrder, getOrderDetail } from '@/api/order'
import { getOrderReview } from '@/api/review'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const defaultCover = 'https://via.placeholder.com/140x140?text=Goods'
const detail = ref(null)
const orderReview = ref(null)

const canSubmitReview = computed(() => {
  if (!detail.value) return false
  return Number(detail.value.status) === 2
    && !orderReview.value
    && Number(detail.value.buyerId) === Number(authStore.user.id)
})

function formatOrderStatus(status) {
  const map = {
    0: '待支付',
    1: '已支付',
    2: '已完成',
    3: '已取消',
    4: '超时关闭',
  }
  return map[status] || '未知状态'
}

function statusClass(status) {
  const map = {
    0: 'pending',
    1: 'paid',
    2: 'done',
    3: 'cancel',
    4: 'timeout',
  }
  return map[status] || ''
}

async function loadDetail() {
  try {
    const data = await getOrderDetail(Number(route.params.id))
    detail.value = data
  } catch (error) {
    ElMessage.error(error.message || '获取订单详情失败')
  }
}

async function loadOrderReview() {
  try {
    const data = await getOrderReview(Number(route.params.id))
    orderReview.value = data || null
  } catch {
    orderReview.value = null
  }
}

function goBack() {
  router.push('/my-order')
}

function goPay() {
  if (!detail.value?.id) return

  router.push({
    path: '/pay',
    query: {
      orderId: String(detail.value.id),
      goodsTitle: detail.value.goodsTitle || '',
      amount: detail.value.amount || detail.value.goodsPrice || '',
    },
  })
}

async function handleCancel() {
  const ok = window.confirm('确定要取消该订单吗？')
  if (!ok) return

  try {
    await cancelOrder(detail.value.id)
    ElMessage.success('订单已取消')
    await loadDetail()
    await loadOrderReview()
  } catch (error) {
    ElMessage.error(error.message || '取消订单失败')
  }
}

async function handleComplete() {
  const ok = window.confirm('确认已收货并完成订单吗？')
  if (!ok) return

  try {
    await completeOrder(detail.value.id)
    ElMessage.success('订单已完成')
    await loadDetail()
    await loadOrderReview()
  } catch (error) {
    ElMessage.error(error.message || '确认完成失败')
  }
}

function handleSubmitReview() {
  if (!detail.value?.id) return
  router.push({
    path: '/review/create',
    query: {
      orderId: String(detail.value.id),
    },
  })
}

function parseReviewImages(images) {
  if (!images) return []
  return String(images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

onMounted(async () => {
  await loadDetail()
  await loadOrderReview()
})
</script>

<template>
  <div v-if="detail" class="page">
    <div class="header">
      <h2>订单详情</h2>
      <button class="back-btn" @click="goBack">返回订单列表</button>
    </div>

    <div class="card">
      <div class="goods-section">
        <img :src="detail.goodsCover || defaultCover" class="cover" />
        <div class="goods-info">
          <h3>{{ detail.goodsTitle }}</h3>
          <p>订单号：{{ detail.orderNo }}</p>
          <p>商品价格：￥{{ detail.goodsPrice }}</p>
          <p>
            订单状态：
            <span class="status" :class="statusClass(detail.status)">
              {{ formatOrderStatus(detail.status) }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>交易信息</h3>
      <p>交易地点：{{ detail.meetLocation || '未填写' }}</p>
      <p>交易时间：{{ detail.meetTime || '未填写' }}</p>
      <p>备注：{{ detail.remark || '无' }}</p>
    </div>

    <div class="card">
      <h3>买卖双方信息</h3>
      <p>买家：{{ detail.buyerName || '未记录' }} / {{ detail.buyerPhone || '未记录' }}</p>
      <p>卖家：{{ detail.sellerName || '未记录' }} / {{ detail.sellerPhone || '未记录' }}</p>
    </div>

    <div class="card">
      <h3>时间信息</h3>
      <p>创建时间：{{ detail.createTime || '未记录' }}</p>
      <p>支付时间：{{ detail.payTime || '未支付' }}</p>
      <p>完成时间：{{ detail.completeTime || '未完成' }}</p>
      <p>关闭时间：{{ detail.closeTime || '未关闭' }}</p>
    </div>

    <div class="card">
      <h3>订单评价</h3>
      <template v-if="orderReview">
        <p>评分：{{ orderReview.score }} 分</p>
        <p>匿名：{{ Number(orderReview.anonymous) === 1 ? '是' : '否' }}</p>
        <p>内容：{{ orderReview.content || '无' }}</p>
        <div v-if="parseReviewImages(orderReview.images).length" class="review-images">
          <el-image
            v-for="(url, index) in parseReviewImages(orderReview.images)"
            :key="`review-image-${index}`"
            :src="url"
            :preview-src-list="parseReviewImages(orderReview.images)"
            :initial-index="index"
            fit="cover"
            preview-teleported
            class="review-thumb"
          />
        </div>
      </template>
      <p v-else>当前订单暂无评价</p>
    </div>

    <div class="action-bar">
      <button v-if="detail.status === 0" class="btn pay-btn" @click="goPay">
        去支付
      </button>

      <button v-if="detail.status === 0" class="btn cancel-btn" @click="handleCancel">
        取消订单
      </button>

      <button v-if="detail.status === 1" class="btn complete-btn" @click="handleComplete">
        确认完成
      </button>

      <button v-if="canSubmitReview" class="btn review-btn" @click="handleSubmitReview">
        去评价
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
  background: #f6f8fb;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.header h2 {
  margin: 0;
  font-size: 30px;
}

.back-btn {
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: #f2f3f5;
  cursor: pointer;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.card h3 {
  margin-top: 0;
}

.goods-section {
  display: flex;
  gap: 18px;
}

.cover {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
}

.goods-info {
  flex: 1;
}

.goods-info h3 {
  margin: 0 0 10px;
}

.goods-info p,
.card p {
  margin: 8px 0;
  color: #555;
}

.status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.pending {
  background: #fff7e6;
  color: #d48806;
}

.paid {
  background: #e6f7ff;
  color: #1677ff;
}

.done {
  background: #f6ffed;
  color: #389e0d;
}

.cancel {
  background: #fff1f0;
  color: #cf1322;
}

.timeout {
  background: #f5f5f5;
  color: #666;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.pay-btn {
  background: #409eff;
  color: #fff;
}

.cancel-btn {
  background: #ff7875;
  color: #fff;
}

.complete-btn {
  background: #67c23a;
  color: #fff;
}

.review-btn {
  background: #9b6bff;
  color: #fff;
}

.review-images {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-thumb {
  width: 88px;
  height: 88px;
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
</style>
