export const SEARCH_SORT_OPTIONS = [
  { label: '最新发布', value: 'time' },
  { label: '热度优先', value: 'hot' },
  { label: '价格升序', value: 'price_asc' },
  { label: '价格降序', value: 'price_desc' },
]

export const SEARCH_QUALITY_OPTIONS = [
  { label: '全部成色', value: '' },
  { label: '95新', value: '5' },
  { label: '9成新', value: '4' },
  { label: '8成新', value: '3' },
  { label: '7成新', value: '2' },
  { label: '6成新及以下', value: '1' },
]

const SEARCH_SORT_LABEL_MAP = {
  time: '最新发布',
  hot: '热度优先',
  price_asc: '价格升序',
  price_desc: '价格降序',
}

const SEARCH_QUALITY_LABEL_MAP = {
  5: '95新',
  4: '9成新',
  3: '8成新',
  2: '7成新',
  1: '6成新及以下',
}

const SEARCH_ASSIST_FALLBACK_HOT_KEYWORDS = [
  '手机',
  '电脑',
  '耳机',
  '教材',
  '自行车',
  '平板',
  '键盘',
  '宿舍小电器',
  '相机',
  '书包',
]

const SORT_ALIASES = {
  latest: 'time',
  time: 'time',
  hot: 'hot',
  priceasc: 'price_asc',
  price_asc: 'price_asc',
  pricedesc: 'price_desc',
  price_desc: 'price_desc',
}

export function normalizeSearchSortBy(value) {
  if (!value) {
    return 'time'
  }

  const normalized = String(value).trim().toLowerCase()
  return SORT_ALIASES[normalized] || normalized
}

export function formatSearchSortLabel(value) {
  return SEARCH_SORT_LABEL_MAP[normalizeSearchSortBy(value)] || SEARCH_SORT_LABEL_MAP.time
}

export function formatSearchQualityLabel(value) {
  const key = String(value ?? '')
  return SEARCH_QUALITY_LABEL_MAP[key] || '成色未知'
}

function takeUniqueKeywords(values, limit) {
  const result = []
  const seen = new Set()

  for (const value of values) {
    const keyword = typeof value === 'string' ? value.trim() : ''
    if (!keyword || seen.has(keyword)) {
      continue
    }

    seen.add(keyword)
    result.push(keyword)

    if (result.length >= limit) {
      break
    }
  }

  return result
}

export function buildSearchAssistFallback(keyword, limit = 8) {
  const trimmed = typeof keyword === 'string' ? keyword.trim() : ''
  if (!trimmed) {
    return getFallbackHotSearchKeywords(limit)
  }

  const variants = [
    `二手${trimmed}`,
    `闲置${trimmed}`,
    `${trimmed}配件`,
    `${trimmed}支架`,
    `${trimmed}壳`,
    `${trimmed}同城`,
    `${trimmed}充电器`,
    `${trimmed}原装`,
    `校园${trimmed}`,
    `宿舍${trimmed}`,
  ]

  return takeUniqueKeywords(variants, limit)
}

export function getFallbackHotSearchKeywords(limit = 8) {
  return takeUniqueKeywords(SEARCH_ASSIST_FALLBACK_HOT_KEYWORDS, limit)
}
