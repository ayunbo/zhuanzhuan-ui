<template>
  <div class="order-page" v-if="goodsInfo">
    <div class="order-container">
      <div class="goods-card">
        <div class="goods-image-wrap">
          <img :src="goodsInfo.cover || defaultCover" class="goods-image" />
          <div v-if="goodsInfo.status !== 3" class="sold-badge">已售出</div>
        </div>

        <div class="goods-content">
          <h2 class="goods-title">{{ goodsInfo.title }}</h2>
          <div class="goods-price">￥{{ goodsInfo.price }}</div>

          <div class="goods-meta">
            <div class="meta-row">
              <span class="meta-label">默认交易地点</span>
              <span class="meta-value">{{ goodsInfo.location || '未填写' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">商品状态</span>
              <span
                class="meta-value"
                :class="goodsInfo.status === 3 ? 'status-sale' : 'status-sold'"
              >
                {{ formatStatus(goodsInfo.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-card">
        <div class="card-header">
          <h2>填写订单信息</h2>
          <span class="header-tip">请确认交易地点与时间</span>
        </div>

        <div class="form-item">
          <label>交易地点</label>
          <select v-model="form.meetLocation" :disabled="goodsInfo.status !== 3">
            <option value="">请选择交易地点</option>
            <option value="图书馆门口">图书馆门口</option>
            <option value="一食堂门口">一食堂门口</option>
            <option value="教学楼A区">教学楼A区</option>
            <option value="宿舍楼下">宿舍楼下</option>
            <option value="实验楼门口">实验楼门口</option>
            <option value="主教楼下">主教楼下</option>
          </select>
        </div>

        <div class="form-item">
          <label>期望时间</label>
          <div
            class="time-display"
            :class="{ disabled: goodsInfo.status !== 3 }"
            @click="openTimeDialog"
          >
            <span v-if="form.meetTime">{{ form.meetTime }}</span>
            <span v-else class="placeholder-text">请选择交易时间</span>
          </div>
          <div class="field-tip">只能选择当前时间之后，精确到分钟</div>
        </div>

        <div class="form-item">
          <label>备注</label>
          <textarea
            v-model="form.remark"
            placeholder="例如：希望晚上交易，麻烦提前联系"
            :disabled="goodsInfo.status !== 3"
          />
        </div>

        <div class="action-row">
          <button class="btn btn-back" @click="goBack">返回详情</button>
          <button
            class="btn btn-submit"
            :disabled="goodsInfo.status !== 3 || submitting"
            @click="handleSubmitOrder"
          >
            {{ goodsInfo.status === 3 ? (submitting ? '提交中...' : '提交订单') : '商品已售出' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 小弹窗时间选择器 -->
    <el-dialog
      v-model="showTimeDialog"
      title="选择交易时间"
      width="580px"
      center
      :close-on-click-modal="false"
      @open="onDialogOpen"
    >
      <div class="time-picker-dialog">
        <div class="picker-wheel-wrap">
          <div class="picker-mask-top"></div>
          <div class="picker-mask-bottom"></div>
          <div class="picker-highlight"></div>

          <div class="picker-grid">
            <div class="picker-column">
              <div class="picker-title">年</div>
              <div
                class="picker-list"
                ref="yearListRef"
                @scroll="onScroll('year', yearOptions, yearListRef)"
              >
                <div
                  v-for="item in yearOptions"
                  :key="item"
                  class="picker-item"
                  :class="{ active: selected.year === item }"
                  @click="handleItemClick('year', item, yearOptions, yearListRef)"
                >
                  {{ item }}
                </div>
              </div>
            </div>

            <div class="picker-column">
              <div class="picker-title">月</div>
              <div
                class="picker-list"
                ref="monthListRef"
                @scroll="onScroll('month', monthOptions, monthListRef)"
              >
                <div
                  v-for="item in monthOptions"
                  :key="item"
                  class="picker-item"
                  :class="{ active: selected.month === item }"
                  @click="handleItemClick('month', item, monthOptions, monthListRef)"
                >
                  {{ pad2(item) }}
                </div>
              </div>
            </div>

            <div class="picker-column">
              <div class="picker-title">日</div>
              <div
                class="picker-list"
                ref="dayListRef"
                @scroll="onScroll('day', dayOptions, dayListRef)"
              >
                <div
                  v-for="item in dayOptions"
                  :key="item"
                  class="picker-item"
                  :class="{ active: selected.day === item }"
                  @click="handleItemClick('day', item, dayOptions, dayListRef)"
                >
                  {{ pad2(item) }}
                </div>
              </div>
            </div>

            <div class="picker-column">
              <div class="picker-title">时</div>
              <div
                class="picker-list"
                ref="hourListRef"
                @scroll="onScroll('hour', hourOptions, hourListRef)"
              >
                <div
                  v-for="item in hourOptions"
                  :key="item"
                  class="picker-item"
                  :class="{ active: selected.hour === item }"
                  @click="handleItemClick('hour', item, hourOptions, hourListRef)"
                >
                  {{ pad2(item) }}
                </div>
              </div>
            </div>

            <div class="picker-column">
              <div class="picker-title">分</div>
              <div
                class="picker-list"
                ref="minuteListRef"
                @scroll="onScroll('minute', minuteOptions, minuteListRef)"
              >
                <div
                  v-for="item in minuteOptions"
                  :key="item"
                  class="picker-item"
                  :class="{ active: selected.minute === item }"
                  @click="handleItemClick('minute', item, minuteOptions, minuteListRef)"
                >
                  {{ pad2(item) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-box">
          当前选择：{{ previewTime }}
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showTimeDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmTime">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGoodsById, submitOrder } from '@/api/order'

const route = useRoute()
const router = useRouter()

const defaultCover = 'https://via.placeholder.com/420x280?text=Goods'

const goodsInfo = ref(null)
const submitting = ref(false)
const showTimeDialog = ref(false)

const form = ref({
  goodsId: '',
  meetLocation: '',
  meetTime: '',
  remark: '',
})

const yearListRef = ref(null)
const monthListRef = ref(null)
const dayListRef = ref(null)
const hourListRef = ref(null)
const minuteListRef = ref(null)

const ITEM_HEIGHT = 40

const scrollTimers = {
  year: null,
  month: null,
  day: null,
  hour: null,
  minute: null,
}

// 当前基准时间 = 当前系统时间 + 1 分钟
const getBaseTime = () => {
  const d = new Date()
  d.setSeconds(0)
  d.setMilliseconds(0)
  d.setMinutes(d.getMinutes() + 1)
  return d
}

const baseTime = ref(getBaseTime())

const selected = ref({
  year: baseTime.value.getFullYear(),
  month: baseTime.value.getMonth() + 1,
  day: baseTime.value.getDate(),
  hour: baseTime.value.getHours(),
  minute: baseTime.value.getMinutes(),
})

const formatStatus = (status) => {
  if (status === 3) return '在售'
  if (status === 4) return '已售出'
  if (status === 5) return '已售出'
  return '未知状态'
}

const pad2 = (num) => String(num).padStart(2, '0')

// 是否仍处于基准年的约束下
const isSameYearAsBase = computed(() => {
  return selected.value.year === baseTime.value.getFullYear()
})

// 是否仍处于基准月的约束下
const isSameMonthAsBase = computed(() => {
  return (
    selected.value.year === baseTime.value.getFullYear() &&
    selected.value.month === baseTime.value.getMonth() + 1
  )
})

// 是否仍处于基准日的约束下
const isSameDayAsBase = computed(() => {
  return (
    selected.value.year === baseTime.value.getFullYear() &&
    selected.value.month === baseTime.value.getMonth() + 1 &&
    selected.value.day === baseTime.value.getDate()
  )
})

// 是否仍处于基准小时的约束下
const isSameHourAsBase = computed(() => {
  return (
    selected.value.year === baseTime.value.getFullYear() &&
    selected.value.month === baseTime.value.getMonth() + 1 &&
    selected.value.day === baseTime.value.getDate() &&
    selected.value.hour === baseTime.value.getHours()
  )
})

// 动态可选年份
const yearOptions = computed(() => {
  const currentYear = baseTime.value.getFullYear()
  return [currentYear, currentYear + 1]
})

// 动态可选月份
const monthOptions = computed(() => {
  const start = isSameYearAsBase.value ? baseTime.value.getMonth() + 1 : 1
  return Array.from({ length: 12 - start + 1 }, (_, i) => start + i)
})

// 动态可选日期
const dayOptions = computed(() => {
  const daysInMonth = new Date(selected.value.year, selected.value.month, 0).getDate()
  const start = isSameMonthAsBase.value ? baseTime.value.getDate() : 1
  return Array.from({ length: daysInMonth - start + 1 }, (_, i) => start + i)
})

// 动态可选小时
const hourOptions = computed(() => {
  const start = isSameDayAsBase.value ? baseTime.value.getHours() : 0
  return Array.from({ length: 24 - start }, (_, i) => start + i)
})

// 动态可选分钟
const minuteOptions = computed(() => {
  const start = isSameHourAsBase.value ? baseTime.value.getMinutes() : 0
  return Array.from({ length: 60 - start }, (_, i) => start + i)
})

// 选项联动修正：如果上层变化导致当前值非法，则自动修正为第一项
watch(yearOptions, (opts) => {
  if (!opts.includes(selected.value.year)) {
    selected.value.year = opts[0]
  }
})

watch(monthOptions, (opts) => {
  if (!opts.includes(selected.value.month)) {
    selected.value.month = opts[0]
  }
})

watch(dayOptions, (opts) => {
  if (!opts.includes(selected.value.day)) {
    selected.value.day = opts[0]
  }
})

watch(hourOptions, (opts) => {
  if (!opts.includes(selected.value.hour)) {
    selected.value.hour = opts[0]
  }
})

watch(minuteOptions, (opts) => {
  if (!opts.includes(selected.value.minute)) {
    selected.value.minute = opts[0]
  }
})

// 日期联动：月份变化后重新校正日
watch(
  () => [selected.value.year, selected.value.month],
  () => {
    const maxDay = new Date(selected.value.year, selected.value.month, 0).getDate()
    if (selected.value.day > maxDay) {
      selected.value.day = maxDay
    }
  }
)

const previewTime = computed(() => {
  return `${selected.value.year}-${pad2(selected.value.month)}-${pad2(selected.value.day)} ${pad2(selected.value.hour)}:${pad2(selected.value.minute)}`
})

const buildSelectedDate = () => {
  return new Date(
    selected.value.year,
    selected.value.month - 1,
    selected.value.day,
    selected.value.hour,
    selected.value.minute,
    0
  )
}

const scrollToValue = (listRef, options, value) => {
  const el = listRef?.value
  if (!el) return
  const index = options.indexOf(value)
  if (index < 0) return
  el.scrollTo({
    top: index * ITEM_HEIGHT,
    behavior: 'smooth',
  })
}

const snapFromScroll = (key, options, listRef) => {
  const el = listRef?.value
  if (!el || !options.length) return

  const index = Math.round(el.scrollTop / ITEM_HEIGHT)
  const safeIndex = Math.max(0, Math.min(index, options.length - 1))
  selected.value[key] = options[safeIndex]

  el.scrollTo({
    top: safeIndex * ITEM_HEIGHT,
    behavior: 'smooth',
  })
}

const onScroll = (key, options, listRef) => {
  if (scrollTimers[key]) {
    clearTimeout(scrollTimers[key])
  }
  scrollTimers[key] = setTimeout(() => {
    snapFromScroll(key, options, listRef)
  }, 80)
}

const handleItemClick = (key, value, options, listRef) => {
  selected.value[key] = value
  scrollToValue(listRef, options, value)
}

const syncAllColumns = async () => {
  await nextTick()
  scrollToValue(yearListRef, yearOptions.value, selected.value.year)
  scrollToValue(monthListRef, monthOptions.value, selected.value.month)
  scrollToValue(dayListRef, dayOptions.value, selected.value.day)
  scrollToValue(hourListRef, hourOptions.value, selected.value.hour)
  scrollToValue(minuteListRef, minuteOptions.value, selected.value.minute)
}

watch(dayOptions, async () => {
  await nextTick()
  scrollToValue(dayListRef, dayOptions.value, selected.value.day)
})

watch(hourOptions, async () => {
  await nextTick()
  scrollToValue(hourListRef, hourOptions.value, selected.value.hour)
})

watch(minuteOptions, async () => {
  await nextTick()
  scrollToValue(minuteListRef, minuteOptions.value, selected.value.minute)
})

const loadGoods = async () => {
  const goodsId = Number(route.query.goodsId)
  if (!goodsId) {
    alert('缺少商品ID')
    router.push('/goods')
    return
  }

  try {
    const res = await getGoodsById(goodsId)
    goodsInfo.value = res?.data?.data ?? res?.data ?? res
    form.value.goodsId = goodsId
  } catch (error) {
    console.error('获取商品信息失败：', error)
    alert('获取商品信息失败')
    router.push('/goods')
  }
}

const openTimeDialog = async () => {
  if (!goodsInfo.value || goodsInfo.value.status !== 3) return

  // 每次打开重新按“当前时间 + 1 分钟”初始化
  baseTime.value = getBaseTime()

  selected.value.year = baseTime.value.getFullYear()
  selected.value.month = baseTime.value.getMonth() + 1
  selected.value.day = baseTime.value.getDate()
  selected.value.hour = baseTime.value.getHours()
  selected.value.minute = baseTime.value.getMinutes()

  showTimeDialog.value = true
}

const onDialogOpen = async () => {
  await syncAllColumns()
}

const confirmTime = () => {
  const picked = buildSelectedDate()
  const currentBase = getBaseTime()

  if (picked < currentBase) {
    alert('请选择当前时间之后的交易时间')
    return
  }

  form.value.meetTime = `${selected.value.year}-${pad2(selected.value.month)}-${pad2(selected.value.day)} ${pad2(selected.value.hour)}:${pad2(selected.value.minute)}`
  showTimeDialog.value = false
}

const goBack = () => {
  router.push(`/goods/${form.value.goodsId}`)
}

const handleSubmitOrder = async () => {
  if (!goodsInfo.value || goodsInfo.value.status !== 3) {
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

  // 提交前再次校验：必须晚于当前时间
  const submitTime = new Date(form.value.meetTime.replace(' ', 'T') + ':00')
  const currentBase = getBaseTime()

  if (submitTime < currentBase) {
    alert('交易时间必须晚于当前时间')
    return
  }

  submitting.value = true

  try {
    const payload = {
      ...form.value,
    }

    const res = await submitOrder(payload)
    const result = res?.data ?? res
    const orderId = result.data || result

    alert('订单提交成功')

    router.push({
      path: '/pay',
      query: {
        orderId,
        goodsTitle: goodsInfo.value.title,
        amount: goodsInfo.value.price,
      },
    })
  } catch (error) {
    console.error('提交订单失败：', error)

    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      '提交订单失败'

    if (msg.includes('锁定') || msg.includes('不在售') || msg.includes('已售出')) {
      alert('商品已售出')
      if (goodsInfo.value) goodsInfo.value.status = 4
      return
    }

    alert(msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadGoods()
})
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  background: #f6f8fb;
  padding: 28px;
}

.order-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.goods-card,
.form-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 35, 95, 0.06);
}

.goods-card {
  width: 420px;
  overflow: hidden;
}

.goods-image-wrap {
  position: relative;
}

.goods-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}

.sold-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 14px;
  border-radius: 18px;
  font-size: 13px;
}

.goods-content {
  padding: 22px;
}

.goods-title {
  margin: 0 0 14px;
  font-size: 32px;
  line-height: 1.3;
  color: #1f2329;
}

.goods-price {
  font-size: 42px;
  color: #e4393c;
  font-weight: 700;
  margin-bottom: 18px;
}

.goods-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
}

.meta-label {
  width: 96px;
  color: #8c8c8c;
  font-size: 14px;
}

.meta-value {
  color: #333;
  font-size: 15px;
}

.status-sale {
  color: #19be6b;
  font-weight: 600;
}

.status-sold {
  color: #e4393c;
  font-weight: 600;
}

.form-card {
  flex: 1;
  padding: 28px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.card-header h2 {
  margin: 0;
  font-size: 32px;
  color: #1f2329;
}

.header-tip {
  color: #999;
  font-size: 13px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

select,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 13px 14px;
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: all 0.2s ease;
}

select:focus,
textarea:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

textarea {
  min-height: 110px;
  resize: vertical;
}

.time-display {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 13px 14px;
  font-size: 14px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.time-display:hover {
  border-color: #409eff;
}

.time-display.disabled {
  background: #f5f7fa;
  color: #999;
  cursor: not-allowed;
}

.placeholder-text {
  color: #999;
}

.field-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.action-row {
  display: flex;
  gap: 14px;
  margin-top: 24px;
}

.btn {
  min-width: 150px;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back {
  background: #f2f3f5;
  color: #333;
}

.btn-back:hover {
  background: #e8eaec;
}

.btn-submit {
  background: linear-gradient(135deg, #409eff, #2f7df6);
  color: #fff;
  font-weight: 600;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(64, 158, 255, 0.22);
}

.btn-submit:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
  box-shadow: none;
}

.time-picker-dialog {
  padding-top: 4px;
}

.picker-wheel-wrap {
  position: relative;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  position: relative;
  z-index: 2;
}

.picker-column {
  background: #f8fafc;
  border-radius: 14px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  height: 280px;
}

.picker-title {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 600;
}

.picker-list {
  overflow-y: auto;
  flex: 1;
  padding-top: 80px;
  padding-bottom: 80px;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.picker-list::-webkit-scrollbar {
  display: none;
}

.picker-item {
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  color: #7d8592;
  transition: all 0.2s ease;
  scroll-snap-align: center;
  user-select: none;
}

.picker-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.picker-item.active {
  color: #1f2329;
  font-weight: 700;
  background: rgba(64, 158, 255, 0.12);
  transform: scale(1.03);
}

.picker-mask-top,
.picker-mask-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 78px;
  z-index: 3;
  pointer-events: none;
}

.picker-mask-top {
  top: 26px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.96),
    rgba(255, 255, 255, 0.7),
    rgba(255, 255, 255, 0)
  );
}

.picker-mask-bottom {
  bottom: 0;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.96),
    rgba(255, 255, 255, 0.7),
    rgba(255, 255, 255, 0)
  );
}

.picker-highlight {
  position: absolute;
  left: 0;
  right: 0;
  top: 120px;
  height: 40px;
  border-top: 1px solid rgba(64, 158, 255, 0.22);
  border-bottom: 1px solid rgba(64, 158, 255, 0.22);
  background: rgba(64, 158, 255, 0.06);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
}

.preview-box {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f5f7fa;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}
</style>
