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

const goodsDraft = computed(() => ({
  goodsId: pick(route.query.goodsId),
  goodsTitle: pick(route.query.goodsTitle),
  goodsCover: pick(route.query.goodsCover, ''),
  amount: pick(route.query.amount),
  sellerName: pick(route.query.sellerName),
  location: pick(route.query.location),
  source: pick(route.query.source, '商品详情'),
}))

function goBack() {
  const id = goodsDraft.value.goodsId
  if (id && id !== '-') {
    router.push(`/goods/${id}`)
    return
  }

  router.push('/goods')
}
</script>

<template>
  <div class="order-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>ORDER DRAFT</p>
        <h1>创建订单</h1>
        <span>页面已搭好，只保留从路由带入的真实商品信息，不会发起任何下单请求。</span>
      </div>
      <el-tag round type="warning">待接入</el-tag>
    </section>

    <div class="order-layout zz-two-column">
      <main class="order-main">
        <el-card class="preview-card" shadow="never">
          <div class="preview-media">
            <img v-if="goodsDraft.goodsCover && goodsDraft.goodsCover !== '-'" :src="goodsDraft.goodsCover" alt="商品封面" />
            <div v-else class="preview-empty">商品封面占位</div>
          </div>

          <div class="preview-copy">
            <div class="preview-title">
              <h2>{{ goodsDraft.goodsTitle }}</h2>
              <span>来源：{{ goodsDraft.source }}</span>
            </div>

            <div class="price-row">
              <strong>￥{{ goodsDraft.amount }}</strong>
              <span>订单金额</span>
            </div>

            <div class="preview-tags">
              <el-tag round>{{ goodsDraft.sellerName }}</el-tag>
              <el-tag round type="info">{{ goodsDraft.location }}</el-tag>
            </div>
          </div>
        </el-card>
      </main>

      <aside class="order-side">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>路由信息</h3>
              <el-tag round>只读</el-tag>
            </div>
          </template>

          <dl class="info-list">
            <div>
              <dt>商品 ID</dt>
              <dd>{{ goodsDraft.goodsId }}</dd>
            </div>
            <div>
              <dt>商品标题</dt>
              <dd>{{ goodsDraft.goodsTitle }}</dd>
            </div>
            <div>
              <dt>卖家</dt>
              <dd>{{ goodsDraft.sellerName }}</dd>
            </div>
            <div>
              <dt>交易地点</dt>
              <dd>{{ goodsDraft.location }}</dd>
            </div>
          </dl>
        </el-card>

        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>接入说明</h3>
            </div>
          </template>

          <ol class="step-list">
            <li>
              <strong>商品信息已读取</strong>
              <span>标题、封面、金额和卖家均来自路由参数。</span>
            </li>
            <li>
              <strong>订单接口未接入</strong>
              <span>当前不提交订单，不模拟支付，也不造假列表。</span>
            </li>
            <li>
              <strong>后续只补真实链路</strong>
              <span>等后端打通后，再把这里接成正式下单页。</span>
            </li>
          </ol>
        </el-card>

        <el-alert
          title="提示"
          type="warning"
          :closable="false"
          show-icon
          description="这是一个正式壳子页面，当前只保留路由带入的信息和返回能力。"
        />
      </aside>
    </div>

    <div class="page-actions">
      <el-button type="primary" @click="goBack">返回商品详情</el-button>
    </div>
  </div>
</template>

<style scoped>
.order-page {
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

.order-layout {
  align-items: start;
}

.preview-card,
.panel-card {
  border-radius: 24px;
}

.preview-card {
  display: grid;
  gap: 16px;
}

.preview-media {
  border-radius: 20px;
  overflow: hidden;
  background: #fafafa;
  aspect-ratio: 16 / 10;
}

.preview-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--zz-text-light);
  font-size: 14px;
}

.preview-copy {
  display: grid;
  gap: 12px;
}

.preview-title {
  display: grid;
  gap: 6px;
}

.preview-title h2 {
  font-size: 26px;
  line-height: 1.2;
  color: var(--zz-black);
}

.preview-title span {
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price-row strong {
  font-size: 32px;
  color: #222;
}

.price-row span {
  color: var(--zz-text-light);
  font-size: 12px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-side {
  display: grid;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h3 {
  font-size: 18px;
  color: var(--zz-black);
}

.info-list {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-list div {
  border-radius: 16px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  padding: 12px;
}

.info-list dt {
  font-size: 12px;
  color: var(--zz-text-light);
}

.info-list dd {
  margin-top: 6px;
  color: var(--zz-black);
  font-weight: 600;
  line-height: 1.45;
  word-break: break-all;
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

.page-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .order-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-list {
    grid-template-columns: 1fr;
  }

  .page-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
