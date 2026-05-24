<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  confirmVirtualWalletPay,
  fetchVirtualWalletPayStatus,
  fetchWalletPageInfo,
  launchVirtualWalletPay,
} from '@/api/wallet'

const route = useRoute()
const router = useRouter()

const WALLET_SESSION_KEY = 'zhuanzhuan_wallet_login_name'

const loading = ref(false)
const launching = ref(false)
const paying = ref(false)
const checkingStatus = ref(false)
const walletInfo = ref(null)

const loginForm = reactive({
  orderId: '',
  loginName: '',
  payPassword: '',
})

const payForm = reactive({
  payChannel: 1,
  bankCardId: null,
})

const currentLoginName = ref(localStorage.getItem(WALLET_SESSION_KEY) || '')

const bankCards = computed(() => walletInfo.value?.bankCards || [])
const orderTitle = computed(() => String(route.query.goodsTitle || '当前订单'))
const displayAmount = computed(() => {
  return walletInfo.value?.amount ?? route.query.amount ?? '0'
})

const activeCard = computed(() => {
  return bankCards.value.find((item) => item.id === payForm.bankCardId) || null
})

const balanceEnough = computed(() => {
  if (!walletInfo.value) return false
  return Number(walletInfo.value.walletBalance) >= Number(walletInfo.value.amount)
})

const cardEnough = computed(() => {
  if (!walletInfo.value || !activeCard.value) return false
  return Number(activeCard.value.balance) >= Number(walletInfo.value.amount)
})

const channelEnough = computed(() => {
  if (payForm.payChannel === 1) return balanceEnough.value
  return cardEnough.value
})

const canSubmit = computed(() => {
  if (!walletInfo.value) return false
  if (!loginForm.payPassword.trim()) return false
  if (payForm.payChannel === 2 && !payForm.bankCardId) return false
  return channelEnough.value
})

function syncRouteToForm() {
  loginForm.orderId = route.query.orderId ? String(route.query.orderId) : ''

  if (route.query.loginName) {
    loginForm.loginName = String(route.query.loginName)
    return
  }

  if (currentLoginName.value) {
    loginForm.loginName = currentLoginName.value
  }
}

function fillDefaultCard(cards) {
  const defaultCard = cards.find((item) => Number(item.isDefault) === 1)
  payForm.bankCardId = defaultCard?.id || cards[0]?.id || null
}

async function ensureWalletRequest() {
  if (!loginForm.orderId) {
    throw new Error('缺少订单编号，无法发起钱包支付请求')
  }

  launching.value = true
  try {
    // 中文注释：先调用后端发起虚拟钱包支付请求，确保当前订单的支付方式切换到虚拟钱包链路。
    await launchVirtualWalletPay(Number(loginForm.orderId))
  } finally {
    launching.value = false
  }
}

async function loadWalletInfo() {
  if (!loginForm.orderId || !loginForm.loginName.trim()) {
    ElMessage.warning('请输入订单号和钱包用户名')
    return
  }

  loading.value = true
  try {
    const data = await fetchWalletPageInfo({
      orderId: Number(loginForm.orderId),
      loginName: loginForm.loginName.trim(),
    })

    walletInfo.value = data
    currentLoginName.value = data.loginName
    localStorage.setItem(WALLET_SESSION_KEY, data.loginName)
    fillDefaultCard(data.bankCards || [])

    router.replace({
      path: '/wallet',
      query: {
        orderId: String(loginForm.orderId),
        goodsTitle: orderTitle.value,
        amount: String(displayAmount.value),
        loginName: data.loginName,
      },
    })
  } catch (error) {
    walletInfo.value = null
    ElMessage.error(error.message || '加载钱包信息失败')
  } finally {
    loading.value = false
  }
}

async function handleWalletLogin() {
  try {
    await ensureWalletRequest()
    await loadWalletInfo()
    ElMessage.success('钱包账户已加载，可以继续选择付款方式')
  } catch (error) {
    ElMessage.error(error.message || '进入钱包失败')
  }
}

