<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceProductCard from '@/components/MarketplaceProductCard.vue'
import { fetchCategoryTree } from '@/api/category'
import { fetchPublicGoodsPage } from '@/api/goods'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const categoryOptions = ref([])
const records = ref([])

const pager = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const queryForm = reactive({
  keyword: '',
  categoryPath: [],
  minPrice: '',
  maxPrice: '',
  sortBy: 'latest',
})

const sortTabs = [
  { value: 'latest', label: '最新发布' },
  { value: 'hot', label: '热度优先' },
  { value: 'priceAsc', label: '价格从低到高' },
  { value: 'priceDesc', label: '价格从高到低' },
]

const categoryCascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  checkStrictly: true,
  emitPath: true,
}

const flatCategories = computed(() => flattenCategories(categoryOptions.value).slice(0, 12))
const selectedCategoryName = computed(() => {
  const explicit = typeof route.query.categoryName === 'string' ? route.query.categoryName : ''
  if (explicit) return explicit

  const path = Array.isArray(queryForm.categoryPath) ? queryForm.categoryPath : []
  const id = path[path.length - 1]
  return findCategoryName(categoryOptions.value, id) || '全部分类'
})

function normalizeCategories(nodes) {
  if (!Array.isArray(nodes)) {
    return []
  }

  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    children: normalizeCategories(node.children),
  }))
}

function normalizeGoods(list) {
  if (!Array.isArray(list)) {
    return []
  }
  return list.filter(Boolean)
}

function flattenCategories(nodes, result = []) {
  if (!Array.isArray(nodes)) return result
  nodes.forEach((node) => {
    result.push(node)
    flattenCategories(node.children, result)
  })
  return result
}

function findCategoryName(nodes, targetId) {
  if (!Array.isArray(nodes) || !targetId) {
    return ''
  }

  for (const node of nodes) {
    if (String(node.id) === String(targetId)) {
      return node.name
    }
    const child = findCategoryName(node.children, targetId)
    if (child) return child
  }

  return ''
}

function syncFromRoute() {
  queryForm.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  queryForm.minPrice = typeof route.query.minPrice === 'string' ? route.query.minPrice : ''
  queryForm.maxPrice = typeof route.query.maxPrice === 'string' ? route.query.maxPrice : ''
  queryForm.sortBy = typeof route.query.sortBy === 'string' ? route.query.sortBy : 'latest'

  const categoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  queryForm.categoryPath = categoryId ? [categoryId] : []
  pager.page = Number(route.query.page || 1)
}

function buildApiQuery() {
  const params = {
    page: pager.page,
    pageSize: pager.pageSize,
    sortBy: queryForm.sortBy,
  }

  if (queryForm.keyword.trim()) {
    params.keyword = queryForm.keyword.trim()
  }

  const path = Array.isArray(queryForm.categoryPath) ? queryForm.categoryPath : []
  if (path.length) {
    params.categoryId = path[path.length - 1]
  }

  if (queryForm.minPrice) {
    params.minPrice = queryForm.minPrice
  }
  if (queryForm.maxPrice) {
    params.maxPrice = queryForm.maxPrice
  }

  return params
}

function applyQueryChange() {
  const targetLocation = {
    path: '/goods',
    query: (() => {
      const query = {}
      if (queryForm.keyword.trim()) query.keyword = queryForm.keyword.trim()
      if (queryForm.minPrice) query.minPrice = queryForm.minPrice
      if (queryForm.maxPrice) query.maxPrice = queryForm.maxPrice
      if (queryForm.sortBy !== 'latest') query.sortBy = queryForm.sortBy

      const path = Array.isArray(queryForm.categoryPath) ? queryForm.categoryPath : []
      if (path.length) {
        query.categoryId = String(path[path.length - 1])
        query.categoryName = selectedCategoryName.value
      }

      if (pager.page > 1) {
        query.page = String(pager.page)
      }
      return query
    })(),
  }

  if (router.resolve(targetLocation).fullPath === route.fullPath) {
    loadList()
    return
  }

  router.replace(targetLocation)
}

function handleSearch() {
  pager.page = 1
  applyQueryChange()
}

function handleReset() {
  queryForm.keyword = ''
  queryForm.categoryPath = []
  queryForm.minPrice = ''
  queryForm.maxPrice = ''
  queryForm.sortBy = 'latest'
  pager.page = 1
  applyQueryChange()
}

