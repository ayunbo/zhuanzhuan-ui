<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderDetail } from '@/api/order'
import { getOrderReview, submitReview, uploadReviewImage } from '@/api/review'
import { useAuthStore } from '@/stores/auth'

const MAX_REVIEW_IMAGE_COUNT = 6

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const imageUploading = ref(false)

const detail = ref(null)
const existingReview = ref(null)
const reviewImages = ref([])

const form = reactive({
  score: 5,
  anonymous: false,
  content: '',
})

const orderId = computed(() => Number(route.query.orderId || 0))

const isBuyer = computed(() => {
  if (!detail.value) return false
  return Number(detail.value.buyerId) === Number(authStore.user.id)
})

const isSeller = computed(() => {
  if (!detail.value) return false
  return Number(detail.value.sellerId) === Number(authStore.user.id)
})

const canSubmit = computed(() => {
  if (!detail.value) return false
  if (existingReview.value) return false
  if (Number(detail.value.status) !== 2) return false
  return isBuyer.value
})

const existingReviewImages = computed(() => parseImageUrls(existingReview.value?.images))
const pageTitle = computed(() => (canSubmit.value ? '提交评价' : '订单评价'))
const pendingReviewText = computed(() => {
  if (!detail.value) return '暂无评价信息'
  if (Number(detail.value.status) !== 2) return '订单尚未完成，暂不支持评价。'
  if (isSeller.value) return '买家暂未提交评价。'
  if (isBuyer.value) return '当前订单暂无评价。'
  return '你没有权限查看该订单评价。'
})

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function statusText(status) {
  const map = {
    0: '待支付',
    1: '已支付',
    2: '已完成',
    3: '已取消',
    4: '超时关闭',
  }
  return map[status] || '未知状态'
}

