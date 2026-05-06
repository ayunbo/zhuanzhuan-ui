<!-- 注册 API: POST /api/user/register；注册字段: studentNo、password、name、phone；登录 API: POST /api/user/login；登录字段: account、password -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'radix-vue'
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import request, { OPEN_LOGIN_DIALOG_EVENT, setAuthSession } from '@/utils/request'

const STUDENT_NO_PATTERN = /^[A-Za-z0-9]{6,20}$/
const PASSWORD_PATTERN = /^\S{6,20}$/
const PHONE_PATTERN = /^1\d{10}$/

const open = ref(false)
const activeTab = ref('login')
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const loginLoading = ref(false)
const registerLoading = ref(false)

const loginForm = reactive({
  account: '',
  password: '',
})

const registerForm = reactive({
  studentNo: '',
  password: '',
  name: '',
  phone: '',
})

const loginErrors = reactive({
  account: '',
  password: '',
  submit: '',
})

const registerErrors = reactive({
  studentNo: '',
  password: '',
  name: '',
  phone: '',
  submit: '',
})

const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const canSubmitLogin = computed(
  () =>
    loginForm.account.trim().length > 0 &&
    loginForm.password.trim().length > 0 &&
    !loginLoading.value,
)

const canSubmitRegister = computed(
  () =>
    registerForm.studentNo.trim().length > 0 &&
    registerForm.password.trim().length > 0 &&
    !registerLoading.value,
)

function resetLoginErrors() {
  loginErrors.account = ''
  loginErrors.password = ''
  loginErrors.submit = ''
}

function resetRegisterErrors() {
  registerErrors.studentNo = ''
  registerErrors.password = ''
  registerErrors.name = ''
  registerErrors.phone = ''
  registerErrors.submit = ''
}

function resetAllErrors() {
  resetLoginErrors()
  resetRegisterErrors()
}

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2600)
}

function openDialog(mode = 'login') {
  activeTab.value = mode === 'register' ? 'register' : 'login'
  open.value = true
  resetAllErrors()
}

function closeDialog() {
  if (loginLoading.value || registerLoading.value) {
    return
  }

  open.value = false
  resetAllErrors()
}

function handleOpenEvent(event) {
  openDialog(event?.detail?.mode)
}

function validateLoginForm() {
  resetLoginErrors()

  if (!loginForm.account.trim()) {
    loginErrors.account = '请输入学号或手机号'
  }

  if (!loginForm.password.trim()) {
    loginErrors.password = '请输入密码'
  } else if (!PASSWORD_PATTERN.test(loginForm.password)) {
    loginErrors.password = '密码格式不正确，长度应为 6-20 且不能包含空格'
  }

  return !loginErrors.account && !loginErrors.password
}

function validateRegisterStudentNo() {
  const value = registerForm.studentNo.trim()
  if (!value) {
    registerErrors.studentNo = '学号不能为空'
    return false
  }

  if (!STUDENT_NO_PATTERN.test(value)) {
    registerErrors.studentNo = '学号格式不正确，应为 6-20 位字母或数字'
    return false
  }

  registerErrors.studentNo = ''
  return true
}

function validateRegisterPassword() {
  const value = registerForm.password
  if (!value.trim()) {
    registerErrors.password = '密码不能为空'
    return false
  }

  if (!PASSWORD_PATTERN.test(value)) {
    registerErrors.password = '密码格式不正确，长度应为 6-20 且不能包含空格'
    return false
  }

  registerErrors.password = ''
  return true
}

function validateRegisterPhone() {
  const value = registerForm.phone.trim()
  if (!value) {
    registerErrors.phone = ''
    return true
  }

  if (!PHONE_PATTERN.test(value)) {
    registerErrors.phone = '手机号格式不正确'
    return false
  }

  registerErrors.phone = ''
  return true
}

function validateRegisterName() {
  registerErrors.name = ''
  return true
}

function validateRegisterForm() {
  resetRegisterErrors()

  const studentNoValid = validateRegisterStudentNo()
  const passwordValid = validateRegisterPassword()
  const nameValid = validateRegisterName()
  const phoneValid = validateRegisterPhone()

  return studentNoValid && passwordValid && nameValid && phoneValid
}

