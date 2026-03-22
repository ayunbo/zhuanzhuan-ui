<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, User } from '@element-plus/icons-vue'
import { unifiedLogin } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const loginFormRef = ref(null)

const loginForm = reactive({
  account: '',
  password: '',
})

const loginRules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 4, message: '账号至少 4 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const redirectPath = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : '/'))

watch(
  () => route.query.account,
  (account) => {
    if (typeof account === 'string' && account) {
      loginForm.account = account
    }
  },
  { immediate: true },
)

async function handleLogin() {
  if (!loginFormRef.value) {
    return
  }

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    const result = await unifiedLogin({
      account: loginForm.account.trim(),
      password: loginForm.password.trim(),
    })

    authStore.setLoginInfo(result)
    ElMessage.success('登录成功')
    router.push(redirectPath.value || '/')
  } catch (error) {
    ElMessage.error(error.message || '登录失败，请检查账号和密码')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="zz-container">
      <div class="auth-shell zz-card">
        <header class="auth-header">
          <div class="brand">
            <img src="@/assets/logo.jpg" alt="转转校园" />
            <div>
              <p>Campus Marketplace</p>
              <strong>转转校园</strong>
            </div>
          </div>
          <el-tag round type="warning">登录</el-tag>
        </header>

        <div class="auth-grid">
          <section class="auth-form-panel">
            <div class="intro">
              <p>账号登录</p>
              <h1>登录继续使用平台</h1>
              <span>学号、手机号或登录账号都可以直接进入商品、订单和个人中心。</span>
            </div>

            <el-form
              ref="loginFormRef"
              class="auth-form"
              :model="loginForm"
              :rules="loginRules"
              label-position="top"
              @submit.prevent="handleLogin"
            >
              <el-form-item label="账号" prop="account">
                <el-input v-model="loginForm.account" :prefix-icon="User" placeholder="学号 / 手机号 / 登录账号" />
              </el-form-item>

              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="loginForm.password"
                  :prefix-icon="Lock"
                  show-password
                  type="password"
                  placeholder="请输入密码"
                />
              </el-form-item>

              <div class="form-footnote">登录后会同步真实账号信息，未接入扫码前仍可直接登录。</div>

              <el-button type="primary" class="submit-btn" :loading="loading" native-type="submit">
                登录
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-form>

            <div class="switch-line">
              还没有账号？
              <router-link to="/register">去注册</router-link>
            </div>
          </section>

          <aside class="auth-side">
            <div class="scan-card">
              <div class="scan-title">扫码登录占位</div>
              <div class="scan-box" aria-hidden="true">
                <span class="scan-grid"></span>
                <strong>二维码占位</strong>
                <p>当前先保留正式入口位，扫码能力后续再接入。</p>
              </div>
            </div>

            <div class="note-card">
              <p class="note-title">接入说明</p>
              <ul>
                <li>账号和密码都走真实 unifiedLogin 接口。</li>
                <li>学号、手机号和登录账号都可以作为入口。</li>
                <li>登录后可直接进入商品、订单和个人中心。</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 180px);
  display: grid;
  align-items: center;
  padding: 18px 0 28px;
}

.auth-shell {
  padding: 20px;
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand img {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 14px;
}

.brand p {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--zz-text-light);
  text-transform: uppercase;
}

.brand strong {
  font-size: 18px;
  color: var(--zz-black);
}

.auth-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}

.auth-form-panel,
.auth-side {
  border: 1px solid var(--zz-border);
  border-radius: 24px;
  background: #fafafa;
  padding: 20px;
}

.intro {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.intro p {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--zz-text-light);
  text-transform: uppercase;
}

.intro h1 {
  font-size: 28px;
  line-height: 1.15;
  color: var(--zz-black);
}

.intro span {
  color: var(--zz-text-secondary);
  line-height: 1.65;
  font-size: 14px;
}

.auth-form {
  display: grid;
  gap: 2px;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.auth-form :deep(.el-form-item__label) {
  color: var(--zz-text);
  font-weight: 700;
  padding-bottom: 4px;
}

.form-footnote {
  margin-top: -2px;
  color: var(--zz-text-light);
  font-size: 12px;
  line-height: 1.6;
}

.submit-btn {
  width: 100%;
  margin-top: 6px;
}

.switch-line {
  margin-top: 12px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.switch-line a {
  color: var(--zz-black);
  font-weight: 700;
  margin-left: 4px;
}

.auth-side {
  display: grid;
  gap: 14px;
  align-content: start;
}

.scan-card,
.note-card {
  border-radius: 20px;
  border: 1px solid var(--zz-border);
  background: #fff;
  padding: 16px;
}

.scan-title,
.note-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--zz-black);
  margin-bottom: 12px;
}

.scan-box {
  min-height: 260px;
  border-radius: 18px;
  border: 1px dashed #d9d9d9;
  background: linear-gradient(180deg, #fff 0%, #fbfbfb 100%);
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
  padding: 18px;
}

.scan-grid {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  background:
    linear-gradient(90deg, rgba(34, 34, 34, 0.1) 1px, transparent 1px),
    linear-gradient(rgba(34, 34, 34, 0.1) 1px, transparent 1px);
  background-size: 12px 12px;
  box-shadow: inset 0 0 0 10px rgba(255, 227, 79, 0.18);
}

.scan-box strong {
  font-size: 16px;
  color: var(--zz-black);
}

.scan-box p {
  max-width: 220px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--zz-text-secondary);
}

.note-card ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  color: var(--zz-text-secondary);
  line-height: 1.55;
  font-size: 13px;
}

@media (max-width: 860px) {
  .auth-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .auth-shell {
    padding: 14px;
  }

  .auth-form-panel,
  .auth-side {
    padding: 16px;
  }

  .auth-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .intro h1 {
    font-size: 22px;
  }
}
</style>
