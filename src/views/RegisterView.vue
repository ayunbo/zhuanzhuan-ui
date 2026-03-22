<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, Phone, Postcard, User } from '@element-plus/icons-vue'
import { registerUser } from '@/api/user'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  studentNo: '',
  password: '',
  name: '',
  phone: '',
})

const rules = {
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

async function handleSubmit() {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    await registerUser({
      studentNo: form.studentNo.trim(),
      password: form.password.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
    })

    ElMessage.success('注册成功，请登录')
    await router.replace({
      name: 'login',
      query: {
        account: form.studentNo.trim(),
      },
    })
  } catch (error) {
    ElMessage.error(error.message || '注册失败')
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
          <el-tag round type="warning">注册</el-tag>
        </header>

        <div class="auth-grid">
          <section class="auth-form-panel">
            <div class="intro">
              <p>账号注册</p>
              <h1>创建校园账号</h1>
              <span>先完成学号、密码和手机号的注册，再进入平台补充头像和校园信息。</span>
            </div>

            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-position="top"
              class="auth-form"
              @submit.prevent="handleSubmit"
            >
              <el-form-item label="学号" prop="studentNo">
                <el-input v-model="form.studentNo" :prefix-icon="Postcard" placeholder="请输入学号" />
              </el-form-item>

              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  show-password
                  :prefix-icon="Lock"
                  placeholder="设置登录密码"
                />
              </el-form-item>

              <el-form-item label="昵称">
                <el-input v-model="form.name" :prefix-icon="User" placeholder="对外展示的昵称" />
              </el-form-item>

              <el-form-item label="手机号" prop="phone">
                <el-input v-model="form.phone" :prefix-icon="Phone" placeholder="用于接收通知" />
              </el-form-item>

              <div class="form-footnote">注册完成后可继续补充头像、校园和简介，不会影响登录链路。</div>

              <el-button type="primary" class="submit-btn" :loading="loading" native-type="submit">
                注册
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-form>

            <div class="switch-line">
              已有账号？
              <router-link to="/login">返回登录</router-link>
            </div>
          </section>

          <aside class="auth-side">
            <div class="scan-card">
              <div class="scan-title">校园认证说明</div>
              <div class="scan-box" aria-hidden="true">
                <span class="scan-grid"></span>
                <strong>后续可接校园认证</strong>
                <p>当前先完成基础注册，后续再叠加统一认证和二维码能力。</p>
              </div>
            </div>

            <div class="note-card">
              <p class="note-title">注册规则</p>
              <ul>
                <li>只填写真实学号、密码、昵称和手机号。</li>
                <li>注册后会直接跳回登录入口，保持统一登录链路。</li>
                <li>头像、校园和简介都在个人中心继续维护。</li>
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
