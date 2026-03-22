<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'

const route = useRoute()

function toText(value, fallback = '-') {
  if (Array.isArray(value)) {
    return toText(value[0], fallback)
  }
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  return String(value)
}

const menuKey = computed(() => (toText(route.query.type, 'buy') === 'sell' ? 'sold' : 'bought'))
const activeTab = ref('all')

const routeSummary = computed(() => [
  {
    label: '视图',
    value: toText(route.query.type, 'buy') === 'sell' ? '我卖出的订单' : '我买到的订单',
  },
  {
    label: '状态',
    value: toText(route.query.status, '全部'),
  },
  {
    label: '备注',
    value: toText(route.query.note, '暂无'),
  },
])

const tabs = [
  { name: 'all', label: '全部订单' },
  { name: 'pendingPay', label: '待付款' },
  { name: 'pendingShip', label: '待发货' },
  { name: 'pendingReceive', label: '待收货' },
  { name: 'finished', label: '已完成' },
]
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
              <p>筛选器已经预留，等后端订单接口补齐后，这里再渲染真实列表。</p>
            </div>
            <el-tag round type="warning">待接入</el-tag>
          </div>

          <el-tabs v-model="activeTab" class="order-tabs">
            <el-tab-pane v-for="tab in tabs" :key="tab.name" :label="tab.label" :name="tab.name" />
          </el-tabs>

          <div class="empty-wrap">
            <el-empty description="订单列表接口尚未接入">
              <template #description>
                <div class="empty-copy">
                  <strong>这里先保留壳子</strong>
                  <span>不加载假数据，不模拟按钮流，只等真实订单接口上线后再填充。</span>
                </div>
              </template>
            </el-empty>
          </div>

          <div class="route-strip">
            <article v-for="item in routeSummary" :key="`strip-${item.label}`" class="route-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <el-alert
            class="order-note"
            title="说明"
            type="info"
            :closable="false"
            show-icon
            description="当前页面不发起任何订单请求，也不制造伪列表，后续只需要接入数据源即可。"
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

.order-note {
  margin-top: 16px;
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
  .banner-meta,
  .route-strip {
    grid-template-columns: 1fr;
  }
}
</style>
