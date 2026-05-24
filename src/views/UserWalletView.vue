<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  CreditCard,
  LoaderCircle,
  RefreshCcw,
  WalletCards,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  bindWalletBankCard,
  fetchWalletOverview,
  fetchWalletRecords,
  openWalletAccount,
  setDefaultWalletBankCard,
} from '@/api/wallet'
import { ensureLoggedIn, getAuthUser } from '@/utils/request'

const router = useRouter()
const PAGE_SIZE = 10

const loading = ref(false)
const page = ref(1)
const total = ref(0)
const records = ref([])
const openSubmitting = ref(false)
const bindSubmitting = ref(false)
const defaultLoadingId = ref(null)

const overview = reactive({
  loginName: '',
  walletUserNo: '',
  walletName: '',
  walletBalance: 0,
  walletStatus: 0,
  bankCards: [],
})

const openForm = reactive({
  walletName: '',
  phone: '',
  payPassword: '',
  confirmPayPassword: '',
  balance: '0',
})

const bindForm = reactive({
  bankName: '',
  cardHolder: '',
  cardNo: '',
  cardType: '1',
  balance: '0',
  isDefault: true,
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const currentUser = computed(() => getAuthUser() || {})
const hasWallet = computed(() => Number(overview.walletStatus) === 1)
const activeBankCardCount = computed(() =>
  Array.isArray(overview.bankCards) ? overview.bankCards.length : 0,
)
const totalPages = computed(() => {
  const count = Math.ceil(total.value / PAGE_SIZE)
  return count > 0 ? count : 1
})
const visiblePages = computed(() => {
  const current = page.value
  const last = totalPages.value

  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)

  if (start > 2) {
    pages.push('ellipsis-left')
  }

  for (let value = start; value <= end; value += 1) {
    pages.push(value)
  }

  if (end < last - 1) {
    pages.push('ellipsis-right')
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

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '0.00'
  }

  return number.toFixed(2)
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeRecord(record = {}) {
  return {
    id: record.id ?? null,
    orderId: record.orderId ?? null,
    recordNo: record.recordNo || '',
    content: record.content || '钱包账单记录',
    status: Number(record.status ?? 0),
    channelResponse: record.channelResponse || '',
    amount: Number(record.amount ?? 0),
    payMethod: Number(record.payMethod ?? 0),
    orderNo: record.orderNo || '',
    createTime: record.createTime || '',
  }
}

function resolveRecordAmount(record) {
  if (record.status === 1) {
    return {
      label: `-${formatPrice(record.amount)}`,
      className: 'text-slate-900',
    }
  }

  if (record.status === 0) {
    return {
      label: `${formatPrice(record.amount)}`,
      className: 'text-slate-400',
    }
  }

  return {
    label: `${formatPrice(record.amount)}`,
    className: 'text-rose-500',
  }
}

function resolveRecordStatus(record) {
  if (record.status === 1) {
    return '支付成功'
  }
  if (record.status === 0) {
    return '待支付'
  }
  if (record.status === 2) {
    return '支付失败'
  }
  return '已关闭'
}

function seedForms() {
  openForm.walletName = currentUser.value?.name || openForm.walletName
  openForm.phone = currentUser.value?.phone || openForm.phone
  bindForm.cardHolder = overview.walletName || currentUser.value?.name || bindForm.cardHolder
  bindForm.isDefault = activeBankCardCount.value === 0
}

async function fetchOverview() {
  const data = await fetchWalletOverview()

  Object.assign(overview, {
    loginName: data?.loginName || currentUser.value?.studentNo || '',
    walletUserNo: data?.walletUserNo || '',
    walletName: data?.walletName || '',
    walletBalance: data?.walletBalance ?? 0,
    walletStatus: Number(data?.walletStatus ?? 0),
    bankCards: Array.isArray(data?.bankCards) ? data.bankCards : [],
  })

  seedForms()
}

async function fetchRecords(targetPage = page.value) {
  const pageData = await fetchWalletRecords({
    page: targetPage,
    pageSize: PAGE_SIZE,
  })

  records.value = Array.isArray(pageData?.records) ? pageData.records.map(normalizeRecord) : []
  total.value = Number(pageData?.total || 0)
  page.value = targetPage
}

async function loadPage(targetPage = page.value) {
  loading.value = true
  try {
    await Promise.all([fetchOverview(), fetchRecords(targetPage)])
  } catch (error) {
    showToast(getErrorMessage(error, '虚拟钱包加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function changePage(targetPage) {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) {
    return
  }

  loadPage(targetPage)
}

function resetOpenPassword() {
  openForm.payPassword = ''
  openForm.confirmPayPassword = ''
}

function resetBindForm() {
  bindForm.bankName = ''
  bindForm.cardHolder = overview.walletName || currentUser.value?.name || ''
  bindForm.cardNo = ''
  bindForm.cardType = '1'
  bindForm.balance = '0'
  bindForm.isDefault = activeBankCardCount.value === 0
}

function normalizeAmountInput(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }

  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('金额必须是大于等于 0 的数字')
  }

  return amount
}

async function handleOpenWallet() {
  if (!openForm.payPassword.trim()) {
    showToast('请先设置钱包支付密码', 'error')
    return
  }
  if (openForm.payPassword.trim().length < 6) {
    showToast('支付密码至少需要 6 位', 'error')
    return
  }
  if (openForm.payPassword !== openForm.confirmPayPassword) {
    showToast('两次输入的支付密码不一致', 'error')
    return
  }

  openSubmitting.value = true
  try {
    await openWalletAccount({
      walletName: openForm.walletName.trim(),
      phone: openForm.phone.trim(),
      payPassword: openForm.payPassword.trim(),
      balance: normalizeAmountInput(openForm.balance),
    })

    resetOpenPassword()
    showToast('虚拟钱包已开通')
    await loadPage(1)
  } catch (error) {
    showToast(getErrorMessage(error, '开通钱包失败'), 'error')
  } finally {
    openSubmitting.value = false
  }
}

async function handleBindCard() {
  if (!hasWallet.value) {
    showToast('请先开通钱包账户', 'error')
    return
  }
  if (!bindForm.bankName.trim() || !bindForm.cardNo.trim()) {
    showToast('请先填写完整的银行卡信息', 'error')
    return
  }

  bindSubmitting.value = true
  try {
    await bindWalletBankCard({
      bankName: bindForm.bankName.trim(),
      cardHolder: bindForm.cardHolder.trim(),
      cardNo: bindForm.cardNo.trim(),
      cardType: Number(bindForm.cardType || 1),
      balance: normalizeAmountInput(bindForm.balance),
      isDefault: bindForm.isDefault ? 1 : 0,
    })

    resetBindForm()
    showToast('银行卡绑定成功')
    await loadPage(page.value)
  } catch (error) {
    showToast(getErrorMessage(error, '绑定银行卡失败'), 'error')
  } finally {
    bindSubmitting.value = false
  }
}

async function handleSetDefault(card) {
  if (!card?.id || Number(card.isDefault) === 1) {
    return
  }

  defaultLoadingId.value = card.id
  try {
    await setDefaultWalletBankCard(card.id)
    showToast('默认银行卡已更新')
    await fetchOverview()
  } catch (error) {
    showToast(getErrorMessage(error, '设置默认银行卡失败'), 'error')
  } finally {
    defaultLoadingId.value = null
  }
}

onMounted(() => {
  if (!ensureLoggedIn({ source: 'user-wallet' })) {
    router.replace('/')
    return
  }

  seedForms()
  loadPage()
})
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-sm">
      <div
        class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_40%),linear-gradient(135deg,#fff7ed_0%,#ffffff_62%,#f8fafc_100%)] p-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-orange-500 shadow-sm">
              <WalletCards class="h-3.5 w-3.5" />
              VIRTUAL WALLET
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-slate-500">当前余额</p>
              <h1 class="text-4xl font-black tracking-tight text-orange-500 sm:text-5xl">
                ￥{{ formatPrice(overview.walletBalance) }}
              </h1>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>{{ overview.walletName || currentUser.name || '未开通钱包' }}</span>
              <span v-if="overview.walletUserNo">钱包号 {{ overview.walletUserNo }}</span>
              <span>已绑卡 {{ activeBankCardCount }}</span>
            </div>
          </div>

          <div class="flex flex-col items-stretch gap-3 sm:items-end">
            <div
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              :class="
                hasWallet
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              "
            >
              <BadgeCheck v-if="hasWallet" class="h-3.5 w-3.5" />
              {{ hasWallet ? '钱包可用' : '钱包未开通' }}
            </div>

            <Button
              variant="outline"
              class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
              :disabled="loading"
              @click="loadPage(page)"
            >
              <RefreshCcw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" />
              刷新
            </Button>
          </div>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">账户标识</p>
            <p class="mt-3 truncate text-sm font-semibold text-slate-900">
              {{ overview.loginName || currentUser.studentNo || '未获取到登录名' }}
            </p>
          </div>

          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">银行卡</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">{{ activeBankCardCount }} 张</p>
          </div>

          <div class="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">账户状态</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">
              {{ hasWallet ? '正常可用' : '未开通' }}
            </p>
          </div>
        </div>
      </div>
    </Card>

    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
        <div class="space-y-1 border-b border-slate-100 pb-4">
          <h2 class="text-2xl font-black tracking-tight text-slate-950">
            {{ hasWallet ? '钱包账户信息' : '开通虚拟钱包' }}
          </h2>
          <p class="text-sm text-slate-400">
            {{ hasWallet ? '你的钱包登录名会与当前学号保持一致，可直接用于支付页完成钱包支付。' : '先开通钱包账户，再绑定银行卡，就可以在订单支付页使用虚拟钱包支付。' }}
          </p>
        </div>

        <div v-if="hasWallet" class="space-y-5 pt-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p class="text-xs font-semibold tracking-[0.18em] text-slate-400">钱包名称</p>
              <p class="mt-3 text-lg font-bold text-slate-950">{{ overview.walletName || '-' }}</p>
            </div>

            <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p class="text-xs font-semibold tracking-[0.18em] text-slate-400">钱包用户号</p>
              <p class="mt-3 text-lg font-bold text-slate-950">{{ overview.walletUserNo || '-' }}</p>
            </div>
          </div>

          <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-600">
            <p>登录名：{{ overview.loginName || currentUser.studentNo || '-' }}</p>
            <p>钱包余额：￥{{ formatPrice(overview.walletBalance) }}</p>
            <p>支付说明：订单支付页会直接读取这里的钱包余额和已绑定银行卡。</p>
          </div>
        </div>

        <div v-else class="grid gap-4 pt-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">钱包昵称</span>
              <Input
                v-model="openForm.walletName"
                placeholder="例如 校园钱包"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">手机号</span>
              <Input
                v-model="openForm.phone"
                placeholder="用于绑定钱包账户"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">支付密码</span>
              <Input
                v-model="openForm.payPassword"
                type="password"
                placeholder="至少 6 位"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">确认密码</span>
              <Input
                v-model="openForm.confirmPayPassword"
                type="password"
                placeholder="再次输入支付密码"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">初始余额</span>
              <Input
                v-model="openForm.balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>
          </div>

          <div class="rounded-[24px] border border-amber-100 bg-amber-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
            <p>登录名将自动使用当前学号：{{ currentUser.studentNo || '未获取到学号' }}</p>
            <p>为了方便联调，这里支持直接设置钱包初始余额，开通后即可去订单页完成钱包支付。</p>
          </div>

          <Button
            size="lg"
            class="h-12 rounded-2xl bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
            :disabled="openSubmitting"
            @click="handleOpenWallet"
          >
            <LoaderCircle v-if="openSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ openSubmitting ? '开通中...' : '立即开通钱包' }}
          </Button>
        </div>
      </Card>

      <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
        <div class="space-y-1 border-b border-slate-100 pb-4">
          <h2 class="text-2xl font-black tracking-tight text-slate-950">绑定银行卡</h2>
          <p class="text-sm text-slate-400">绑卡后就可以在支付页选择银行卡作为虚拟钱包扣款渠道。</p>
        </div>

        <div v-if="!hasWallet" class="pt-6 text-sm leading-7 text-slate-500">
          需要先开通虚拟钱包，才能继续绑定银行卡。
        </div>

        <div v-else class="space-y-5 pt-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">银行名称</span>
              <Input
                v-model="bindForm.bankName"
                placeholder="例如 中国建设银行"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">持卡人</span>
              <Input
                v-model="bindForm.cardHolder"
                placeholder="持卡人姓名"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <label class="space-y-2 sm:col-span-2">
              <span class="text-sm font-semibold text-slate-900">银行卡号</span>
              <Input
                v-model="bindForm.cardNo"
                placeholder="请输入银行卡号"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-900">卡内余额</span>
              <Input
                v-model="bindForm.balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="h-11 rounded-2xl border-slate-200"
              />
            </label>
          </div>

          <div class="flex flex-wrap items-center gap-4 rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <label class="inline-flex items-center gap-2">
              <span>卡类型</span>
              <select
                v-model="bindForm.cardType"
                class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="1">储蓄卡</option>
                <option value="2">信用卡</option>
              </select>
            </label>

            <label class="inline-flex items-center gap-2">
              <input v-model="bindForm.isDefault" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
              设为默认银行卡
            </label>
          </div>

          <Button
            size="lg"
            class="h-12 rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-slate-800"
            :disabled="bindSubmitting"
            @click="handleBindCard"
          >
            <LoaderCircle v-if="bindSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ bindSubmitting ? '绑定中...' : '绑定银行卡' }}
          </Button>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-900">已绑定银行卡</h3>
              <span class="text-xs text-slate-400">{{ activeBankCardCount }} 张</span>
            </div>

            <div v-if="activeBankCardCount" class="space-y-3">
              <div
                v-for="card in overview.bankCards"
                :key="card.id"
                class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-semibold text-slate-950">{{ card.bankName }}</p>
                      <span
                        v-if="Number(card.isDefault) === 1"
                        class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-600"
                      >
                        默认卡
                      </span>
                    </div>
                    <p class="text-xs text-slate-500">{{ card.cardNoMask }}</p>
                    <p class="text-xs text-slate-500">可用余额 ￥{{ formatPrice(card.balance) }}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    class="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
                    :disabled="Number(card.isDefault) === 1 || defaultLoadingId === card.id"
                    @click="handleSetDefault(card)"
                  >
                    <LoaderCircle v-if="defaultLoadingId === card.id" class="mr-2 h-4 w-4 animate-spin" />
                    {{ Number(card.isDefault) === 1 ? '当前默认卡' : '设为默认' }}
                  </Button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500"
            >
              还没有绑定银行卡。建议至少绑定一张卡，这样钱包余额不足时也能继续完成支付。
            </div>
          </div>
        </div>
      </Card>
    </div>

    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-black tracking-tight text-slate-950">账单明细</h2>
          <p class="text-sm text-slate-400">这里展示当前用户通过虚拟钱包链路产生的支付流水。</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4 pt-6">
        <div
          v-for="index in 5"
          :key="index"
          class="flex items-center justify-between rounded-[24px] border border-slate-100 bg-slate-50/70 px-5 py-4"
        >
          <div class="space-y-2">
            <div class="h-4 w-48 rounded bg-slate-200" />
            <div class="h-3 w-32 rounded bg-slate-100" />
          </div>
          <div class="h-5 w-20 rounded bg-slate-200" />
        </div>
      </div>

      <div v-else-if="records.length" class="divide-y divide-slate-100 pt-3">
        <div
          v-for="record in records"
          :key="record.id"
          class="flex flex-wrap items-center justify-between gap-4 py-4"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-slate-900">{{ record.content }}</p>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                {{ resolveRecordStatus(record) }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>{{ formatDate(record.createTime) }}</span>
              <span v-if="record.orderNo">订单号 {{ record.orderNo }}</span>
              <span v-if="record.recordNo">流水号 {{ record.recordNo }}</span>
            </div>
          </div>

          <div class="text-right">
            <p class="text-lg font-black tracking-tight" :class="resolveRecordAmount(record).className">
              {{ resolveRecordAmount(record).label }}
            </p>
            <p class="mt-1 text-xs text-slate-400">
              {{ record.payMethod === 2 ? '虚拟钱包' : record.payMethod === 1 ? '模拟支付' : '未知渠道' }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center"
      >
        <div
          class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300"
        >
          <CreditCard class="h-10 w-10" />
        </div>
        <div class="space-y-2">
          <p class="text-lg font-semibold text-slate-800">暂无钱包账单</p>
          <p class="text-sm text-slate-400">完成一次虚拟钱包支付后，流水会显示在这里。</p>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-8">
        <Button
          variant="outline"
          size="sm"
          class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
          :disabled="page <= 1 || loading"
          @click="changePage(page - 1)"
        >
          上一页
        </Button>

        <template v-for="entry in visiblePages" :key="entry">
          <span
            v-if="typeof entry === 'string'"
            class="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
          >
            ...
          </span>
          <Button
            v-else
            size="sm"
            :variant="entry === page ? 'default' : 'outline'"
            class="h-9 min-w-9 rounded-full px-3"
            :class="
              entry === page
                ? 'bg-slate-950 text-white hover:bg-slate-950'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            "
            :disabled="loading"
            @click="changePage(entry)"
          >
            {{ entry }}
          </Button>
        </template>

        <Button
          variant="outline"
          size="sm"
          class="h-9 rounded-full border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
          :disabled="page >= totalPages || loading"
          @click="changePage(page + 1)"
        >
          下一页
        </Button>
      </div>
    </Card>

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
        class="fixed bottom-6 right-6 z-[160] rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-950'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>
