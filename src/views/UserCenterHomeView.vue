<!-- 用户资料 API: GET /api/user/profile, PUT /api/user/profile, POST /api/user/upload; 可编辑字段: name, phone, avatar, campus, intro -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  BadgeCheck,
  Camera,
  GraduationCap,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import request, { getAuthUser, getToken, setAuthSession } from '@/utils/request'

const PHONE_PATTERN = /^1\d{10}$/
const DISPLAY_NAME_PATTERN = /^[\u4e00-\u9fa5A-Za-z0-9_\-\s]{1,20}$/
const HTTP_URL_PATTERN = /^https?:\/\/.+/i

const loading = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const editOpen = ref(false)
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
  avatar: '',
  campus: '',
  intro: '',
  submit: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const displayName = computed(() => profile.name || profile.studentNo || '校园同学')
const displayCampus = computed(() => profile.campus || '暂未填写校区')
const displayIntro = computed(() => profile.intro || '这个同学还没有留下个性签名。')
const displayScore = computed(() => {
  if (profile.scoreAvg === null || profile.scoreAvg === undefined || profile.scoreAvg === '') {
    return '暂无评分'
  }
  const scoreNumber = Number(profile.scoreAvg)
  return Number.isNaN(scoreNumber) ? '暂无评分' : scoreNumber.toFixed(1)
})
const scoreBadge = computed(() => {
  const scoreNumber = Number(profile.scoreAvg)
  if (!Number.isNaN(scoreNumber) && scoreNumber >= 4.8) {
    return '信用极佳'
  }
  if (!Number.isNaN(scoreNumber) && scoreNumber >= 4.3) {
    return '信用优秀'
  }
  return '校园实名用户'
})
const roleText = computed(() => (Number(profile.role) === 2 ? '认证卖家' : '普通用户'))
const statusText = computed(() => (Number(profile.status) === 1 ? '账号正常' : '状态受限'))
const joinedText = computed(() => formatDate(profile.createTime))
const canSubmit = computed(() => !saving.value && !uploadingAvatar.value)

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

