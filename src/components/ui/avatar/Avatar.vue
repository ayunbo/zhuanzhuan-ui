<script setup>
import { computed, ref } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiAvatar',
})

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-brand-100 text-brand-700 shadow-sm',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: 'avatar',
  },
  fallback: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
  },
})

const imageError = ref(false)
const showImage = computed(() => Boolean(props.src) && !imageError.value)

function handleError() {
  imageError.value = true
}
</script>

<template>
  <div :class="cn(avatarVariants({ size }))">
    <img
      v-if="showImage"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      @error="handleError"
    />
    <span v-else class="font-semibold">
      <slot>{{ fallback }}</slot>
    </span>
  </div>
</template>
