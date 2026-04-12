<script setup>
import { DropdownMenuItem } from 'radix-vue'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiDropdownMenuItem',
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
  <DropdownMenuItem
    v-bind="$attrs"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
