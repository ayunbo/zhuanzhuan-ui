<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  CircleCheck,
  InfoFilled,
  Promotion,
  Refresh,
  Stamp,
  UploadFilled,
  WarnTriangleFilled,
} from '@element-plus/icons-vue'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'
import {
  fetchCurrentUserProfile,
  fetchSellerAuthResult,
  fetchSellerPortal,
  submitSellerAuth,
  uploadUserFile,
} from '@/api/user'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_SUFFIXES,
  IMAGE_UPLOAD_ACCEPT,
  OSS_UPLOAD_CATEGORY,
  UPLOAD_MAX_FILE_COUNT,
  UPLOAD_MAX_SIZE_MB,
} from '@/constants/upload'
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

const authStatus = computed(() => authResult.value?.status ?? null)
const isPending = computed(() => authStatus.value === 0)
const isApproved = computed(() => authStatus.value === 1)
const isRejected = computed(() => authStatus.value === 2)
const canEditForm = computed(() => !isPending.value && !isApproved.value)

const statusMeta = computed(() => {
  switch (authStatus.value) {
    case 0:
      return {
        tone: 'warning',
        icon: InfoFilled,
        title: '审核中',
        desc: '认证资料已提交，正在等待审核。',
        badge: '待审核',
      }
    case 1:
      return {
        tone: 'success',
        icon: CircleCheck,
        title: '已通过',
        desc: '你现在可以直接进入商品管理页面。',
        badge: '已通过',
      }
    case 2:
      return {
        tone: 'danger',
        icon: WarnTriangleFilled,
        title: '已驳回',
        desc: authResult.value?.reason ? `驳回原因：${authResult.value.reason}` : '请补充完整资料后重新提交。',
        badge: '重新提交',
      }
    default:
      return {
        tone: 'info',
        icon: Stamp,
        title: '卖家认证',
        desc: '填写真实信息并上传认证材料后即可提交审核。',
        badge: '未提交',
      }
  }
})

const submitButtonText = computed(() => (isRejected.value ? '重新提交认证' : '提交认证'))

async function loadData() {
  loadingResult.value = true
  try {
    const [profile, result] = await Promise.all([
      fetchCurrentUserProfile(),
      fetchSellerAuthResult().catch(() => null),
    ])

    form.realName = profile?.name || form.realName || ''
    form.studentNo = profile?.studentNo || form.studentNo || ''
    form.phone = profile?.phone || form.phone || ''
    authResult.value = result
    form.material = result?.material || form.material || ''
  } catch (error) {
    ElMessage.error(error.message || '加载认证信息失败')
  } finally {
    loadingResult.value = false
  }
}

function beforeMaterialUpload(file) {
  const suffix = typeof file?.name === 'string' ? file.name.split('.').pop()?.trim().toLowerCase() || '' : ''
  const mimeType = typeof file?.type === 'string' ? file.type.trim().toLowerCase() : ''
  const isAllowedImage = ALLOWED_IMAGE_SUFFIXES.includes(suffix) && ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)
  if (!isAllowedImage) {
    ElMessage.warning('仅支持 jpg/jpeg/png/webp/gif 格式图片')
    return false
  }

  const isLt5m = Number(file?.size || 0) <= UPLOAD_MAX_SIZE_MB * 1024 * 1024
  if (!isLt5m) {
    ElMessage.warning(`图片大小不能超过 ${UPLOAD_MAX_SIZE_MB}MB`)
    return false
  }

  return true
}

async function handleMaterialUpload(options) {
  uploadingMaterial.value = true
  try {
    const url = await uploadUserFile(options.file, OSS_UPLOAD_CATEGORY.SELLER_AUTH_MATERIAL)
    form.material = url
    options.onSuccess({ url })
    ElMessage.success('材料上传成功')
  } catch (error) {
    options.onError(error)
    ElMessage.error(error.message || '上传失败')
  } finally {
    uploadingMaterial.value = false
  }
}

