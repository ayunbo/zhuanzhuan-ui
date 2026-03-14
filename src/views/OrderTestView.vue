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
            <span class="value" :class="goodsInfo.status === 3 ? 'on-sale' : 'sold-text'">
              {{ formatStatus(goodsInfo.status) }}
            </span>
          </div>
        </div>

        <div class="buy-panel">
          <div class="panel-header">
            <h3>填写交易信息</h3>
            <span class="panel-tip">请确认交易地点与时间</span>
          </div>

          <div class="form-item">
            <label>交易地点</label>
            <select v-model="form.meetLocation" :disabled="goodsInfo.status !== 3">
              <option value="">请选择交易地点</option>
              <option value="图书馆门口">图书馆门口</option>
              <option value="一食堂门口">一食堂门口</option>
              <option value="教学楼A区">教学楼A区</option>
              <option value="宿舍楼下">宿舍楼下</option>
            </select>
          </div>

          <div class="form-item">
            <label>期望时间</label>
            <input
              v-model="form.meetTime"
              class="time-input"
              type="datetime-local"
              :min="minDateTime"
              step="60"
              :disabled="goodsInfo.status !== 3"
            />
            <div class="field-tip">只能选择当前时间之后，精确到分钟</div>
          </div>

          <div class="form-item">
            <label>备注</label>
            <textarea
              v-model="form.remark"
              placeholder="例如：希望今晚 7 点后交易，麻烦提前联系"
              :disabled="goodsInfo.status !== 3"
            />
          </div>

          <div class="action-row">
            <button
              class="buy-btn"
              :disabled="goodsInfo.status !== 3"
              @click="handleSubmitOrder"
            >
              {{ goodsInfo.status === 3 ? '立即购买' : '商品已售出' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsById, submitOrder } from '@/api/order'

const route = useRoute()
const router = useRouter()

const goodsInfo = ref(null)

const form = ref({
  goodsId: '',
  meetLocation: '',
  meetTime: '',
  remark: '',
})

const formatStatus = (status) => {
  if (status === 3) return '在售'
  if (status === 4) return '已售出'
  if (status === 5) return '已售出'
  return '未知状态'
}

// 生成 datetime-local 需要的格式：yyyy-MM-ddTHH:mm
const minDateTime = computed(() => {
  const now = new Date()
  now.setSeconds(0)
  now.setMilliseconds(0)

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
})

const loadGoods = async () => {
  const id = Number(route.params.id)
  const res = await getGoodsById(id)
  goodsInfo.value = res?.data?.data ?? res?.data ?? res
  form.value.goodsId = id
}

const handleSubmitOrder = async () => {
  if (goodsInfo.value.status !== 3) {
    alert('商品已售出')
    return
  }

  if (!form.value.meetLocation) {
    alert('请选择交易地点')
    return
  }

  if (!form.value.meetTime) {
    alert('请选择期望时间')
    return
  }

  // 防止用户手动输入过去时间
  const selectedTime = new Date(form.value.meetTime)
  const now = new Date()
  now.setSeconds(0)
  now.setMilliseconds(0)

  if (selectedTime < now) {
    alert('请选择当前时间之后的交易时间')
    return
  }

  try {
    const payload = {
      ...form.value,
      // 后端当前格式：yyyy-MM-dd HH:mm
      meetTime: form.value.meetTime.replace('T', ' '),
    }

    const res = await submitOrder(payload)
    const result = res?.data ?? res

    alert('订单提交成功')
    router.push({
      path: '/pay',
      query: {
        orderId: result.data || result,
        goodsTitle: goodsInfo.value.title,
        amount: goodsInfo.value.price,
      },
    })
  } catch (error) {
    console.error('商品下单失败：', error)

    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      '提交订单失败'

    if (
      msg.includes('锁定') ||
      msg.includes('不在售') ||
      msg.includes('已售出')
    ) {
      alert('商品已售出')
      goodsInfo.value.status = 4
      return
    }

    alert(msg)
  }
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
  align-items: flex-start;
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
  object-fit: cover;
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
  letter-spacing: 1px;
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

.buy-panel {
  background: #fff;
  border-radius: 18px;
  padding: 24px 24px 20px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.panel-header h3 {
  margin: 0;
  font-size: 24px;
  color: #222;
}

.panel-tip {
  color: #999;
  font-size: 13px;
}

.form-item {
  margin-bottom: 18px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

select,
input,
textarea {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  background: #fff;
}

select:focus,
input:focus,
textarea:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.time-input {
  letter-spacing: 0.5px;
}

textarea {
  min-height: 96px;
  resize: vertical;
}

.field-tip {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.action-row {
  margin-top: 8px;
}

.buy-btn {
  min-width: 180px;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff, #2f7df6);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.buy-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(64, 158, 255, 0.24);
}

.buy-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