async function handlePay() {
  if (!canSubmit.value) {
    ElMessage.warning(channelEnough.value ? '请完善支付信息' : '当前付款账户余额不足')
    return
  }

  paying.value = true
  try {
    await confirmVirtualWalletPay({
      orderId: walletInfo.value.orderId,
      requestNo: walletInfo.value.requestNo,
      payChannel: payForm.payChannel,
      bankCardId: payForm.payChannel === 2 ? payForm.bankCardId : null,
      loginName: walletInfo.value.loginName,
      payPassword: loginForm.payPassword.trim(),
    })

    ElMessage.success('虚拟钱包支付成功')
    router.push(`/order/detail/${walletInfo.value.orderId}`)
  } catch (error) {
    ElMessage.error(error.message || '支付失败')
  } finally {
    paying.value = false
  }
}

async function handleCheckStatus() {
  if (!loginForm.orderId) {
    ElMessage.warning('请先输入订单号')
    return
  }

  checkingStatus.value = true
  try {
    const status = await fetchVirtualWalletPayStatus(Number(loginForm.orderId))
    if (Number(status?.payStatus) === 1) {
      ElMessage.success('当前订单已支付成功')
      router.push(`/order/detail/${loginForm.orderId}`)
      return
    }

    ElMessage.info('当前订单仍未支付完成')
  } catch (error) {
    ElMessage.error(error.message || '查询支付状态失败')
  } finally {
    checkingStatus.value = false
  }
}

function selectWalletBalance() {
  payForm.payChannel = 1
}

function selectBankCard(cardId) {
  payForm.payChannel = 2
  payForm.bankCardId = cardId
}

function handleSwitchAccount() {
  // 中文注释：切换账户时只清除钱包会话，不影响站点用户登录态。
  walletInfo.value = null
  payForm.payChannel = 1
  payForm.bankCardId = null
  loginForm.loginName = ''
  loginForm.payPassword = ''
  currentLoginName.value = ''
  localStorage.removeItem(WALLET_SESSION_KEY)
}

function handleLogout() {
  handleSwitchAccount()
  ElMessage.success('已退出当前钱包账户')
}

function goBack() {
  if (loginForm.orderId) {
    router.push(`/order/detail/${loginForm.orderId}`)
    return
  }
  router.push('/my-order')
}

onMounted(async () => {
  syncRouteToForm()

  if (loginForm.orderId && loginForm.loginName) {
    try {
      await ensureWalletRequest()
      await loadWalletInfo()
    } catch (error) {
      ElMessage.error(error.message || '初始化钱包页面失败')
    }
  }
})
</script>

