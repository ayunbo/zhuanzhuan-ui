<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, Phone, Postcard, User } from '@element-plus/icons-vue'
import { registerUser, unifiedLogin } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'login',
  },
})

const emit = defineEmits(['update:modelValue', 'success'])
const authStore = useAuthStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const activeMode = ref('login')
const loading = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({
  account: '',
  password: '',
})

const registerForm = reactive({
  studentNo: '',
  password: '',
  name: '',
  phone: '',
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

const registerRules = {
  studentNo: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { min: 5, message: '学号至少 5 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

const sideTitle = computed(() => (activeMode.value === 'register' ? '校园认证说明' : '扫码登录占位'))
const sideDescription = computed(() =>
  activeMode.value === 'register'
    ? '注册完成后可以直接使用学号和手机号登录，后续再补充头像、校园和简介。'
    : '扫码区先保留为正式入口占位，当前仍可用学号、手机号或登录账号直登。',
)

const sideSteps = computed(() =>
  activeMode.value === 'register'
    ? [
        '只填写真实学号、密码、昵称和手机号。',
        '注册后会直接回到登录态，后续接入校园认证时可继续扩展。',
        '头像、校园、简介等资料仍在个人中心维护。',
      ]
    : [
        '账号和密码都走真实 unifiedLogin 接口。',
        '扫码入口当前只做占位，不影响学号或手机号登录。',
        '登录后可直接进入商品、订单和个人中心。',
      ],
)

watch(
  () => props.mode,
  (mode) => {
    activeMode.value = mode === 'register' ? 'register' : 'login'
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeMode.value = props.mode === 'register' ? 'register' : 'login'
    }
  },
)

function closeDialog() {
  visible.value = false
}

function switchMode(mode) {
  activeMode.value = mode === 'register' ? 'register' : 'login'
}

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
    emit('success', {
      mode: 'login',
      user: result,
    })
    visible.value = false
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerFormRef.value) {
    return
  }

  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    await registerUser({
      studentNo: registerForm.studentNo.trim(),
      password: registerForm.password.trim(),
      name: registerForm.name.trim(),
      phone: registerForm.phone.trim(),
    })

    ElMessage.success('注册成功，请登录')
    loginForm.account = registerForm.studentNo.trim()
    loginForm.password = registerForm.password.trim()
    activeMode.value = 'login'
  } catch (error) {
    ElMessage.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="920px"
    class="auth-dialog"
    align-center
    :show-close="false"
    destroy-on-close
    append-to-body
  >
    <div class="auth-shell">
      <header class="auth-header">
        <div class="brand-block">
          <div class="brand-mark">转</div>
          <div class="brand-copy">
            <p>Campus Marketplace</p>
            <strong>转转校园</strong>
          </div>
        </div>
        <button type="button" class="close-btn" @click="closeDialog">×</button>
      </header>

      <div class="auth-body">
        <section class="auth-form-column">
          <div class="auth-intro">
            <span class="eyebrow">账号入口</span>
            <h2>{{ activeMode === 'register' ? '注册校园账号' : '登录继续浏览商品和订单' }}</h2>
            <p>
              {{ activeMode === 'register'
                ? '先补齐学号、密码和手机号，再回到登录页进入平台。'
                : '保持真实接口直连，登录后可直接进入商品广场、订单中心和个人中心。' }}
            </p>
          </div>

          <nav class="mode-switch">
            <button :class="{ active: activeMode === 'login' }" type="button" @click="switchMode('login')">
              登录
            </button>
            <button :class="{ active: activeMode === 'register' }" type="button" @click="switchMode('register')">
              注册
            </button>
          </nav>

          <el-form
            v-if="activeMode === 'login'"
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

          <el-form
            v-else
            ref="registerFormRef"
            class="auth-form"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            @submit.prevent="handleRegister"
          >
            <el-form-item label="学号" prop="studentNo">
              <el-input v-model="registerForm.studentNo" :prefix-icon="Postcard" placeholder="请输入学号" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                :prefix-icon="Lock"
                show-password
                type="password"
                placeholder="设置登录密码"
              />
            </el-form-item>

            <el-form-item label="昵称">
              <el-input v-model="registerForm.name" :prefix-icon="User" placeholder="对外展示的昵称" />
            </el-form-item>

            <el-form-item label="手机号" prop="phone">
              <el-input v-model="registerForm.phone" :prefix-icon="Phone" placeholder="用于接收通知" />
            </el-form-item>

            <div class="form-footnote">注册完成后可继续补充头像、校园和简介，不会影响登录链路。</div>

            <el-button type="primary" class="submit-btn" :loading="loading" native-type="submit">
              注册
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </el-form>
        </section>

        <aside class="auth-side">
          <div class="scan-card">
            <div class="scan-title">{{ sideTitle }}</div>
            <div class="scan-box" aria-hidden="true">
              <span class="scan-grid"></span>
              <strong>二维码占位</strong>
              <p>{{ sideDescription }}</p>
            </div>
          </div>

          <div class="note-card">
            <p class="note-title">接入说明</p>
            <ul>
              <li v-for="item in sideSteps" :key="item">{{ item }}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
:deep(.auth-dialog .el-dialog) {
  width: min(920px, calc(100vw - 24px));
  border-radius: 28px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--zz-border);
  box-shadow: 0 28px 70px rgba(34, 34, 34, 0.16);
}

:deep(.auth-dialog .el-dialog__header) {
  display: none;
}

:deep(.auth-dialog .el-dialog__body) {
  padding: 0;
}

.auth-shell {
  padding: 18px;
  background: #fff;
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--zz-yellow);
  color: var(--zz-black);
  font-size: 18px;
  font-weight: 800;
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-copy p {
  font-size: 12px;
  color: var(--zz-text-light);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brand-copy strong {
  font-size: 18px;
  color: var(--zz-black);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: #f4f4f4;
  color: var(--zz-text-secondary);
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
}

.auth-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 16px;
}

.auth-form-column,
.auth-side {
  border: 1px solid var(--zz-border);
  border-radius: 24px;
  background: #fafafa;
  padding: 20px;
}

.auth-intro {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.eyebrow {
  color: var(--zz-text-light);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.auth-intro h2 {
  font-size: 26px;
  line-height: 1.15;
  color: var(--zz-black);
}

.auth-intro p {
  color: var(--zz-text-secondary);
  line-height: 1.65;
  font-size: 14px;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.mode-switch button {
  min-height: 44px;
  border: 1px solid var(--zz-border);
  border-radius: 14px;
  background: #fff;
  color: var(--zz-text-secondary);
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.mode-switch button:hover {
  transform: translateY(-1px);
}

.mode-switch button.active {
  border-color: rgba(255, 227, 79, 0.85);
  background: var(--zz-yellow-soft);
  color: var(--zz-black);
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
  .auth-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .auth-shell {
    padding: 14px;
  }

  .auth-form-column,
  .auth-side {
    padding: 16px;
  }

  .auth-intro h2 {
    font-size: 22px;
  }
}
</style>
