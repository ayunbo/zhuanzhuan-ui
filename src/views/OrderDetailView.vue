<template>
  <div class="page" v-if="detail">
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

    <div class="action-bar">
      <button
        v-if="detail.status === 0"
        class="btn pay-btn"
        @click="handlePay"
      >
        去支付
      </button>

      <button
        v-if="detail.status === 0"
        class="btn cancel-btn"
        @click="handleCancel"
      >
        取消订单
      </button>

      <button
        v-if="detail.status === 1"
        class="btn complete-btn"
        @click="handleComplete"
      >
        确认完成
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getOrderDetail,
  cancelOrder,
  completeOrder,
  mockPay,
} from '@/api/order'

const route = useRoute()
const router = useRouter()

const defaultCover = 'https://via.placeholder.com/140x140?text=Goods'
const detail = ref(null)

const formatOrderStatus = (status) => {
  const map = {
    0: '待支付',
    1: '已支付',
    2: '已完成',
    3: '已取消',
    4: '超时关闭',
  }
  return map[status] || '未知状态'
}

const statusClass = (status) => {
  const map = {
    0: 'pending',
    1: 'paid',
    2: 'done',
    3: 'cancel',
    4: 'timeout',
  }
  return map[status] || ''
}

const loadDetail = async () => {
  try {
    const id = Number(route.params.id)
    const res = await getOrderDetail(id)
    detail.value = res?.data?.data ?? res?.data ?? res
  } catch (error) {
    console.error('获取订单详情失败：', error)
    alert('获取订单详情失败')
  }
}

const goBack = () => {
  router.push('/my-order')
}

const handleCancel = async () => {
  const ok = window.confirm('确定要取消该订单吗？')
  if (!ok) return

  try {
    await cancelOrder(detail.value.id)
    alert('取消成功')
    loadDetail()
  } catch (error) {
    console.error('取消订单失败：', error)
    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      '取消订单失败'
    alert(msg)
  }
}

const handleComplete = async () => {
  const ok = window.confirm('确认已收货并完成订单吗？')
  if (!ok) return

  try {
    await completeOrder(detail.value.id)
    alert('订单已完成')
    loadDetail()
  } catch (error) {
    console.error('确认完成失败：', error)
    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      '确认完成失败'
    alert(msg)
  }
}

const handlePay = async () => {
  const ok = window.confirm('确认支付该订单吗？')
  if (!ok) return

  try {
    await mockPay({
      orderId: detail.value.id,
    })
    alert('支付成功')
    loadDetail()
  } catch (error) {
    console.error('支付失败：', error)
    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      '支付失败'
    alert(msg)
  }
}

onMounted(() => {
  loadDetail()
})
</script>

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
</style>
