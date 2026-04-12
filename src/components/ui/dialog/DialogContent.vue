<script setup>
import { DialogContent, DialogOverlay, DialogPortal } from 'radix-vue'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiDialogContent',
  inheritAttrs: false,
})

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <DialogPortal to="body">
    <DialogOverlay class="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm" />
    <DialogContent
      v-bind="$attrs"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-[121] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.38)] outline-none sm:p-7',
          props.class,
        )
      "
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>
