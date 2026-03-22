<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Plus, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { SELLER_ROLE } from '@/constants/auth'
import { OSS_UPLOAD_CATEGORY } from '@/constants/upload'
import {
  GOODS_STATUS,
  GOODS_STATUS_LABEL_MAP,
  SELLER_GOODS_STATUS_OPTIONS,
} from '@/constants/goods'
import { fetchCategoryTree } from '@/api/category'
import {
  createSellerGoods,
  deleteSellerGoods,
  fetchSellerGoodsById,
  fetchSellerGoodsPage,
  offShelfSellerGoods,
  onShelfSellerGoods,
  submitSellerGoods,
  updateSellerGoods,
} from '@/api/goods'
import { fetchCurrentUserProfile, uploadUserFile } from '@/api/user'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const pageMode = ref(route.query.create === '1' ? 'create' : 'manage')
const profileLoading = ref(false)
const loading = ref(false)
const saving = ref(false)
const actionLoadingId = ref(null)
const editingId = ref(null)
const hoveredTopIndex = ref(0)
const records = ref([])
const categoryTree = ref([])
const formRef = ref(null)
const previewVisible = ref(false)
const previewImage = ref('')

const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const queryForm = reactive({
  title: '',
  status: '',
})

const form = reactive({
  categoryPath: [],
  title: '',
  price: null,
  oldPrice: null,
  quality: 5,
  location: '',
  detail: '',
  fileList: [],
  cover: '',
})

const categoryCascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  checkStrictly: true,
  emitPath: true,
}

const isSeller = computed(() => Number(authStore.user?.role) === SELLER_ROLE)
const isCreateMode = computed(() => pageMode.value === 'create')
const formTitle = computed(() => (editingId.value ? '编辑闲置' : '发布闲置'))

const availableImageUrls = computed(() =>
  form.fileList
    .map((item) => item.url || item.response?.url)
    .filter((url) => Boolean(url)),
)

const categoryNameMap = computed(() => {
  const map = {}

  const walk = (nodes) => {
    if (!Array.isArray(nodes)) {
      return
    }

    for (const node of nodes) {
      map[node.id] = node.name
      walk(node.children)
    }
  }

  walk(categoryTree.value)
  return map
})

const summaryCards = computed(() => {
  const counts = records.value.reduce(
    (acc, item) => {
      const status = Number(item.status)
      if (status === GOODS_STATUS.ON_SALE) acc.onSale += 1
      if (status === GOODS_STATUS.PENDING) acc.pending += 1
      if (status === GOODS_STATUS.DRAFT) acc.draft += 1
      if (status === GOODS_STATUS.OFF_SHELF || status === GOODS_STATUS.REJECTED) acc.offShelf += 1
      return acc
    },
    { onSale: 0, pending: 0, draft: 0, offShelf: 0 },
  )

  return [
    { label: '总数', value: pager.total },
    { label: '在售', value: counts.onSale },
    { label: '待审', value: counts.pending },
    { label: '草稿', value: counts.draft + counts.offShelf },
  ]
})

const topCategories = computed(() => categoryTree.value.slice(0, 10))

const activeTopCategory = computed(() => topCategories.value[hoveredTopIndex.value] || topCategories.value[0] || null)

const activeTopChildren = computed(() => {
  const children = activeTopCategory.value?.children
  return Array.isArray(children) ? children : []
})

