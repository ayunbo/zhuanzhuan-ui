<script setup>
defineProps({
  title: {
    type: String,
    default: '暂无内容',
  },
  description: {
    type: String,
    default: '当前没有可展示的数据。',
  },
  actionText: {
    type: String,
    default: '',
  },
})

defineEmits(['action'])
</script>

<template>
  <section class="empty-state">
    <div class="empty-mark">闲</div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <el-button v-if="actionText" type="primary" @click="$emit('action')">
      {{ actionText }}
    </el-button>
  </section>
</template>

<style scoped>
.empty-state {
  min-height: 320px;
  padding: 40px 20px;
  border: 1px solid var(--zz-border);
  border-radius: 24px;
  background: #fff;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 14px;
}

.empty-mark {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: var(--zz-yellow-soft);
  color: var(--zz-black);
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 800;
}

h3 {
  font-size: 26px;
  color: var(--zz-black);
}

p {
  max-width: 32em;
  color: var(--zz-text-secondary);
  line-height: 1.7;
}
</style>