<template>
  <div class="wallet-page">
    <div class="wallet-shell">
      <div class="toolbar">
        <button class="ghost-btn" @click="goBack">返回订单</button>
        <div class="toolbar-actions">
          <button class="ghost-btn" :disabled="checkingStatus" @click="handleCheckStatus">
            {{ checkingStatus ? '查询中...' : '查询支付状态' }}
          </button>
          <button v-if="currentLoginName" class="ghost-btn" @click="handleLogout">退出账户</button>
        </div>
      </div>

      <section class="hero-card">
        <div>
          <p class="eyebrow">Virtual Wallet</p>
          <h1>虚拟钱包收银台</h1>
          <p class="hero-desc">
            这里是订单支付时进入的独立钱包页。先用钱包用户名进入账户，再选择钱包余额或绑定银行卡完成付款。
          </p>
        </div>
        <div class="hero-side">
          <span>当前订单</span>
          <strong>#{{ loginForm.orderId || '--' }}</strong>
          <small>{{ orderTitle }}</small>
          <b>￥{{ displayAmount }}</b>
        </div>
      </section>

      <section class="login-card">
        <div class="section-header">
          <div>
            <h2>钱包账户登录</h2>
            <p>根据后端现有接口，页面先按用户名读取钱包信息，支付密码会在确认付款时校验。</p>
          </div>
          <button v-if="walletInfo" class="text-btn" @click="handleSwitchAccount">切换账户</button>
        </div>

        <div class="login-grid">
          <label class="field">
            <span>订单号</span>
            <input v-model="loginForm.orderId" placeholder="请输入订单 ID" />
          </label>
          <label class="field">
            <span>钱包用户名</span>
            <input v-model="loginForm.loginName" placeholder="请输入钱包用户名" />
          </label>
          <label class="field">
            <span>支付密码</span>
            <input
              v-model="loginForm.payPassword"
              type="password"
              placeholder="请输入支付密码"
              @keyup.enter="handleWalletLogin"
            />
          </label>
          <button class="primary-btn login-btn" :disabled="loading || launching" @click="handleWalletLogin">
            {{ loading || launching ? '进入中...' : '进入钱包账户' }}
          </button>
        </div>
      </section>

      <template v-if="walletInfo">
        <section class="summary-grid">
          <article class="summary-card summary-card--primary">
            <span>钱包账户</span>
            <strong>{{ walletInfo.walletName }}</strong>
            <small>{{ walletInfo.loginName }} / {{ walletInfo.walletUserNo }}</small>
          </article>
          <article class="summary-card">
            <span>应付金额</span>
            <strong>￥{{ walletInfo.amount }}</strong>
            <small>请求号：{{ walletInfo.requestNo }}</small>
          </article>
          <article class="summary-card">
            <span>钱包余额</span>
            <strong>￥{{ walletInfo.walletBalance }}</strong>
            <small>{{ balanceEnough ? '余额充足，可直接支付' : '余额不足，请改用银行卡' }}</small>
          </article>
        </section>

        <section class="content-grid">
          <article class="panel">
            <div class="section-header">
              <div>
                <h2>选择付款方式</h2>
                <p>支持钱包余额付款，也支持当前账户已绑定的银行卡付款。</p>
              </div>
            </div>

            <div class="channel-card" :class="{ active: payForm.payChannel === 1 }" @click="selectWalletBalance">
              <div>
                <h3>钱包余额</h3>
                <p>直接从当前钱包账户扣款</p>
              </div>
              <div class="channel-side">
                <strong>￥{{ walletInfo.walletBalance }}</strong>
                <span :class="balanceEnough ? 'ok' : 'warn'">{{ balanceEnough ? '余额充足' : '余额不足' }}</span>
              </div>
            </div>

            <div class="bank-list">
              <div
                v-for="card in bankCards"
                :key="card.id"
                class="channel-card"
                :class="{ active: payForm.payChannel === 2 && payForm.bankCardId === card.id }"
                @click="selectBankCard(card.id)"
              >
                <div>
                  <h3>{{ card.bankName }}</h3>
                  <p>{{ card.cardNoMask }}</p>
                </div>
                <div class="channel-side">
                  <strong>￥{{ card.balance }}</strong>
                  <span :class="Number(card.balance) >= Number(walletInfo.amount) ? 'ok' : 'warn'">
                    {{ Number(card.balance) >= Number(walletInfo.amount) ? '可支付' : '余额不足' }}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="section-header">
              <div>
                <h2>确认付款</h2>
                <p>支付密码将直接提交给后端的确认支付接口进行校验。</p>
              </div>
            </div>

            <div class="confirm-box">
              <div class="confirm-row">
                <span>商品名称</span>
                <strong>{{ orderTitle }}</strong>
              </div>
              <div class="confirm-row">
                <span>支付方式</span>
                <strong>{{ payForm.payChannel === 1 ? '钱包余额' : '绑定银行卡' }}</strong>
              </div>
              <div v-if="payForm.payChannel === 2" class="confirm-row">
                <span>当前银行卡</span>
                <strong>{{ activeCard?.bankName || '--' }} {{ activeCard?.cardNoMask || '' }}</strong>
              </div>
              <div class="confirm-row">
                <span>支付状态</span>
                <strong :class="channelEnough ? 'ok-text' : 'warn-text'">
                  {{ channelEnough ? '余额充足，可提交支付' : '余额不足，暂时无法支付' }}
                </strong>
              </div>
              <div class="confirm-row">
                <span>应付金额</span>
                <strong class="price">￥{{ walletInfo.amount }}</strong>
              </div>
            </div>

            <button class="primary-btn submit-btn" :disabled="!canSubmit || paying" @click="handlePay">
              {{ paying ? '支付处理中...' : '确认支付' }}
            </button>
          </article>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(24, 144, 255, 0.16), transparent 30%),
    radial-gradient(circle at right, rgba(82, 196, 26, 0.12), transparent 24%),
    linear-gradient(180deg, #f4f8ff 0%, #f7fbf8 100%);
}

.wallet-shell {
  max-width: 1180px;
  margin: 0 auto;
}

