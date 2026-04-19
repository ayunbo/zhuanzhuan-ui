<script setup>
import { RadioGroupIndicator, RadioGroupItem } from 'radix-vue'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiRadioGroupItem',
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
  <RadioGroupItem
    v-bind="$attrs"
    :class="
      cn(
        'h-5 w-5 shrink-0 rounded-full border border-slate-300 bg-white text-brand-500 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  >
    <RadioGroupIndicator class="flex h-full w-full items-center justify-center">
      <span class="h-2.5 w-2.5 rounded-full bg-current" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
