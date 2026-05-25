<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Camera, Check, Refresh, SwitchButton, User } from '@element-plus/icons-vue'
import MarketplaceUserSidebar from '@/components/MarketplaceUserSidebar.vue'
import { ROLE_LABEL_MAP } from '@/constants/auth'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_SUFFIXES,
  IMAGE_UPLOAD_ACCEPT,
  OSS_UPLOAD_CATEGORY,
  UPLOAD_MAX_FILE_COUNT,
  UPLOAD_MAX_SIZE_MB,
} from '@/constants/upload'
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

const profileName = computed(() => profileForm.name || profileForm.studentNo || '校园用户')
const roleLabel = computed(() => ROLE_LABEL_MAP[profileForm.role] || '普通用户')
const avatarUrl = computed(() => profileForm.avatar || authStore.user.avatar || '')

function beforeAvatarUpload(file) {
  const suffix = typeof file?.name === 'string' ? file.name.split('.').pop()?.trim().toLowerCase() || '' : ''
  const mimeType = typeof file?.type === 'string' ? file.type.trim().toLowerCase() : ''

  if (!ALLOWED_IMAGE_SUFFIXES.includes(suffix) || !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    ElMessage.warning('仅支持 jpg/jpeg/png/webp/gif 格式图片')
    return false
  }

  if (Number(file?.size || 0) > UPLOAD_MAX_SIZE_MB * 1024 * 1024) {
    ElMessage.warning(`图片大小不能超过 ${UPLOAD_MAX_SIZE_MB}MB`)
    return false
  }

  return true
}

const profileMetrics = computed(() => [
  {
    label: '身份',
    value: roleLabel.value,
  },
  {
    label: '学号',
    value: profileForm.studentNo || '未绑定',
  },
  {
    label: '校园',
    value: profileForm.campus || '未填写',
  },
  {
    label: '头像',
    value: profileForm.avatar ? '已上传' : '未上传',
  },
])

const statusRows = computed(() => [
  {
    label: '资料同步',
    value: loading.value ? '加载中' : '已同步',
    hint: '来自 /user/profile 接口',
  },
  {
    label: '手机号',
    value: profileForm.phone || '未填写',
    hint: '用于通知和找回账号',
  },
  {
    label: '简介',
    value: profileForm.intro ? '已填写' : '待补充',
    hint: '个人展示文案，长度不超过 200 字',
  },
  {
    label: '登录状态',
    value: authStore.isLoggedIn ? '已登录' : '未登录',
    hint: '退出后会清空本地凭证',
  },
])

