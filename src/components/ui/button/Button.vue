<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

defineOptions({
  name: 'UiButton',
})

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand-500 text-white shadow-[0_10px_30px_-16px_rgba(249,115,22,0.9)] hover:bg-brand-600',
        secondary: 'bg-slate-900 text-white hover:bg-slate-800',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        link: 'rounded-none p-0 text-brand-600 hover:text-brand-700 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
  size: {
    type: String,
    default: 'default',
  },
  type: {
    type: String,
    default: 'button',
  },
})

const classes = computed(() => buttonVariants({ variant: props.variant, size: props.size }))
</script>

<template>
  <button :type="type" :class="classes">
    <slot />
  </button>
</template>
