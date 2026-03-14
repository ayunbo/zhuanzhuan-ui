<template>
  <div class="page">
    <h2 class="title">校园闲置商品</h2>

    <div class="goods-grid">
      <div
        v-for="item in goodsList"
        :key="item.id"
        class="goods-card"
        @click="handleCardClick(item)"
      >
        <div v-if="item.status !== 3" class="sold-mask">已售出</div>

        <img :src="item.cover" class="goods-cover" />
        <div class="goods-info">
          <div class="goods-name">{{ item.title }}</div>
          <div class="goods-price">￥{{ item.price }}</div>
          <div class="goods-location">{{ item.location }}</div>
          <div class="goods-status">{{ formatStatus(item.status) }}</div>
        </div>
      </div>
    </div>

    <div v-if="goodsList.length === 0" class="empty">
      暂无商品数据
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getGoodsList } from '@/api/goods'

const router = useRouter()
const goodsList = ref([])

const formatStatus = (status) => {
  if (status === 3) return '在售'
  if (status === 4) return '已售出'
  if (status === 5) return '已售出'
  return '未知状态'
}

const loadGoodsList = async () => {
  try {
    const res = await getGoodsList()
    console.log('商品列表返回：', res)

    goodsList.value = res?.data?.data ?? res?.data ?? res ?? []
  } catch (error) {
    console.error('获取商品列表失败：', error)
    alert('获取商品列表失败')
  }
}

const handleCardClick = (item) => {
  if (item.status !== 3) {
    alert('商品已售出')
    return
  }

  router.push(`/goods/${item.id}`)
}

onMounted(() => {
  loadGoodsList()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.title {
  margin-bottom: 20px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.goods-card {
  position: relative;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
}

.goods-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.goods-cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.goods-info {
  padding: 12px;
}

.goods-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.goods-price {
  color: #e4393c;
  font-size: 18px;
  margin-bottom: 6px;
}

.goods-location {
  color: #666;
  font-size: 14px;
  margin-bottom: 6px;
}

.goods-status {
  color: #999;
  font-size: 13px;
}

.sold-mask {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 12px;
  z-index: 2;
}

.empty {
  margin-top: 40px;
  text-align: center;
  color: #999;
}
</style>
