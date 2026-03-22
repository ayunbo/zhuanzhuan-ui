<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Goods,
  Iphone,
  Monitor,
  Reading,
  ShoppingBag,
  Suitcase,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MarketplaceEmptyState from '@/components/MarketplaceEmptyState.vue'
import MarketplaceProductCard from '@/components/MarketplaceProductCard.vue'
import { fetchCategoryTree } from '@/api/category'
import { fetchPublicGoodsPage } from '@/api/goods'

const router = useRouter()

const loading = ref(false)
const categoryTree = ref([])
const recommendGoods = ref([])
const latestGoods = ref([])
const heroBlocks = ref([])
const activeTab = ref('all')
const activeCategoryId = ref('')
const showMegaPanel = ref(false)

let megaCloseTimer = 0

const iconList = [Iphone, ShoppingBag, Reading, Suitcase, Goods, Monitor]
const blockThemes = [
  { key: 'wardrobe', color: 'yellow' },
  { key: 'digital', color: 'blue' },
  { key: 'anime', color: 'green' },
  { key: 'coupon', color: 'pink' },
]

const topCategories = computed(() => categoryTree.value.slice(0, 9))

const activeCategory = computed(() => {
  return topCategories.value.find((item) => String(item.id) === String(activeCategoryId.value)) || topCategories.value[0] || null
})

const megaCategoryGroups = computed(() => {
  if (!activeCategory.value || !Array.isArray(activeCategory.value.children)) {
    return []
  }

  return activeCategory.value.children.slice(0, 7).map((item) => ({
    id: item.id,
    title: item.name,
    children: Array.isArray(item.children) ? item.children.slice(0, 8) : [],
  }))
})

const categoryTabs = computed(() => {
  const flat = flattenCategories(categoryTree.value).slice(0, 10)
  return [{ id: 'all', name: '猜你喜欢' }].concat(
    flat.map((item) => ({
      id: String(item.id),
      name: item.name,
    })),
  )
})

const filteredGoods = computed(() => {
  if (activeTab.value === 'all') {
    return latestGoods.value
  }

  return latestGoods.value.filter((item) => String(item.categoryId) === String(activeTab.value))
})

function flattenCategories(nodes, result = []) {
  if (!Array.isArray(nodes)) {
    return result
  }

  nodes.forEach((node) => {
    if (!node) return
    result.push(node)
    flattenCategories(node.children, result)
  })

  return result
}

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

  return list.filter(Boolean).map((item) => ({
    ...item,
    title: item.title || '校园好物',
    cover: item.cover || '',
    sellerName: item.sellerName || item.location || '校园卖家',
  }))
}

function getCategoryPreview(item) {
  return Array.isArray(item?.children)
    ? item.children
        .slice(0, 2)
        .map((child) => child.name)
        .filter(Boolean)
        .join(' / ')
    : ''
}

function collectCategoryIds(node, bucket = new Set()) {
  if (!node) {
    return bucket
  }

  bucket.add(String(node.id))

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectCategoryIds(child, bucket))
  }

  return bucket
}

function uniqueGoods(list) {
  const map = new Map()

  list.forEach((item) => {
    if (item?.id && !map.has(String(item.id))) {
      map.set(String(item.id), item)
    }
  })

  return Array.from(map.values())
}

function pickRandomItems(list, count) {
  const pool = [...list]
  const result = []

  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length)
    result.push(pool[index])
    pool.splice(index, 1)
  }

  return result
}

function buildHeroBlocks(categories, goods) {
  const goodsPool = uniqueGoods(goods)

  return categories.slice(0, 4).map((category, index) => {
    const theme = blockThemes[index % blockThemes.length]
    const categoryIds = collectCategoryIds(category)
    const matchedGoods = goodsPool.filter((item) => categoryIds.has(String(item.categoryId)))
    const items = pickRandomItems(matchedGoods.length ? matchedGoods : goodsPool, 3)

    return {
      key: `${theme.key}-${category.id}`,
      color: theme.color,
      title: category.name,
      subTitle: getCategoryPreview(category) || '校内热门精选',
      items,
    }
  })
}

function cancelMegaPanelClose() {
  if (megaCloseTimer) {
    clearTimeout(megaCloseTimer)
    megaCloseTimer = 0
  }
}

function scheduleMegaPanelClose() {
  cancelMegaPanelClose()
  megaCloseTimer = window.setTimeout(() => {
    showMegaPanel.value = false
  }, 140)
}

function openMegaPanel(item) {
  cancelMegaPanelClose()
  activeCategoryId.value = String(item.id)
  showMegaPanel.value = true
}

function goGoodsDetail(item) {
  if (!item?.id) return
  router.push(`/goods/${item.id}`)
}

function goGoodsList(query = {}) {
  router.push({
    path: '/goods',
    query,
  })
}

function goCategory(item) {
  if (!item?.id) {
    goGoodsList()
    return
  }

  activeTab.value = String(item.id)
  goGoodsList({
    categoryId: String(item.id),
    categoryName: item.name,
  })
}

