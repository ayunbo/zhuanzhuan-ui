<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found-page zz-empty-center">
    <div class="not-found-card zz-card">
      <el-tag round type="warning">页面不存在</el-tag>
      <div class="number">404</div>
      <h1>你访问的页面找不到了</h1>
      <p>可能是链接失效、页面迁移，或者当前版本还没有接入这个入口。</p>

      <div class="actions">
        <el-button type="primary" @click="router.push('/')">返回首页</el-button>
        <el-button plain @click="router.push('/goods')">去商品广场</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: calc(100vh - 180px);
  padding: 20px 0;
}

.not-found-card {
  width: min(560px, 100%);
  padding: 32px 28px;
  display: grid;
  gap: 14px;
  text-align: center;
  justify-items: center;
}

.number {
  font-size: clamp(72px, 12vw, 118px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--zz-black);
}

.not-found-card h1 {
  font-size: 28px;
  line-height: 1.15;
  color: var(--zz-black);
}

.not-found-card p {
  max-width: 360px;
  color: var(--zz-text-secondary);
  line-height: 1.7;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

@media (max-width: 640px) {
  .not-found-card {
    padding: 26px 18px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>
