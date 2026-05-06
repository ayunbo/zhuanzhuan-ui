<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import request, { OPEN_LOGIN_DIALOG_EVENT, setAuthSession } from '@/utils/request'

const visible = ref(false)
const showPassword = ref(false)
const loading = ref(false)

const form = reactive({
  account: '',
  password: '',
})

const errors = reactive({
  account: '',
  password: '',
  submit: '',
})

const canSubmit = computed(
  () => form.account.trim().length > 0 && form.password.trim().length > 0 && !loading.value,
)

function resetErrors() {
  errors.account = ''
  errors.password = ''
  errors.submit = ''
}

function openDialog() {
  visible.value = true
  resetErrors()
}

function closeDialog() {
  if (loading.value) {
    return
  }

  visible.value = false
  errors.submit = ''
}

function handleOpenEvent() {
  openDialog()
}

function validate() {
  resetErrors()

  if (!form.account.trim()) {
    errors.account = '请输入账号'
  }

  if (!form.password.trim()) {
    errors.password = '请输入密码'
  }

  return !errors.account && !errors.password
}

async function handleSubmit() {
  if (!validate()) {
    return
  }

  loading.value = true
  try {
    const { data } = await request.post('/user/login', {
      account: form.account.trim(),
      password: form.password,
    })

    if (data?.code !== 1 || !data?.data?.token) {
      throw new Error(data?.msg || '登录失败')
    }

    setAuthSession(data.data)
    visible.value = false
    form.account = ''
    form.password = ''
    showPassword.value = false
    resetErrors()
  } catch (error) {
    errors.submit = error?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener(OPEN_LOGIN_DIALOG_EVENT, handleOpenEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_LOGIN_DIALOG_EVENT, handleOpenEvent)
})
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
      >
        <div
          class="w-full max-w-[520px] rounded-[32px] border border-white/80 bg-white px-7 py-7 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.38)] sm:px-9"
        >
          <div class="mb-6 flex items-center justify-end">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-brand-200 hover:text-brand-600"
              @click="closeDialog"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="mb-8 text-center">
            <h2 class="text-[34px] font-black tracking-tight text-slate-950">密码登录</h2>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <div class="space-y-2">
              <Input
                v-model="form.account"
                type="text"
                placeholder="请输入学号或手机号"
                class="h-15 rounded-[22px] border-white bg-slate-100/90 px-6 text-lg shadow-none focus:bg-white"
              />
              <p v-if="errors.account" class="text-sm font-medium text-rose-500">
                {{ errors.account }}
              </p>
            </div>

            <div class="space-y-2">
              <div class="relative">
                <Input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入密码"
                  class="h-15 rounded-[22px] border-white bg-slate-100/90 px-6 pr-16 text-lg shadow-none focus:bg-white"
                />
                <button
                  type="button"
                  class="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  @click="showPassword = !showPassword"
                >
                  <Eye v-if="!showPassword" class="h-5 w-5" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="errors.password" class="text-sm font-medium text-rose-500">
                {{ errors.password }}
              </p>
            </div>

            <p v-if="errors.submit" class="text-sm font-medium text-rose-500">
              {{ errors.submit }}
            </p>

            <Button
              type="submit"
              class="h-15 w-full rounded-[22px] text-xl font-black"
              :disabled="!canSubmit"
            >
              <LoaderCircle v-if="loading" class="h-5 w-5 animate-spin" />
              登录
            </Button>
          </form>
        </div>
      </div>
    </transition>
  </teleport>
</template>
