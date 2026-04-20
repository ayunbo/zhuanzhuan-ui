<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

defineOptions({
  name: 'UiBadge',
})

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-brand-200 bg-brand-50 text-brand-700',
        secondary: 'border-slate-200 bg-slate-100 text-slate-700',
        outline: 'border-slate-200 bg-white text-slate-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
})

const classes = computed(() => badgeVariants({ variant: props.variant }))
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
