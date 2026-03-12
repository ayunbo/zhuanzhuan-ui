<template>
  <div class="not-found-container">
    <el-result
      icon="warning"
      title="404 - 页面不见了"
      sub-title="抱歉，您访问的页面可能已被移动或不存在。"
    >
      <template #extra>
        <el-button type="primary" round @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
}
</style>
