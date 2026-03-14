<template>
  <div class="page">
    <div class="pay-card">
      <h2>订单支付</h2>

      <p><strong>订单ID：</strong>{{ orderId }}</p>
      <p><strong>商品名称：</strong>{{ goodsTitle }}</p>
      <p><strong>应付金额：</strong>￥{{ amount }}</p>

      <div class="tips">
        请确认订单信息无误后完成支付
      </div>

      <button class="pay-btn" @click="handleMockPay">立即支付</button>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const orderId = route.query.orderId
const goodsTitle = route.query.goodsTitle
const amount = route.query.amount

const handleMockPay = async () => {
  try {
    await request({
      url: '/user/pay/mock',
      method: 'post',
      data: {
        orderId: Number(orderId),
      },
    })

    alert('支付成功')
    router.push('/')
  } catch (error) {
    console.error(error)
    alert('支付失败')
  }
}
</script>

<style scoped>
.page {
  padding: 40px;
  display: flex;
  justify-content: center;
}

.pay-card {
  width: 420px;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 24px;
  background: #fff;
}

.pay-card h2 {
  margin-bottom: 20px;
}

.pay-card p {
  margin-bottom: 12px;
}

.tips {
  margin: 18px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  color: #666;
}

.pay-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 8px;
  background: #67c23a;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}
</style>