function fillForm(profile) {
  if (!profile) {
    return
  }

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
    ElMessage.error(error.message || '资料加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (profileForm.name && profileForm.name.length > 20) {
    ElMessage.warning('昵称最多 20 个字')
    return
  }

  if (profileForm.phone && !/^1\d{10}$/.test(profileForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }

  saving.value = true
  try {
    await updateCurrentUserProfile({
      name: profileForm.name?.trim() || null,
      phone: profileForm.phone?.trim() || null,
      avatar: profileForm.avatar?.trim() || null,
      campus: profileForm.campus?.trim() || null,
      intro: profileForm.intro?.trim() || null,
    })
    await loadProfile()
    ElMessage.success('资料已更新')
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleAvatarUpload(options) {
  avatarUploading.value = true
  try {
    const avatar = await uploadUserFile(options.file, OSS_UPLOAD_CATEGORY.USER_AVATAR)
    profileForm.avatar = avatar
    options.onSuccess({ url: avatar })
    ElMessage.success('头像上传成功')
  } catch (error) {
    options.onError(error)
    ElMessage.error(error.message || '头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function handleDeleteAccount() {
  try {
    await ElMessageBox.confirm('确认注销账号？该操作不可恢复。', '危险操作', {
      confirmButtonText: '确认注销',
      cancelButtonText: '取消',
      type: 'warning',
    })

    deleting.value = true
    await deleteCurrentUserProfile()
    authStore.logout()
    ElMessage.success('账号已注销')
    router.replace('/')
  } catch {
    // 用户取消
  } finally {
    deleting.value = false
  }
}

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  fillForm(authStore.user)
  loadProfile()
})
</script>

<template>
  <div class="profile-page zz-page">
    <section class="profile-banner zz-card">
      <div class="banner-copy">
        <p>MY ACCOUNT</p>
        <h1>个人中心</h1>
        <span>资料、头像、手机号、校园信息和账号状态都在这里维护。</span>
      </div>

      <div class="banner-meta">
        <article v-for="item in profileMetrics" :key="item.label" class="banner-stat">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <div class="profile-layout zz-two-column">
      <aside class="profile-side">
        <MarketplaceUserSidebar activeKey="profile" />
      </aside>

      <main class="profile-main">
        <el-card class="summary-card" shadow="never">
          <div class="summary-grid">
            <div class="avatar-block">
              <el-avatar :size="106" :src="avatarUrl || undefined">
                <el-icon :size="42"><User /></el-icon>
              </el-avatar>
              <el-upload
                class="avatar-upload"
                :show-file-list="false"
                :http-request="handleAvatarUpload"
                :before-upload="beforeAvatarUpload"
                :limit="UPLOAD_MAX_FILE_COUNT"
                :on-exceed="() => ElMessage.warning('单次只允许上传 1 张图片')"
                :accept="IMAGE_UPLOAD_ACCEPT"
              >
                <el-button circle :icon="Camera" :loading="avatarUploading" />
              </el-upload>
            </div>

            <div class="summary-copy">
              <p>当前账号</p>
              <h2>{{ profileName }}</h2>
              <div class="summary-tags">
                <el-tag round type="warning">{{ roleLabel }}</el-tag>
                <el-tag round>{{ profileForm.studentNo || '未绑定学号' }}</el-tag>
                <el-tag round :type="profileForm.avatar ? 'success' : 'info'">
                  {{ profileForm.avatar ? '头像已上传' : '头像未设置' }}
                </el-tag>
              </div>
              <dl class="summary-list">
                <div>
                  <dt>手机号</dt>
                  <dd>{{ profileForm.phone || '未填写' }}</dd>
                </div>
                <div>
                  <dt>校园</dt>
                  <dd>{{ profileForm.campus || '未填写' }}</dd>
                </div>
                <div class="summary-wide">
                  <dt>简介</dt>
                  <dd>{{ profileForm.intro || '暂未填写个人简介' }}</dd>
                </div>
              </dl>
            </div>

            <div class="summary-actions">
              <el-button :icon="Refresh" :loading="loading" @click="loadProfile">刷新资料</el-button>
              <el-button type="danger" plain :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
            </div>
          </div>
        </el-card>

        <div class="content-grid">
          <el-card class="form-card" shadow="never">
            <template #header>
              <div class="card-head">
                <div>
                  <h3>资料编辑</h3>
                  <p>仅保存真实资料，不做额外假数据填充。</p>
                </div>
                <el-tag round type="warning">可编辑</el-tag>
              </div>
            </template>

            <el-form label-position="top" class="profile-form">
              <div class="form-grid">
                <el-form-item label="昵称">
                  <el-input v-model="profileForm.name" maxlength="20" show-word-limit placeholder="用于对外展示" />
                </el-form-item>

                <el-form-item label="手机号">
                  <el-input v-model="profileForm.phone" placeholder="用于通知和联系" />
                </el-form-item>
              </div>

              <el-form-item label="校园">
                <el-select v-model="profileForm.campus" placeholder="选择校园" class="w-full">
                  <el-option label="主校区" value="主校区" />
                  <el-option label="东校区" value="东校区" />
                  <el-option label="西校区" value="西校区" />
                  <el-option label="北校区" value="北校区" />
                </el-select>
              </el-form-item>

              <el-form-item label="个人简介">
                <el-input
                  v-model="profileForm.intro"
                  type="textarea"
                  :rows="5"
                  maxlength="200"
                  show-word-limit
                  placeholder="补充你的交易习惯、校园位置或者闲置偏好"
                />
              </el-form-item>

              <div class="form-footer">
                <div class="footer-copy">
                  <strong>保存后会同步到账号资料</strong>
                  <span>头像、昵称、手机号和简介都会走真实更新接口。</span>
                </div>

                <div class="footer-actions">
                  <el-button type="primary" :icon="Check" :loading="saving" @click="handleSave">保存资料</el-button>
                  <el-button type="danger" text :loading="deleting" @click="handleDeleteAccount">注销账号</el-button>
                </div>
              </div>
            </el-form>
          </el-card>

          <el-card class="status-card" shadow="never">
            <template #header>
              <div class="card-head">
                <div>
                  <h3>资料状态</h3>
                  <p>这里是只读状态摘要，便于快速确认当前资料是否完整。</p>
                </div>
              </div>
            </template>

            <div class="status-list">
              <article v-for="item in statusRows" :key="item.label" class="status-item">
                <div class="status-label">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.hint }}</p>
              </article>
            </div>

            <el-alert
              class="status-note"
              title="说明"
              type="info"
              :closable="false"
              show-icon
              description="资料更新、头像上传和账号注销都保留真实接口，当前页面只是更紧凑的产品壳。"
            />
          </el-card>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 16px;
}

