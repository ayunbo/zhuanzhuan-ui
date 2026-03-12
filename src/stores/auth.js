import { defineStore } from 'pinia'
import { ROLE_LABEL_MAP } from '@/constants/auth'
import { clearStoredAuth, getStoredToken, getStoredUser, setStoredAuth } from '@/utils/auth'

function createEmptyUser() {
  return {
    id: null,
    studentNo: '',
    name: '',
    role: null,
    avatar: '',
  }
}

export const useAuthStore = defineStore('userAuth', {
  state: () => {
    const storedUser = getStoredUser()

    return {
      token: getStoredToken(),
      user: {
        ...createEmptyUser(),
        ...storedUser,
      },
    }
  },
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    roleLabel: (state) => ROLE_LABEL_MAP[state.user.role] || '普通用户',
  },
  actions: {
    setLoginInfo(loginInfo) {
      this.token = loginInfo?.token || ''
      this.user = {
        id: loginInfo?.id ?? null,
        studentNo: loginInfo?.studentNo ?? '',
        name: loginInfo?.name ?? '',
        role: loginInfo?.role ?? null,
        avatar: loginInfo?.avatar ?? '',
      }
      setStoredAuth(loginInfo)
    },
    updateUserProfile(profile) {
      if (!profile) return

      this.user = {
        ...this.user,
        ...profile,
      }

      setStoredAuth({
        token: this.token,
        ...this.user,
      })
    },
    logout() {
      this.token = ''
      this.user = createEmptyUser()
      clearStoredAuth()
    },
  },
})