function switchToLogin() {
  activeTab.value = 'login'
  resetAllErrors()
}

function switchToRegister() {
  activeTab.value = 'register'
  resetAllErrors()
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

async function handleLoginSubmit() {
  if (!validateLoginForm()) {
    return
  }

  loginLoading.value = true
  try {
    const { data } = await request.post('/user/login', {
      account: loginForm.account.trim(),
      password: loginForm.password,
    })

    if (data?.code !== 1 || !data?.data?.token) {
      throw new Error(data?.msg || '登录失败')
    }

    setAuthSession(data.data)
    showToast('登录成功')
    open.value = false
    loginForm.password = ''
    showLoginPassword.value = false
    resetAllErrors()
  } catch (error) {
    loginErrors.submit = getErrorMessage(error, '登录失败')
  } finally {
    loginLoading.value = false
  }
}

async function handleRegisterSubmit() {
  if (!validateRegisterForm()) {
    return
  }

  registerLoading.value = true
  try {
    const payload = {
      studentNo: registerForm.studentNo.trim(),
      password: registerForm.password,
      name: registerForm.name.trim() || undefined,
      phone: registerForm.phone.trim() || undefined,
    }

    const { data } = await request.post('/user/register', payload)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '注册失败')
    }

    loginForm.account = payload.studentNo
    loginForm.password = ''
    registerForm.password = ''
    showRegisterPassword.value = false
    switchToLogin()
    showToast('注册成功')
  } catch (error) {
    registerErrors.submit = getErrorMessage(error, '注册失败')
    showToast(registerErrors.submit, 'error')
  } finally {
    registerLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener(OPEN_LOGIN_DIALOG_EVENT, handleOpenEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_LOGIN_DIALOG_EVENT, handleOpenEvent)
  window.clearTimeout(showToast.timer)
})
</script>