.profile-banner {
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 16px;
  align-items: end;
}

.banner-copy {
  display: grid;
  gap: 8px;
}

.banner-copy p {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--zz-text-light);
}

.banner-copy h1 {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.1;
  color: var(--zz-black);
}

.banner-copy span {
  color: var(--zz-text-secondary);
  line-height: 1.65;
}

.banner-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.banner-stat {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  display: grid;
  gap: 6px;
}

.banner-stat span {
  font-size: 12px;
  color: var(--zz-text-light);
}

.banner-stat strong {
  font-size: 16px;
  color: var(--zz-black);
}

.profile-layout {
  align-items: start;
}

.profile-side {
  position: sticky;
  top: 146px;
}

.profile-main {
  display: grid;
  gap: 16px;
}

.summary-card,
.form-card,
.status-card {
  border-radius: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
}

.avatar-block {
  position: relative;
}

.avatar-upload {
  position: absolute;
  right: -4px;
  bottom: -4px;
}

.summary-copy {
  display: grid;
  gap: 10px;
}

.summary-copy p {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--zz-text-light);
  text-transform: uppercase;
}

.summary-copy h2 {
  font-size: 30px;
  line-height: 1.1;
  color: var(--zz-black);
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-list div {
  border-radius: 16px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  padding: 12px;
}

.summary-wide {
  grid-column: 1 / -1;
}

.summary-list dt {
  font-size: 12px;
  color: var(--zz-text-light);
}

.summary-list dd {
  margin-top: 6px;
  color: var(--zz-black);
  font-weight: 600;
  line-height: 1.55;
  word-break: break-all;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-head h3 {
  font-size: 18px;
  color: var(--zz-black);
}

.card-head p {
  margin-top: 6px;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.profile-form {
  display: grid;
  gap: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.w-full {
  width: 100%;
}

.form-footer {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--zz-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-copy {
  display: grid;
  gap: 4px;
}

.footer-copy strong {
  font-size: 14px;
  color: var(--zz-black);
}

.footer-copy span {
  color: var(--zz-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-list {
  display: grid;
  gap: 12px;
}

.status-item {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  display: grid;
  gap: 8px;
}

.status-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.status-label span {
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.status-label strong {
  color: var(--zz-black);
  font-size: 15px;
}

.status-item p {
  color: var(--zz-text-secondary);
  line-height: 1.55;
  font-size: 13px;
}

.status-note {
  margin-top: 16px;
}

@media (max-width: 1080px) {
  .profile-banner,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .summary-actions {
    justify-content: flex-start;
  }

  .profile-side {
    position: static;
  }
}

@media (max-width: 760px) {
  .banner-meta,
  .form-grid,
  .summary-list {
    grid-template-columns: 1fr;
  }

  .form-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