const rules = {
  categoryPath: [
    {
      validator: (_rule, value, callback) => {
        if (!Array.isArray(value) || value.length === 0) {
          callback(new Error('请选择商品分类'))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  price: [{ required: true, message: '请输入售价', trigger: 'change' }],
  quality: [{ required: true, message: '请选择成色', trigger: 'change' }],
  fileList: [
    {
      validator: (_rule, _value, callback) => {
        if (availableImageUrls.value.length === 0) {
          callback(new Error('请至少上传 1 张商品图片'))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  cover: [{ required: true, message: '请选择封面图', trigger: 'change' }],
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toPrice(value) {
  const num = Number(value)
  if (Number.isNaN(num)) {
    return '0.00'
  }
  return num.toFixed(2)
}

function statusTagType(status) {
  if (status === GOODS_STATUS.ON_SALE) {
    return 'success'
  }
  if (status === GOODS_STATUS.PENDING || status === GOODS_STATUS.LOCKED) {
    return 'warning'
  }
  if (status === GOODS_STATUS.REJECTED) {
    return 'danger'
  }
  return 'info'
}

function getRowIndex(index) {
  return (pager.page - 1) * pager.pageSize + index + 1
}

function isRowActionLoading(goodsId) {
  return String(actionLoadingId.value || '') === String(goodsId)
}

function canEdit(status) {
  return status === GOODS_STATUS.DRAFT || status === GOODS_STATUS.REJECTED || status === GOODS_STATUS.OFF_SHELF
}

function canSubmit(status) {
  return status === GOODS_STATUS.DRAFT || status === GOODS_STATUS.REJECTED
}

function canOnShelf(status) {
  return status === GOODS_STATUS.OFF_SHELF
}

function canOffShelf(status) {
  return status === GOODS_STATUS.ON_SALE
}

function canDelete(status) {
  return status === GOODS_STATUS.DRAFT || status === GOODS_STATUS.PENDING || status === GOODS_STATUS.REJECTED
}

function syncCover() {
  const urls = availableImageUrls.value
  if (urls.length === 0) {
    form.cover = ''
    return
  }

  if (!urls.includes(form.cover)) {
    form.cover = urls[0]
  }
}

function resetForm() {
  form.categoryPath = []
  form.title = ''
  form.price = null
  form.oldPrice = null
  form.quality = 5
  form.location = ''
  form.detail = ''
  form.fileList = []
  form.cover = ''
}

function getFirstAvailableCategoryPath() {
  const find = (nodes, path = []) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return []
    }

    for (const node of nodes) {
      const nextPath = [...path, node.id]
      if (!Array.isArray(node.children) || node.children.length === 0) {
        return nextPath
      }

      const childPath = find(node.children, nextPath)
      if (childPath.length > 0) {
        return childPath
      }
    }

    return []
  }

  return find(categoryTree.value)
}

function findCategoryPathById(targetId, nodes = categoryTree.value, path = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return []
  }

  for (const node of nodes) {
    const nextPath = [...path, node.id]
    if (Number(node.id) === Number(targetId)) {
      return nextPath
    }

    const childPath = findCategoryPathById(targetId, node.children, nextPath)
    if (childPath.length > 0) {
      return childPath
    }
  }

  return []
}

function buildQueryParams() {
  const params = {
    page: pager.page,
    pageSize: pager.pageSize,
  }

  const title = normalizeText(queryForm.title)
  if (title) {
    params.title = title
  }

  if (queryForm.status !== '' && queryForm.status !== null && queryForm.status !== undefined) {
    params.status = Number(queryForm.status)
  }

  return params
}

function buildPayload() {
  const categoryPath = Array.isArray(form.categoryPath) ? form.categoryPath : []
  const categoryId = categoryPath.length > 0 ? Number(categoryPath[categoryPath.length - 1]) : null
  const imageUrls = availableImageUrls.value

  return {
    categoryId,
    title: normalizeText(form.title),
    detail: normalizeText(form.detail) || null,
    price: Number(form.price),
    oldPrice: form.oldPrice === null || form.oldPrice === '' ? null : Number(form.oldPrice),
    quality: Number(form.quality || 5),
    location: normalizeText(form.location) || null,
    cover: form.cover || imageUrls[0],
    imageUrls,
  }
}

function extractGoodsId(response) {
  if (response === null || response === undefined) {
    return null
  }

  if (typeof response === 'string' || typeof response === 'number') {
    return response
  }

  if (typeof response === 'object') {
    return response.id ?? response.data?.id ?? response.record?.id ?? response.result?.id ?? null
  }

  return null
}

async function refreshProfile() {
  profileLoading.value = true
  try {
    const profile = await fetchCurrentUserProfile()
    authStore.updateUserProfile(profile)
  } catch (error) {
    ElMessage.error(error.message || '同步资料失败')
  } finally {
    profileLoading.value = false
  }
}

async function fetchCategories() {
  try {
    const data = await fetchCategoryTree()
    categoryTree.value = Array.isArray(data) ? data : []

    if (hoveredTopIndex.value >= categoryTree.value.length) {
      hoveredTopIndex.value = 0
    }

    if (isCreateMode.value && editingId.value === null && form.categoryPath.length === 0) {
      const defaultPath = getFirstAvailableCategoryPath()
      if (defaultPath.length > 0) {
        form.categoryPath = defaultPath
      }
    }
  } catch (error) {
    ElMessage.error(error.message || '分类加载失败')
  }
}

async function fetchList() {
  if (!isSeller.value) {
    return
  }

  loading.value = true
  try {
    const pageData = await fetchSellerGoodsPage(buildQueryParams())
    records.value = Array.isArray(pageData?.records) ? pageData.records : []
    pager.total = Number(pageData?.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '商品列表加载失败')
  } finally {
    loading.value = false
  }
}

function goCreate() {
  resetForm()
  editingId.value = null
  const defaultPath = getFirstAvailableCategoryPath()
  if (defaultPath.length > 0) {
    form.categoryPath = defaultPath
  }
  pageMode.value = 'create'
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      create: '1',
    },
  })
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

function focusCategoryTop(index) {
  if (index >= 0 && index < topCategories.value.length) {
    hoveredTopIndex.value = index
  }
}

function selectCategory(node, parent = null) {
  if (!node) {
    return
  }

  if (parent) {
    form.categoryPath = [parent.id, node.id]
  } else if (!Array.isArray(node.children) || node.children.length === 0) {
    form.categoryPath = [node.id]
  } else {
    const index = topCategories.value.findIndex((item) => Number(item.id) === Number(node.id))
    focusCategoryTop(index)
    return
  }

  pageMode.value = 'create'
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      create: '1',
    },
  })
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

function goManage() {
  pageMode.value = 'manage'
  const nextQuery = { ...route.query }
  delete nextQuery.create
  router.replace({
    path: route.path,
    query: nextQuery,
  })
  if (!route.query.create && isSeller.value) {
    fetchList()
  }
}

function handleSearch() {
  pager.page = 1
  fetchList()
}

function handleReset() {
  queryForm.title = ''
  queryForm.status = ''
  pager.page = 1
  fetchList()
}

function handleCurrentChange(page) {
  pager.page = page
  fetchList()
}

function handleSizeChange(pageSize) {
  pager.page = 1
  pager.pageSize = pageSize
  fetchList()
}

function buildFileListFromDetail(detail) {
  const images = Array.isArray(detail?.images) ? detail.images : []
  const sources = images.length > 0 ? images.map((item) => item.url) : [detail?.cover].filter(Boolean)

  return sources.map((url, index) => ({
    uid: `existing-${detail.id}-${index}`,
    name: `image-${index + 1}`,
    status: 'success',
    url,
  }))
}

async function openEdit(row) {
  try {
    const detail = await fetchSellerGoodsById(row.id)

    editingId.value = row.id
    form.categoryPath = findCategoryPathById(detail.categoryId)
    form.title = detail.title || ''
    form.price = detail.price === null || detail.price === undefined ? null : Number(detail.price)
    form.oldPrice = detail.oldPrice === null || detail.oldPrice === undefined ? null : Number(detail.oldPrice)
    form.quality = Number(detail.quality || 5)
    form.location = detail.location || ''
    form.detail = detail.detail || ''
    form.fileList = buildFileListFromDetail(detail)
    form.cover = detail.cover || ''
    syncCover()

    pageMode.value = 'create'
    router.replace({
      path: route.path,
      query: {
        ...route.query,
        create: '1',
      },
    })
    nextTick(() => {
      formRef.value?.clearValidate()
    })
  } catch (error) {
    ElMessage.error(error.message || '商品详情加载失败')
  }
}

async function persistGoods(shouldSubmit = false) {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload = buildPayload()
  if (!payload.categoryId) {
    ElMessage.warning('请选择商品分类')
    return
  }

  saving.value = true
  try {
    let goodsId = editingId.value

    if (editingId.value) {
      await updateSellerGoods(editingId.value, payload)
    } else {
      const response = await createSellerGoods(payload)
      goodsId = extractGoodsId(response)
    }

    if (shouldSubmit) {
      if (goodsId) {
        await submitSellerGoods(goodsId)
        ElMessage.success(editingId.value ? '已保存并提交' : '已保存草稿并提交')
      } else {
        ElMessage.success('草稿已保存，请到管理中提交')
      }
    } else {
      ElMessage.success(editingId.value ? '修改已保存' : '草稿已保存')
    }

    goManage()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function withRowAction(row, action, successMessage) {
  actionLoadingId.value = row.id
  try {
    await action()
    ElMessage.success(successMessage)
    await fetchList()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    actionLoadingId.value = null
  }
}

async function handleSubmitAudit(row) {
  try {
    await ElMessageBox.confirm('提交后将进入待审状态，确认继续？', '提交商品', {
      type: 'warning',
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await withRowAction(row, () => submitSellerGoods(row.id), '已提交审核')
}

async function handleOnShelf(row) {
  await withRowAction(row, () => onShelfSellerGoods(row.id), '已上架')
}

async function handleOffShelf(row) {
  await withRowAction(row, () => offShelfSellerGoods(row.id), '已下架')
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确认删除该商品？删除后无法恢复。', '删除商品', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await withRowAction(row, () => deleteSellerGoods(row.id), '已删除')
}

function beforeImageUpload(file) {
  const isImage = typeof file.type === 'string' && file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.warning('仅支持图片文件')
    return false
  }

  const isLt5m = file.size / 1024 / 1024 < 5
  if (!isLt5m) {
    ElMessage.warning('单张图片不能超过 5MB')
    return false
  }

  return true
}

async function handleImageUpload(options) {
  try {
    const url = await uploadUserFile(options.file, OSS_UPLOAD_CATEGORY.GOODS_IMAGE)
    options.onSuccess({ url })
  } catch (error) {
    options.onError(error)
  }
}

function handleUploadSuccess(response, file) {
  if (response?.url) {
    file.url = response.url
  }
  syncCover()
  formRef.value?.validateField('fileList').catch(() => {})
}

function handleUploadRemove() {
  syncCover()
  formRef.value?.validateField('fileList').catch(() => {})
}

function handleUploadPreview(file) {
  previewImage.value = file.url || ''
  previewVisible.value = true
}

function handleUploadExceed() {
  ElMessage.warning('最多上传 9 张商品图片')
}

watch(
  () => route.query.create,
  (value) => {
    pageMode.value = value === '1' ? 'create' : 'manage'
    if (pageMode.value === 'manage' && isSeller.value) {
      fetchList()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await Promise.all([refreshProfile(), fetchCategories()])

  if (isSeller.value) {
    await fetchList()
  }
})
</script>

<template>
  <div class="seller-goods-page zz-page">
    <section v-if="!isCreateMode" class="page-head zz-white-panel">
      <div class="page-head__copy">
        <p>SELLER GOODS</p>
        <h1>{{ isCreateMode ? formTitle : '商品管理' }}</h1>
      </div>

      <div class="page-head__actions">
        <el-button :icon="Refresh" :loading="profileLoading" @click="refreshProfile">同步资料</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="fetchList">刷新列表</el-button>
        <el-button type="primary" :icon="Plus" @click="goCreate">发布闲置</el-button>
      </div>
    </section>

    <template v-if="isSeller">
      <section v-if="isCreateMode" class="publish-page">
        <div class="publish-page__gutter"></div>

        <div class="publish-page__body zz-white-panel">
          <div class="publish-page__head">
            <h1>{{ formTitle }}</h1>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="publish-form publish-form--page">
            <section class="publish-section">
              <h2>基础信息</h2>

              <div class="publish-field publish-field--full">
                <label>宝贝图片 <span>*</span></label>
                <el-form-item prop="fileList" class="publish-item">
                  <el-upload
                    v-model:file-list="form.fileList"
                    list-type="picture-card"
                    multiple
                    :limit="9"
                    :http-request="handleImageUpload"
                    :before-upload="beforeImageUpload"
                    :on-success="handleUploadSuccess"
                    :on-remove="handleUploadRemove"
                    :on-preview="handleUploadPreview"
                    :on-exceed="handleUploadExceed"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-upload>
                  <div class="upload-tip">最多 9 张，单张不超过 5MB。</div>
                </el-form-item>
              </div>

              <div class="publish-field publish-field--full">
                <label>宝贝描述</label>
                <el-form-item prop="detail" class="publish-item">
                  <el-input
                    v-model="form.detail"
                    type="textarea"
                    :rows="6"
                    maxlength="5000"
                    show-word-limit
                    placeholder="描述一下宝贝的品牌型号、货品来源、使用情况、配件信息等"
                  />
                </el-form-item>
              </div>

              <div class="publish-grid">
                <div class="publish-field">
                  <label>分类 <span>*</span></label>
                  <el-form-item prop="categoryPath" class="publish-item">
                    <el-cascader
                      v-model="form.categoryPath"
                      :options="categoryTree"
                      :props="categoryCascaderProps"
                      clearable
                      filterable
                      collapse-tags
                      collapse-tags-tooltip
                      placeholder="选择分类"
                      class="full-width"
                    />
                  </el-form-item>
                </div>

                <div class="publish-field">
                  <label>标题 <span>*</span></label>
                  <el-form-item prop="title" class="publish-item">
                    <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="输入商品标题" />
                  </el-form-item>
                </div>

                <div class="publish-field">
                  <label>成色 <span>*</span></label>
                  <el-form-item prop="quality" class="publish-item">
                    <el-slider v-model="form.quality" :min="1" :max="10" show-input />
                  </el-form-item>
                </div>
              </div>

              <div v-if="availableImageUrls.length > 0" class="publish-field publish-field--full">
                <label>封面图 <span>*</span></label>
                <el-form-item prop="cover" class="publish-item">
                  <el-radio-group v-model="form.cover" class="cover-group">
                    <el-radio
                      v-for="(url, index) in availableImageUrls"
                      :key="`${url}-${index}`"
                      :value="url"
                      class="cover-item"
                    >
                      <img :src="url" alt="封面候选" />
                    </el-radio>
                  </el-radio-group>
                </el-form-item>
              </div>
            </section>

            <section class="publish-section">
              <h2>价格</h2>

              <div class="publish-grid publish-grid--two">
                <div class="publish-field">
                  <label>价格 <span>*</span></label>
                  <el-form-item prop="price" class="publish-item">
                    <el-input-number v-model="form.price" :min="0.01" :step="1" :precision="2" class="full-width" />
                  </el-form-item>
                </div>

                <div class="publish-field">
                  <label>原价</label>
                  <el-form-item prop="oldPrice" class="publish-item">
                    <el-input-number v-model="form.oldPrice" :min="0.01" :step="1" :precision="2" class="full-width" />
                  </el-form-item>
                </div>
              </div>
            </section>

            <section class="publish-section">
              <h2>发货设置</h2>

              <div class="publish-grid">
                <div class="publish-field">
                  <label>地点</label>
                  <el-form-item prop="location" class="publish-item">
                    <el-input v-model="form.location" maxlength="120" show-word-limit placeholder="如：图书馆南门 / 宿舍楼下" />
                  </el-form-item>
                </div>
              </div>
            </section>
          </el-form>

          <div class="publish-footer">
            <el-button @click="goManage">返回管理</el-button>
            <el-button :loading="saving" @click="persistGoods(false)">
              {{ editingId ? '保存修改' : '保存草稿' }}
            </el-button>
            <el-button type="primary" :loading="saving" @click="persistGoods(true)">
              {{ editingId ? '保存并提交' : '发布' }}
            </el-button>
          </div>
        </div>
      </section>

      <div v-else class="seller-layout">
        <aside class="seller-side">
          <el-card class="category-card" shadow="never">
            <div class="category-card__head">
              <span>分类</span>
              <el-button link type="primary" @click="goCreate">发布闲置</el-button>
            </div>

            <div class="category-nav" @mouseleave="focusCategoryTop(0)">
              <button
                v-for="(item, index) in topCategories"
                :key="item.id"
                type="button"
                class="category-row"
                :class="{ 'is-active': hoveredTopIndex === index }"
                @mouseenter="focusCategoryTop(index)"
              >
                <span class="category-row__name">{{ item.name }}</span>
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>

            <transition name="fade">
              <div v-if="activeTopCategory" class="category-flyout">
                <div class="category-flyout__title">{{ activeTopCategory.name }}</div>
                <div class="category-tags">
                  <button
                    v-for="child in activeTopChildren.length > 0 ? activeTopChildren : [activeTopCategory]"
                    :key="child.id"
                    type="button"
                    class="category-tag"
                    @click="selectCategory(child, activeTopChildren.length > 0 ? activeTopCategory : null)"
                  >
                    {{ child.name }}
                  </button>
                </div>
              </div>
            </transition>
          </el-card>

          <el-card class="side-card" shadow="never">
            <div class="side-card__title">商品概览</div>
            <div class="summary-grid">
              <div v-for="item in summaryCards" :key="item.label" class="summary-item">
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </div>
            </div>
            <el-button type="primary" class="full-button" @click="goCreate">发布闲置</el-button>
          </el-card>
        </aside>

        <main class="seller-main">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <h2>{{ isCreateMode ? formTitle : '管理商品' }}</h2>
                  <p>{{ isCreateMode ? '填写后保存草稿或直接提交。' : '筛选、编辑、上下架、删除都在这里。' }}</p>
                </div>

                <div class="mode-switch">
                  <button type="button" class="mode-pill" :class="{ 'is-active': isCreateMode }" @click="goCreate">
                    发布闲置
                  </button>
                  <button type="button" class="mode-pill" :class="{ 'is-active': !isCreateMode }" @click="goManage">
                    管理商品
                  </button>
                </div>
              </div>
            </template>

            <div v-if="isCreateMode" class="publish-shell">
              <div class="publish-actions">
                <el-button @click="goManage">返回管理</el-button>
                <el-button :loading="saving" @click="persistGoods(false)">
                  {{ editingId ? '保存修改' : '保存草稿' }}
                </el-button>
                <el-button type="primary" :loading="saving" @click="persistGoods(true)">
                  {{ editingId ? '保存并提交' : '保存并提交' }}
                </el-button>
              </div>

              <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" class="publish-form">
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="分类" prop="categoryPath">
                      <el-cascader
                        v-model="form.categoryPath"
                        :options="categoryTree"
                        :props="categoryCascaderProps"
                        clearable
                        filterable
                        collapse-tags
                        collapse-tags-tooltip
                        placeholder="选择分类"
                        class="full-width"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="标题" prop="title">
                      <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="输入商品标题" />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="售价" prop="price">
                      <el-input-number v-model="form.price" :min="0.01" :step="1" :precision="2" class="full-width" />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="原价" prop="oldPrice">
                      <el-input-number v-model="form.oldPrice" :min="0.01" :step="1" :precision="2" class="full-width" />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="成色" prop="quality">
                      <el-slider v-model="form.quality" :min="1" :max="10" show-input />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="地点" prop="location">
                      <el-input v-model="form.location" maxlength="120" show-word-limit placeholder="如：图书馆南门" />
                    </el-form-item>
                  </el-col>

                  <el-col :span="24">
                    <el-form-item label="详情" prop="detail">
                      <el-input
                        v-model="form.detail"
                        type="textarea"
                        :rows="4"
                        maxlength="5000"
                        show-word-limit
                        placeholder="补充成色、配件、使用情况"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="24">
                    <el-form-item label="图片" prop="fileList">
                      <el-upload
                        v-model:file-list="form.fileList"
                        list-type="picture-card"
                        multiple
                        :limit="9"
                        :http-request="handleImageUpload"
                        :before-upload="beforeImageUpload"
                        :on-success="handleUploadSuccess"
                        :on-remove="handleUploadRemove"
                        :on-preview="handleUploadPreview"
                        :on-exceed="handleUploadExceed"
                      >
                        <el-icon><Plus /></el-icon>
                      </el-upload>
                      <div class="upload-tip">最多 9 张，单张不超过 5MB。</div>
                    </el-form-item>
                  </el-col>

                  <el-col :span="24" v-if="availableImageUrls.length > 0">
                    <el-form-item label="封面" prop="cover">
                      <el-radio-group v-model="form.cover" class="cover-group">
                        <el-radio
                          v-for="(url, index) in availableImageUrls"
                          :key="`${url}-${index}`"
                          :value="url"
                          class="cover-item"
                        >
                          <img :src="url" alt="封面候选" />
                        </el-radio>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
            </div>

            <div v-else class="manage-shell">
              <el-form :inline="true" class="filter-form" @submit.prevent="handleSearch">
                <el-form-item label="标题">
                  <el-input
                    v-model="queryForm.title"
                    placeholder="搜索标题"
                    clearable
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>

                <el-form-item label="状态">
                  <el-select v-model="queryForm.status" placeholder="全部" clearable>
                    <el-option
                      v-for="item in SELLER_GOODS_STATUS_OPTIONS"
                      :key="String(item.value)"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" @click="handleSearch">筛选</el-button>
                  <el-button @click="handleReset">重置</el-button>
                </el-form-item>
              </el-form>

              <el-table :data="records" border v-loading="loading" class="goods-table">
                <el-table-column label="序号" type="index" width="76" :index="getRowIndex" />

                <el-table-column label="商品" min-width="260">
                  <template #default="{ row }">
                    <div class="goods-cell">
                      <img v-if="row.cover" :src="row.cover" alt="封面" class="goods-cover" />
                      <div v-else class="goods-cover-empty">无图</div>
                      <div class="goods-info">
                        <p class="goods-title">{{ row.title || '-' }}</p>
                        <span class="goods-meta">{{ row.location || '未填写地点' }}</span>
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="分类" min-width="140">
                  <template #default="{ row }">
                    {{ categoryNameMap[row.categoryId] || `分类 #${row.categoryId || '-'}` }}
                  </template>
                </el-table-column>

                <el-table-column label="价格" min-width="100">
                  <template #default="{ row }">
                    ￥{{ toPrice(row.price) }}
                  </template>
                </el-table-column>

                <el-table-column label="成色" width="92">
                  <template #default="{ row }">
                    {{ row.quality || '-' }} 成
                  </template>
                </el-table-column>

                <el-table-column label="状态" width="120">
                  <template #default="{ row }">
                    <el-tag :type="statusTagType(row.status)" round>
                      {{ row.statusDesc || GOODS_STATUS_LABEL_MAP[row.status] || '未知' }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="更新时间" min-width="170">
                  <template #default="{ row }">
                    {{ formatDateTime(row.updateTime) }}
                  </template>
                </el-table-column>

                <el-table-column label="操作" min-width="240" fixed="right">
                  <template #default="{ row }">
                    <div class="actions">
                      <el-button
                        v-if="canEdit(row.status)"
                        type="primary"
                        link
                        :disabled="isRowActionLoading(row.id)"
                        @click="openEdit(row)"
                      >
                        编辑
                      </el-button>

                      <el-button
                        v-if="canSubmit(row.status)"
                        type="warning"
                        link
                        :disabled="isRowActionLoading(row.id)"
                        @click="handleSubmitAudit(row)"
                      >
                        提交
                      </el-button>

                      <el-button
                        v-if="canOnShelf(row.status)"
                        type="success"
                        link
                        :disabled="isRowActionLoading(row.id)"
                        @click="handleOnShelf(row)"
                      >
                        上架
                      </el-button>

                      <el-button
                        v-if="canOffShelf(row.status)"
                        type="danger"
                        link
                        :disabled="isRowActionLoading(row.id)"
                        @click="handleOffShelf(row)"
                      >
                        下架
                      </el-button>

                      <el-button
                        v-if="canDelete(row.status)"
                        type="danger"
                        link
                        :disabled="isRowActionLoading(row.id)"
                        @click="handleDelete(row)"
                      >
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pager-wrap">
                <el-pagination
                  v-model:current-page="pager.page"
                  v-model:page-size="pager.pageSize"
                  :total="pager.total"
                  :page-sizes="[10, 20, 30]"
                  layout="total, sizes, prev, pager, next"
                  @current-change="handleCurrentChange"
                  @size-change="handleSizeChange"
                />
              </div>
            </div>
          </el-card>
        </main>
      </div>
    </template>

    <el-card v-else class="access-card" shadow="never">
      <el-result
        icon="warning"
        title="当前账号未开通卖家权限"
        sub-title="先完成卖家认证，再回来发布和管理商品。"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/seller-auth')">去卖家认证</el-button>
        </template>
      </el-result>
    </el-card>

    <el-dialog v-model="previewVisible" title="图片预览" width="640px">
      <img :src="previewImage" class="preview-image" alt="预览图片" />
    </el-dialog>
  </div>
</template>

<style scoped>
.seller-goods-page {
  display: grid;
  gap: 16px;
}

.publish-page {
  display: grid;
  grid-template-columns: 220px minmax(980px, 1180px) minmax(0, 1fr);
  gap: 0;
  min-height: calc(100vh - 160px);
  background: transparent;
}

.publish-page__gutter {
  border-radius: 24px 0 0 24px;
  background: #f1f3f6;
}

.publish-page__body {
  width: 100%;
  max-width: none;
  min-height: calc(100vh - 160px);
  padding: 28px 28px 110px;
  border-radius: 28px;
  background: #fff;
  display: grid;
  align-content: start;
  gap: 24px;
  box-shadow: none;
}

.publish-page__head h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: var(--zz-black);
}

.publish-form--page {
  gap: 28px;
}

.publish-section {
  display: grid;
  gap: 18px;
  padding-bottom: 8px;
}

.publish-section h2 {
  margin: 0;
  font-size: 18px;
  color: var(--zz-black);
}

.publish-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.publish-grid--two {
  max-width: 620px;
}

.publish-field {
  display: grid;
  gap: 8px;
}

.publish-field--full {
  max-width: 960px;
}

.publish-field label {
  font-size: 15px;
  font-weight: 500;
  color: var(--zz-text-secondary);
}

.publish-field label span {
  color: #ff7d45;
}

.publish-item {
  margin-bottom: 0;
}

.publish-item :deep(.el-form-item__content) {
  line-height: normal;
}

.publish-footer {
  position: sticky;
  bottom: 12px;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff 34%);
}

.page-head {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-top: 4px solid var(--zz-yellow);
}

.page-head__copy {
  display: grid;
  gap: 6px;
}

.page-head__copy p {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--zz-text-light);
  font-weight: 700;
}

.page-head__copy h1 {
  margin: 0;
  font-size: clamp(26px, 2.6vw, 38px);
  line-height: 1.1;
  color: var(--zz-black);
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.seller-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.seller-side {
  display: grid;
  gap: 16px;
}

.category-card {
  position: relative;
  overflow: visible;
  border-radius: 24px;
}

.category-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.category-card__head span {
  font-size: 15px;
  font-weight: 700;
  color: var(--zz-black);
}

.category-nav {
  display: grid;
  gap: 4px;
  max-height: 410px;
  overflow: auto;
  padding-right: 2px;
}

.category-row {
  width: 100%;
  min-height: 44px;
  padding: 0 10px 0 12px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: var(--zz-text);
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.category-row:hover,
.category-row.is-active {
  background: #f7f7f7;
  color: var(--zz-black);
}

.category-row__name {
  min-width: 0;
  text-align: left;
  font-size: 14px;
}

.category-flyout {
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  width: min(560px, calc(100vw - 360px));
  padding: 18px 20px;
  border: 1px solid var(--zz-border);
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--zz-shadow-sm);
  z-index: 4;
}

.category-flyout__title {
  margin-bottom: 14px;
  font-size: 16px;
  font-weight: 700;
  color: var(--zz-black);
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-tag {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--zz-border);
  border-radius: 999px;
  background: #fff;
  color: var(--zz-text);
  cursor: pointer;
  transition: all 0.18s ease;
}

.category-tag:hover {
  border-color: var(--zz-yellow);
  background: var(--zz-yellow-soft);
  color: var(--zz-black);
}

.side-card {
  border-radius: 24px;
}

.side-card__title {
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--zz-black);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summary-item {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--zz-border);
  background: #fafafa;
  display: grid;
  gap: 6px;
}

.summary-item strong {
  font-size: 24px;
  line-height: 1;
  color: var(--zz-black);
}

.summary-item span {
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.full-button {
  width: 100%;
}

.seller-main {
  min-width: 0;
}

.panel-card {
  border-radius: 28px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.panel-header p {
  margin: 4px 0 0;
  color: var(--zz-text-secondary);
  font-size: 13px;
}

.mode-switch {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: #f6f6f6;
}

.mode-pill {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--zz-text-secondary);
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-pill.is-active {
  background: var(--zz-yellow);
  color: var(--zz-black);
  font-weight: 700;
}

.publish-shell,
.manage-shell {
  display: grid;
  gap: 16px;
}

.publish-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.publish-form {
  display: grid;
}

.full-width {
  width: 100%;
}

.upload-tip {
  width: 100%;
  margin-top: 8px;
  color: var(--zz-text-light);
  font-size: 12px;
}

.cover-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cover-item :deep(.el-radio__label) {
  padding-left: 6px;
}

.cover-item img {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  border: 1px solid var(--zz-border);
  object-fit: cover;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
}

.goods-table {
  margin-top: 2px;
}

.goods-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goods-cover {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
}

.goods-cover-empty {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  border: 1px dashed var(--zz-border-strong);
  background: var(--zz-page-bg);
  color: var(--zz-text-light);
  font-size: 12px;
  display: grid;
  place-items: center;
}

.goods-info {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.goods-title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-all;
}

.goods-meta {
  color: var(--zz-text-light);
  font-size: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
}

.access-card {
  border-radius: 24px;
}

.preview-image {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

@media (max-width: 1080px) {
  .publish-page {
    grid-template-columns: 1fr;
  }

  .publish-page__gutter {
    display: none;
  }

  .publish-page__body {
    max-width: none;
    min-height: auto;
    padding: 22px 20px 96px;
  }

  .seller-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-head__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .publish-grid {
    grid-template-columns: 1fr;
  }

  .publish-footer {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .publish-actions {
    flex-direction: column;
  }
}
</style>
