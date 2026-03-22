export const GOODS_STATUS = {
  DRAFT: 0,
  PENDING: 1,
  REJECTED: 2,
  ON_SALE: 3,
  LOCKED: 4,
  SOLD: 5,
  OFF_SHELF: 6,
}

export const GOODS_STATUS_LABEL_MAP = {
  [GOODS_STATUS.DRAFT]: '草稿',
  [GOODS_STATUS.PENDING]: '待审核',
  [GOODS_STATUS.REJECTED]: '已驳回',
  [GOODS_STATUS.ON_SALE]: '在售',
  [GOODS_STATUS.LOCKED]: '锁定中',
  [GOODS_STATUS.SOLD]: '已售出',
  [GOODS_STATUS.OFF_SHELF]: '已下架',
}

export const GOODS_SORT_OPTIONS = [
  {
    label: '最新发布',
    value: 'latest',
  },
  {
    label: '价格升序',
    value: 'priceAsc',
  },
  {
    label: '价格降序',
    value: 'priceDesc',
  },
  {
    label: '热度优先',
    value: 'hot',
  },
]

export const SELLER_GOODS_STATUS_OPTIONS = [
  {
    label: '全部状态',
    value: '',
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.DRAFT],
    value: GOODS_STATUS.DRAFT,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.PENDING],
    value: GOODS_STATUS.PENDING,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.REJECTED],
    value: GOODS_STATUS.REJECTED,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.ON_SALE],
    value: GOODS_STATUS.ON_SALE,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.LOCKED],
    value: GOODS_STATUS.LOCKED,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.SOLD],
    value: GOODS_STATUS.SOLD,
  },
  {
    label: GOODS_STATUS_LABEL_MAP[GOODS_STATUS.OFF_SHELF],
    value: GOODS_STATUS.OFF_SHELF,
  },
]
