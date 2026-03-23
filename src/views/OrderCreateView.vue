<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchPublicGoodsById } from '@/api/goods'
import { submitOrder } from '@/api/order'
import { GOODS_STATUS, GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { formatCurrency } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const goodsDetail = ref(null)

const form = reactive({
  meetLocation: '',
  meetTime: '',
  remark: '',
})

const goodsId = computed(() => {
  const raw = Array.isArray(route.query.goodsId) ? route.query.goodsId[0] : route.query.goodsId
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
})

const sellerName = computed(() => goodsDetail.value?.sellerName || route.query.sellerName || '校园卖家')
const orderAmount = computed(() => formatCurrency(goodsDetail.value?.price || route.query.amount || 0))
const goodsStatus = computed(() => Number(goodsDetail.value?.status))
const goodsStatusText = computed(() => {
  if (goodsDetail.value?.statusDesc) return goodsDetail.value.statusDesc
  return GOODS_STATUS_LABEL_MAP[goodsStatus.value] || '未知状态'
})
const canSubmitOrder = computed(() => goodsStatus.value === GOODS_STATUS.ON_SALE)

function goBack() {
  if (goodsId.value) {
    router.push(`/goods/${goodsId.value}`)
    return
  }
  router.push('/goods')
}

async function loadGoodsDetail() {
  if (!goodsId.value) {
    ElMessage.warning('缺少商品信息，无法创建订单')
    router.replace('/goods')
    return
  }

  loading.value = true
  try {
    goodsDetail.value = await fetchPublicGoodsById(goodsId.value)
    if (!canSubmitOrder.value) {
      ElMessage.warning(`当前商品状态为${goodsStatusText.value}，不可下单`)
    }
    if (!form.meetLocation && goodsDetail.value?.location) {
      form.meetLocation = goodsDetail.value.location
    }
  } catch (error) {
    ElMessage.error(error.message || '商品信息加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmitOrder() {
  if (!goodsId.value) {
    ElMessage.warning('缺少商品编号')
    return
  }
  if (!goodsDetail.value) {
    ElMessage.warning('商品信息加载失败，请返回详情页重试')
    return
  }
  if (!canSubmitOrder.value) {
    ElMessage.warning(`当前商品状态为${goodsStatusText.value}，不可下单`)
    return
  }
  if (!form.meetLocation.trim()) {
    ElMessage.warning('请填写交易地点')
    return
  }
  if (!form.meetTime) {
    ElMessage.warning('请选择交易时间')
    return
  }

  submitting.value = true
  try {
    // 中文注释：根据当前后端反序列化表现，这里提交“yyyy-MM-dd HH:mm”格式最稳妥。
    const orderId = await submitOrder({
      goodsId: goodsId.value,
      meetLocation: form.meetLocation.trim(),
      meetTime: form.meetTime,
      remark: form.remark.trim() || null,
    })

    ElMessage.success('订单创建成功，请继续完成支付')
    router.push({
      path: '/pay',
      query: {
        orderId: String(orderId),
        goodsTitle: goodsDetail.value?.title || '',
        amount: String(goodsDetail.value?.price || ''),
      },
    })
  } catch (error) {
    ElMessage.error(error.message || '创建订单失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadGoodsDetail)
</script>

<template>
  <div class="order-page zz-page">
    <section class="page-head zz-card">
      <div class="head-copy">
        <p>ORDER CREATE</p>
        <h1>创建订单</h1>
        <span>确认交易地点和见面时间后提交订单，系统会锁定商品并进入支付流程。</span>
      </div>
      <el-tag round type="success">已接入</el-tag>
    </section>

    <div class="order-layout zz-two-column">
      <main class="order-main">
        <el-card class="preview-card" shadow="never">
          <div class="preview-media">
            <img v-if="goodsDetail?.cover" :src="goodsDetail.cover" alt="商品封面" />
            <div v-else class="preview-empty">暂无商品封面</div>
          </div>

          <div class="preview-copy">
            <div class="preview-title">
              <h2>{{ goodsDetail?.title || route.query.goodsTitle || '当前商品' }}</h2>
              <span>卖家：{{ sellerName }}</span>
            </div>

            <div class="price-row">
              <strong>{{ orderAmount }}</strong>
              <span>订单金额</span>
            </div>

            <div class="preview-tags">
              <el-tag round>{{ goodsDetail?.categoryName || '校园闲置' }}</el-tag>
              <el-tag round type="info">{{ goodsDetail?.location || '校内当面交易' }}</el-tag>
            </div>

            <div class="desc-box">
              <h3>商品说明</h3>
              <p>{{ goodsDetail?.detail || '卖家暂未补充更多说明。' }}</p>
            </div>
          </div>
        </el-card>
      </main>

      <aside class="order-side">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-head">
              <h3>订单信息</h3>
              <el-tag round>{{ goodsId || '--' }}</el-tag>
            </div>
          </template>

          <el-alert
            v-if="goodsDetail && !canSubmitOrder"
            class="status-alert"
            title="当前商品不可下单"
            type="warning"
            :closable="false"
            show-icon
            :description="`商品状态：${goodsStatusText}，仅在售商品支持下单。`"
          />

          <el-form label-position="top" class="order-form">
            <el-form-item label="交易地点">
              <el-input v-model="form.meetLocation" placeholder="例如：主教学楼一层大厅" />
            </el-form-item>

            <el-form-item label="交易时间">
              <el-date-picker
                v-model="form.meetTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                placeholder="请选择交易时间"
                class="full-width"
              />
            </el-form-item>

            <el-form-item label="备注说明">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="4"
                maxlength="120"
                show-word-limit
                placeholder="可填写楼号、到达方式或补充说明"
              />
            </el-form-item>

            <el-button
              type="primary"
              class="submit-btn"
              :loading="submitting"
              :disabled="!canSubmitOrder"
              @click="handleSubmitOrder"
            >
              {{ submitting ? '提交中...' : canSubmitOrder ? '提交订单并去支付' : '当前不可提交' }}
            </el-button>
          </el-form>
        </el-card>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          description="订单提交成功后会自动进入支付页，待支付订单 30 分钟内未支付会被系统自动关闭。"
        />
      </aside>
    </div>

    <div class="page-actions">
      <el-button @click="goBack">返回商品详情</el-button>
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

.desc-box {
  padding: 16px;
  border-radius: 20px;
  background: #fafafa;
  border: 1px solid var(--zz-border);
  display: grid;
  gap: 8px;
}

.desc-box h3 {
  font-size: 18px;
  color: var(--zz-black);
}

.desc-box p {
  color: var(--zz-text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
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

.order-form {
  display: grid;
}

.status-alert {
  margin-bottom: 12px;
}

.full-width {
  width: 100%;
}

.submit-btn {
  width: 100%;
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

  .page-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
