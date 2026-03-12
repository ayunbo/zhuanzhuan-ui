<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  Plus,
  Stamp,
  User,
  ArrowRight
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => {
  if (!authStore.isLoggedIn) return '同学'
  return authStore.user.name || authStore.user.studentNo
})

const handleAction = (path) => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
  } else {
    router.push(path)
  }
}
</script>

<template>
  <div class="zz-portal-clean">
    <!-- 核心操作卡片 -->
    <div class="portal-main-grid">
      <!-- 用户状态与快速入口 -->
      <section class="user-card">
        <div class="user-profile-brief">
          <el-avatar 
            :size="60" 
            :src="authStore.user.avatar"
          >
            <el-icon :size="30"><User /></el-icon>
          </el-avatar>
          <div class="user-text">
            <h3>{{ userName }}</h3>
            <el-tag size="small" round :type="authStore.user.role === 2 ? 'success' : 'info'">
              {{ authStore.roleLabel }}
            </el-tag>
          </div>
        </div>
        <div class="user-quick-actions">
          <el-button type="primary" round :icon="Plus" @click="handleAction('/profile')">发布宝贝</el-button>
          <el-button round :icon="Stamp" @click="handleAction('/seller-auth')">卖家认证</el-button>
        </div>
      </section>

      <!-- 平台简讯/系统状态 (仅展示真实信息) -->
      <section class="system-card">
        <div class="card-label">赚赚·系统状态</div>
        <div class="status-list">
          <div class="status-item">
            <span class="dot active"></span>
            <span>核心服务运行正常</span>
          </div>
          <div class="status-item">
            <span class="dot" :class="{ active: authStore.isLoggedIn }"></span>
            <span>账户身份：{{ authStore.isLoggedIn ? '已验证' : '访客' }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- 商品列表区域 -->
    <section class="feed-area">
      <div class="feed-header">
        <h2>最新闲置</h2>
        <el-link :underline="false">全部 <el-icon><ArrowRight /></el-icon></el-link>
      </div>

      <!-- 空状态：无假商品 -->
      <div class="empty-placeholder">
        <el-empty 
          description="当前校园内暂无同学发布闲置" 
          :image-size="180"
        >
          <template #extra>
            <el-button type="primary" plain round @click="handleAction('/profile')">
              成为第一个分享者
            </el-button>
          </template>
        </el-empty>
      </div>
    </section>
  </div>
</template>

<style scoped>
.zz-portal-clean {
  padding-top: 10px;
}

.portal-main-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

.user-card, .system-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 30px;
  border: 1px solid #f0f0f0;
}

.user-profile-brief {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.user-text h3 {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 6px 0;
}

.user-quick-actions {
  display: flex;
  gap: 12px;
}

.user-quick-actions .el-button {
  flex: 1;
}

.card-label {
  font-size: 12px;
  font-weight: 700;
  color: #999;
  letter-spacing: 1px;
  margin-bottom: 20px;
  text-transform: uppercase;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #444;
  font-weight: 500;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e5e7;
}

.dot.active {
  background: #28cd41;
  box-shadow: 0 0 8px rgba(40, 205, 65, 0.4);
}

/* Feed Area */
.feed-area {
  margin-top: 20px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.feed-header h2 {
  font-size: 24px;
  font-weight: 800;
}

.empty-placeholder {
  background: #ffffff;
  border-radius: 24px;
  border: 1px dashed #e0e0e0;
  padding: 60px 0;
}

@media (max-width: 768px) {
  .portal-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
