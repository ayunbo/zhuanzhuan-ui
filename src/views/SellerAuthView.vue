<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Stamp, 
  UploadFilled, 
  CircleCheck,
  Refresh,
  InfoFilled,
  WarnTriangleFilled,
  Promotion,
  ArrowRight
} from '@element-plus/icons-vue'
import {
  fetchCurrentUserProfile,
  fetchSellerAuthResult,
  fetchSellerPortal,
  submitSellerAuth,
  uploadUserFile,
} from '@/api/user'
import { OSS_UPLOAD_CATEGORY } from '@/constants/upload'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loadingResult = ref(false)
const submitting = ref(false)
const checkingPortal = ref(false)
const uploadingMaterial = ref(false)
const authResult = ref(null)

const form = reactive({
  realName: '',
  studentNo: '',
  phone: '',
  material: '',
})

// 状态枚举：0-审核中，1-审核通过，2-已驳回，null-未提交
const authStatus = computed(() => authResult.value?.status ?? null)

const statusConfig = computed(() => {
  switch (authStatus.value) {
    case 0: return { type: 'warning', icon: InfoFilled, title: '认证审核中', desc: '您的申请已提交，预计在 24 小时内完成审核' }
    case 1: return { type: 'success', icon: CircleCheck, title: '卖家认证成功', desc: '恭喜！您已获得赚赚平台的卖家发布权限' }
    case 2: return { type: 'danger', icon: WarnTriangleFilled, title: '认证申请被驳回', desc: `原因：${authResult.value?.reason || '材料不清晰'}` }
    default: return { type: 'info', icon: Stamp, title: '未认证卖家', desc: '完成学生身份认证，即可在校园内发布您的闲置好物' }
  }
})

async function loadData() {
  loadingResult.value = true
  try {
    const [profile, result] = await Promise.all([
      fetchCurrentUserProfile(),
      fetchSellerAuthResult().catch(() => null)
    ])
    form.studentNo = profile?.studentNo || ''
    form.phone = profile?.phone || ''
    authResult.value = result
  } catch (error) {
    ElMessage.error('无法同步认证数据')
  } finally {
    loadingResult.value = false
  }
}

async function handleMaterialUpload(options) {
  uploadingMaterial.value = true
  try {
    const url = await uploadUserFile(options.file, OSS_UPLOAD_CATEGORY.SELLER_AUTH_MATERIAL)
    form.material = url
    options.onSuccess(url)
    ElMessage.success('证明材料上传成功')
  } catch (error) {
    options.onError(error)
    ElMessage.error('上传失败')
  } finally {
    uploadingMaterial.value = false
  }
}

async function handleSubmit() {
  if (!form.realName || !form.phone || !form.material) {
    return ElMessage.warning('请填写完整信息并上传证明材料')
  }
  submitting.value = true
  try {
    await submitSellerAuth({ ...form })
    ElMessage.success('认证申请已提交')
    await loadData()
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    submitting.value = false
  }
}