async function loadHomeData() {
  loading.value = true
  try {
    const [categoryData, latestPage, recommendPage] = await Promise.all([
      fetchCategoryTree(),
      fetchPublicGoodsPage({
        page: 1,
        pageSize: 20,
        sortBy: 'latest',
      }),
      fetchPublicGoodsPage({
        page: 1,
        pageSize: 12,
        sortBy: 'hot',
      }),
    ])

    categoryTree.value = normalizeCategories(categoryData)
    activeCategoryId.value = categoryTree.value[0]?.id ? String(categoryTree.value[0].id) : ''
    latestGoods.value = normalizeGoods(latestPage?.records)
    recommendGoods.value = normalizeGoods(recommendPage?.records)
    heroBlocks.value = buildHeroBlocks(categoryTree.value, [...recommendGoods.value, ...latestGoods.value])
  } catch (error) {
    ElMessage.error(error.message || '首页数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadHomeData)
onBeforeUnmount(cancelMegaPanelClose)
</script>

<template>
  <div class="home-page zz-page">
    <section class="hero-shell zz-white-panel">
      <div
        class="hero-layout"
        @mouseenter="cancelMegaPanelClose"
        @mouseleave="scheduleMegaPanelClose"
      >
        <aside class="category-board">
          <button
            v-for="(item, index) in topCategories"
            :key="item.id"
            type="button"
            class="category-entry"
            :class="{ 'is-active': String(item.id) === String(activeCategoryId) }"
            @mouseenter="openMegaPanel(item)"
            @click="goCategory(item)"
            >
              <span class="category-entry__icon">
                <el-icon><component :is="iconList[index % iconList.length]" /></el-icon>
              </span>
              <span class="category-entry__content">
                <span class="category-entry__primary">{{ item.name }}</span>
                <span v-if="getCategoryPreview(item)" class="category-entry__secondary"> / {{ getCategoryPreview(item) }}</span>
              </span>
            </button>
          </aside>

        <section v-if="!showMegaPanel || !activeCategory" class="hero-stage">
          <article class="promo-poster">
            <span class="poster-badge">校园捡漏专区</span>
            <h1>把闲置流转给更需要它的同学</h1>
            <p>围绕校园交易场景重做首页主屏，先把搜索、分类、逛买体验拉回正常节奏。</p>

            <div class="poster-actions">
              <el-button type="primary" @click="goGoodsList()">去逛一逛</el-button>
              <el-button plain @click="router.push('/seller/goods?create=1')">发布闲置</el-button>
            </div>
          </article>

          <div class="channel-grid">
            <article
              v-for="block in heroBlocks"
              :key="block.key"
              class="channel-card"
              :class="`channel-card--${block.color}`"
            >
              <div class="channel-card__head">
                <div>
                  <h3>{{ block.title }}</h3>
                  <p>{{ block.subTitle }}</p>
                </div>

                <button type="button" class="channel-more" @click="goGoodsList()">
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>

              <div class="channel-items">
                <button
                  v-for="item in block.items"
                  :key="item.id"
                  type="button"
                  class="channel-item"
                  @click="goGoodsDetail(item)"
                >
                  <img v-if="item.cover" :src="item.cover" :alt="item.title" />
                  <div v-else class="channel-item__empty">暂无图片</div>
                  <strong>￥{{ Number(item.price || 0).toFixed(2) }}</strong>
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-else class="mega-stage">
          <article class="mega-overlay">
            <div class="mega-copy__head">
              <div>
                <span class="mega-label">分类导航</span>
                <h2>{{ activeCategory?.name || '校园精选分类' }}</h2>
              </div>
              <el-button plain @click="activeCategory ? goCategory(activeCategory) : goGoodsList()">进入分类</el-button>
            </div>

            <div v-if="megaCategoryGroups.length" class="mega-groups">
              <div v-for="group in megaCategoryGroups" :key="group.id" class="mega-group">
                <button
                  type="button"
                  class="mega-group__title"
                  @click="goGoodsList({ categoryId: String(group.id), categoryName: group.title })"
                >
                  {{ group.title }}
                  <el-icon><ArrowRight /></el-icon>
                </button>

                <div class="mega-group__children">
                  <button
                    v-for="child in group.children"
                    :key="child.id"
                    type="button"
                    class="mega-child"
                    @click="goGoodsList({ categoryId: String(child.id), categoryName: child.name })"
                  >
                    {{ child.name }}
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="mega-empty">
              当前分类暂无更多二级分类，点击进入分类查看对应商品。
            </div>
          </article>
        </section>
      </div>
    </section>

    <section class="feed-shell zz-white-panel">
      <div class="tabs-panel">
        <div class="zz-chip-row">
          <button
            v-for="tab in categoryTabs"
            :key="tab.id"
            type="button"
            class="zz-chip"
            :class="{ 'is-active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </div>
      </div>

      <div class="feed-panel">
        <div v-if="filteredGoods.length" class="goods-grid">
          <MarketplaceProductCard
            v-for="item in filteredGoods"
            :key="item.id"
            :item="item"
            @click="goGoodsDetail"
          />
        </div>

        <MarketplaceEmptyState
          v-else-if="!loading"
          title="当前分类暂无商品"
          description="可以切换到其他分类，或者直接查看全部商品。"
          action-text="查看全部商品"
          @action="goGoodsList()"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-shell {
  padding: 12px;
}

.hero-layout {
  --category-width: 288px;
  display: grid;
  grid-template-columns: var(--category-width) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  position: relative;
}

.category-board {
  display: grid;
  gap: 2px;
  padding: 12px 10px;
  border-radius: 22px;
  background: #f7f7f7;
}

.category-entry {
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--zz-text);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.category-entry:hover,
.category-entry.is-active {
  background: #fff4bf;
}

.category-entry.is-active {
  font-weight: 700;
}

.category-entry__icon {
  width: 24px;
  height: 24px;
  border-radius: 10px;
  background: #fff6cf;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.category-entry__content {
  min-width: 0;
  font-size: 14px;
  line-height: 1.15;
  overflow: hidden;
  white-space: nowrap;
}

.category-entry__primary {
  color: var(--zz-black);
}

.category-entry__secondary {
  color: var(--zz-text-secondary);
}

.hero-stage {
  display: grid;
  grid-template-columns: 242px minmax(0, 1fr);
  gap: 12px;
  min-height: 312px;
}

.mega-stage {
  min-height: 312px;
}

.promo-poster {
  min-height: 312px;
  padding: 18px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 86% 18%, rgba(255, 255, 255, 0.22), transparent 18%),
    radial-gradient(circle at 78% 72%, rgba(255, 226, 124, 0.38), transparent 20%),
    linear-gradient(135deg, #ff9627 0%, #ffb63d 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.poster-badge {
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 248, 214, 0.92);
  color: #a86c00;
  font-size: 13px;
  font-weight: 700;
}

.promo-poster h1 {
  margin-top: 14px;
  max-width: 6.2em;
  font-size: 38px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.promo-poster p {
  margin-top: 12px;
  max-width: 16em;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.92);
}

.poster-actions {
  margin-top: auto;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.channel-card {
  min-height: 148px;
  padding: 12px;
  border: 3px solid transparent;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.channel-card--yellow {
  background: #fff7cc;
  border-color: #f3d54a;
}

.channel-card--blue {
  background: #dcf3ff;
  border-color: #96ddff;
}

.channel-card--green {
  background: #ddf9d9;
  border-color: #9be58e;
}

.channel-card--pink {
  background: #ffe1f1;
  border-color: #f3b7dc;
}

.channel-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.channel-card__head h3 {
  font-size: 17px;
  color: var(--zz-black);
}

.channel-card__head p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--zz-text-secondary);
}

.channel-more {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: rgba(34, 34, 34, 0.88);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.channel-items {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.channel-item {
  border: 0;
  padding: 7px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  display: grid;
  gap: 5px;
  cursor: pointer;
}

.channel-item img,
.channel-item__empty {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  object-fit: cover;
  background: #fff;
}

.channel-item__empty {
  display: grid;
  place-items: center;
  color: var(--zz-text-light);
  font-size: 12px;
}

.channel-item strong {
  color: #ff5a26;
  text-align: center;
  font-size: 15px;
}

.mega-overlay {
  min-height: 100%;
  width: 100%;
  padding: 18px 22px;
  border-radius: 24px;
  border: 1px solid var(--zz-border);
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
  display: grid;
  align-content: start;
  gap: 16px;
}

.mega-copy__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mega-label {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  background: #fff6cf;
  color: #8f6c00;
  font-size: 12px;
  font-weight: 600;
}

.mega-copy__head h2 {
  margin-top: 10px;
  font-size: 24px;
  color: var(--zz-black);
  line-height: 1.15;
}

.mega-groups {
  display: grid;
  gap: 12px;
}

.mega-group {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.mega-group__title,
.mega-child {
  border: 0;
  background: transparent;
  color: var(--zz-text);
  text-align: left;
  cursor: pointer;
}

.mega-group__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
}

.mega-group__children {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.mega-child {
  color: var(--zz-text-secondary);
  font-size: 14px;
}

.mega-empty {
  padding: 18px;
  border-radius: 16px;
  background: #fafafa;
  color: var(--zz-text-secondary);
  line-height: 1.7;
}

.feed-shell {
  margin-top: 8px;
  padding: 12px;
}

.tabs-panel {
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f1f1;
}

.feed-panel {
  padding-top: 12px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1400px) {
  .goods-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .hero-stage {
    grid-template-columns: 228px minmax(0, 1fr);
  }

  .promo-poster h1 {
    font-size: 34px;
  }
}

@media (max-width: 1120px) {
  .hero-layout {
    grid-template-columns: 1fr;
  }

  .hero-stage {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .promo-poster {
    min-height: 260px;
  }

  .mega-overlay {
    width: 100%;
    min-height: auto;
  }
}

@media (max-width: 960px) {
  .channel-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .goods-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hero-shell {
    padding: 10px;
  }

  .hero-layout {
    --category-width: 100%;
  }

  .promo-poster {
    padding: 18px;
  }

  .promo-poster h1 {
    font-size: 34px;
  }

  .channel-items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mega-group {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (max-width: 680px) {
  .goods-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
