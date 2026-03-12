<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Phone, Postcard, ArrowRight } from '@element-plus/icons-vue'
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
    { min: 5, message: '学号不少于5位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不少于6位', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true
    
    await registerUser({
      studentNo: form.studentNo.trim(),
      password: form.password.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
    })

    ElMessage.success('注册成功，请登录')
    await router.replace({
      name: 'login',
      query: { account: form.studentNo.trim() },
    })
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="title">加入赚赚</h1>
        <p class="subtitle">开启你的绿色校园循环之旅</p>
      </div>

      <el-form 
        ref="formRef" 
        :model="form" 
        :rules="rules" 
        label-position="top" 
        class="register-form"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="核心信息" class="form-section-label"></el-form-item>
        
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item prop="studentNo">
              <el-input 
                v-model="form.studentNo" 
                placeholder="学号 (必填)" 
                :prefix-icon="Postcard"
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item prop="password">
              <el-input 
                v-model="form.password" 
                type="password" 
                show-password 
                placeholder="密码 (必填)" 
                :prefix-icon="Lock"
                size="large"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="选填信息" class="form-section-label"></el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item prop="name">
              <el-input 
                v-model="form.name" 
                placeholder="昵称" 
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item prop="phone">
              <el-input 
                v-model="form.phone" 
                placeholder="手机号" 
                :prefix-icon="Phone"
                size="large"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-button 
          type="primary" 
          class="submit-button" 
          :loading="loading" 
          size="large"
          @click="handleSubmit"
        >
          立即注册
          <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>

        <div class="login-link">
          已有账号？
          <router-link to="/login">返回登录</router-link>
        </div>
      </el-form>
    </div>

    <div class="register-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-bg-color-page);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 500px;
  padding: 40px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  z-index: 10;
  border: 1px solid var(--el-border-color-lighter);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0;
}

.form-section-label :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  padding: 0;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 15px;
  box-shadow: 0 0 0 1px var(--el-border-color-light) inset;
}

.submit-button {
  width: 100%;
  border-radius: 12px;
  height: 50px;
  font-weight: 600;
  font-size: 16px;
  margin: 20px 0;
}

.login-link {
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.login-link a {
  color: var(--el-color-primary);
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
}

/* Decoration */
.register-decoration .circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.1;
  z-index: 1;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: var(--el-color-primary);
  top: -100px;
  left: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: #409eff;
  bottom: -50px;
  right: -50px;
}
</style>