<template>
  <DialogRoot :open="open" @update:open="(value) => (value ? openDialog(activeTab) : closeDialog())">
    <DialogPortal to="body">
      <DialogOverlay class="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[121] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/80 bg-white px-8 py-8 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.38)] outline-none sm:px-10"
      >
        <div class="mb-7 flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.28em] text-brand-500">Campus Auth</p>
            <DialogTitle class="mt-3 text-[30px] font-black tracking-tight text-slate-950">
              {{ activeTab === 'login' ? '密码登录' : '用户注册' }}
            </DialogTitle>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-brand-200 hover:text-brand-600"
            @click="closeDialog"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <TabsRoot v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2 rounded-full bg-slate-100 p-1.5">
            <TabsTrigger
              value="login"
              class="h-11 rounded-full text-sm font-semibold outline-none transition"
              :class="
                activeTab === 'login'
                  ? 'bg-white text-slate-950 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)]'
                  : 'text-slate-500 hover:text-slate-700'
              "
            >
              登录
            </TabsTrigger>
            <TabsTrigger
              value="register"
              class="h-11 rounded-full text-sm font-semibold outline-none transition"
              :class="
                activeTab === 'register'
                  ? 'bg-white text-slate-950 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)]'
                  : 'text-slate-500 hover:text-slate-700'
              "
            >
              注册
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" class="mt-8 outline-none">
            <form class="space-y-5" @submit.prevent="handleLoginSubmit">
              <div class="space-y-2.5">
                <Input
                  v-model="loginForm.account"
                  type="text"
                  placeholder="请输入学号或手机号"
                  class="h-12 rounded-full border-white bg-slate-100/90 px-5 text-[15px] shadow-none focus:bg-white"
                />
                <p v-if="loginErrors.account" class="text-sm font-medium text-rose-500">
                  {{ loginErrors.account }}
                </p>
              </div>

              <div class="space-y-2.5">
                <div class="relative">
                  <Input
                    v-model="loginForm.password"
                    :type="showLoginPassword ? 'text' : 'password'"
                    placeholder="请输入密码"
                    class="h-12 rounded-full border-white bg-slate-100/90 px-5 pr-14 text-[15px] shadow-none focus:bg-white"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    @click="showLoginPassword = !showLoginPassword"
                  >
                    <Eye v-if="!showLoginPassword" class="h-5 w-5" />
                    <EyeOff v-else class="h-5 w-5" />
                  </button>
                </div>
                <p v-if="loginErrors.password" class="text-sm font-medium text-rose-500">
                  {{ loginErrors.password }}
                </p>
              </div>

              <p v-if="loginErrors.submit" class="text-sm font-medium text-rose-500">
                {{ loginErrors.submit }}
              </p>

              <Button
                type="submit"
                class="h-12 w-full rounded-full bg-orange-400 text-lg font-black text-white shadow-[0_16px_36px_-18px_rgba(251,146,60,0.85)] hover:bg-orange-500"
                :disabled="!canSubmitLogin"
              >
                <LoaderCircle v-if="loginLoading" class="h-5 w-5 animate-spin" />
                登录
              </Button>

              <div class="pt-1 text-center text-sm text-slate-500">
                没有账号？
                <button
                  type="button"
                  class="font-semibold text-brand-600 transition hover:text-brand-700"
                  @click="switchToRegister"
                >
                  去注册
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" class="mt-8 outline-none">
            <form class="space-y-5" @submit.prevent="handleRegisterSubmit">
              <div class="space-y-2.5">
                <Input
                  v-model="registerForm.studentNo"
                  type="text"
                  placeholder="学号，6-20 位字母或数字"
                  class="h-12 rounded-full border-white bg-slate-100/90 px-5 text-[15px] shadow-none focus:bg-white"
                  @blur="validateRegisterStudentNo"
                />
                <p v-if="registerErrors.studentNo" class="text-sm font-medium text-rose-500">
                  {{ registerErrors.studentNo }}
                </p>
              </div>

              <div class="space-y-2.5">
                <div class="relative">
                  <Input
                    v-model="registerForm.password"
                    :type="showRegisterPassword ? 'text' : 'password'"
                    placeholder="密码，6-20 位且不能包含空格"
                    class="h-12 rounded-full border-white bg-slate-100/90 px-5 pr-14 text-[15px] shadow-none focus:bg-white"
                    @blur="validateRegisterPassword"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    @click="showRegisterPassword = !showRegisterPassword"
                  >
                    <Eye v-if="!showRegisterPassword" class="h-5 w-5" />
                    <EyeOff v-else class="h-5 w-5" />
                  </button>
                </div>
                <p v-if="registerErrors.password" class="text-sm font-medium text-rose-500">
                  {{ registerErrors.password }}
                </p>
              </div>

              <div class="space-y-2.5">
                <Input
                  v-model="registerForm.name"
                  type="text"
                  placeholder="昵称，不填则默认使用学号"
                  class="h-12 rounded-full border-white bg-slate-100/90 px-5 text-[15px] shadow-none focus:bg-white"
                  @blur="validateRegisterName"
                />
                <p v-if="registerErrors.name" class="text-sm font-medium text-rose-500">
                  {{ registerErrors.name }}
                </p>
              </div>

              <div class="space-y-2.5">
                <Input
                  v-model="registerForm.phone"
                  type="text"
                  inputmode="numeric"
                  placeholder="手机号，选填"
                  class="h-12 rounded-full border-white bg-slate-100/90 px-5 text-[15px] shadow-none focus:bg-white"
                  @blur="validateRegisterPhone"
                />
                <p v-if="registerErrors.phone" class="text-sm font-medium text-rose-500">
                  {{ registerErrors.phone }}
                </p>
              </div>

              <p v-if="registerErrors.submit" class="text-sm font-medium text-rose-500">
                {{ registerErrors.submit }}
              </p>

              <Button
                type="submit"
                class="h-12 w-full rounded-full bg-orange-400 text-lg font-black text-white shadow-[0_16px_36px_-18px_rgba(251,146,60,0.85)] hover:bg-orange-500"
                :disabled="!canSubmitRegister"
              >
                <LoaderCircle v-if="registerLoading" class="h-5 w-5 animate-spin" />
                注册
              </Button>

              <div class="pt-1 text-center text-sm text-slate-500">
                已有账号？
                <button
                  type="button"
                  class="font-semibold text-brand-600 transition hover:text-brand-700"
                  @click="switchToLogin"
                >
                  去登录
                </button>
              </div>
            </form>
          </TabsContent>
        </TabsRoot>
      </DialogContent>
    </DialogPortal>

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
  </DialogRoot>
</template>
