<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Check, ChevronRight, ImagePlus, LoaderCircle, Trash2, UploadCloud } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import request, { ensureLoggedIn } from '@/utils/request'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TITLE_LENGTH = 100
const MAX_LOCATION_LENGTH = 120
const MIN_QUALITY = 1
const MAX_QUALITY = 5
const route = useRoute()

const form = reactive({
  categoryId: '',
  title: '',
  detail: '',
  price: '',
  oldPrice: '',
  quality: '5',
  location: '',
  imageUrls: [],
})

const errors = reactive({
  categoryId: '',
  title: '',
  detail: '',
  price: '',
  oldPrice: '',
  quality: '',
  location: '',
  imageUrls: '',
})

const categories = ref([])
const fileInputRef = ref(null)
const categoryPanelOpen = ref(false)
const activeLevel1Index = ref(0)
const activeLevel2Index = ref(0)
const loadingCategories = ref(false)
const uploadingImages = ref(false)
const savingDraft = ref(false)
const submittingAudit = ref(false)
const currentGoodsId = ref(null)
const toast = reactive({
  visible: false,
  type: 'success',
  message: '',
})

const qualityOptions = [
  { label: '95新', value: '5' },
  { label: '9成新', value: '4' },
  { label: '8成新', value: '3' },
  { label: '7成新', value: '2' },
  { label: '6成新及以下', value: '1' },
]

const flatCategoryOptions = computed(() => flattenCategories(categories.value))
const selectedCategoryLabel = computed(
  () => flatCategoryOptions.value.find((item) => String(item.id) === form.categoryId)?.label || '',
)
const level1Categories = computed(() => categories.value)
const level2Categories = computed(
  () => level1Categories.value[activeLevel1Index.value]?.children || [],
)
const level3Categories = computed(
  () => level2Categories.value[activeLevel2Index.value]?.children || [],
)
const detailLength = computed(() => form.detail.length)
const canPickMoreImages = computed(() => !uploadingImages.value)
const isBusy = computed(
  () =>
    uploadingImages.value || savingDraft.value || submittingAudit.value || loadingCategories.value,
)

function flattenCategories(tree, prefix = []) {
  return tree.flatMap((node) => {
    const path = [...prefix, node.name]
    const current = {
      id: node.id,
      label: path.join(' / '),
      level: node.level,
      isLeaf: !node.children?.length,
    }

    if (!node.children?.length) {
      return [current]
    }

    return [current, ...flattenCategories(node.children, path)]
  })
}

function syncCategoryIndexes() {
  activeLevel1Index.value = 0
  activeLevel2Index.value = 0
}

function showToast(message, type = 'success') {
  toast.visible = true
  toast.type = type
  toast.message = message

  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast.visible = false
  }, 2600)
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function resetErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

function validateAmount(value) {
  return /^(\d+)(\.\d{1,2})?$/.test(value)
}

function validateForm(mode = 'draft') {
  resetErrors()

  if (form.title.trim().length > MAX_TITLE_LENGTH) {
    errors.title = `标题最多 ${MAX_TITLE_LENGTH} 个字`
  }

  if (form.location.trim().length > MAX_LOCATION_LENGTH) {
    errors.location = `地点最多 ${MAX_LOCATION_LENGTH} 个字`
  }

  if (form.price && !validateAmount(form.price)) {
    errors.price = '售价格式需为数字，最多两位小数'
  }

  if (form.oldPrice && !validateAmount(form.oldPrice)) {
    errors.oldPrice = '原价格式需为数字，最多两位小数'
  }

  const qualityNumber = Number(form.quality)
  if (
    !Number.isInteger(qualityNumber) ||
    qualityNumber < MIN_QUALITY ||
    qualityNumber > MAX_QUALITY
  ) {
    errors.quality = `成色需在 ${MIN_QUALITY}-${MAX_QUALITY} 之间`
  }

  if (mode === 'submit') {
    if (!form.categoryId) {
      errors.categoryId = '请选择分类'
    }

    if (!form.title.trim()) {
      errors.title = '请输入商品标题'
    }

    if (!form.detail.trim()) {
      errors.detail = '请输入商品描述'
    }

    if (!form.price) {
      errors.price = '请输入售价'
    }

    if (!form.imageUrls.length) {
      errors.imageUrls = '请至少上传一张图片'
    }
  }

  return !Object.values(errors).some(Boolean)
}

function buildPayload() {
  return {
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    title: form.title.trim(),
    detail: form.detail.trim(),
    price: form.price ? Number(form.price) : null,
    oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
    quality: Number(form.quality),
    location: form.location.trim() || null,
    imageUrls: [...form.imageUrls],
  }
}

