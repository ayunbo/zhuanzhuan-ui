<script setup>
import { DropdownMenuContent, DropdownMenuPortal } from 'radix-vue'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiDropdownMenuContent',
  inheritAttrs: false,
})

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
  sideOffset: {
    type: Number,
    default: 10,
  },
})
</script>

<template>
  <DropdownMenuPortal to="body">
    <DropdownMenuContent
      v-bind="$attrs"
      :side-offset="props.sideOffset"
      :class="
        cn(
          'z-[140] min-w-[9rem] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-700 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.3)] outline-none',
          props.class,
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
