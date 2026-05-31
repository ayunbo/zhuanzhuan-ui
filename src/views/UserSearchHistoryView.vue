<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock3, MapPin, RefreshCcw, Search, Trash2 } from 'lucide-vue-next'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fetchCategoryTree } from '@/api/category'
import {
  clearSearchHistory,
  deleteSearchHistory,
  fetchSearchHistoryArchive,
} from '@/api/search'
import { GOODS_STATUS_LABEL_MAP } from '@/constants/goods'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { ensureLoggedIn } from '@/utils/request'
import {
  formatSearchQualityLabel,
  formatSearchSortLabel,
  normalizeSearchSortBy,
} from '@/utils/search'

const router = useRouter()

const loading = ref(false)
const categories = ref([])
const archives = ref([])

const categoryMap = computed(() => {
  const map = new Map()

  function walk(nodes) {
    if (!Array.isArray(nodes)) {
      return
    }

    nodes.forEach((node) => {
      map.set(node.id, node)
      walk(node.children)
    })
  }

  walk(categories.value)
  return map
})

const totalCount = computed(() =>
  archives.value.reduce(
    (total, archive) => total + (Array.isArray(archive?.items) ? archive.items.length : 0),
    0,
  ),
)

const latestSearchTime = computed(() => {
  for (const archive of archives.value) {
    if (Array.isArray(archive?.items) && archive.items.length > 0) {
      return formatDateTime(archive.items[0].lastSearchTime)
    }
  }

  return '-'
})

const summaryMetrics = computed(() => [
  {
    label: '历史总数',
    value: `${totalCount.value} 条`,
  },
  {
    label: '归档天数',
    value: `${archives.value.length} 天`,
  },
  {
    label: '最近搜索',
    value: latestSearchTime.value,
  },
])

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg || error?.message || fallback
}

function normalizeCategoryNode(node) {
  return {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    level: node.level,
    sort: node.sort,
    status: node.status,
    children: Array.isArray(node.children) ? node.children.map(normalizeCategoryNode) : [],
  }
}

function getCategoryLabel(categoryId) {
  if (!categoryId) {
    return '全部分类'
  }

  const category = categoryMap.value.get(categoryId)
  return category?.name || `分类 ${categoryId}`
}

function formatPriceRange(item) {
  const hasMin = item?.minPrice !== null && item?.minPrice !== undefined && item.minPrice !== ''
  const hasMax = item?.maxPrice !== null && item?.maxPrice !== undefined && item.maxPrice !== ''

  if (!hasMin && !hasMax) {
    return '不限'
  }

  if (hasMin && hasMax) {
    return `${formatCurrency(item.minPrice)} - ${formatCurrency(item.maxPrice)}`
  }

  if (hasMin) {
    return `≥ ${formatCurrency(item.minPrice)}`
  }

  return `≤ ${formatCurrency(item.maxPrice)}`
}

function buildSearchQuery(item) {
  const query = {}

  if (item?.keyword?.trim()) {
    query.keyword = item.keyword.trim()
  }

  if (item?.categoryId) {
    query.categoryId = String(item.categoryId)
  }

  if (item?.quality !== null && item?.quality !== undefined && item.quality !== '') {
    query.quality = String(item.quality)
  }

  if (item?.location?.trim()) {
    query.location = item.location.trim()
  }

  if (item?.minPrice !== null && item?.minPrice !== undefined && item.minPrice !== '') {
    query.minPrice = String(item.minPrice)
  }

  if (item?.maxPrice !== null && item?.maxPrice !== undefined && item.maxPrice !== '') {
    query.maxPrice = String(item.maxPrice)
  }

  if (item?.sortBy) {
    const sortBy = normalizeSearchSortBy(item.sortBy)
    if (sortBy && sortBy !== 'time') {
      query.sortBy = sortBy
    }
  }

  query.page = '1'
  return query
}

function searchAgain(item) {
  router.push({
    path: '/search',
    query: buildSearchQuery(item),
  })
}

async function loadCategories() {
  try {
    const response = await fetchCategoryTree()
    const payload = response.data

    if (payload?.code !== 1) {
      throw new Error(payload?.msg || '分类加载失败')
    }

    categories.value = Array.isArray(payload.data) ? payload.data.map(normalizeCategoryNode) : []
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '分类加载失败'))
  }
}

async function loadArchives() {
  if (!ensureLoggedIn({ source: 'search-history' })) {
    archives.value = []
    return
  }

  loading.value = true
  try {
    const data = await fetchSearchHistoryArchive()
    archives.value = Array.isArray(data) ? data : []
  } catch (error) {
    archives.value = []
    ElMessage.error(getErrorMessage(error, '搜索历史加载失败'))
  } finally {
    loading.value = false
  }
}

async function refreshArchives() {
  await loadArchives()
}

