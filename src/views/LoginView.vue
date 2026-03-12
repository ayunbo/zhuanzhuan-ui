<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, ArrowRight } from '@element-plus/icons-vue'
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
    { min: 4, message: '账号长度不少于4位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于6位', trigger: 'blur' }
  ],
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await unifiedLogin({
      account: loginForm.account.trim(),
      password: loginForm.password.trim()
    })
    
    authStore.setLoginInfo(res)
    ElMessage.success(`欢迎回来，${res.name || '同学'}`)
    
    const redirectPath = route.query.redirect || '/'
    router.push(redirectPath)
  } catch (error) {
    ElMessage.error(error.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="zz-login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="@/assets/logo.jpg" alt="Logo" class="login-logo" />
          <h1>登录赚赚</h1>
          <p>请使用您的学号或手机号登录</p>
        </div>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="account">
            <el-input
              v-model="loginForm.account"
              placeholder="学号 / 手机号"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              size="large"
            />
          </el-form-item>

          <div class="form-options">
            <el-checkbox>保持登录状态</el-checkbox>
            <el-link :underline="false">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            size="large"
            native-type="submit"
          >
            登录 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>

          <div class="footer-link">
            还没有账号？ <router-link to="/register">立即注册</router-link>
          </div>
        </el-form>
      </div>
    </div>
    
    <div class="login-bg-circles">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
    </div>
  </div>
</template>

<style scoped>
.zz-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f7;
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: 24px;
  z-index: 10;
}

.login-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--zz-radius-lg);
  padding: 48px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 8px;
}

.login-header p {
  color: var(--zz-text-secondary);
  font-size: 15px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.submit-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  margin-bottom: 24px;
}

.footer-link {
  text-align: center;
  font-size: 14px;
  color: var(--zz-text-secondary);
}

.footer-link a {
  color: var(--zz-primary);
  font-weight: 600;
  text-decoration: none;
}

.login-bg-circles .circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
}

.c1 { width: 400px; height: 400px; background: var(--zz-primary); top: -100px; right: -100px; }
.c2 { width: 300px; height: 300px; background: var(--zz-success); bottom: -50px; left: -50px; }
</style>
