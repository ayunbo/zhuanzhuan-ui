<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({
  name: 'UiInput',
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const attrs = useAttrs()

const mergedValue = computed(() => props.modelValue ?? '')

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <input
    v-bind="attrs"
    :value="mergedValue"
    class="flex h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
    @input="handleInput"
  />
</template>