.toolbar,
.toolbar-actions,
.login-grid,
.summary-grid,
.content-grid,
.confirm-row,
.channel-card,
.channel-side,
.section-header {
  display: flex;
}

.toolbar,
.section-header,
.confirm-row,
.channel-card {
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-actions {
  gap: 12px;
  flex-wrap: wrap;
}

.hero-card,
.login-card,
.summary-card,
.panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(20, 33, 61, 0.08);
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #1677ff;
}

.hero-card h1,
.section-header h2 {
  margin: 0;
  color: #14213d;
}

.hero-card h1 {
  font-size: 36px;
}

.hero-desc,
.section-header p,
.field span,
.confirm-row span,
.channel-card p,
.summary-card span,
.summary-card small {
  color: #6b7280;
}

.hero-desc {
  max-width: 760px;
  margin: 14px 0 0;
  line-height: 1.7;
}

.hero-side {
  min-width: 240px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #14213d 0%, #1677ff 100%);
  color: #fff;
}

.hero-side span,
.hero-side strong,
.hero-side small,
.hero-side b {
  display: block;
}

.hero-side strong {
  margin: 10px 0 8px;
  font-size: 26px;
}

.hero-side b {
  margin-top: 14px;
  font-size: 30px;
}

.login-card,
.panel {
  padding: 24px;
}

.login-card {
  margin-top: 16px;
}

.text-btn,
.ghost-btn,
.primary-btn {
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

.text-btn,
.ghost-btn {
  height: 40px;
  padding: 0 16px;
  background: #f4f7fb;
  color: #334155;
}

.login-grid {
  gap: 16px;
  margin-top: 18px;
  align-items: end;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 220px;
  flex: 1;
}

.field input {
  height: 46px;
  padding: 0 14px;
  border: 1px solid #dbe3ee;
  border-radius: 14px;
  outline: none;
  font-size: 14px;
}

.field input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1);
}

.primary-btn {
  height: 46px;
  padding: 0 18px;
  background: linear-gradient(135deg, #1677ff, #2f7df6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.primary-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

.login-btn {
  min-width: 170px;
}

.summary-grid {
  gap: 16px;
  margin: 16px 0;
}

.summary-card {
  flex: 1;
  padding: 24px;
}

.summary-card strong {
  display: block;
  margin: 12px 0 10px;
  font-size: 28px;
  color: #14213d;
}

.summary-card--primary {
  background: linear-gradient(135deg, #14213d 0%, #1677ff 100%);
}

.summary-card--primary span,
.summary-card--primary strong,
.summary-card--primary small {
  color: #fff;
}

.content-grid {
  gap: 16px;
  align-items: flex-start;
}

.panel {
  flex: 1;
}

.channel-card {
  gap: 16px;
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid #dce6f2;
  background: #f8fbff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.channel-card.active {
  background: #fff;
  border-color: #1677ff;
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.14);
}

.channel-card h3 {
  margin: 0 0 8px;
  color: #14213d;
}

.channel-card p {
  margin: 0;
}

.channel-side {
  flex-direction: column;
  align-items: end;
  gap: 8px;
}

.channel-side strong,
.price,
.ok-text,
.warn-text {
  color: #14213d;
}

.channel-side strong {
  font-size: 22px;
}

.channel-side span {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.ok,
.ok-text {
  color: #16a34a;
}

.ok {
  background: #e8f8ef;
}

.warn,
.warn-text {
  color: #d97706;
}

.warn {
  background: #fff3e0;
}

.confirm-box {
  margin: 20px 0;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid #dce6f2;
  background: #f8fbff;
}

.confirm-row {
  gap: 16px;
  padding: 10px 0;
}

.confirm-row + .confirm-row {
  border-top: 1px solid #e6eef7;
}

.confirm-row strong {
  text-align: right;
}

.price {
  font-size: 24px;
}

.submit-btn {
  width: 100%;
}

@media (max-width: 960px) {
  .toolbar,
  .hero-card,
  .summary-grid,
  .content-grid {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .wallet-page {
    padding: 16px;
  }

  .hero-card,
  .login-card,
  .summary-card,
  .panel {
    padding: 20px;
    border-radius: 20px;
  }

  .hero-card h1 {
    font-size: 28px;
  }

  .channel-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .channel-side {
    align-items: flex-start;
  }
}
</style>
