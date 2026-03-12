<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  Phone, 
  Location, 
  Camera,
  Refresh,
  Delete,
  Check,
  Promotion,
  SwitchButton
} from '@element-plus/icons-vue'
import { ROLE_LABEL_MAP } from '@/constants/auth'
import { OSS_UPLOAD_CATEGORY } from '@/constants/upload'
import { useAuthStore } from '@/stores/auth'
import {
  deleteCurrentUserProfile,
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
  uploadUserFile,
} from '@/api/user'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const avatarUploading = ref(false)

const profileForm = reactive({
  studentNo: '',
  role: null,
  name: '',
  phone: '',
  avatar: '',
  campus: '',
  intro: '',
})

const roleLabel = computed(() => ROLE_LABEL_MAP[profileForm.role] || '未认证用户')

function fillForm(profile) {
  if (!profile) return
  profileForm.studentNo = profile.studentNo || ''
  profileForm.role = profile.role ?? null
  profileForm.name = profile.name || ''
  profileForm.phone = profile.phone || ''
  profileForm.avatar = profile.avatar || ''
  profileForm.campus = profile.campus || ''
  profileForm.intro = profile.intro || ''
}

async function loadProfile() {
  loading.value = true
  try {
    const profile = await fetchCurrentUserProfile()
    fillForm(profile)
    authStore.updateUserProfile(profile)
  } catch (error) {
    ElMessage.error(error.message || '加载资料失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (profileForm.name && profileForm.name.length > 20) {
    return ElMessage.warning('昵称长度不能超过20位')
  }
  if (profileForm.phone && !/^1\d{10}$/.test(profileForm.phone)) {
    return ElMessage.warning('请输入正确的11位手机号')
  }

  saving.value = true
  try {
    const payload = {
      name: profileForm.name?.trim() || null,
      phone: profileForm.phone?.trim() || null,
      avatar: profileForm.avatar?.trim() || null,
      campus: profileForm.campus?.trim() || null,
      intro: profileForm.intro?.trim() || null,
    }

    await updateCurrentUserProfile(payload)
    await loadProfile()
    ElMessage.success('个人资料已更新')
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    saving.value = false
  }
}

async function handleAvatarUpload(options) {
  avatarUploading.value = true
  try {
    const avatarUrl = await uploadUserFile(options.file, OSS_UPLOAD_CATEGORY.USER_AVATAR)
    profileForm.avatar = avatarUrl
    options.onSuccess(avatarUrl)
    ElMessage.success('头像已上传，保存后生效')
  } catch (error) {
    options.onError(error)
    ElMessage.error('图片上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function handleDeleteAccount() {
  try {
    await ElMessageBox.confirm('注销后数据无法找回，且卖家身份无法注销。确认继续？', '危险操作', {
      confirmButtonText: '确定注销',
      cancelButtonText: '取消',
      type: 'error',
      roundButton: true
    })
    deleting.value = true
    await deleteCurrentUserProfile()
    authStore.logout()
    ElMessage.success('账号已注销')
    router.replace('/')
  } catch { /* Cancel */ } finally {
    deleting.value = false
  }
}

const handleLogout = () => {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

onMounted(() => loadProfile())
</script>

<template>
  <div class="zz-profile-container">
    <el-card class="unified-card">
      <!-- 顶部：头像与身份摘要 -->
      <div class="card-hero">
        <div class="avatar-wrap">
          <el-avatar :size="100" :src="profileForm.avatar || undefined">
            <el-icon :size="40"><User /></el-icon>
          </el-avatar>
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :http-request="handleAvatarUpload"
            accept="image/*"
          >
            <el-button circle :icon="Camera" :loading="avatarUploading" size="small"></el-button>
          </el-upload>
        </div>
        <div class="hero-info">
          <h2>{{ profileForm.name || '赚赚校友' }}</h2>
          <div class="hero-tags">
            <el-tag round :type="profileForm.role === 2 ? 'success' : 'info'" effect="light">
              {{ roleLabel }}
            </el-tag>
            <span class="uid-tag">学号：{{ profileForm.studentNo }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <el-button round :icon="Refresh" :loading="loading" @click="loadProfile">刷新</el-button>
          <el-button round type="danger" plain :icon="SwitchButton" @click="handleLogout">退出</el-button>
        </div>
      </div>

      <el-divider />

      <!-- 中部：详细表单 -->
      <div class="card-body">
        <el-form label-position="top" class="profile-form">
          <el-row :gutter="40">
            <el-col :xs="24" :sm="12">
              <el-form-item label="公开昵称">
                <el-input v-model="profileForm.name" placeholder="起个好听的名字" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="联系电话">
                <el-input v-model="profileForm.phone" placeholder="仅用于交易联系" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="所在校区">
            <el-select v-model="profileForm.campus" placeholder="请选择您的活动校区" class="w-full">
              <el-option label="主校区" value="主校区" />
              <el-option label="东校区" value="东校区" />
              <el-option label="西校区" value="西校区" />
              <el-option label="北校区" value="北校区" />
            </el-select>
          </el-form-item>

          <el-form-item label="个性简介">
            <el-input 
              v-model="profileForm.intro" 
              type="textarea" 
              :rows="4" 
              placeholder="介绍一下自己，或者您的交易偏好..."
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <!-- 底部：操作区 -->
          <div class="form-footer">
            <el-button type="primary" size="large" round :icon="Check" :loading="saving" @click="handleSave" class="save-btn">
              保存全部修改
            </el-button>
            <el-button type="danger" text @click="handleDeleteAccount" :loading="deleting">
              注销账户
            </el-button>
          </div>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.zz-profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.unified-card {
  padding: 20px;
}

/* Hero Header */
.card-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 0;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-uploader {
  position: absolute;
  bottom: 0;
  right: 0;
}

.hero-info {
  flex: 1;
}

.hero-info h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 8px 0;
}

.hero-tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.uid-tag {
  font-size: 13px;
  color: var(--zz-text-secondary);
}

.hero-actions {
  display: flex;
  gap: 10px;
}

/* Card Body */
.card-body {
  padding: 20px 0;
}

.w-full {
  width: 100%;
}

.form-footer {
  margin-top: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f2f2f2;
  padding-top: 24px;
}

.save-btn {
  padding-left: 40px !important;
  padding-right: 40px !important;
}

@media (max-width: 768px) {
  .card-hero {
    flex-direction: column;
    text-align: center;
  }
  .hero-tags {
    justify-content: center;
  }
  .hero-actions {
    margin-top: 16px;
  }
  .form-footer {
    flex-direction: column;
    gap: 20px;
  }
}
</style>
