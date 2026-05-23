<!-- 我的举报 API: GET /api/user/report/page?page&pageSize&status&targetType; GET /api/user/report/{id} -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  PackageSearch,
  RefreshCcw,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request, { ensureLoggedIn } from '@/utils/request'

const router = useRouter()
const PAGE_SIZE = 8

const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const reports = ref([])
const detail = ref(null)
const total = ref(0)

const query = reactive({
  page: 1,
  pageSize: PAGE_SIZE,
  status: '',
  targetType: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const statusTabs = [
  { key: '', label: '全部' },
  { key: '0', label: '待处理' },
  { key: '1', label: '已处理' },
  { key: '2', label: '已忽略' },
]

const targetTabs = [
  { key: '', label: '全部对象' },
  { key: '1', label: '商品' },
  { key: '2', label: '用户/商家' },
  { key: '3', label: '消息' },
]

const totalPages = computed(() => {
  const count = Math.ceil(total.value / PAGE_SIZE)
  return count > 0 ? count : 1
})

const visiblePages = computed(() => {
  const current = query.page
  const last = totalPages.value

  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)

  if (start > 2) {
    pages.push('left-ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < last - 1) {
    pages.push('right-ellipsis')
  }

  pages.push(last)
  return pages
})

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2400)
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return '-'
  }

  return `￥${amount.toFixed(2)}`
}

function targetTypeLabel(targetType) {
  if (Number(targetType) === 1) return '商品'
  if (Number(targetType) === 2) return '用户/商家'
  if (Number(targetType) === 3) return '消息'
  return '未知对象'
}

function targetIcon(targetType) {
  if (Number(targetType) === 1) return Store
  if (Number(targetType) === 2) return UserRound
  if (Number(targetType) === 3) return FileText
  return CircleAlert
}