function parseImageUrls(images) {
  if (!images) return []
  return String(images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadPageData() {
  if (!orderId.value) {
    ElMessage.warning('缺少订单编号')
    router.replace('/user/bought')
    return
  }

  loading.value = true
  try {
    detail.value = await getOrderDetail(orderId.value)
    try {
      existingReview.value = await getOrderReview(orderId.value)
    } catch {
      existingReview.value = null
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载订单信息失败'))
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (orderId.value) {
    router.push(`/order/detail/${orderId.value}`)
    return
  }
  router.push('/user/bought')
}

function beforeImageUpload(file) {
  if (!file?.type?.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('单张图片不能超过 5MB')
    return false
  }
  if (reviewImages.value.length >= MAX_REVIEW_IMAGE_COUNT) {
    ElMessage.warning(`最多上传 ${MAX_REVIEW_IMAGE_COUNT} 张图片`)
    return false
  }
  return true
}

async function handleImageUpload(options) {
  imageUploading.value = true
  try {
    const url = await uploadReviewImage(options.file)
    reviewImages.value.push(url)
    options.onSuccess(url)
    ElMessage.success('图片上传成功')
  } catch (error) {
    options.onError(error)
    ElMessage.error(getErrorMessage(error, '图片上传失败'))
  } finally {
    imageUploading.value = false
  }
}

function removeImage(index) {
  reviewImages.value.splice(index, 1)
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('当前订单不满足评价条件')
    return
  }

  const content = form.content.trim()
  if (content.length > 500) {
    ElMessage.warning('评价内容不能超过 500 字')
    return
  }

  submitting.value = true
  try {
    await submitReview({
      orderId: orderId.value,
      score: form.score,
      content: content || null,
      images: reviewImages.value.join(',') || null,
      anonymous: form.anonymous ? 1 : 0,
    })
    existingReview.value = await getOrderReview(orderId.value)
    reviewImages.value = []
    ElMessage.success('评价提交成功')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '评价提交失败'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPageData()
})
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>{{ pageTitle }}</h2>
      <button class="ghost-btn" @click="goBack">返回订单</button>
    </div>

    <div v-if="loading" class="card">页面加载中...</div>

    <template v-else>
      <section class="card" v-if="detail">
        <h3>{{ detail.goodsTitle || '订单商品' }}</h3>
        <p>订单号：{{ detail.orderNo }}</p>
        <p>订单状态：{{ statusText(detail.status) }}</p>
        <p>卖家：{{ detail.sellerName || detail.sellerId || '未知' }}</p>
      </section>

      <section class="card" v-if="existingReview">
        <h3>该订单已评价</h3>
        <p>评分：{{ existingReview.score }} 分</p>
        <p>内容：{{ existingReview.content || '无' }}</p>

        <div v-if="existingReviewImages.length" class="image-list readonly">
          <el-image
            v-for="(url, index) in existingReviewImages"
            :key="`${url}-${index}`"
            :src="url"
            :preview-src-list="existingReviewImages"
            :initial-index="index"
            fit="cover"
            preview-teleported
            class="image-thumb"
          />
        </div>
      </section>

      <section class="card" v-else-if="canSubmit">
        <h3>评价内容</h3>

        <div class="form-row">
          <label>评分</label>
          <div class="score-group">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="score-btn"
              :class="{ active: form.score === n }"
              @click="form.score = n"
            >
              {{ n }} 分
            </button>
          </div>
        </div>

        <div class="form-row">
          <label>评价内容</label>
          <textarea
            v-model="form.content"
            maxlength="500"
            rows="6"
            placeholder="请输入评价内容（可留空，最多 500 字）"
          />
          <span class="hint">{{ form.content.length }}/500</span>
        </div>

        <div class="form-row">
          <label>评价图片（最多 {{ MAX_REVIEW_IMAGE_COUNT }} 张）</label>

          <div v-if="reviewImages.length" class="image-list">
            <div v-for="(url, index) in reviewImages" :key="`${url}-${index}`" class="image-item">
              <el-image
                :src="url"
                :preview-src-list="reviewImages"
                :initial-index="index"
                fit="cover"
                preview-teleported
                class="image-thumb"
              />
              <button type="button" class="remove-btn" @click="removeImage(index)">删除</button>
            </div>
          </div>

          <el-upload
            class="upload-entry"
            accept="image/*"
            :show-file-list="false"
            :disabled="imageUploading || reviewImages.length >= MAX_REVIEW_IMAGE_COUNT"
            :before-upload="beforeImageUpload"
            :http-request="handleImageUpload"
          >
            <button
              type="button"
              class="ghost-btn"
              :disabled="imageUploading || reviewImages.length >= MAX_REVIEW_IMAGE_COUNT"
            >
              {{ imageUploading ? '上传中...' : '上传图片' }}
            </button>
          </el-upload>
        </div>

        <div class="form-row inline">
          <label class="checkbox">
            <input v-model="form.anonymous" type="checkbox" />
            匿名评价
          </label>
        </div>

        <button class="primary-btn" :disabled="submitting || !canSubmit" @click="handleSubmit">
          {{ submitting ? '提交中...' : '确认提交评价' }}
        </button>

      </section>

      <section class="card" v-else>
        <h3>暂无可展示评价</h3>
        <p>{{ pendingReviewText }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f6f8fb;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
}

.card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.card h3 {
  margin: 0 0 10px;
}

.card p {
  margin: 8px 0;
  color: #555;
}

.form-row {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.form-row.inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.score-btn {
  height: 34px;
  min-width: 64px;
  border: 1px solid #d0d7e2;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.score-btn.active {
  color: #fff;
  border-color: #409eff;
  background: #409eff;
}

textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #d0d7e2;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
  font-family: inherit;
}

.hint {
  color: #888;
  font-size: 12px;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.image-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.image-item {
  position: relative;
  width: 110px;
}

.image-item .image-thumb,
.image-list.readonly .image-thumb {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  overflow: hidden;
}

.image-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.remove-btn {
  width: 100%;
  margin-top: 6px;
  border: none;
  border-radius: 6px;
  height: 28px;
  background: #ffe4e6;
  color: #be123c;
  cursor: pointer;
}

.upload-entry {
  display: inline-flex;
}

.ghost-btn,
.primary-btn {
  border: none;
  border-radius: 10px;
  cursor: pointer;
  height: 38px;
  padding: 0 16px;
}

.ghost-btn {
  background: #f2f3f5;
}

.primary-btn {
  background: #409eff;
  color: #fff;
}

.primary-btn:disabled,
.ghost-btn:disabled {
  background: #c0c4cc;
  color: #fff;
  cursor: not-allowed;
}

</style>
