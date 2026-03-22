<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function pick(value, fallback = '-') {
  if (Array.isArray(value)) {
    return pick(value[0], fallback)
  }
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  return String(value)
}

const orderSummary = computed(() => ({
  orderId: pick(route.params.id),
  orderNo: pick(route.query.orderNo),
  goodsTitle: pick(route.query.goodsTitle),
  amount: pick(route.query.amount),
  status: pick(route.query.status, '待接入'),
  source: pick(route.query.source, '路由直达'),
}))
</script>

<template>
  <div class="detail-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>ORDER DETAIL</p>
        <h1>订单详情</h1>
        <span>当前仅展示路由带入的最少字段，后端接入后再补充完整详情和状态流转。</span>
      </div>
      <el-tag round type="warning">待接入</el-tag>
    </section>

    <div class="detail-layout zz-two-column">
      <main class="detail-main">
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <div>
                <h2>基础信息</h2>
                <p>所有内容都来自路由参数，没有额外请求和假数据。</p>
              </div>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单 ID">{{ orderSummary.orderId }}</el-descriptions-item>
            <el-descriptions-item label="订单号">{{ orderSummary.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="商品名称">{{ orderSummary.goodsTitle }}</el-descriptions-item>
            <el-descriptions-item label="金额">￥{{ orderSummary.amount }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ orderSummary.status }}</el-descriptions-item>
            <el-descriptions-item label="来源">{{ orderSummary.source }}</el-descriptions-item>
          </el-descriptions>
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
              <strong>详情字段已读取</strong>
              <span>订单号、商品名、金额、状态和来源都来自路由。</span>
            </li>
            <li>
              <strong>订单操作未接入</strong>
              <span>当前不提供取消、支付或完成等伪按钮。</span>
            </li>
            <li>
              <strong>后续补真实接口</strong>
              <span>等后端返回完整详情后，再补充物流和状态历史。</span>
            </li>
          </ol>
        </el-card>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          description="这是订单详情的正式壳子，当前仅保留路由读取和返回入口。"
        />
      </aside>
    </div>

    <div class="page-actions">
      <el-button type="primary" @click="router.push('/my-order')">返回订单中心</el-button>
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

.page-actions {
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

  .page-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
