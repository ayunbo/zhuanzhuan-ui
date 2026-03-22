<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'
import { cancelOrder, completeOrder, getOrderPage } from '@/api/order'
import { formatCurrency, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const typeValue = computed(() => {
  const raw = Array.isArray(route.query.type) ? route.query.type[0] : route.query.type
  return raw === 'sell' ? 'sell' : 'buy'
})

const menuKey = computed(() => (typeValue.value === 'sell' ? 'sold' : 'bought'))
const activeTab = ref('all')

const statusMap = {
  all: null,
  pendingPay: 0,
  paid: 1,
  finished: 2,
  canceled: 3,
  timeoutClosed: 4,
}

const statusTextMap = {
  0: '待支付',
  1: '已支付',
  2: '已完成',
  3: '已取消',
  4: '超时关闭',
}

const routeSummary = computed(() => [
  {
    label: '视图',
    value: typeValue.value === 'sell' ? '我卖出的订单' : '我买到的订单',
  },
  {
    label: '筛选',
    value: activeTab.value === 'all' ? '全部订单' : tabs.find((item) => item.name === activeTab.value)?.label || '全部订单',
  },
  {
    label: '总数',
    value: `${total.value} 条`,
  },
])

const tabs = [
  { name: 'all', label: '全部订单' },
  { name: 'pendingPay', label: '待付款' },
  { name: 'paid', label: '已支付' },
  { name: 'finished', label: '已完成' },
  { name: 'canceled', label: '已取消' },
]

function getStatusText(status) {
  return statusTextMap[status] || '未知状态'
}

function getTagType(status) {
  if (status === 0) return 'warning'
  if (status === 1) return 'success'
  if (status === 2) return ''
  if (status === 3 || status === 4) return 'info'
  return 'info'
}

async function loadOrders() {
  loading.value = true
  try {
    const data = await getOrderPage({
      page: page.value,
      pageSize: pageSize.value,
      type: typeValue.value === 'sell' ? 2 : 1,
      ...(statusMap[activeTab.value] !== null ? { status: statusMap[activeTab.value] } : {}),
    })
    orders.value = data?.records || []
    total.value = Number(data?.total || 0)
  } catch (error) {
    orders.value = []
    total.value = 0
    ElMessage.error(error.message || '订单列表加载失败')
  } finally {
    loading.value = false
  }
}

function goDetail(order) {
  router.push(`/order/detail/${order.id}`)
}

function goPay(order) {
  router.push({
    path: '/pay',
    query: {
      orderId: String(order.id),
      goodsTitle: order.goodsTitle || '',
      amount: String(order.amount || ''),
    },
  })
}

async function handleCancel(order) {
  try {
    await ElMessageBox.confirm('确认取消当前订单吗？', '取消订单', {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      type: 'warning',
    })
    await cancelOrder(order.id)
    ElMessage.success('订单已取消')
    loadOrders()
  } catch {
    // 用户取消或请求失败已提示
  }
}

async function handleComplete(order) {
  try {
    await ElMessageBox.confirm('确认本次交易已经完成吗？', '确认完成', {
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await completeOrder(order.id)
    ElMessage.success('订单已完成')
    loadOrders()
  } catch {
    // 用户取消或请求失败已提示
  }
}

watch([typeValue, activeTab, page], () => {
  loadOrders()
})

onMounted(loadOrders)
</script>

<template>
  <div class="order-page zz-page">
    <section class="order-banner zz-card">
      <div class="banner-copy">
        <p>ORDER CENTER</p>
        <h1>订单中心</h1>
        <span>当前页面只保留状态筛选、路由摘要和空态，占位等待订单列表接口接入。</span>
      </div>

      <div class="banner-meta">
        <article v-for="item in routeSummary" :key="item.label" class="banner-stat">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <div class="order-layout zz-two-column">
      <aside class="order-side">
        <MarketplaceUserSidebar :activeKey="menuKey" />
      </aside>

      <main class="order-main">
        <el-card class="order-center-card" shadow="never">
          <div class="panel-head">
            <div>
              <h2>订单列表</h2>
              <p>这里展示当前账号的真实订单数据，并根据订单状态给出可执行操作。</p>
            </div>
            <el-tag round type="success">已接入</el-tag>
          </div>

          <el-tabs v-model="activeTab" class="order-tabs">
            <el-tab-pane v-for="tab in tabs" :key="tab.name" :label="tab.label" :name="tab.name" />
          </el-tabs>

          <div v-loading="loading" class="list-wrap">
            <div v-if="orders.length" class="order-list">
              <article v-for="item in orders" :key="item.id" class="order-item">
                <div class="order-cover">
                  <img v-if="item.goodsCover" :src="item.goodsCover" :alt="item.goodsTitle" />
                  <div v-else class="cover-empty">暂无封面</div>
                </div>

                <div class="order-copy">
                  <div class="order-top">
                    <div>
                      <h3>{{ item.goodsTitle || '未命名商品' }}</h3>
                      <p>订单号：{{ item.orderNo }}</p>
                    </div>
                    <el-tag round :type="getTagType(item.status)">{{ getStatusText(item.status) }}</el-tag>
                  </div>

                  <div class="order-meta">
                    <span>金额：{{ formatCurrency(item.amount) }}</span>
                    <span>交易地点：{{ item.meetLocation || '未填写' }}</span>
                    <span>交易时间：{{ formatDateTime(item.meetTime) }}</span>
                    <span>创建时间：{{ formatDateTime(item.createTime) }}</span>
                  </div>

                  <div class="order-actions">
                    <el-button @click="goDetail(item)">查看详情</el-button>
                    <el-button v-if="item.status === 0 && typeValue !== 'sell'" type="primary" @click="goPay(item)">
                      去支付
                    </el-button>
                    <el-button v-if="item.status === 0 && typeValue !== 'sell'" danger plain @click="handleCancel(item)">
                      取消订单
                    </el-button>
                    <el-button v-if="item.status === 1 && typeValue !== 'sell'" type="success" @click="handleComplete(item)">
                      确认完成
                    </el-button>
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="empty-wrap">
              <el-empty description="当前没有符合条件的订单" />
            </div>
          </div>

          <div class="route-strip">
            <article v-for="item in routeSummary" :key="`strip-${item.label}`" class="route-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <el-pagination
            v-if="total > pageSize"
            class="pager"
            background
            layout="prev, pager, next"
            :current-page="page"
            :page-size="pageSize"
            :total="total"
            @current-change="page = $event"
          />
        </el-card>
      </main>
    </div>
  </div>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 16px;
}

.order-banner {
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

.order-layout {
  align-items: start;
}

.order-side {
  position: sticky;
  top: 146px;
}

.order-main {
  min-width: 0;
}

.order-center-card {
  border-radius: 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2 {
  font-size: 20px;
  color: var(--zz-black);
}

.panel-head p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
  line-height: 1.6;
  font-size: 13px;
}

.order-tabs {
  margin-top: 14px;
}

.list-wrap {
  min-height: 240px;
}

.order-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.order-item {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 16px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
}

.order-cover {
  border-radius: 16px;
  overflow: hidden;
  background: #f2f2f2;
  aspect-ratio: 1 / 1;
}

.order-cover img,
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

.order-copy {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.order-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.order-top h3 {
  font-size: 18px;
  color: var(--zz-black);
}

.order-top p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.order-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.empty-wrap {
  padding: 14px 0 4px;
}

.empty-copy {
  display: grid;
  gap: 6px;
  text-align: center;
}

.empty-copy strong {
  font-size: 18px;
  color: var(--zz-black);
}

.empty-copy span {
  color: var(--zz-text-secondary);
  line-height: 1.65;
}

.route-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 6px;
}

.route-item {
  border: 1px solid var(--zz-border);
  border-radius: 18px;
  background: #fafafa;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
}

.route-item span {
  font-size: 12px;
  color: var(--zz-text-light);
}

.route-item strong {
  font-size: 14px;
  color: var(--zz-black);
}

.pager {
  margin-top: 18px;
  justify-content: flex-end;
}

@media (max-width: 1080px) {
  .order-banner {
    grid-template-columns: 1fr;
  }

  .order-side {
    position: static;
  }
}

@media (max-width: 760px) {
  .order-item {
    grid-template-columns: 1fr;
  }

  .banner-meta,
  .route-strip {
    grid-template-columns: 1fr;
  }
}
</style>
