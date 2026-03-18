<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  UserFilled,
  Stamp,
  SwitchButton,
  ArrowDown,
  Search,
  User,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import FloatingMessageCapsule from '@/components/FloatingMessageCapsule.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const isAuthPage = computed(() => ['login', 'register'].includes(route.name))
const showMessageCapsule = computed(() => route.name === 'home' && !isAuthPage.value)
const messageUnreadCount = computed(() => (authStore.isLoggedIn ? chatStore.unreadTotal : 0))

async function bootstrapChatState() {
  if (!authStore.isLoggedIn) {
    chatStore.reset()
    return
  }

  try {
    chatStore.connectSocket()
    await chatStore.refreshUnreadTotal()
  } catch {
    // Ignore unread fetch errors in app shell.
  }
}

const handleLogout = () => {
  authStore.logout()
  chatStore.reset()
  ElMessage.success('已安全退出')
  router.push('/login')
}

const handleMessageCapsuleClick = () => {
  if (!authStore.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: '/chat' } })
    return
  }
  router.push('/chat')
}

onMounted(() => {
  bootstrapChatState()
})

watch(
  () => authStore.isLoggedIn,
  () => {
    bootstrapChatState()
  },
)
</script>

<template>
  <div class="zz-app">
    <header v-if="!isAuthPage" class="zz-navbar">
      <div class="nav-container">
        <div class="nav-left">
          <RouterLink to="/" class="brand">
            <img src="@/assets/logo.jpg" alt="Logo" />
            <span>赚赚</span>
          </RouterLink>
        </div>

        <div class="nav-center">
          <div class="search-bar">
            <el-input placeholder="搜索校内闲置宝贝..." :prefix-icon="Search" clearable />
          </div>
        </div>

        <div class="nav-right">
          <div class="nav-links">
            <RouterLink to="/" :class="{ active: route.path === '/' }">首页</RouterLink>
            <RouterLink to="/seller-auth" :class="{ active: route.path === '/seller-auth' }">
              认证
            </RouterLink>
          </div>

          <el-divider direction="vertical" />

          <div class="user-entry">
            <template v-if="authStore.isLoggedIn">
              <el-dropdown trigger="click">
                <div class="avatar-pill">
                  <el-avatar :size="28" :src="authStore.user.avatar">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <el-icon><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="router.push('/profile')">
                      <el-icon><UserFilled /></el-icon>个人中心
                    </el-dropdown-item>
                    <el-dropdown-item @click="router.push('/seller-auth')">
                      <el-icon><Stamp /></el-icon>卖家认证
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleLogout" class="logout-text">
                      <el-icon><SwitchButton /></el-icon>退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-button text @click="router.push('/login')">登录</el-button>
              <el-button type="primary" round size="small" @click="router.push('/register')">
                注册
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <main :class="['zz-content', { full: isAuthPage }]">
      <div :class="{ inner: !isAuthPage }">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <FloatingMessageCapsule
      v-if="showMessageCapsule"
      :unread-count="messageUnreadCount"
      @click="handleMessageCapsuleClick"
    />
  </div>
</template>

<style scoped>
.zz-app {
  min-height: 100vh;
  background-color: #ffffff;
}

.zz-navbar {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.brand img {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.brand span {
  font-size: 18px;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.nav-center {
  flex: 1;
  padding: 0 60px;
}

.search-bar :deep(.el-input__wrapper) {
  background-color: #f4f4f4 !important;
  box-shadow: none !important;
  border-radius: 20px !important;
  height: 36px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  text-decoration: none;
}

.nav-links a.active {
  color: #0071e3;
  font-weight: 700;
}

.avatar-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px;
  border-radius: 20px;
  transition: background 0.2s;
}

.avatar-pill:hover {
  background: #f5f5f5;
}

.logout-text {
  color: #ff4d4f !important;
}

.zz-content {
  padding-top: 20px;
}

.zz-content.full {
  padding-top: 0;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

@media (max-width: 768px) {
  .nav-center,
  .nav-links {
    display: none;
  }
}
</style>
