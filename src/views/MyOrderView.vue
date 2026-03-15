<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cancelOrder, completeOrder, getOrderPage } from '@/api/order'

const router = useRouter()

const defaultCover = 'https://via.placeholder.com/120x120?text=Goods'
const loading = ref(false)
const orderList = ref([])
const total = ref(0)

// 中文注释：type 为 1 表示买到的订单，2 表示卖出的订单。
const query = ref({
  page: 1,
  pageSize: 10,
  type: 1,
  status: '',
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

async function loadOrderList() {
  loading.value = true
  try {
    const params = {
      page: query.value.page,
      pageSize: query.value.pageSize,
      type: query.value.type,
    }

    if (query.value.status !== '' && query.value.status !== null) {
      params.status = query.value.status
    }

    const data = await getOrderPage(params)
    orderList.value = data?.records || data?.result || data?.list || []
    total.value = data?.total || 0
  } catch (error) {
    ElMessage.error(error.message || '获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function switchType(type) {
  query.value.type = type
  query.value.page = 1
  loadOrderList()
}

function prevPage() {
  if (query.value.page <= 1) return
  query.value.page--
  loadOrderList()
}

function nextPage() {
  if (query.value.page * query.value.pageSize >= total.value) return
  query.value.page++
  loadOrderList()
}

function goDetail(id) {
  router.push(`/order/detail/${id}`)
}

function goPay(item) {
  router.push({
    path: '/pay',
    query: {
      orderId: String(item.id),
      goodsTitle: item.goodsTitle || '',
      amount: item.amount || '',
    },
  })
}

async function handleCancel(id) {
  const ok = window.confirm('确定要取消该订单吗？')
  if (!ok) return

  try {
    await cancelOrder(id)
    ElMessage.success('订单已取消')
    loadOrderList()
  } catch (error) {
    ElMessage.error(error.message || '取消订单失败')
  }
}

async function handleComplete(id) {
  const ok = window.confirm('确认已收货并完成订单吗？')
  if (!ok) return

  try {
    await completeOrder(id)
    ElMessage.success('订单已完成')
    loadOrderList()
  } catch (error) {
    ElMessage.error(error.message || '确认完成失败')
  }
}

onMounted(() => {
  loadOrderList()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>我的订单</h2>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: query.type === 1 }" @click="switchType(1)">
          我买到的
        </button>
        <button class="tab-btn" :class="{ active: query.type === 2 }" @click="switchType(2)">
          我卖出的
        </button>
      </div>

      <div class="status-filter">
        <select v-model="query.status" @change="loadOrderList">
          <option value="">全部状态</option>
          <option :value="0">待支付</option>
          <option :value="1">已支付</option>
          <option :value="2">已完成</option>
          <option :value="3">已取消</option>
          <option :value="4">超时关闭</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">订单加载中...</div>
    <div v-else-if="orderList.length === 0" class="empty">暂无订单数据</div>

    <div v-else class="order-list">
      <div v-for="item in orderList" :key="item.id" class="order-card">
        <div class="left">
          <img :src="item.goodsCover || defaultCover" class="cover" />
        </div>

        <div class="center">
          <div class="title-row">
            <h3>{{ item.goodsTitle }}</h3>
            <span class="status-tag" :class="statusClass(item.status)">
              {{ formatOrderStatus(item.status) }}
            </span>
          </div>

          <p>订单号：{{ item.orderNo }}</p>
          <p>订单金额：￥{{ item.amount }}</p>
          <p>交易地点：{{ item.meetLocation || '未填写' }}</p>
          <p>交易时间：{{ item.meetTime || '未填写' }}</p>
          <p>创建时间：{{ item.createTime || '未记录' }}</p>
        </div>

        <div class="right">
          <button class="btn detail-btn" @click="goDetail(item.id)">查看详情</button>

          <button
            v-if="query.type === 1 && item.status === 0"
            class="btn pay-btn"
            @click="goPay(item)"
          >
            去支付
          </button>

          <button
            v-if="query.type === 1 && item.status === 0"
            class="btn cancel-btn"
            @click="handleCancel(item.id)"
          >
            取消订单
          </button>

          <button
            v-if="query.type === 1 && item.status === 1"
            class="btn complete-btn"
            @click="handleComplete(item.id)"
          >
            确认完成
          </button>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pager">
      <button class="page-btn" :disabled="query.page <= 1" @click="prevPage">上一页</button>
      <span>第 {{ query.page }} 页</span>
      <button class="page-btn" :disabled="query.page * query.pageSize >= total" @click="nextPage">
        下一页
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: #f6f8fb;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
  font-size: 30px;
}

.tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: #eef2f7;
  cursor: pointer;
}

.tab-btn.active {
  background: #409eff;
  color: #fff;
}

.status-filter select {
  height: 38px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  padding: 0 12px;
}

.loading,
.empty {
  text-align: center;
  color: #888;
  padding: 40px 0;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  display: flex;
  gap: 18px;
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.left {
  width: 120px;
  flex-shrink: 0;
}

.cover {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
}

.center {
  flex: 1;
}

.center p {
  margin: 8px 0;
  color: #555;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title-row h3 {
  margin: 0;
  font-size: 20px;
}

.status-tag {
  padding: 6px 12px;
  border-radius: 14px;
  font-size: 12px;
  white-space: nowrap;
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

.right {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  height: 36px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.detail-btn {
  background: #f2f3f5;
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

.pager {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  gap: 16px;
  align-items: center;
}

.page-btn {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: #409eff;
  color: #fff;
}

.page-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}
</style>
