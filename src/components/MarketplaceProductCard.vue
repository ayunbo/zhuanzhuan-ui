<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  showSeller: {
    type: Boolean,
    default: true,
  },
  showStatus: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])

function normalizeImage(item) {
  if (typeof item?.cover === 'string' && item.cover.trim()) {
    return item.cover.trim()
  }

  if (Array.isArray(item?.images) && item.images.length) {
    const first = item.images[0]
    if (typeof first === 'string') {
      return first
    }
    if (first?.url) {
      return first.url
    }
  }

  return ''
}

function toPrice(value) {
  const num = Number(value)
  return Number.isFinite(num) ? `￥${num.toFixed(2)}` : '￥--'
}

const imageUrl = computed(() => normalizeImage(props.item))
const title = computed(() => props.item?.title || '校园二手好物')
const price = computed(() => toPrice(props.item?.price))
const statusText = computed(() => props.item?.statusDesc || '')
const sellerName = computed(() => props.item?.sellerName || props.item?.location || '校园卖家')
const metaText = computed(() => props.item?.quality || props.item?.createTime || '校内自提')

function handleClick() {
  emit('click', props.item)
}
</script>

<template>
  <article
    class="product-card"
    :class="{ 'product-card--compact': compact }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
  >
    <div class="product-media">
      <img v-if="imageUrl" :src="imageUrl" :alt="title" loading="lazy" />
      <div v-else class="media-placeholder">暂无图片</div>
      <span v-if="showStatus && statusText" class="status-chip">{{ statusText }}</span>
    </div>

    <div class="product-body">
      <h3>{{ title }}</h3>
      <div class="price-row">
        <strong>{{ price }}</strong>
        <span>{{ metaText }}</span>
      </div>
      <div v-if="showSeller" class="seller-row">
        <span>{{ sellerName }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  overflow: hidden;
  border: 1px solid var(--zz-border);
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--zz-shadow-sm);
}

.product-media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f7f7f7;
}

.product-media img,
.media-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-placeholder {
  display: grid;
  place-items: center;
  color: var(--zz-text-light);
  font-size: 14px;
}

.status-chip {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(34, 34, 34, 0.78);
  color: #fff;
  font-size: 12px;
}

.product-body {
  padding: 14px 14px 16px;
  display: grid;
  gap: 10px;
}

.product-body h3 {
  min-height: 44px;
  font-size: 18px;
  line-height: 1.35;
  color: var(--zz-black);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.price-row strong {
  font-size: 28px;
  line-height: 1;
  color: #ff5a26;
}

.price-row span,
.seller-row span {
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.product-card--compact .product-body {
  padding: 12px;
}

.product-card--compact .product-body h3 {
  min-height: 38px;
  font-size: 16px;
}

.product-card--compact .price-row strong {
  font-size: 22px;
}
</style>
