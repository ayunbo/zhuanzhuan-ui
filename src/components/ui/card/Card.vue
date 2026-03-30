<script setup>
defineOptions({
  name: 'UiCard',
})
</script>

<template>
  <div
    class="rounded-[28px] border border-white/80 bg-white/95 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur"
  >
    <slot />
  </div>
</template>
