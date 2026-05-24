<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { mockPay } from '@/api/order'
import { formatCurrency } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const submitting = ref(false)
const payMethod = ref('mock')

const orderId = computed(() => {
  const raw = Array.isArray(route.query.orderId) ? route.query.orderId[0] : route.query.orderId
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
})

const goodsTitle = computed(() => {
  const value = Array.isArray(route.query.goodsTitle) ? route.query.goodsTitle[0] : route.query.goodsTitle
  return value || '当前订单商品'
})

const amountText = computed(() => formatCurrency(route.query.amount || 0))

async function handlePay() {
  if (!orderId.value) {
    ElMessage.warning('缺少订单编号')
    return
  }

  if (payMethod.value === 'wallet') {
    router.push({
      path: '/wallet',
      query: {
        orderId: String(orderId.value),
        goodsTitle: goodsTitle.value,
        amount: String(route.query.amount || ''),
      },
    })
    return
  }

  submitting.value = true
  try {
    // 中文注释：模拟支付仍然沿用原有后端接口，保持你原来的测试流程不变。
    await mockPay({
      orderId: orderId.value,
      requestNo: null,
    })
    ElMessage.success('模拟支付成功')
    router.push(`/order/detail/${orderId.value}`)
  } catch (error) {
    ElMessage.error(error.message || '支付失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="pay-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>PAYMENT CENTER</p>
        <h1>支付中心</h1>
        <span>请选择当前订单的支付方式。模拟支付保持原流程，虚拟钱包支付会跳转到独立钱包页。</span>
      </div>
      <el-tag round type="success">已接入</el-tag>
    </section>

    <div class="pay-layout zz-two-column">
      <main class="pay-main">
        <el-card class="pay-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <div>
                <h2>订单摘要</h2>
                <p>确认商品和金额无误后，再继续选择支付方式。</p>
              </div>
            </div>
          </template>

          <div class="info-grid">
            <div>
              <label>订单 ID</label>
              <p>{{ orderId || '--' }}</p>
            </div>
            <div>
              <label>商品名称</label>
              <p>{{ goodsTitle }}</p>
            </div>
            <div>
              <label>应付金额</label>
              <p class="price">{{ amountText }}</p>
            </div>
            <div>
              <label>支付状态</label>
              <p>待支付</p>
            </div>
          </div>
        </el-card>
      </main>

      <aside class="pay-side">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>支付方式</h3>
              <el-tag round>必选</el-tag>
            </div>
          </template>

          <div class="method-list">
            <button
              type="button"
              class="method-item"
              :class="{ 'is-active': payMethod === 'mock' }"
              @click="payMethod = 'mock'"
            >
              <strong>模拟支付</strong>
              <span>保持原有测试链路，直接调用后端模拟支付接口。</span>
            </button>

            <button
              type="button"
              class="method-item"
              :class="{ 'is-active': payMethod === 'wallet' }"
              @click="payMethod = 'wallet'"
            >
              <strong>虚拟钱包支付</strong>
              <span>进入独立钱包页，登录钱包账户后选择余额或银行卡支付。</span>
            </button>
          </div>

          <el-button type="primary" class="submit-btn" :loading="submitting" @click="handlePay">
            {{ payMethod === 'wallet' ? '前往虚拟钱包页' : submitting ? '支付中...' : '立即支付' }}
          </el-button>
        </el-card>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          description="如果你选择虚拟钱包支付，系统会先跳转到钱包页，再由钱包页读取当前订单并完成付款。"
        />
      </aside>
    </div>

    <div class="page-actions">
      <el-button @click="router.push('/my-order')">返回订单中心</el-button>
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

.method-list {
  display: grid;
  gap: 12px;
}

.method-item {
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
}

.method-item.is-active {
  border-color: var(--zz-yellow);
  background: #fffaf0;
}

.method-item strong {
  font-size: 16px;
  color: var(--zz-black);
}

.method-item span {
  color: var(--zz-text-secondary);
  line-height: 1.55;
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

.pay-side {
  display: grid;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  margin-top: 16px;
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
