<!-- 用户资料 API: GET /api/user/profile; 展示字段: id, studentNo, name, phone, avatar, role, status, campus, intro, scoreAvg, reviewCount, createTime, updateTime -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-vue-next'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import request, { getAuthUser, getToken, setAuthSession } from '@/utils/request'

const router = useRouter()
const loading = ref(false)

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

async function fetchProfile() {
  loading.value = true

  try {
    const { data } = await request.get('/user/profile')

    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '个人资料加载失败')
    }

    applyProfile(data.data)
    syncAuthCache()
  } catch (error) {
    showToast(getErrorMessage(error, '个人资料加载失败'), 'error')
  } finally {
    loading.value = false
  }
}

function goToProfileSettings() {
  router.push('/user/profile')
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
          <div
            class="inline-flex items-center gap-3 rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500"
          >
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

              <div
                class="max-w-2xl rounded-3xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_14px_35px_-28px_rgba(15,23,42,0.35)]"
              >
                {{ displayIntro }}
              </div>
            </div>
          </div>

          <Button variant="secondary" @click="goToProfileSettings">编辑资料</Button>
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