async function handleCheckPortal() {
  checkingPortal.value = true
  try {
    await fetchSellerPortal()
    ElMessage.success('卖家权限校验通过，快去发布宝贝吧！')
  } catch {
    ElMessage.error('暂无卖家权限')
  } finally {
    checkingPortal.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="zz-auth-container">
    <el-card class="unified-card">
      <!-- 头部：动态状态区 -->
      <div class="card-hero" :class="statusConfig.type">
        <div class="status-icon-wrap">
          <el-icon><component :is="statusConfig.icon" /></el-icon>
        </div>
        <div class="hero-text">
          <h2>{{ statusConfig.title }}</h2>
          <p>{{ statusConfig.desc }}</p>
        </div>
        <div class="hero-actions">
          <el-button circle :icon="Refresh" :loading="loadingResult" @click="loadData"></el-button>
        </div>
      </div>

      <el-divider />

      <!-- 主体内容 -->
      <div class="card-body">
        <!-- 情况 A: 已认证 - 显示认证详情 -->
        <div v-if="authStatus === 1" class="success-content">
          <el-descriptions title="身份认证详情" :column="2" border>
            <el-descriptions-item label="真实姓名">{{ authResult.realName }}</el-descriptions-item>
            <el-descriptions-item label="学号">{{ authResult.studentNo }}</el-descriptions-item>
            <el-descriptions-item label="认证时间">{{ formatDateTime(authResult.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="身份类型">校园卖家</el-descriptions-item>
          </el-descriptions>
          <div class="success-actions">
            <el-button type="success" size="large" round :icon="Promotion" :loading="checkingPortal" @click="handleCheckPortal">
              校验卖家功能权限
            </el-button>
            <el-button size="large" round plain @click="router.push('/')">返回首页逛逛</el-button>
          </div>
        </div>

        <!-- 情况 B: 审核中 - 显示等待提示 -->
        <div v-else-if="authStatus === 0" class="processing-content">
          <div class="wait-card">
            <el-icon class="is-loading"><Refresh /></el-icon>
            <h3>正在为您加急审核</h3>
            <p>我们正在核实您的学号与学生证信息，审核结果将通过手机号发送通知给您。</p>
            <el-descriptions :column="1" border class="m-top">
              <el-descriptions-item label="提交时间">{{ formatDateTime(authResult.createTime) }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ authResult.phone }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 情况 C: 未认证或被驳回 - 显示表单 -->
        <div v-else class="form-content">
          <el-form label-position="top" class="auth-form">
            <el-row :gutter="40">
              <el-col :xs="24" :sm="12">
                <el-form-item label="真实姓名" required>
                  <el-input v-model="form.realName" placeholder="姓名需与证件一致" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="绑定手机号" required>
                  <el-input v-model="form.phone" placeholder="接收审核通知" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="学生证 / 校园卡照片" required>
              <el-upload
                class="material-uploader"
                drag
                :http-request="handleMaterialUpload"
                :show-file-list="false"
              >
                <div v-if="form.material" class="preview-wrap">
                  <img :src="form.material" />
                  <div class="mask">点击重新上传</div>
                </div>
                <template v-else>
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">将照片拖到此处或 <em>点击上传</em></div>
                </template>
              </el-upload>
              <div class="upload-tip">请上传带照片和学号的一面，确保文字清晰可见</div>
            </el-form-item>

            <div class="form-footer">
              <el-button type="primary" size="large" round block :loading="submitting" @click="handleSubmit">
                提交身份认证申请
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </el-card>

    <!-- 安全提醒 -->
    <div class="safety-alert">
      <el-alert
        title="隐私保护声明"
        type="info"
        description="您的个人信息仅用于赚赚平台的卖家资格审核，系统将对所有证件材料进行加密存储，不会泄露给第三方或其他用户。"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<style scoped>
.zz-auth-container {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.unified-card {
  padding: 10px;
}

/* Hero Section */
.card-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  border-radius: 12px;
  transition: all 0.3s;
}

.status-icon-wrap {
  font-size: 48px;
  display: flex;
  align-items: center;
}

.hero-text {
  flex: 1;
}

.hero-text h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 4px 0;
}

.hero-text p {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
}

/* Status Colors */
.card-hero.info { background: #f5f5f7; color: #1d1d1f; }
.card-hero.success { background: #f0fdf4; color: #166534; }
.card-hero.warning { background: #fffbeb; color: #92400e; }
.card-hero.danger { background: #fef2f2; color: #991b1b; }

/* Body Content */
.card-body {
  padding: 20px;
}

.success-actions {
  margin-top: 40px;
  display: flex;
  gap: 16px;
}

.wait-card {
  text-align: center;
  padding: 40px 0;
}

.wait-card .el-icon {
  font-size: 64px;
  color: var(--zz-primary);
  margin-bottom: 24px;
}

.wait-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}

.wait-card p {
  color: var(--zz-text-secondary);
  max-width: 400px;
  margin: 0 auto 32px;
}

.m-top {
  max-width: 400px;
  margin: 0 auto;
}

/* Form Styles */
.material-uploader :deep(.el-upload-dragger) {
  padding: 0;
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 16px;
}

.preview-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-wrap .mask {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-wrap:hover .mask { opacity: 1; }

.upload-tip {
  font-size: 13px;
  color: var(--zz-text-secondary);
  margin-top: 12px;
}

.form-footer {
  margin-top: 48px;
  border-top: 1px solid #f2f2f2;
  padding-top: 32px;
}

.safety-alert {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .card-hero {
    flex-direction: column;
    text-align: center;
  }
  .success-actions {
    flex-direction: column;
  }
}
</style>