function changeSort(sortBy) {
  queryForm.sortBy = sortBy
  handleSearch()
}

function chooseCategory(item) {
  queryForm.categoryPath = [String(item.id)]
  handleSearch()
}

function goDetail(item) {
  if (!item?.id) return
  router.push(`/goods/${item.id}`)
}

async function loadCategories() {
  try {
    const data = await fetchCategoryTree()
    categoryOptions.value = normalizeCategories(data)
  } catch (error) {
    ElMessage.error(error.message || '分类加载失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const data = await fetchPublicGoodsPage(buildApiQuery())
    records.value = normalizeGoods(data?.records)
    pager.total = Number(data?.total || records.value.length)
  } catch (error) {
    ElMessage.error(error.message || '商品列表加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    syncFromRoute()
    loadList()
  },
)

onMounted(async () => {
  syncFromRoute()
  await loadCategories()
  await loadList()
})
</script>

<template>
  <div class="goods-list-page zz-page">
    <section class="search-head zz-white-panel">
      <div class="head-copy">
        <h1>{{ queryForm.keyword || '商品广场' }}</h1>
        <p>当前分类：{{ selectedCategoryName }}，共找到 {{ pager.total }} 件商品。</p>
      </div>

      <div class="head-controls">
        <el-input v-model="queryForm.keyword" placeholder="搜索商品标题" clearable @keyup.enter="handleSearch" />
        <el-cascader
          v-model="queryForm.categoryPath"
          :options="categoryOptions"
          :props="categoryCascaderProps"
          clearable
          filterable
          placeholder="选择分类"
        />
        <div class="price-range">
          <el-input v-model="queryForm.minPrice" placeholder="最低价" />
          <span>-</span>
          <el-input v-model="queryForm.maxPrice" placeholder="最高价" />
        </div>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button plain @click="handleReset">重置</el-button>
      </div>
    </section>

    <section class="filter-board zz-white-panel">
      <div class="sort-row">
        <button
          v-for="item in sortTabs"
          :key="item.value"
          type="button"
          class="sort-item"
          :class="{ 'is-active': queryForm.sortBy === item.value }"
          @click="changeSort(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="category-row">
        <button
          type="button"
          class="category-chip"
          :class="{ 'is-active': !queryForm.categoryPath.length }"
          @click="queryForm.categoryPath = []; handleSearch()"
        >
          全部
        </button>
        <button
          v-for="item in flatCategories"
          :key="item.id"
          type="button"
          class="category-chip"
          :class="{ 'is-active': String(queryForm.categoryPath[0] || '') === String(item.id) }"
          @click="chooseCategory(item)"
        >
          {{ item.name }}
        </button>
      </div>
    </section>

    <section class="result-board zz-white-panel">
      <div v-if="records.length" class="goods-grid">
        <MarketplaceProductCard
          v-for="item in records"
          :key="item.id"
          :item="item"
          @click="goDetail"
        />
      </div>

      <MarketplaceEmptyState
        v-else-if="!loading"
        title="没有找到匹配商品"
        description="可以调整关键词、分类或价格区间后重新搜索。"
        action-text="返回全部商品"
        @action="handleReset"
      />
    </section>

    <div class="pager-wrap">
      <el-pagination
        v-model:current-page="pager.page"
        v-model:page-size="pager.pageSize"
        :total="pager.total"
        :page-sizes="[20, 30, 40]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadList"
        @size-change="loadList"
      />
    </div>
  </div>
</template>

<style scoped>
.search-head,
.filter-board,
.result-board {
  padding: 18px;
}

.search-head {
  display: grid;
  gap: 18px;
}

.head-copy h1 {
  font-size: 32px;
  line-height: 1.08;
  color: var(--zz-black);
}

.head-copy p {
  margin-top: 8px;
  color: var(--zz-text-secondary);
}

.head-controls {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto auto;
  gap: 12px;
}

.price-range {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.sort-row,
.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.sort-item,
.category-chip {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid var(--zz-border);
  border-radius: 999px;
  background: #fff;
  color: var(--zz-text);
  cursor: pointer;
}

.sort-item.is-active,
.category-chip.is-active {
  border-color: transparent;
  background: var(--zz-yellow);
  color: var(--zz-black);
  font-weight: 700;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1480px) {
  .goods-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .head-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .goods-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .head-controls {
    grid-template-columns: 1fr;
  }

  .goods-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pager-wrap {
    justify-content: center;
  }
}
</style>