async function handleSubmit() {
  const phoneValid = /^1\d{10}$/.test(form.phone.trim())
  if (!form.realName.trim() || !form.studentNo.trim() || !form.phone.trim() || !form.material || !phoneValid) {
    ElMessage.warning('请完善真实姓名、学号、手机号和认证材料')
    return
  }

  submitting.value = true
  try {
    await submitSellerAuth({
      realName: form.realName.trim(),
      studentNo: form.studentNo.trim(),
      phone: form.phone.trim(),
      material: form.material,
    })
    ElMessage.success('认证申请已提交')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function handleCheckPortal() {
  checkingPortal.value = true
  try {
    await fetchSellerPortal()
    ElMessage.success('卖家入口校验通过')
  } catch (error) {
    ElMessage.error(error.message || '当前账号尚未开通卖家入口')
  } finally {
    checkingPortal.value = false
  }
}

function goGoodsManage() {
  router.push('/seller/goods?create=1')
}

onMounted(() => loadData())
</script>

<template>
  <div class="seller-auth-page zz-page">
    <section class="page-head zz-white-panel">
      <div class="page-head__copy">
        <p>SELLER CENTER</p>
        <h1>卖家认证</h1>
      </div>

      <div class="page-head__actions">
        <el-button :icon="Refresh" :loading="loadingResult" @click="loadData">刷新状态</el-button>
        <el-button type="primary" :icon="Promotion" :loading="checkingPortal" @click="handleCheckPortal">
          校验卖家入口
        </el-button>
      </div>
    </section>

    <div class="auth-layout">
      <aside class="auth-side">
        <MarketplaceUserSidebar active-key="seller-auth" />

        <el-card class="side-card" shadow="never">
          <div class="side-card__title">当前状态</div>
          <div class="status-chip" :class="statusMeta.tone">
            <el-icon><component :is="statusMeta.icon" /></el-icon>
            <span>{{ statusMeta.badge }}</span>
          </div>
          <h3 class="side-title">{{ statusMeta.title }}</h3>
          <p class="side-line">{{ form.realName || authResult?.realName || '未填写姓名' }}</p>
          <p class="side-line">{{ form.studentNo || authResult?.studentNo || '未填写学号' }}</p>
          <el-button type="primary" block :loading="checkingPortal" @click="handleCheckPortal">校验卖家入口</el-button>
        </el-card>

        <el-card class="side-card" shadow="never">
          <div class="side-card__title">快捷入口</div>
          <el-button block @click="goGoodsManage">前往发布商品</el-button>
        </el-card>
      </aside>

      <main class="auth-main">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="panel-header">
              <div>
                <h2>认证资料</h2>
                <p>在这里填写真实姓名、学号、手机号，并上传认证材料。</p>
              </div>
              <el-tag :type="statusMeta.tone" round>{{ statusMeta.badge }}</el-tag>
            </div>
          </template>

          <div v-if="isApproved" class="state-stack">
            <div class="result-banner success">
              <strong>{{ statusMeta.title }}</strong>
              <span>{{ statusMeta.desc }}</span>
            </div>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="真实姓名">{{ authResult?.realName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="学号">{{ authResult?.studentNo || '-' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ authResult?.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="提交时间">{{ formatDateTime(authResult?.createTime) }}</el-descriptions-item>
            </el-descriptions>

            <div class="state-actions">
              <el-button type="primary" :loading="checkingPortal" @click="handleCheckPortal">校验卖家入口</el-button>
              <el-button @click="goGoodsManage">打开商品发布页</el-button>
            </div>
          </div>

          <div v-else-if="isPending" class="state-stack">
            <div class="result-banner warning">
              <strong>{{ statusMeta.title }}</strong>
              <span>{{ statusMeta.desc }}</span>
            </div>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="真实姓名">{{ authResult?.realName || form.realName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="学号">{{ authResult?.studentNo || form.studentNo || '-' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ authResult?.phone || form.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="提交时间">{{ formatDateTime(authResult?.createTime) }}</el-descriptions-item>
            </el-descriptions>

            <div class="state-actions">
              <el-button type="primary" :loading="checkingPortal" @click="handleCheckPortal">校验卖家入口</el-button>
              <el-button :loading="loadingResult" @click="loadData">刷新结果</el-button>
            </div>
          </div>

          <div v-else-if="canEditForm" class="state-stack">
            <div v-if="isRejected" class="result-banner danger">
              <strong>审核未通过</strong>
              <span>{{ authResult?.reason || '请补充完整资料后重新提交。' }}</span>
            </div>

            <el-form label-position="top" class="auth-form">
              <div class="form-grid">
                <el-form-item label="真实姓名" required>
                  <el-input v-model="form.realName" placeholder="请输入真实姓名" />
                </el-form-item>

                <el-form-item label="学号" required>
                  <el-input v-model="form.studentNo" placeholder="请输入学号" />
                </el-form-item>
              </div>

              <el-form-item label="手机号" required>
                <el-input v-model="form.phone" placeholder="用于接收审核结果" />
              </el-form-item>

              <el-form-item label="认证材料" required>
                <el-upload
                  class="material-uploader"
                  drag
                  :http-request="handleMaterialUpload"
                  :show-file-list="false"
                  :before-upload="beforeMaterialUpload"
                  :limit="UPLOAD_MAX_FILE_COUNT"
                  :on-exceed="() => ElMessage.warning('一次只能上传 1 张图片')"
                  :disabled="uploadingMaterial"
                  :accept="IMAGE_UPLOAD_ACCEPT"
                >
                  <div v-if="form.material" class="preview-wrap">
                    <img :src="form.material" alt="认证材料预览" />
                    <div class="mask">重新上传</div>
                  </div>
                  <template v-else>
                    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                    <div class="el-upload__text">将图片拖到此处，或点击上传</div>
                    <div class="upload-hint">请上传清晰的学生证或校园卡正面图片。</div>
                  </template>
                </el-upload>
              </el-form-item>

              <div class="form-footer">
                <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
                  {{ submitButtonText }}
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </el-form>
          </div>
        </el-card>
      </main>
    </div>
  </div>
</template>

<style scoped>
.seller-auth-page {
  display: grid;
  gap: 16px;
}

.page-head {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-top: 4px solid var(--zz-yellow);
}

.page-head__copy {
  display: grid;
  gap: 6px;
}

.page-head__copy p {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--zz-text-light);
  font-weight: 700;
}

.page-head__copy h1 {
  margin: 0;
  font-size: clamp(26px, 2.6vw, 38px);
  line-height: 1.1;
  color: var(--zz-black);
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.auth-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.auth-side {
  display: grid;
  gap: 16px;
}

.side-card {
  border-radius: 24px;
}

.side-card__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--zz-black);
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
}

.status-chip.info {
  background: #f5f7fa;
  color: #475467;
}

.status-chip.success {
  background: #eefaf2;
  color: #16804b;
}

.status-chip.warning {
  background: #fff8e8;
  color: #b46a11;
}

.status-chip.danger {
  background: #fff1f1;
  color: #c34a4a;
}

.side-title {
  margin: 0 0 6px;
  font-size: 18px;
  color: var(--zz-black);
}

.side-line {
  margin: 0 0 8px;
  color: var(--zz-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.panel-card {
  border-radius: 28px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.panel-header p {
  margin: 4px 0 0;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.state-stack {
  display: grid;
  gap: 16px;
}

.result-banner {
  padding: 14px 16px;
  border-radius: 18px;
  display: grid;
  gap: 4px;
}

.result-banner strong {
  font-size: 16px;
}

.result-banner span {
  font-size: 13px;
  line-height: 1.5;
  color: var(--zz-text-secondary);
}

.result-banner.success {
  background: #eefaf2;
  border: 1px solid #d3efd9;
}

.result-banner.warning {
  background: #fff8e8;
  border: 1px solid #f4e1ac;
}

.result-banner.danger {
  background: #fff1f1;
  border: 1px solid #f4c8c8;
}

.auth-form {
  display: grid;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.material-uploader :deep(.el-upload-dragger) {
  padding: 0;
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  border-color: var(--zz-border-strong);
  background: linear-gradient(180deg, #fffdf8 0%, #fff 100%);
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
  inset: 0;
  background: rgba(0, 0, 0, 0.34);
  color: #fff;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.preview-wrap:hover .mask {
  opacity: 1;
}

.upload-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--zz-text-secondary);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid var(--zz-border);
}

.state-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-head__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .state-actions {
    flex-direction: column;
  }
}
</style>
