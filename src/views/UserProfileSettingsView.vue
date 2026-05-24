<!-- 用户资料 API: GET /api/user/profile, PUT /api/user/profile, POST /api/user/upload; 可编辑字段: name, phone, avatar, campus, intro -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Camera, LoaderCircle, Save } from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import request, {
  AUTH_CHANGED_EVENT,
  getAuthUser,
  getToken,
  isLoggedIn as checkLoggedIn,
  setAuthSession,
} from '@/utils/request'

const PHONE_PATTERN = /^1\d{10}$/
const DISPLAY_NAME_PATTERN = /^[\u4e00-\u9fa5A-Za-z0-9_\-\s]{1,20}$/

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const avatarInputRef = ref(null)

const profile = reactive({
  id: null,
  studentNo: '',
  name: '',
  phone: '',
  avatar: '',
  role: null,
  status: null,
  campus: '',
  intro: '',
  scoreAvg: null,
  reviewCount: 0,
  createTime: '',
  updateTime: '',
})

const form = reactive({
  name: '',
  phone: '',
  avatar: '',
  campus: '',
  intro: '',
})

const errors = reactive({
  name: '',
  phone: '',
  campus: '',
  intro: '',
  submit: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const canSubmit = computed(() => !saving.value && !uploadingAvatar.value)
const introCount = computed(() => form.intro.trim().length)

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2600)
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function applyProfile(data = {}) {
  profile.id = data.id ?? null
  profile.studentNo = data.studentNo ?? ''
  profile.name = data.name ?? ''
  profile.phone = data.phone ?? ''
  profile.avatar = data.avatar ?? ''
  profile.role = data.role ?? null
  profile.status = data.status ?? null
  profile.campus = data.campus ?? ''
  profile.intro = data.intro ?? ''
  profile.scoreAvg = data.scoreAvg ?? null
  profile.reviewCount = data.reviewCount ?? 0
  profile.createTime = data.createTime ?? ''
  profile.updateTime = data.updateTime ?? ''
}

function syncFormWithProfile() {
  form.name = profile.name || profile.studentNo || ''
  form.phone = profile.phone || ''
  form.avatar = profile.avatar || ''
  form.campus = profile.campus || ''
  form.intro = profile.intro || ''
}

function syncAuthCache() {
  const existing = getAuthUser() || {}
  const token = getToken()

  if (!token) {
    return
  }

  setAuthSession(
    {
      ...existing,
      token,
      studentNo: profile.studentNo || existing.studentNo || '',
      name: profile.name || profile.studentNo || existing.name || '',
      avatar: profile.avatar || '',
    },
    { notify: false },
  )
}

function resetErrors() {
  errors.name = ''
  errors.phone = ''
  errors.campus = ''
  errors.intro = ''
  errors.submit = ''
}

function validateName() {
  const value = form.name.trim()
  if (!value) {
    errors.name = '请输入昵称'
    return false
  }

  if (!DISPLAY_NAME_PATTERN.test(value)) {
    errors.name = '昵称需为 1-20 位中文、字母、数字、下划线或短横线'
    return false
  }

  errors.name = ''
  return true
}

function validatePhone() {
  const value = form.phone.trim()
  if (!value) {
    errors.phone = ''
    return true
  }

  if (!PHONE_PATTERN.test(value)) {
    errors.phone = '手机号格式不正确'
    return false
  }

  errors.phone = ''
  return true
}

function validateCampus() {
  if (form.campus.trim().length > 30) {
    errors.campus = '校区信息请控制在 30 个字以内'
    return false
  }

  errors.campus = ''
  return true
}

function validateIntro() {
  if (introCount.value > 120) {
    errors.intro = '个性签名请控制在 120 个字以内'
    return false
  }

  errors.intro = ''
  return true
}

function validateForm() {
  resetErrors()

  const nameValid = validateName()
  const phoneValid = validatePhone()
  const campusValid = validateCampus()
  const introValid = validateIntro()

  return nameValid && phoneValid && campusValid && introValid
}

async function fetchProfile() {
  loading.value = true

  try {
    const { data } = await request.get('/user/profile')

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '个人资料加载失败')
    }

    applyProfile(data.data)
    syncFormWithProfile()
    syncAuthCache()
  } catch (error) {
    showToast(getErrorMessage(error, '个人资料加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

async function handleAvatarChange(event) {
  const file = event.target?.files?.[0]
  if (!file) {
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('头像图片不能超过 5MB', 'error')
    event.target.value = ''
    return
  }

  uploadingAvatar.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'avatar')

    const { data } = await request.post('/user/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '头像上传失败')
    }

    form.avatar = data.data
    showToast('头像上传成功')
  } catch (error) {
    showToast(getErrorMessage(error, '头像上传失败'), 'error')
  } finally {
    uploadingAvatar.value = false
    event.target.value = ''
  }
}

async function handleSave() {
  if (!validateForm()) {
    showToast('请先修正表单内容', 'error')
    return
  }

  saving.value = true
  errors.submit = ''

  try {
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      avatar: form.avatar.trim(),
      campus: form.campus.trim(),
      intro: form.intro.trim(),
    }

    const { data } = await request.put('/user/profile', payload)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '修改失败')
    }

    await fetchProfile()
    showToast('修改成功')
  } catch (error) {
    errors.submit = getErrorMessage(error, '修改失败')
    showToast(errors.submit, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/user')
}

onMounted(() => {
  fetchProfile()
  window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
  window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
})

function handleAuthChanged() {
  if (!checkLoggedIn()) {
    return
  }

  fetchProfile()
}
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-sm">
      <div class="border-b border-slate-100 pb-5">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 text-sm font-medium text-slate-400">
            <button
              type="button"
              class="inline-flex items-center gap-1 transition hover:text-slate-700"
              @click="goBack"
            >
              <ArrowLeft class="h-4 w-4" />
              返回
            </button>
          </div>
          <h1 class="text-2xl font-black tracking-tight text-slate-950">个人资料</h1>
          <p class="text-sm text-slate-400">修改后会同步更新到导航栏与个人中心展示信息</p>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-[420px] items-center justify-center">
        <div
          class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500"
        >
          <LoaderCircle class="h-4 w-4 animate-spin" />
          正在加载个人资料
        </div>
      </div>

      <div v-else class="grid gap-6 pt-7 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div class="space-y-4">
          <div class="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div class="flex flex-col items-center gap-4">
              <div class="rounded-[28px] bg-white p-2 shadow-sm">
                <Avatar
                  size="lg"
                  :src="form.avatar"
                  :fallback="(form.name || profile.studentNo || '校').slice(0, 1)"
                  :alt="form.name || profile.studentNo || '校园同学'"
                />
              </div>

              <div class="space-y-1 text-center">
                <p class="text-base font-semibold text-slate-900">
                  {{ form.name || profile.studentNo || '校园同学' }}
                </p>
                <p class="text-xs text-slate-400">学号 {{ profile.studentNo || '未绑定' }}</p>
              </div>

              <input
                ref="avatarInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleAvatarChange"
              />

              <button
                type="button"
                class="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-600"
                :disabled="uploadingAvatar"
                @click="triggerAvatarUpload"
              >
                <LoaderCircle v-if="uploadingAvatar" class="h-4 w-4 animate-spin" />
                <Camera v-else class="h-4 w-4" />
                上传头像
              </button>

              <p class="text-center text-xs leading-5 text-slate-400">
                支持 jpg、png，单张不超过 5MB
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="grid gap-5 md:grid-cols-2">
            <div class="space-y-2">
              <p class="text-sm font-semibold text-slate-700">昵称</p>
              <Input v-model="form.name" type="text" placeholder="请输入昵称" @blur="validateName" />
              <p v-if="errors.name" class="text-sm font-medium text-rose-500">
                {{ errors.name }}
              </p>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-semibold text-slate-700">手机号</p>
              <Input
                v-model="form.phone"
                type="text"
                inputmode="numeric"
                placeholder="请输入手机号"
                @blur="validatePhone"
              />
              <p v-if="errors.phone" class="text-sm font-medium text-rose-500">
                {{ errors.phone }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-700">校区信息</p>
            <Input
              v-model="form.campus"
              type="text"
              placeholder="例如：广州大学城校区"
              @blur="validateCampus"
            />
            <p v-if="errors.campus" class="text-sm font-medium text-rose-500">
              {{ errors.campus }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-700">个性签名</p>
            <textarea
              v-model="form.intro"
              rows="5"
              placeholder="写一句介绍自己或交易风格的话"
              class="w-full resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              @blur="validateIntro"
            />
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span v-if="errors.intro" class="font-medium text-rose-500">
                {{ errors.intro }}
              </span>
              <span>{{ introCount }}/120</span>
            </div>
          </div>

          <p v-if="errors.submit" class="text-sm font-medium text-rose-500">
            {{ errors.submit }}
          </p>

          <div class="flex justify-end">
            <Button type="button" :disabled="!canSubmit" @click="handleSave">
              <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              保存修改
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-6 right-6 z-[140] rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>