function statusMeta(status) {
  if (Number(status) === 1) {
    return {
      label: '已处理',
      badge: 'success',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (Number(status) === 2) {
    return {
      label: '已忽略',
      badge: 'secondary',
      className: 'border-slate-200 bg-slate-100 text-slate-500',
    }
  }

  return {
    label: '待处理',
    badge: 'warning',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  }
}

function normalizeReport(record = {}) {
  return {
    id: record.id ?? null,
    targetType: Number(record.targetType ?? 0),
    targetId: record.targetId ?? null,
    reason: record.reason || '',
    status: Number(record.status ?? 0),
    createTime: record.createTime || '',
  }
}

function buildParams(targetPage = query.page) {
  const params = {
    page: targetPage,
    pageSize: query.pageSize,
  }

  if (query.status !== '') {
    params.status = Number(query.status)
  }

  if (query.targetType !== '') {
    params.targetType = Number(query.targetType)
  }

  return params
}

async function fetchReports(targetPage = query.page) {
  if (!ensureLoggedIn({ source: 'user-reports' })) {
    router.replace('/')
    return
  }

  loading.value = true

  try {
    const { data } = await request.get('/user/report/page', {
      params: buildParams(targetPage),
    })

    if (data?.code !== 1) {
      throw new Error(data?.msg || '举报记录加载失败')
    }

    const pageData = data.data || {}
    reports.value = Array.isArray(pageData.records) ? pageData.records.map(normalizeReport) : []
    total.value = Number(pageData.total || 0)
    query.page = targetPage
  } catch (error) {
    reports.value = []
    total.value = 0
    showToast(getErrorMessage(error, '举报记录加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function openDetail(report) {
  if (!report?.id) {
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detail.value = null

  try {
    const { data } = await request.get(`/user/report/${report.id}`)

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '举报详情加载失败')
    }

    detail.value = data.data
  } catch (error) {
    showToast(getErrorMessage(error, '举报详情加载失败'), 'error')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailVisible.value = false
  detail.value = null
}

function selectStatus(status) {
  if (query.status === status) {
    return
  }

  query.status = status
  query.page = 1
  fetchReports(1)
}

function selectTargetType(targetType) {
  if (query.targetType === targetType) {
    return
  }

  query.targetType = targetType
  query.page = 1
  fetchReports(1)
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === query.page) {
    return
  }

  fetchReports(targetPage)
}

function openTarget() {
  if (!detail.value) {
    return
  }

  if (Number(detail.value.targetType) === 1 && detail.value.targetId) {
    router.push(`/goods/${detail.value.targetId}`)
    closeDetail()
    return
  }

  if (Number(detail.value.targetType) === 2 && detail.value.targetId) {
    router.push(`/seller/${detail.value.targetId}`)
    closeDetail()
  }
}

onMounted(() => {
  fetchReports()
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
})
</script>

<template>
  <section class="space-y-5">
    <Card class="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div class="space-y-1">
          <h1 class="text-2xl font-black tracking-tight text-slate-950">我的举报</h1>
          <p class="text-sm text-slate-400">查看你提交过的举报记录和平台处理结果</p>
        </div>

        <Button
          variant="outline"
          class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
          :disabled="loading"
          @click="fetchReports(query.page)"
        >
          <RefreshCcw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          刷新
        </Button>
      </div>

      <div class="flex flex-col gap-4 border-b border-slate-100 py-5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-1 text-sm font-semibold text-slate-500">状态</span>
          <button
            v-for="item in statusTabs"
            :key="`status-${item.key}`"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="
              query.status === item.key
                ? 'bg-slate-950 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
            "
            @click="selectStatus(item.key)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-1 text-sm font-semibold text-slate-500">对象</span>
          <button
            v-for="item in targetTabs"
            :key="`target-${item.key}`"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="
              query.targetType === item.key
                ? 'bg-orange-500 text-white'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            "
            @click="selectTargetType(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="space-y-3 pt-5">
        <div
          v-for="index in 4"
          :key="index"
          class="rounded-[22px] border border-slate-200 bg-white p-5"
        >
          <div class="flex items-start gap-4">
            <div class="h-12 w-12 rounded-2xl bg-slate-100" />
            <div class="flex-1 space-y-3">
              <div class="h-4 w-2/5 rounded bg-slate-100" />
              <div class="h-4 w-3/4 rounded bg-slate-100" />
              <div class="h-3 w-1/3 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="reports.length" class="space-y-3 pt-5">
        <article
          v-for="report in reports"
          :key="report.id"
          class="group rounded-[22px] border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_24px_55px_-35px_rgba(15,23,42,0.35)]"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"
              >
                <component :is="targetIcon(report.targetType)" class="h-5 w-5" />
              </div>

              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-base font-black text-slate-950">
                    {{ targetTypeLabel(report.targetType) }}举报 #{{ report.id }}
                  </h2>
                  <Badge :variant="statusMeta(report.status).badge">
                    {{ statusMeta(report.status).label }}
                  </Badge>
                  <Badge variant="outline">对象ID {{ report.targetId || '-' }}</Badge>
                </div>

                <p class="line-clamp-2 text-sm leading-6 text-slate-600">
                  {{ report.reason || '未填写举报原因' }}
                </p>

                <p class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Clock3 class="h-3.5 w-3.5" />
                  {{ formatDateTime(report.createTime) }}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              class="shrink-0 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
              @click="openDetail(report)"
            >
              查看详情
            </Button>
          </div>
        </article>
      </div>

      <div
        v-else
        class="flex min-h-[380px] flex-col items-center justify-center gap-4 text-center"
      >
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <PackageSearch class="h-8 w-8" />
        </div>
        <div class="space-y-1">
          <p class="text-base font-semibold text-slate-700">暂无举报记录</p>
          <p class="text-sm text-slate-400">你提交的商品、商家或消息举报会显示在这里</p>
        </div>
      </div>

      <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-2 pt-8">
        <Button
          variant="outline"
          size="sm"
          class="h-9 w-9 rounded-full p-0"
          :disabled="query.page <= 1"
          @click="changePage(query.page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>

        <template v-for="item in visiblePages" :key="item">
          <span
            v-if="typeof item === 'string'"
            class="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
          >
            ...
          </span>
          <Button
            v-else
            :variant="item === query.page ? 'default' : 'outline'"
            size="sm"
            class="h-9 min-w-9 rounded-full px-3"
            @click="changePage(item)"
          >
            {{ item }}
          </Button>
        </template>

        <Button
          variant="outline"
          size="sm"
          class="h-9 w-9 rounded-full p-0"
          :disabled="query.page >= totalPages"
          @click="changePage(query.page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </Card>

    <div
      v-if="detailVisible"
      class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      @click.self="closeDetail"
    >
      <div
        class="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.5)]"
      >
        <div class="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div class="space-y-1">
            <h2 class="text-xl font-black text-slate-950">举报详情</h2>
            <p class="text-sm text-slate-400">举报编号 #{{ detail?.id || '-' }}</p>
          </div>

          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            @click="closeDetail"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="detailLoading" class="flex min-h-[260px] items-center justify-center">
          <LoaderCircle class="h-6 w-6 animate-spin text-orange-500" />
        </div>

        <div v-else-if="detail" class="space-y-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-400">对象类型</p>
              <p class="mt-2 text-base font-black text-slate-900">
                {{ targetTypeLabel(detail.targetType) }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-400">处理状态</p>
              <p class="mt-2 text-base font-black" :class="statusMeta(detail.status).className">
                {{ statusMeta(detail.status).label }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-400">提交时间</p>
              <p class="mt-2 text-base font-black text-slate-900">
                {{ formatDateTime(detail.createTime) }}
              </p>
            </div>
          </div>

          <section class="rounded-2xl border border-slate-200 p-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <CircleAlert class="h-4 w-4 text-orange-500" />
              举报内容
            </h3>
            <div class="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>对象ID：{{ detail.targetId || '-' }}</p>
              <p>对象名称：{{ detail.targetName || detail.goodsTitle || '-' }}</p>
              <p class="sm:col-span-2">举报原因：{{ detail.reason || '-' }}</p>
            </div>
          </section>

          <section
            v-if="Number(detail.targetType) === 1"
            class="rounded-2xl border border-slate-200 p-4"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <Store class="h-4 w-4 text-orange-500" />
              被举报商品
            </h3>
            <div class="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>标题：{{ detail.goodsTitle || '-' }}</p>
              <p>价格：{{ formatPrice(detail.goodsPrice) }}</p>
              <p>状态：{{ detail.goodsStatusDesc || '-' }}</p>
              <p>分类：{{ detail.goodsCategoryName || '-' }}</p>
              <p>面交地点：{{ detail.goodsLocation || '-' }}</p>
              <p>发布人：{{ detail.goodsSellerName || '-' }}</p>
              <p>发布人校区：{{ detail.goodsSellerCampus || '-' }}</p>
              <p class="sm:col-span-2">商品描述：{{ detail.goodsDetail || '-' }}</p>
            </div>
          </section>

          <section
            v-if="Number(detail.targetType) === 2"
            class="rounded-2xl border border-slate-200 p-4"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <UserRound class="h-4 w-4 text-orange-500" />
              被举报用户/商家
            </h3>
            <div class="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>昵称：{{ detail.targetName || '-' }}</p>
              <p>校区：{{ detail.targetUserCampus || '-' }}</p>
              <p class="sm:col-span-2">简介：{{ detail.targetUserIntro || '-' }}</p>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 p-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <ShieldCheck class="h-4 w-4 text-emerald-500" />
              平台处理
            </h3>
            <div class="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>处理管理员：{{ detail.handleAdminName || '-' }}</p>
              <p>处理时间：{{ formatDateTime(detail.handleTime) }}</p>
              <p class="sm:col-span-2">处理结果：{{ detail.handleResult || '平台暂未处理' }}</p>
            </div>
          </section>

          <div class="flex justify-end gap-2">
            <Button
              v-if="Number(detail.targetType) === 1 || Number(detail.targetType) === 2"
              variant="outline"
              class="rounded-full border-slate-200"
              @click="openTarget"
            >
              查看举报对象
            </Button>
            <Button class="rounded-full bg-slate-950 text-white hover:bg-slate-800" @click="closeDetail">
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-6 right-6 z-[160] rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </section>
</template>
