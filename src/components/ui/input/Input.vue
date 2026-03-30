<script setup>
defineOptions({
  name: 'UiInput',
})
</script>

<template>
  <input
    v-bind="$attrs"
    class="flex h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
  />
</template>
