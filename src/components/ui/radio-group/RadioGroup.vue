<script setup>
import { RadioGroupRoot } from 'radix-vue'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiRadioGroup',
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
  <RadioGroupRoot
    v-bind="$attrs"
    :class="cn('grid gap-3', props.class)"
  >
    <slot />
  </RadioGroupRoot>
</template>
