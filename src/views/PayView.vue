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

const paySummary = computed(() => ({
  orderId: pick(route.query.orderId),
  goodsTitle: pick(route.query.goodsTitle),
  amount: pick(route.query.amount),
  source: pick(route.query.source, '订单创建后跳转'),
}))
</script>

<template>
  <div class="pay-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>PAYMENT SHELL</p>
        <h1>支付页</h1>
        <span>支付通道尚未接入，当前仅展示从路由读取到的订单摘要。</span>
      </div>
      <el-tag round type="warning">待接入</el-tag>
    </section>

    <div class="pay-layout zz-two-column">
      <main class="pay-main">
        <el-card class="pay-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <div>
                <h2>支付信息</h2>
                <p>金额和商品名称来自路由参数，当前不会发起真实支付请求。</p>
              </div>
            </div>
          </template>

          <div class="info-grid">
            <div>
              <label>订单 ID</label>
              <p>{{ paySummary.orderId }}</p>
            </div>
            <div>
              <label>商品名称</label>
              <p>{{ paySummary.goodsTitle }}</p>
            </div>
            <div>
              <label>应付金额</label>
              <p class="price">￥{{ paySummary.amount }}</p>
            </div>
            <div>
              <label>来源</label>
              <p>{{ paySummary.source }}</p>
            </div>
          </div>
        </el-card>
      </main>

      <aside class="pay-side">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>接入说明</h3>
              <el-tag round>只读</el-tag>
            </div>
          </template>

          <ol class="step-list">
            <li>
              <strong>订单信息已读取</strong>
              <span>只保留商品名、金额和订单号等最少字段。</span>
            </li>
            <li>
              <strong>支付通道未上线</strong>
              <span>当前不放任何二维码、按钮或伪支付流程。</span>
            </li>
            <li>
              <strong>回跳订单中心</strong>
              <span>后续接入真正的支付后，再恢复完整交互。</span>
            </li>
          </ol>
        </el-card>

        <el-alert
          title="提示"
          type="warning"
          :closable="false"
          show-icon
          description="这是支付页的正式壳子，当前只负责展示和返回。"
        />
      </aside>
    </div>

    <div class="page-actions">
      <el-button type="primary" @click="router.push('/my-order')">返回订单中心</el-button>
    </div>
  </div>
</template>

<style scoped>
.pay-page {
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

.pay-layout {
  align-items: start;
}

.pay-card,
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-grid div {
  border-radius: 16px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  padding: 12px;
}

.info-grid label {
  display: block;
  font-size: 12px;
  color: var(--zz-text-light);
}

.info-grid p {
  margin-top: 6px;
  color: var(--zz-black);
  font-size: 15px;
  font-weight: 700;
  word-break: break-all;
}

.price {
  font-size: 28px !important;
  color: #222 !important;
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

.pay-side {
  display: grid;
  gap: 16px;
}

.page-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .pay-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .page-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
