<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cancelOrder, completeOrder, getOrderDetail } from '@/api/order'
import { formatCurrency, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const orderDetail = ref(null)

const orderId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
})

const statusTextMap = {
  0: '待支付',
  1: '已支付',
  2: '已完成',
  3: '已取消',
  4: '超时关闭',
}

const statusText = computed(() => statusTextMap[orderDetail.value?.status] || '未知状态')

function getTagType(status) {
  if (status === 0) return 'warning'
  if (status === 1) return 'success'
  if (status === 2) return ''
  if (status === 3 || status === 4) return 'info'
  return 'info'
}

async function loadOrderDetail() {
  if (!orderId.value) {
    ElMessage.warning('缺少订单编号')
    router.replace('/my-order')
    return
  }

  loading.value = true
  try {
    orderDetail.value = await getOrderDetail(orderId.value)
  } catch (error) {
    ElMessage.error(error.message || '订单详情加载失败')
  } finally {
    loading.value = false
  }
}

function goPay() {
  if (!orderDetail.value) return
  router.push({
    path: '/pay',
    query: {
      orderId: String(orderDetail.value.id),
      goodsTitle: orderDetail.value.goodsTitle || '',
      amount: String(orderDetail.value.amount || ''),
    },
  })
}

async function handleCancel() {
  if (!orderDetail.value) return
  try {
    await ElMessageBox.confirm('确认取消当前订单吗？', '取消订单', {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      type: 'warning',
    })
    await cancelOrder(orderDetail.value.id)
    ElMessage.success('订单已取消')
    loadOrderDetail()
  } catch {
    // ignore
  }
}

async function handleComplete() {
  if (!orderDetail.value) return
  try {
    await ElMessageBox.confirm('确认交易已经完成吗？', '确认完成', {
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await completeOrder(orderDetail.value.id)
    ElMessage.success('订单已完成')
    loadOrderDetail()
  } catch {
    // ignore
  }
}

onMounted(loadOrderDetail)
</script>

<template>
  <div class="detail-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>ORDER DETAIL</p>
        <h1>订单详情</h1>
        <span>这里展示订单的真实详情信息，包括金额、见面时间、联系人和当前订单状态。</span>
      </div>
      <el-tag round type="success">已接入</el-tag>
    </section>

    <div class="detail-layout zz-two-column">
      <main class="detail-main">
        <el-card v-loading="loading" class="detail-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <div>
                <h2>基础信息</h2>
                <p>以下内容全部来自订单详情接口。</p>
              </div>
            </div>
          </template>

          <template v-if="orderDetail">
            <div class="hero-row">
              <div class="goods-block">
                <img v-if="orderDetail.goodsCover" :src="orderDetail.goodsCover" :alt="orderDetail.goodsTitle" />
                <div v-else class="cover-empty">暂无封面</div>
                <div>
                  <h3>{{ orderDetail.goodsTitle || '当前商品' }}</h3>
                  <p>订单号：{{ orderDetail.orderNo }}</p>
                </div>
              </div>
              <el-tag round :type="getTagType(orderDetail.status)">{{ statusText }}</el-tag>
            </div>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="订单 ID">{{ orderDetail.id }}</el-descriptions-item>
              <el-descriptions-item label="订单金额">{{ formatCurrency(orderDetail.amount) }}</el-descriptions-item>
              <el-descriptions-item label="交易地点">{{ orderDetail.meetLocation || '未填写' }}</el-descriptions-item>
              <el-descriptions-item label="交易时间">{{ formatDateTime(orderDetail.meetTime) }}</el-descriptions-item>
              <el-descriptions-item label="买家">{{ orderDetail.buyerName || '未返回' }}</el-descriptions-item>
              <el-descriptions-item label="买家电话">{{ orderDetail.buyerPhone || '未返回' }}</el-descriptions-item>
              <el-descriptions-item label="卖家">{{ orderDetail.sellerName || '未返回' }}</el-descriptions-item>
              <el-descriptions-item label="卖家电话">{{ orderDetail.sellerPhone || '未返回' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(orderDetail.createTime) }}</el-descriptions-item>
              <el-descriptions-item label="支付时间">{{ formatDateTime(orderDetail.payTime) }}</el-descriptions-item>
              <el-descriptions-item label="关闭时间">{{ formatDateTime(orderDetail.closeTime) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ formatDateTime(orderDetail.completeTime) }}</el-descriptions-item>
              <el-descriptions-item label="备注说明" :span="2">{{ orderDetail.remark || '无' }}</el-descriptions-item>
            </el-descriptions>

            <div class="action-row">
              <el-button @click="router.push('/my-order')">返回订单中心</el-button>
              <el-button v-if="orderDetail.status === 0" type="primary" @click="goPay">去支付</el-button>
              <el-button v-if="orderDetail.status === 0" danger plain @click="handleCancel">取消订单</el-button>
              <el-button v-if="orderDetail.status === 1" type="success" @click="handleComplete">确认完成</el-button>
            </div>
          </template>
        </el-card>
      </main>

      <aside class="detail-side">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>接入说明</h3>
              <el-tag round>只读</el-tag>
            </div>
          </template>

          <ol class="step-list">
            <li>
              <strong>详情已接入</strong>
              <span>订单主信息、快照信息和买卖双方联系方式都来自后端接口。</span>
            </li>
            <li>
              <strong>状态操作已接入</strong>
              <span>待支付订单可以继续支付或取消，已支付订单可以确认完成。</span>
            </li>
            <li>
              <strong>保持真实链路</strong>
              <span>这里不会展示假数据，页面行为完全跟随后端订单状态变化。</span>
            </li>
          </ol>
        </el-card>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          description="如果管理员在后台修改了当前订单状态，刷新本页后也会同步看到最新结果。"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  display: grid;
  gap: 16px;
}

.page-head {
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.head-copy {
  display: grid;
  gap: 8px;
}

.head-copy p {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--zz-text-light);
}

.head-copy h1 {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.1;
  color: var(--zz-black);
}

.head-copy span {
  color: var(--zz-text-secondary);
  line-height: 1.65;
}

.detail-layout {
  align-items: start;
}

.detail-card,
.panel-card {
  border-radius: 24px;
}

.hero-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.goods-block {
  display: flex;
  gap: 14px;
}

.goods-block img,
.cover-empty {
  width: 108px;
  height: 108px;
  border-radius: 18px;
  background: #f2f2f2;
  object-fit: cover;
}

.cover-empty {
  display: grid;
  place-items: center;
  color: var(--zz-text-light);
  font-size: 13px;
}

.goods-block h3 {
  font-size: 22px;
  color: var(--zz-black);
}

.goods-block p {
  margin-top: 8px;
  color: var(--zz-text-secondary);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2,
.panel-head h3 {
  font-size: 18px;
  color: var(--zz-black);
}

.panel-head p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
  line-height: 1.6;
  font-size: 13px;
}

.step-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 12px;
}

.step-list li {
  display: grid;
  gap: 4px;
}

.step-list strong {
  font-size: 14px;
  color: var(--zz-black);
}

.step-list span {
  color: var(--zz-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.detail-side {
  display: grid;
  gap: 16px;
}

.action-row {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-row,
  .goods-block,
  .action-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
