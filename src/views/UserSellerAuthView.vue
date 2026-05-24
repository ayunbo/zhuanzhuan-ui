<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import request from '@/utils/request'

const PHONE_PATTERN = /^1\d{10}$/
const SELLER_AUTH_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
}

const loading = ref(true)
const submitting = ref(false)
const uploading = ref(false)
const materialInputRef = ref(null)

const profile = reactive({
  studentNo: '',
  name: '',
  phone: '',
})

const form = reactive({
  realName: '',
  studentNo: '',
  phone: '',
  material: '',
})

const authResult = reactive({
  id: null,
  realName: '',
  studentNo: '',
  phone: '',
  material: '',
  status: null,
  statusDesc: '',
  reason: '',
  createTime: '',
  updateTime: '',
})

const errors = reactive({
  realName: '',
  phone: '',
  material: '',
  submit: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const hasAuthRecord = ref(false)

const showForm = computed(
  () =>
    !hasAuthRecord.value ||
    authResult.status === SELLER_AUTH_STATUS.REJECTED ||
    authResult.status === null,
)
const isPending = computed(() => hasAuthRecord.value && authResult.status === SELLER_AUTH_STATUS.PENDING)
const isApproved = computed(
  () => hasAuthRecord.value && authResult.status === SELLER_AUTH_STATUS.APPROVED,
)
const statusText = computed(() => {
  if (isApproved.value) {
    return authResult.statusDesc || '已认证'
  }
  if (isPending.value) {
    return authResult.statusDesc || '审核中'
  }
  if (hasAuthRecord.value && authResult.status === SELLER_AUTH_STATUS.REJECTED) {
    return authResult.statusDesc || '已驳回'
  }
  return '未认证'
})
const statusClass = computed(() => {
  if (isApproved.value) {
    return 'bg-emerald-50 text-emerald-700'
  }
  if (isPending.value) {
    return 'bg-amber-50 text-amber-700'
  }
  if (hasAuthRecord.value && authResult.status === SELLER_AUTH_STATUS.REJECTED) {
    return 'bg-rose-50 text-rose-700'
  }
  return 'bg-slate-100 text-slate-600'
})
const materialName = computed(() => {
  if (!form.material) {
    return ''
  }

  const cleanUrl = form.material.split('?')[0]
  const segments = cleanUrl.split('/')
  return segments[segments.length - 1] || '已上传认证材料'
})
const maskedRealName = computed(() => maskRealName(authResult.realName))
const maskedStudentNo = computed(() => maskStudentNo(authResult.studentNo))
const maskedPhone = computed(() => maskPhone(authResult.phone))

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

function resetErrors() {
  errors.realName = ''
  errors.phone = ''
  errors.material = ''
  errors.submit = ''
}

function resetAuthResult() {
  authResult.id = null
  authResult.realName = ''
  authResult.studentNo = ''
  authResult.phone = ''
  authResult.material = ''
  authResult.status = null
  authResult.statusDesc = ''
  authResult.reason = ''
  authResult.createTime = ''
  authResult.updateTime = ''
}

function syncFormFromProfile() {
  if (!form.studentNo) {
    form.studentNo = profile.studentNo || ''
  }

  if (!form.phone) {
    form.phone = profile.phone || ''
  }
}

function applyAuthResult(data = {}) {
  authResult.id = data.id ?? null
  authResult.realName = data.realName ?? ''
  authResult.studentNo = data.studentNo ?? ''
  authResult.phone = data.phone ?? ''
  authResult.material = data.material ?? ''
  authResult.status = data.status ?? null
  authResult.statusDesc = data.statusDesc ?? ''
  authResult.reason = data.reason ?? ''
  authResult.createTime = data.createTime ?? ''
  authResult.updateTime = data.updateTime ?? ''

  form.realName = authResult.realName || ''
  form.studentNo = authResult.studentNo || profile.studentNo || ''
  form.phone = authResult.phone || profile.phone || ''
  form.material = authResult.material || ''
}

function isNoRecordMessage(message = '') {
  return message.includes('暂无') && message.includes('认证')
}

function validateRealName() {
  const value = form.realName.trim()
  if (!value) {
    errors.realName = '请输入真实姓名'
    return false
  }

  if (value.length > 20) {
    errors.realName = '真实姓名请控制在 20 个字以内'
    return false
  }

  errors.realName = ''
  return true
}

function validatePhone() {
  const value = form.phone.trim()
  if (!value) {
    errors.phone = '请输入联系电话'
    return false
  }

  if (!PHONE_PATTERN.test(value)) {
    errors.phone = '手机号格式不正确'
    return false
  }

  errors.phone = ''
  return true
}

function validateMaterial() {
  if (!form.material.trim()) {
    errors.material = '请上传认证材料'
    return false
  }

  errors.material = ''
  return true
}

function validateForm() {
  resetErrors()
  const realNameValid = validateRealName()
  const phoneValid = validatePhone()
  const materialValid = validateMaterial()

  return realNameValid && phoneValid && materialValid
}

function triggerMaterialUpload() {
  materialInputRef.value?.click()
}

async function handleMaterialChange(event) {
  const file = event.target?.files?.[0]
  if (!file) {
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('认证材料不能超过 5MB', 'error')
    event.target.value = ''
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'seller-auth')

    const { data } = await request.post('/user/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '认证材料上传失败')
    }

    form.material = data.data
    errors.material = ''
    showToast('认证材料上传成功')
  } catch (error) {
    showToast(getErrorMessage(error, '认证材料上传失败'), 'error')
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

async function fetchProfile() {
  const { data } = await request.get('/user/profile')

  if (data?.code !== 1 || !data?.data) {
    throw new Error(data?.msg || '用户资料加载失败')
  }

  profile.studentNo = data.data.studentNo ?? ''
  profile.name = data.data.name ?? ''
  profile.phone = data.data.phone ?? ''

  syncFormFromProfile()
}

async function fetchAuthResult() {
  const { data } = await request.get('/user/seller-auth/result')

  if (data?.code === 1 && data?.data) {
    hasAuthRecord.value = true
    applyAuthResult(data.data)
    return
  }

  if (data?.code === 0 && isNoRecordMessage(data?.msg || '')) {
    hasAuthRecord.value = false
    resetAuthResult()
    syncFormFromProfile()
    return
  }

  throw new Error(data?.msg || '认证信息加载失败')
}

async function initializePage() {
  loading.value = true

  try {
    await fetchProfile()
    await fetchAuthResult()
  } catch (error) {
    showToast(getErrorMessage(error, '认证信息加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!validateForm()) {
    showToast('请先完善认证信息', 'error')
    return
  }

  submitting.value = true
  errors.submit = ''

  try {
    const payload = {
      realName: form.realName.trim(),
      studentNo: form.studentNo.trim(),
      phone: form.phone.trim(),
      material: form.material.trim(),
    }

    const { data } = await request.post('/user/seller-auth/apply', payload)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '认证申请提交失败')
    }

    showToast('认证申请已提交')
    await fetchAuthResult()
  } catch (error) {
    errors.submit = getErrorMessage(error, '认证申请提交失败')
    showToast(errors.submit, 'error')
  } finally {
    submitting.value = false
  }
}

function maskRealName(value = '') {
  if (!value) {
    return '--'
  }

  if (value.length === 1) {
    return `${value}*`
  }

  return `${value.slice(0, 1)}${'*'.repeat(Math.max(value.length - 1, 1))}`
}

function maskStudentNo(value = '') {
  if (!value) {
    return '--'
  }

  if (value.length <= 4) {
    return `${value.slice(0, 1)}***`
  }

  return `${value.slice(0, 4)}${'*'.repeat(Math.max(value.length - 4, 4))}`
}

function maskPhone(value = '') {
  if (!value) {
    return '--'
  }

  if (value.length !== 11) {
    return value
  }

  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

onMounted(() => {
  initializePage()
})

onBeforeUnmount(() => {
  window.clearTimeout(showToast.timer)
})
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            <ShieldCheck class="h-4 w-4" />
            卖家认证
          </div>
          <h1 class="text-2xl font-black tracking-tight text-slate-950">身份认证</h1>
        </div>

        <span
          class="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold"
          :class="statusClass"
        >
          <BadgeCheck class="h-3.5 w-3.5" />
          {{ statusText }}
        </span>
      </div>

      <div v-if="loading" class="flex min-h-[420px] items-center justify-center">
        <div
          class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500"
        >
          <LoaderCircle class="h-4 w-4 animate-spin" />
          正在加载认证信息
        </div>
      </div>

      <div v-else-if="showForm" class="space-y-6 pt-7">
        <div
          v-if="hasAuthRecord && authResult.status === SELLER_AUTH_STATUS.REJECTED"
          class="rounded-[28px] border border-rose-100 bg-rose-50/80 p-5"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm"
            >
              <XCircle class="h-5 w-5" />
            </div>
            <div class="space-y-1.5">
              <p class="text-base font-semibold text-rose-700">本次申请未通过</p>
              <p class="text-sm text-rose-600">
                {{ authResult.reason || '请更新资料后重新提交' }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-700">真实姓名</p>
            <Input
              v-model="form.realName"
              type="text"
              placeholder="请输入真实姓名"
              @blur="validateRealName"
            />
            <p v-if="errors.realName" class="text-sm font-medium text-rose-500">
              {{ errors.realName }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-700">学号</p>
            <Input v-model="form.studentNo" type="text" disabled />
          </div>

          <div class="space-y-2 md:col-span-2">
            <p class="text-sm font-semibold text-slate-700">联系电话</p>
            <Input
              v-model="form.phone"
              type="text"
              inputmode="numeric"
              placeholder="请输入联系电话"
              @blur="validatePhone"
            />
            <p v-if="errors.phone" class="text-sm font-medium text-rose-500">
              {{ errors.phone }}
            </p>
          </div>

          <div class="space-y-3 md:col-span-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-slate-700">认证材料</p>
              <input
                ref="materialInputRef"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleMaterialChange"
              />
              <Button variant="outline" :disabled="uploading" @click="triggerMaterialUpload">
                <LoaderCircle v-if="uploading" class="h-4 w-4 animate-spin" />
                <UploadCloud v-else class="h-4 w-4" />
                上传材料
              </Button>
            </div>

            <div
              class="flex flex-col gap-4 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"
                >
                  <FileUp class="h-5 w-5" />
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="truncate text-sm font-semibold text-slate-800">
                    {{ materialName || '未上传认证材料' }}
                  </p>
                  <p class="text-xs text-slate-400">支持 jpg、png、pdf，单个文件不超过 5MB</p>
                </div>
              </div>

              <a
                v-if="form.material"
                :href="form.material"
                target="_blank"
                rel="noreferrer"
                class="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                查看材料
              </a>
            </div>

            <p v-if="errors.material" class="text-sm font-medium text-rose-500">
              {{ errors.material }}
            </p>
          </div>
        </div>

        <p v-if="errors.submit" class="text-sm font-medium text-rose-500">
          {{ errors.submit }}
        </p>

        <div class="flex justify-end">
          <Button :disabled="submitting || uploading" @click="handleSubmit">
            <LoaderCircle v-if="submitting" class="h-4 w-4 animate-spin" />
            <CheckCircle2 v-else class="h-4 w-4" />
            提交申请
          </Button>
        </div>
      </div>

      <div v-else-if="isPending" class="flex min-h-[420px] items-center justify-center pt-7">
        <div class="w-full max-w-md rounded-[32px] border border-amber-100 bg-amber-50/70 p-8 text-center">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm"
          >
            <Clock3 class="h-8 w-8" />
          </div>
          <div class="mt-5 space-y-2">
            <p class="text-xl font-bold text-slate-900">审核中</p>
            <p class="text-sm text-slate-500">您的卖家认证申请正在审核中，请耐心等待</p>
          </div>
          <div class="mt-6 grid gap-3 rounded-[24px] bg-white/80 p-4 text-left text-sm text-slate-600">
            <div class="flex items-center justify-between gap-3">
              <span>真实姓名</span>
              <span class="font-semibold text-slate-900">{{ authResult.realName || '--' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span>学号</span>
              <span class="font-semibold text-slate-900">{{ authResult.studentNo || '--' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span>联系电话</span>
              <span class="font-semibold text-slate-900">{{ authResult.phone || '--' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="isApproved" class="flex min-h-[420px] items-center justify-center pt-7">
        <div class="w-full max-w-2xl space-y-6 rounded-[32px] border border-emerald-100 bg-emerald-50/70 p-8">
          <div class="text-center">
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm"
            >
              <CheckCircle2 class="h-8 w-8" />
            </div>
            <div class="mt-5 space-y-2">
              <p class="text-2xl font-black tracking-tight text-slate-950">认证通过</p>
              <p class="text-sm text-slate-500">您已通过实名认证，当前为正式卖家身份</p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-[24px] bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">姓名</p>
              <p class="mt-3 text-lg font-bold text-slate-900">{{ maskedRealName }}</p>
            </div>
            <div class="rounded-[24px] bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">学号</p>
              <p class="mt-3 text-lg font-bold text-slate-900">{{ maskedStudentNo }}</p>
            </div>
            <div class="rounded-[24px] bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">电话</p>
              <p class="mt-3 text-lg font-bold text-slate-900">{{ maskedPhone }}</p>
            </div>
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