function applyGoodsDetail(data = {}) {
  currentGoodsId.value = data.id ?? null
  form.categoryId = data.categoryId !== null && data.categoryId !== undefined ? String(data.categoryId) : ''
  form.title = data.title || ''
  form.detail = data.detail || ''
  form.price = data.price !== null && data.price !== undefined ? String(data.price) : ''
  form.oldPrice = data.oldPrice !== null && data.oldPrice !== undefined ? String(data.oldPrice) : ''
  form.quality = data.quality !== null && data.quality !== undefined ? String(data.quality) : '5'
  form.location = data.location || ''
  form.imageUrls = Array.isArray(data.images)
    ? data.images
        .map((item) => item?.url)
        .filter(Boolean)
    : []
}

async function fetchCategories() {
  loadingCategories.value = true
  try {
    const { data } = await request.get('/user/category/tree')
    if (data?.code !== 1) {
      throw new Error(data?.msg || '分类加载失败')
    }

    categories.value = Array.isArray(data.data) ? data.data : []
    syncCategoryIndexes()
  } catch (error) {
    showToast(getErrorMessage(error, '分类加载失败'), 'error')
  } finally {
    loadingCategories.value = false
  }
}

async function fetchGoodsDetail(goodsId) {
  if (!goodsId) {
    return
  }

  try {
    const { data } = await request.get(`/user/seller/goods/${goodsId}`)
    if (data?.code !== 1 || !data?.data) {
      throw new Error(data?.msg || '商品详情加载失败')
    }

    applyGoodsDetail(data.data)
  } catch (error) {
    showToast(getErrorMessage(error, '商品详情加载失败'), 'error')
  }
}

function pickImages() {
  if (!canPickMoreImages.value) {
    return
  }

  if (!ensureLoggedIn({ source: 'publish-upload' })) {
    return
  }

  fileInputRef.value?.click()
}

function toggleCategoryPanel() {
  categoryPanelOpen.value = !categoryPanelOpen.value
}

function closeCategoryPanel() {
  categoryPanelOpen.value = false
}

function handleLevel1Click(index) {
  activeLevel1Index.value = index
  activeLevel2Index.value = 0
}

function handleLevel2Click(index) {
  activeLevel2Index.value = index
}

function handleCategoryPick(node) {
  form.categoryId = String(node.id)
  errors.categoryId = ''
  categoryPanelOpen.value = false
}

async function handleFilesChange(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''

  if (!files.length) {
    return
  }

  const oversizeFile = files.find((file) => file.size > MAX_FILE_SIZE)
  if (oversizeFile) {
    errors.imageUrls = '单张图片不能超过 5MB'
    showToast('单张图片不能超过 5MB', 'error')
    return
  }

  errors.imageUrls = ''
  uploadingImages.value = true

  try {
    const uploadedUrls = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'goods')

      const { data } = await request.post('/user/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (data?.code !== 1 || !data?.data) {
        throw new Error(data?.msg || '图片上传失败')
      }

      uploadedUrls.push(data.data)
    }

    form.imageUrls.push(...uploadedUrls)
    showToast('图片上传成功')
  } catch (error) {
    showToast(getErrorMessage(error, '图片上传失败'), 'error')
  } finally {
    uploadingImages.value = false
  }
}

function removeImage(index) {
  form.imageUrls.splice(index, 1)
}

async function saveDraftInternal() {
  const payload = buildPayload()

  if (currentGoodsId.value) {
    const { data } = await request.put(`/user/seller/goods/${currentGoodsId.value}`, payload)
    if (data?.code !== 1) {
      throw new Error(data?.msg || '草稿保存失败')
    }
    return currentGoodsId.value
  }

  const { data } = await request.post('/user/seller/goods', payload)
  if (data?.code !== 1) {
    throw new Error(data?.msg || '草稿保存失败')
  }

  currentGoodsId.value = data.data
  return currentGoodsId.value
}

async function handleSaveDraft() {
  if (!ensureLoggedIn({ source: 'publish-save-draft' })) {
    return
  }

  if (!validateForm('draft')) {
    showToast('请先修正表单格式', 'error')
    return
  }

  savingDraft.value = true
  try {
    await saveDraftInternal()
    showToast('草稿保存成功')
  } catch (error) {
    showToast(getErrorMessage(error, '草稿保存失败'), 'error')
  } finally {
    savingDraft.value = false
  }
}

