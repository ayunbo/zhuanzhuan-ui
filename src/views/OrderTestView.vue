<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Promotion, ShoppingBag, Van } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const goodsId = computed(() => {
  const rawValue = route.query.goodsId
  return typeof rawValue === 'string' && rawValue.trim() ? rawValue : ''
})

function goToOrderCreate() {
  if (goodsId.value) {
    router.push({
      path: '/order/create',
      query: { goodsId: goodsId.value },
    })
    return
  }

  router.push('/goods')
}
</script>

<template>
  <div class="order-test-page">
    <section class="notice-card">
      <div class="notice-badge">
        <el-icon><Promotion /></el-icon>
      </div>
      <div class="notice-copy">
        <p class="eyebrow">Order Flow Update</p>
        <h1>测试下单页已并入正式交易流程</h1>
        <p>
          这个入口保留用于兼容旧链接。新的用户端下单流程已经统一到正式页面，订单能力当前仍处于前端占位阶段。
        </p>
      </div>
    </section>

    <section class="guide-grid">
      <article class="guide-card">
        <div class="guide-icon yellow">
          <el-icon><ShoppingBag /></el-icon>
        </div>
        <h2>继续浏览商品</h2>
        <p>从商品广场进入详情页，再使用新的下单占位页查看后续流程。</p>
        <el-button @click="router.push('/goods')">去商品广场</el-button>
      </article>

      <article class="guide-card">
        <div class="guide-icon dark">
          <el-icon><Van /></el-icon>
        </div>
        <h2>跳转正式入口</h2>
        <p>如果你是从旧链路进入，可以直接跳到新的创建订单页继续查看页面结构。</p>
        <el-button type="primary" @click="goToOrderCreate">前往正式下单页</el-button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.order-test-page {
  display: grid;
  gap: 20px;
}

.notice-card,
.guide-card {
  border-radius: 28px;
  border: 1px solid rgba(22, 22, 22, 0.08);
  background: #fffdf6;
  box-shadow: 0 18px 40px rgba(22, 22, 22, 0.08);
}

.notice-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  padding: 28px;
}

.notice-badge {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  font-size: 28px;
  color: #161616;
  background: linear-gradient(135deg, #ffe34f, #ffcc19);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8b7b42;
}

.notice-copy h1,
.guide-card h2 {
  margin: 0;
  color: #161616;
}

.notice-copy p:last-child,
.guide-card p {
  margin: 12px 0 0;
  color: #5b5642;
  line-height: 1.7;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.guide-card {
  padding: 24px;
  display: grid;
  gap: 12px;
}

.guide-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.guide-icon.yellow {
  background: #ffe16e;
  color: #161616;
}

.guide-icon.dark {
  background: #1f2024;
  color: #ffe14f;
}

@media (max-width: 760px) {
  .notice-card {
    grid-template-columns: 1fr;
  }

  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