function formatDate(value) {
  if (!value) {
    return '刚刚加入'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚加入'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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

  setAuthSession({
    ...existing,
    token,
    studentNo: profile.studentNo || existing.studentNo || '',
    name: profile.name || profile.studentNo || existing.name || '',
    avatar: profile.avatar || '',
  })
}

function resetErrors() {
  errors.name = ''
  errors.phone = ''
  errors.avatar = ''
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

function validateAvatar() {
  const value = form.avatar.trim()
  if (!value) {
    errors.avatar = ''
    return true
  }

  if (!HTTP_URL_PATTERN.test(value)) {
    errors.avatar = '头像地址需为 http 或 https 链接'
    return false
  }

  errors.avatar = ''
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
  if (form.intro.trim().length > 120) {
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
  const avatarValid = validateAvatar()
  const campusValid = validateCampus()
  const introValid = validateIntro()

  return nameValid && phoneValid && avatarValid && campusValid && introValid
}

async function fetchProfile() {
  loading.value = true

  try {
    const { data } = await request.get('/user/profile')

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '个人资料加载失败')
    }

    applyProfile(data.data)
    syncAuthCache()

    if (editOpen.value) {
      syncFormWithProfile()
    }
  } catch (error) {
    showToast(getErrorMessage(error, '个人资料加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function handleDialogOpenChange(value) {
  editOpen.value = value

  if (value) {
    resetErrors()
    syncFormWithProfile()
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
    errors.avatar = ''
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

    editOpen.value = false
    showToast('修改成功')
    await fetchProfile()
  } catch (error) {
    errors.submit = getErrorMessage(error, '修改失败')
    showToast(errors.submit, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchProfile()
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
})
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-sm">
      <div class="bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] px-7 py-7">
        <div v-if="loading" class="flex min-h-[250px] items-center justify-center">
          <div class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500">
            <LoaderCircle class="h-4 w-4 animate-spin" />
            正在加载个人资料
          </div>
        </div>

        <div v-else class="flex items-start justify-between gap-6">
          <div class="flex items-start gap-5">
            <div class="rounded-[28px] bg-white/70 p-2 shadow-[0_24px_50px_-36px_rgba(249,115,22,0.75)]">
              <Avatar
                size="lg"
                :src="profile.avatar"
                :fallback="displayName.slice(0, 1)"
                :alt="displayName"
              />
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-black tracking-tight text-slate-950">
                    {{ displayName }}
                  </h1>
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    <ShieldCheck class="h-3.5 w-3.5" />
                    {{ scoreBadge }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span class="inline-flex items-center gap-1.5">
                    <GraduationCap class="h-4 w-4" />
                    学号 {{ profile.studentNo || '未绑定' }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <MapPin class="h-4 w-4" />
                    {{ displayCampus }}
                  </span>
                  <span>评分 {{ displayScore }}</span>
                  <span>评价 {{ profile.reviewCount || 0 }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <Star class="h-3.5 w-3.5 text-amber-500" />
                  {{ roleText }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <BadgeCheck class="h-3.5 w-3.5 text-sky-500" />
                  {{ statusText }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  <Sparkles class="h-3.5 w-3.5 text-brand-500" />
                  加入于 {{ joinedText }}
                </span>
              </div>

              <div class="max-w-2xl rounded-3xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_14px_35px_-28px_rgba(15,23,42,0.35)]">
                {{ displayIntro }}
              </div>
            </div>
          </div>

          <Dialog :open="editOpen" @update:open="handleDialogOpenChange">
            <Button variant="secondary" @click="handleDialogOpenChange(true)">
              编辑资料
            </Button>

            <DialogContent class="max-w-[680px] p-0">
              <DialogHeader class="border-b border-slate-100 px-7 py-6">
                <DialogTitle class="text-2xl font-black tracking-tight text-slate-950">
                  编辑资料
                </DialogTitle>
              </DialogHeader>

              <div class="space-y-6 px-7 py-7">
                <div class="grid gap-6 md:grid-cols-[168px_minmax(0,1fr)]">
                  <div class="space-y-4">
                    <p class="text-sm font-semibold text-slate-700">头像</p>

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

                    <div class="space-y-2">
                      <p class="text-sm font-semibold text-slate-700">头像链接</p>
                      <Input
                        v-model="form.avatar"
                        type="text"
                        placeholder="上传头像后会自动填充，也可手动粘贴链接"
                        @blur="validateAvatar"
                      />
                      <p v-if="errors.avatar" class="text-sm font-medium text-rose-500">
                        {{ errors.avatar }}
                      </p>
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
                        rows="4"
                        placeholder="写一句介绍自己或交易风格的话"
                        class="w-full resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        @blur="validateIntro"
                      />
                      <div class="flex items-center justify-between text-xs text-slate-400">
                        <span v-if="errors.intro" class="font-medium text-rose-500">
                          {{ errors.intro }}
                        </span>
                        <span v-else>让买家更快认识你</span>
                        <span>{{ form.intro.trim().length }}/120</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p v-if="errors.submit" class="text-sm font-medium text-rose-500">
                  {{ errors.submit }}
                </p>

                <div class="flex justify-end gap-3">
                  <Button variant="outline" type="button" @click="handleDialogOpenChange(false)">
                    取消
                  </Button>
                  <Button type="button" :disabled="!canSubmit" @click="handleSave">
                    <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />
                    保存
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>

    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-sm">
      <div class="border-b border-slate-100 pb-4">
        <div class="flex items-center gap-8 text-sm font-semibold">
          <button type="button" class="border-b-2 border-slate-950 pb-3 text-slate-950">
            宝贝
          </button>
          <button type="button" class="pb-3 text-slate-400 transition hover:text-slate-700">
            信用及评价
          </button>
        </div>
      </div>

      <div class="flex min-h-[340px] flex-col items-center justify-center gap-5 text-center">
        <div
          class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        >
          <Package class="h-10 w-10" />
        </div>
        <div class="space-y-2">
          <p class="text-lg font-semibold text-slate-800">暂无商品</p>
          <p class="text-sm text-slate-400">你的闲置宝贝上架后会展示在这里</p>
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
