<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { mockPay } from '@/api/order'

const route = useRoute()
const router = useRouter()

const paying = ref(false)
const selectedMethod = ref('mock')

const orderId = computed(() => route.query.orderId ? Number(route.query.orderId) : null)
const goodsTitle = computed(() => String(route.query.goodsTitle || '当前订单'))
const amount = computed(() => String(route.query.amount || '0'))

const payMethods = [
  {
    value: 'mock',
    title: '模拟支付',
    desc: '保持原有模拟支付流程，适合当前系统联调和基础支付测试。',
    buttonText: '使用模拟支付',
  },
  {
    value: 'wallet',
    title: '虚拟钱包支付',
    desc: '进入独立虚拟钱包收银台，支持钱包余额和绑定银行卡付款。',
    buttonText: '前往虚拟钱包',
  },
]

const activeMethod = computed(() => {
  return payMethods.find((item) => item.value === selectedMethod.value) || payMethods[0]
})

function goBack() {
  if (orderId.value) {
    router.push(`/order/detail/${orderId.value}`)
    return
  }
  router.push('/my-order')
}

async function handlePay() {
  if (!orderId.value) {
    ElMessage.warning('缺少订单编号，无法发起支付')
    return
  }

  if (selectedMethod.value === 'wallet') {
    router.push({
      path: '/wallet',
      query: {
        orderId: String(orderId.value),
        goodsTitle: goodsTitle.value,
        amount: amount.value,
      },
    })
    return
  }

  paying.value = true
  try {
    // 中文注释：模拟支付仍然沿用原来的后端接口，保证旧流程不受影响。
    await mockPay({
      orderId: orderId.value,
    })

    ElMessage.success('支付成功')
    router.push(`/order/detail/${orderId.value}`)
  } catch (error) {
    ElMessage.error(error.message || '支付失败')
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="pay-page">
    <div class="pay-shell">
      <div class="top-bar">
        <button class="ghost-btn" @click="goBack">返回订单</button>
      </div>

      <section class="hero-card">
        <div>
          <p class="eyebrow">Order Payment</p>
          <h1>选择支付方式</h1>
          <p class="hero-desc">
            先确认订单信息，再选择是继续使用模拟支付，还是进入虚拟钱包收银台完成支付。
          </p>
        </div>
        <div class="amount-box">
          <span>应付金额</span>
          <strong>￥{{ amount }}</strong>
          <small>订单 ID：{{ orderId || '--' }}</small>
        </div>
      </section>

      <section class="summary-card">
        <div class="summary-row">
          <span>商品名称</span>
          <strong>{{ goodsTitle }}</strong>
        </div>
        <div class="summary-row">
          <span>支付说明</span>
          <strong>待支付订单仅可选择一种方式完成付款</strong>
        </div>
      </section>

      <section class="method-grid">
        <article
          v-for="item in payMethods"
          :key="item.value"
          class="method-card"
          :class="{ active: selectedMethod === item.value }"
          @click="selectedMethod = item.value"
        >
          <div class="radio-dot"></div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </section>

      <section class="action-card">
        <div class="action-copy">
          <h2>{{ activeMethod.title }}</h2>
          <p>{{ activeMethod.desc }}</p>
        </div>
        <button class="pay-btn" :disabled="paying" @click="handlePay">
          {{ paying ? '支付处理中...' : activeMethod.buttonText }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pay-page {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(64, 158, 255, 0.14), transparent 30%),
    radial-gradient(circle at right bottom, rgba(103, 194, 58, 0.1), transparent 22%),
    linear-gradient(180deg, #f5f8ff 0%, #f8fbf7 100%);
}

.pay-shell {
  max-width: 1080px;
  margin: 0 auto;
}

.top-bar {
  margin-bottom: 16px;
}

.ghost-btn,
.pay-btn {
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

.ghost-btn {
  height: 42px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.8);
  color: #334155;
}

.hero-card,
.summary-card,
.method-card,
.action-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(20, 33, 61, 0.08);
  border-radius: 24px;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-card h1 {
  margin: 0;
  font-size: 36px;
  color: #14213d;
}

.hero-desc {
  max-width: 680px;
  margin: 14px 0 0;
  color: #5b6677;
  line-height: 1.7;
}

.amount-box {
  min-width: 220px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #14213d 0%, #1677ff 100%);
  color: #fff;
}

.amount-box span,
.amount-box strong,
.amount-box small {
  display: block;
}

.amount-box strong {
  margin: 12px 0 8px;
  font-size: 32px;
}

.summary-card {
  margin-top: 16px;
  padding: 20px 24px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #526071;
}

.summary-row + .summary-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #edf2f7;
}

.summary-row strong {
  color: #14213d;
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.method-card {
  position: relative;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.method-card.active {
  border-color: #1677ff;
  box-shadow: 0 14px 30px rgba(22, 119, 255, 0.14);
  transform: translateY(-2px);
}

.radio-dot {
  width: 16px;
  height: 16px;
  margin-bottom: 18px;
  border: 2px solid #b6c2cf;
  border-radius: 999px;
}

.method-card.active .radio-dot {
  border-color: #1677ff;
  box-shadow: inset 0 0 0 4px #1677ff;
}

.method-card h3 {
  margin: 0 0 10px;
  color: #14213d;
  font-size: 22px;
}

.method-card p {
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.action-card {
  margin-top: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.action-copy h2 {
  margin: 0;
  color: #14213d;
}

.action-copy p {
  margin: 10px 0 0;
  color: #6b7280;
}

.pay-btn {
  min-width: 190px;
  height: 48px;
  padding: 0 20px;
  background: linear-gradient(135deg, #16a34a, #67c23a);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.pay-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

@media (max-width: 820px) {
  .hero-card,
  .action-card {
    flex-direction: column;
    align-items: stretch;
  }

  .method-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .pay-page {
    padding: 16px;
  }

  .hero-card,
  .summary-card,
  .method-card,
  .action-card {
    border-radius: 20px;
  }

  .hero-card {
    padding: 24px;
  }

  .hero-card h1 {
    font-size: 28px;
  }
}
</style>
