<template>
  <div class="page" v-if="goodsInfo">
    <div class="detail-container">
      <div class="left">
        <div class="image-wrapper">
          <img :src="goodsInfo.cover" class="cover" />
          <div v-if="goodsInfo.status !== 3" class="sold-mask">已售出</div>
        </div>
      </div>

      <div class="right">
        <h1 class="title">{{ goodsInfo.title }}</h1>
        <div class="price">￥{{ goodsInfo.price }}</div>

        <div class="meta-list">
          <div class="meta-item">
            <span class="label">交易地点</span>
            <span class="value">{{ goodsInfo.location }}</span>
          </div>
          <div class="meta-item">
            <span class="label">商品状态</span>
            <span :class="goodsInfo.status === 3 ? 'on-sale' : 'sold-text'">
              {{ formatStatus(goodsInfo.status) }}
            </span>
          </div>
        </div>

        <div class="action-box">
          <button
            class="order-btn"
            :disabled="goodsInfo.status !== 3"
            @click="goCreateOrder"
          >
            {{ goodsInfo.status === 3 ? '去下单' : '商品已售出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsById } from '@/api/order'

const route = useRoute()
const router = useRouter()

const goodsInfo = ref(null)

const formatStatus = (status) => {
  if (status === 3) return '在售'
  if (status === 4) return '已售出'
  if (status === 5) return '已售出'
  return '未知状态'
}

const loadGoods = async () => {
  const id = Number(route.params.id)
  const res = await getGoodsById(id)
  goodsInfo.value = res?.data?.data ?? res?.data ?? res
}

const goCreateOrder = () => {
  if (!goodsInfo.value || goodsInfo.value.status !== 3) {
    alert('商品已售出')
    return
  }

  router.push({
    path: '/order/create',
    query: {
      goodsId: goodsInfo.value.id,
    },
  })
}

onMounted(() => {
  loadGoods()
})
</script>

<style scoped>
.page {
  padding: 28px;
  background: #f7f8fa;
  min-height: 100vh;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 36px;
}

.left {
  width: 460px;
}

.image-wrapper {
  position: relative;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.cover {
  width: 100%;
  display: block;
}

.sold-mask {
  position: absolute;
  top: 18px;
  right: 18px;
  background: rgba(0, 0, 0, 0.68);
  color: #fff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.right {
  flex: 1;
}

.title {
  margin: 4px 0 18px;
  font-size: 36px;
  font-weight: 700;
  color: #222;
}

.price {
  font-size: 42px;
  color: #e4393c;
  font-weight: 700;
  margin-bottom: 22px;
}

.meta-list {
  background: #fff;
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  margin-bottom: 22px;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.label {
  width: 90px;
  color: #888;
  font-size: 15px;
}

.value {
  color: #333;
  font-size: 15px;
}

.on-sale {
  color: #67c23a;
  font-weight: 600;
}

.sold-text {
  color: #e4393c;
  font-weight: 600;
}

.action-box {
  margin-top: 24px;
}

.order-btn {
  min-width: 180px;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff, #2f7df6);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.order-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}
</style>