async function handleDelete(item) {
  if (!item?.historyId) {
    return
  }

  try {
    await ElMessageBox.confirm('确定删除这条搜索记录吗？', '删除搜索记录', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteSearchHistory(item.historyId)
    archives.value = archives.value
      .map((archive) => ({
        ...archive,
        items: Array.isArray(archive.items)
          ? archive.items.filter((record) => String(record.historyId) !== String(item.historyId))
          : [],
      }))
      .filter((archive) => archive.items.length > 0)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    ElMessage.error(getErrorMessage(error, '删除失败'))
  }
}

async function handleClearAll() {
  if (!totalCount.value) {
    return
  }

  try {
    await ElMessageBox.confirm('确认清空全部搜索历史？该操作不可恢复。', '清空搜索历史', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await clearSearchHistory()
    archives.value = []
    ElMessage.success('搜索历史已清空')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    ElMessage.error(getErrorMessage(error, '清空失败'))
  }
}

function handleGoSearch() {
  router.push('/search')
}

function statusLabel(value) {
  return GOODS_STATUS_LABEL_MAP[value] || '状态未知'
}

onMounted(async () => {
  await loadCategories()
  await loadArchives()
})
</script>

<template>
  <section class="bg-slate-50 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-[1480px] flex-col gap-6">
      <Card
        class="overflow-hidden border border-slate-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#eff6ff_100%)] shadow-sm"
      >
        <div class="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
              SEARCH HISTORY
            </p>
            <h1 class="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              搜索历史
            </h1>
            <p class="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              这里会保存你在商品搜索页使用过的关键词、分类、成色、位置、价格和排序条件，
              支持再次搜索、单条删除和一键清空。
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <article
              v-for="item in summaryMetrics"
              :key="item.label"
              class="rounded-3xl border border-white/80 bg-white/90 px-4 py-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <span class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                {{ item.label }}
              </span>
              <strong class="mt-2 block text-lg font-black text-slate-950">{{ item.value }}</strong>
            </article>
          </div>
        </div>
      </Card>

      <section class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-slate-900">最近搜索</h2>
          <p class="text-sm text-slate-500">可按时间归档查看，也可以直接再次发起同样的搜索条件。</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" class="h-10" @click="refreshArchives">
            <RefreshCcw class="h-4 w-4" />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-10 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            :disabled="!totalCount"
            @click="handleClearAll"
          >
            <Trash2 class="h-4 w-4" />
            清空历史
          </Button>
        </div>
      </section>

      <section v-loading="loading" class="min-h-[260px]">
        <div v-if="archives.length" class="grid gap-5">
          <Card
            v-for="archive in archives"
            :key="archive.dateKey"
            class="overflow-hidden border border-slate-200/80 bg-white shadow-sm"
          >
            <div class="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-slate-900">
                    {{ archive.dateLabel || archive.dateKey }}
                  </h3>
                  <p class="mt-1 text-sm text-slate-500">{{ archive.items?.length || 0 }} 条记录</p>
                </div>
                <span
                  class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                >
                  {{ archive.dateKey }}
                </span>
              </div>
            </div>

            <div class="grid gap-4 px-5 py-5 sm:px-6">
              <article
                v-for="item in archive.items"
                :key="item.historyId"
                class="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 transition hover:border-brand-200 hover:bg-white"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <button
                    type="button"
                    class="group flex min-w-0 items-center gap-3 text-left"
                    @click="searchAgain(item)"
                  >
                    <span
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white"
                    >
                      <Search class="h-4 w-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-base font-semibold text-slate-900 group-hover:text-brand-700">
                        {{ item.keyword?.trim() || '全部条件搜索' }}
                      </span>
                      <span class="mt-1 block text-xs text-slate-500">
                        点击可以立即复用这组搜索条件
                      </span>
                    </span>
                  </button>

                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      搜索次数 {{ item.searchCount ?? 1 }} 次
                    </span>
                    <span
                      class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      <Clock3 class="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                      {{ formatDateTime(item.lastSearchTime) }}
                    </span>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    分类：{{ getCategoryLabel(item.categoryId) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    成色：{{ formatSearchQualityLabel(item.quality) }}
                  </span>
                  <span
                    v-if="item.location"
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    <MapPin class="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                    {{ item.location }}
                  </span>
                  <span
                    v-if="item.minPrice !== null || item.maxPrice !== null"
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    价格：{{ formatPriceRange(item) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    排序：{{ formatSearchSortLabel(item.sortBy) }}
                  </span>
                  <span
                    v-if="item.status !== null && item.status !== undefined"
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    状态：{{ statusLabel(item.status) }}
                  </span>
                  <span
                    v-if="item.sellerId"
                    class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    卖家 ID：{{ item.sellerId }}
                  </span>
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <Button size="sm" class="h-10" @click="searchAgain(item)">
                    <Search class="h-4 w-4" />
                    重新搜索
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
                    @click="handleDelete(item)"
                  >
                    <Trash2 class="h-4 w-4" />
                    删除记录
                  </Button>
                </div>
              </article>
            </div>
          </Card>
        </div>

        <MarketplaceEmptyState
          v-else
          title="暂无搜索历史"
          description="你在商品搜索页使用关键词、分类、价格、成色或位置筛选后，记录会自动保存到这里。"
          action-text="去搜索商品"
          @action="handleGoSearch"
        />
      </section>
    </div>
  </section>
</template>