async function handleSubmitAudit() {
  if (!ensureLoggedIn({ source: 'publish-submit-audit' })) {
    return
  }

  if (!validateForm('submit')) {
    showToast('请完善必填信息后再提交', 'error')
    return
  }

  submittingAudit.value = true
  try {
    const goodsId = await saveDraftInternal()
    const { data } = await request.put(`/user/seller/goods/${goodsId}/submit`)

    if (data?.code !== 1) {
      throw new Error(data?.msg || '提交审核失败')
    }

    showToast('提交审核成功')
  } catch (error) {
    showToast(getErrorMessage(error, '提交审核失败'), 'error')
  } finally {
    submittingAudit.value = false
  }
}

onMounted(() => {
  fetchCategories()
})

watch(
  () => route.query.id,
  (value) => {
    const goodsId = Number(value)
    if (Number.isFinite(goodsId) && goodsId > 0) {
      fetchGoodsDetail(goodsId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
      <Card
        class="overflow-visible rounded-[28px] border border-slate-200/80 bg-white px-6 py-6 sm:px-8"
      >
        <div class="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.28em] text-brand-500">发布闲置</p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">发布你的宝贝</h1>
          </div>
        </div>

        <form class="mt-6 space-y-6" @submit.prevent>
          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-brand-500" />
              <h2 class="text-lg font-bold text-slate-950">基础信息</h2>
            </div>

            <div class="grid gap-6">
              <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">宝贝图片</p>
                    <p class="mt-1 text-xs text-slate-500">首张图片将作为封面</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="rounded-full"
                    :disabled="uploadingImages"
                    @click="pickImages"
                  >
                    <LoaderCircle v-if="uploadingImages" class="h-4 w-4 animate-spin" />
                    <ImagePlus v-else class="h-4 w-4" />
                    添加图片
                  </Button>
                </div>

                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleFilesChange"
                />

                <div class="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    class="flex aspect-square flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
                    :disabled="!canPickMoreImages"
                    @click="pickImages"
                  >
                    <UploadCloud class="h-7 w-7" />
                    <span class="mt-2 text-sm font-medium">上传图片</span>
                  </button>

                  <div
                    v-for="(url, index) in form.imageUrls"
                    :key="`${url}-${index}`"
                    class="group relative aspect-square overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100"
                  >
                    <img
                      :src="url"
                      :alt="`商品图片-${index + 1}`"
                      class="h-full w-full object-cover"
                    />
                    <div
                      class="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-slate-950/60 to-transparent px-3 py-3 text-white"
                    >
                      <span class="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold">
                        {{ index === 0 ? '封面' : `图 ${index + 1}` }}
                      </span>
                      <button
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                        @click="removeImage(index)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p v-if="errors.imageUrls" class="mt-3 text-sm font-medium text-rose-500">
                  {{ errors.imageUrls }}
                </p>
              </div>

              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold text-slate-900">宝贝标题</label>
                  <span class="text-xs text-slate-400"
                    >{{ form.title.length }}/{{ MAX_TITLE_LENGTH }}</span
                  >
                </div>
                <Input
                  v-model="form.title"
                  type="text"
                  maxlength="100"
                  placeholder="请输入商品标题"
                  class="h-12 rounded-2xl border-slate-200 bg-white"
                />
                <p v-if="errors.title" class="text-sm font-medium text-rose-500">
                  {{ errors.title }}
                </p>
              </div>

              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold text-slate-900">宝贝描述</label>
                  <span class="text-xs text-slate-400">{{ detailLength }}</span>
                </div>
                <textarea
                  v-model="form.detail"
                  rows="6"
                  placeholder="描述一下宝贝的使用情况、入手时间和转手原因"
                  class="min-h-[160px] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
                <p v-if="errors.detail" class="text-sm font-medium text-rose-500">
                  {{ errors.detail }}
                </p>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-slate-900">分类选择</label>
                <div class="relative">
                  <button
                    type="button"
                    class="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition hover:border-brand-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    @click="toggleCategoryPanel"
                  >
                    <span :class="selectedCategoryLabel ? 'text-slate-900' : 'text-slate-400'">
                      {{ selectedCategoryLabel || '请选择商品分类' }}
                    </span>
                    <ChevronRight
                      class="h-4 w-4 rotate-90 text-slate-400 transition"
                      :class="categoryPanelOpen ? 'rotate-[270deg]' : 'rotate-90'"
                    />
                  </button>

                  <div
                    v-if="categoryPanelOpen"
                    class="fixed inset-0 z-20"
                    @click="closeCategoryPanel"
                  />

                  <div
                    v-if="categoryPanelOpen"
                    class="absolute left-0 top-[calc(100%+12px)] z-30 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-36px_rgba(15,23,42,0.28)] sm:min-w-[720px]"
                  >
                    <div class="grid h-[420px] max-h-[70vh] sm:grid-cols-3">
                      <div class="flex h-full min-h-0 flex-col border-b border-slate-100 p-3 sm:border-b-0 sm:border-r">
                        <div
                          class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
                        >
                          一级分类
                        </div>
                        <div class="flex-1 space-y-1 overflow-y-auto pr-1">
                          <button
                            v-for="(item, index) in level1Categories"
                            :key="item.id"
                            type="button"
                            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium transition"
                            :class="
                              index === activeLevel1Index
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            "
                            @click="handleLevel1Click(index)"
                          >
                            <span>{{ item.name }}</span>
                            <ChevronRight class="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div class="flex h-full min-h-0 flex-col border-b border-slate-100 p-3 sm:border-b-0 sm:border-r">
                        <div
                          class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
                        >
                          二级分类
                        </div>
                        <div class="flex-1 space-y-1 overflow-y-auto pr-1">
                          <button
                            v-for="(item, index) in level2Categories"
                            :key="item.id"
                            type="button"
                            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium transition"
                            :class="
                              index === activeLevel2Index
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            "
                            @click="
                              item.children?.length
                                ? handleLevel2Click(index)
                                : handleCategoryPick(item)
                            "
                          >
                            <span>{{ item.name }}</span>
                            <ChevronRight v-if="item.children?.length" class="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div class="flex h-full min-h-0 flex-col p-3">
                        <div
                          class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
                        >
                          三级分类
                        </div>
                        <div class="flex-1 space-y-1 overflow-y-auto pr-1">
                          <button
                            v-for="item in level3Categories"
                            :key="item.id"
                            type="button"
                            class="flex w-full items-center rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                            @click="handleCategoryPick(item)"
                          >
                            {{ item.name }}
                          </button>
                          <div
                            v-if="!level3Categories.length"
                            class="px-3 py-8 text-sm text-slate-400"
                          >
                            请选择上一级分类
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-if="errors.categoryId" class="text-sm font-medium text-rose-500">
                  {{ errors.categoryId }}
                </p>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-brand-500" />
              <h2 class="text-lg font-bold text-slate-950">价格与属性</h2>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-semibold text-slate-900">售价</label>
                <Input
                  v-model="form.price"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="h-12 rounded-2xl border-slate-200 bg-white"
                />
                <p v-if="errors.price" class="text-sm font-medium text-rose-500">
                  {{ errors.price }}
                </p>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-slate-900">原价</label>
                <Input
                  v-model="form.oldPrice"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="h-12 rounded-2xl border-slate-200 bg-white"
                />
                <p v-if="errors.oldPrice" class="text-sm font-medium text-rose-500">
                  {{ errors.oldPrice }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-semibold text-slate-900">成色</label>
                <div class="relative">
                  <select
                    v-model="form.quality"
                    class="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  >
                    <option v-for="item in qualityOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                  <ChevronRight
                    class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400"
                  />
                </div>
                <p v-if="errors.quality" class="text-sm font-medium text-rose-500">
                  {{ errors.quality }}
                </p>
              </div>

              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold text-slate-900">面交地点</label>
                  <span class="text-xs text-slate-400"
                    >{{ form.location.length }}/{{ MAX_LOCATION_LENGTH }}</span
                  >
                </div>
                <Input
                  v-model="form.location"
                  type="text"
                  maxlength="120"
                  placeholder="例如：南苑宿舍楼下"
                  class="h-12 rounded-2xl border-slate-200 bg-white"
                />
                <p v-if="errors.location" class="text-sm font-medium text-rose-500">
                  {{ errors.location }}
                </p>
              </div>
            </div>
          </section>

          <div
            class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end"
          >
            <Button
              type="button"
              variant="outline"
              class="h-12 rounded-2xl px-6"
              :disabled="isBusy"
              @click="handleSaveDraft"
            >
              <LoaderCircle v-if="savingDraft" class="h-4 w-4 animate-spin" />
              保存草稿
            </Button>
            <Button
              type="button"
              class="h-12 rounded-2xl px-6"
              :disabled="isBusy"
              @click="handleSubmitAudit"
            >
              <LoaderCircle v-if="submittingAudit" class="h-4 w-4 animate-spin" />
              提交审核
            </Button>
          </div>
        </form>
      </Card>
    </div>

    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]"
        :class="toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-white'"
      >
        <Check v-if="toast.type !== 'error'" class="h-4 w-4" />
        <span>{{ toast.message }}</span>
      </div>
    </transition>
  </section>
</template>
