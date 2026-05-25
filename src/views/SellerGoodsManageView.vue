<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  createGoodsDraft,
  getSellerGoodsPage,
  offShelfGoods,
  onShelfGoods,
  submitGoodsAudit,
  updateGoodsDraft,
} from '@/api/sellerGoods'
import { createGoodsStatusSocket } from '@/utils/goodsStatusSocket'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const actionLoadingId = ref(null)
const dialogVisible = ref(false)
const editingId = ref(null)
const saving = ref(false)
const records = ref([])
let goodsStatusSocket = null
let refreshTimer = null

const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const queryForm = reactive({
  status: '',
})

const form = reactive({
  categoryId: '',
  title: '',
  detail: '',
  price: '',
  oldPrice: '',
  quality: 5,
  location: '',
  cover: '',
})

const isSeller = computed(() => authStore.user.role === 2)
const pageCount = computed(() => Math.max(1, Math.ceil(pager.total / pager.pageSize)))
const isEditing = computed(() => editingId.value !== null)

const GOODS_STATUS_LABEL_MAP = {
  0: '草稿',
  1: '待审核',
  2: '已驳回',
  3: '在售',
  4: '锁定',
  5: '已售出',
  6: '已下架',
}

const editableStatus = new Set([0, 2, 6])

function statusType(status) {
  if (status === 3) return 'success'
  if (status === 1) return 'warning'
  if (status === 2) return 'danger'
  if (status === 4) return 'warning'
  return 'info'
}

function canEdit(status) {
  return editableStatus.has(status)
}

function canSubmitAudit(status) {
  return editableStatus.has(status)
}

function canOnShelf(status) {
  return status === 6
}

function canOffShelf(status) {
  return status === 3
}

function resetForm() {
  form.categoryId = ''
  form.title = ''
  form.detail = ''
  form.price = ''
  form.oldPrice = ''
  form.quality = 5
  form.location = ''
  form.cover = ''
}

function fillForm(record) {
  form.categoryId = record.categoryId ?? ''
  form.title = record.title ?? ''
  form.detail = record.detail ?? ''
  form.price = record.price ?? ''
  form.oldPrice = record.oldPrice ?? ''
  form.quality = record.quality ?? 5
  form.location = record.location ?? ''
  form.cover = record.cover ?? ''
}

function buildQueryParams() {
  const params = {
    page: pager.page,
    pageSize: pager.pageSize,
  }
  if (queryForm.status !== '' && queryForm.status !== null) {
    params.status = Number(queryForm.status)
  }
  return params
}

async function fetchPage() {
  if (!isSeller.value) return

  loading.value = true
  try {
    const pageData = await getSellerGoodsPage(buildQueryParams())
    records.value = Array.isArray(pageData?.records) ? pageData.records : []
    pager.total = Number(pageData?.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '加载商品列表失败')
  } finally {
    loading.value = false
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
  refreshTimer = window.setTimeout(() => {
    fetchPage()
  }, 120)
}

function connectGoodsStatusSocket() {
  if (!authStore.isLoggedIn) {
    return
  }

  goodsStatusSocket?.close()
  goodsStatusSocket = createGoodsStatusSocket({
    onMessage(payload) {
      if (payload?.type !== 'goods-status') {
        return
      }

      const exists = records.value.some((item) => String(item.id) === String(payload.goodsId))
      if (exists || queryForm.status !== '' || loading.value) {
        scheduleRefresh()
      }
    },
  })
  goodsStatusSocket.connect()
}

function openCreateDialog() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function tryOpenCreateDialogFromQuery() {
  const rawCreate = Array.isArray(route.query.create) ? route.query.create[0] : route.query.create
  if (rawCreate !== '1') {
    return
  }

  openCreateDialog()
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      create: undefined,
    },
  })
}

function openEditDialog(record) {
  editingId.value = record.id
  fillForm(record)
  dialogVisible.value = true
}

async function saveDraft() {
  const payload = {
    categoryId: Number(form.categoryId),
    title: String(form.title || '').trim(),
    detail: String(form.detail || '').trim(),
    price: Number(form.price),
    oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
    quality: Number(form.quality),
    location: String(form.location || '').trim(),
    imageUrls: String(form.cover || '').trim() ? [String(form.cover || '').trim()] : [],
  }

  if (!payload.categoryId || !payload.title || !payload.price || payload.price <= 0) {
    ElMessage.warning('请完善必填商品信息')
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await updateGoodsDraft(editingId.value, payload)
      ElMessage.success('草稿已更新')
    } else {
      await createGoodsDraft(payload)
      ElMessage.success('草稿已创建')
    }
    dialogVisible.value = false
    await fetchPage()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleSubmitAudit(record) {
  actionLoadingId.value = String(record.id)
  try {
    await submitGoodsAudit(record.id)
    ElMessage.success('已提交审核')
    await fetchPage()
  } catch (error) {
    ElMessage.error(error.message || '提交失败')
  } finally {
    actionLoadingId.value = null
  }
}

async function handleOnShelf(record) {
  actionLoadingId.value = String(record.id)
  try {
    await onShelfGoods(record.id)
    ElMessage.success('上架成功')
    await fetchPage()
  } catch (error) {
    ElMessage.error(error.message || '上架失败')
  } finally {
    actionLoadingId.value = null
  }
}

async function handleOffShelf(record) {
  try {
    await ElMessageBox.confirm('确认下架该商品吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  actionLoadingId.value = String(record.id)
  try {
    await offShelfGoods(record.id)
    ElMessage.success('下架成功')
    await fetchPage()
  } catch (error) {
    ElMessage.error(error.message || '下架失败')
  } finally {
    actionLoadingId.value = null
  }
}

function setPage(page) {
  if (page < 1 || page > pageCount.value || page === pager.page) return
  pager.page = page
  fetchPage()
}

onMounted(() => {
  fetchPage()
  connectGoodsStatusSocket()
  tryOpenCreateDialogFromQuery()
})

onBeforeUnmount(() => {
  goodsStatusSocket?.close()
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
})
</script>

<template>
  <div class="goods-manage-page">
    <el-card v-if="!isSeller" class="empty-card">
      <el-empty description="当前账号还不是卖家，暂时不能管理商品。">
        <el-button type="primary" @click="router.push('/seller-auth')">去卖家认证</el-button>
      </el-empty>
    </el-card>

    <template v-else>
      <el-card class="toolbar-card">
        <div class="toolbar">
          <h3>我的商品</h3>
          <div class="actions">
            <el-select v-model="queryForm.status" placeholder="筛选状态" clearable style="width: 160px" @change="fetchPage">
              <el-option label="草稿" :value="0" />
              <el-option label="待审核" :value="1" />
              <el-option label="已驳回" :value="2" />
              <el-option label="在售" :value="3" />
              <el-option label="已下架" :value="6" />
            </el-select>
            <el-button @click="fetchPage">刷新</el-button>
            <el-button type="primary" @click="openCreateDialog">新建草稿</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="table-card">
        <el-table :data="records" v-loading="loading">
          <el-table-column prop="id" label="编号" width="120" />
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column prop="price" label="价格" width="100">
            <template #default="{ row }">￥{{ row.price }}</template>
          </el-table-column>
          <el-table-column prop="quality" label="成色" width="100" />
          <el-table-column prop="location" label="地点" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="140">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ GOODS_STATUS_LABEL_MAP[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="360" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  size="small"
                  :disabled="!canEdit(row.status) || actionLoadingId === String(row.id)"
                  @click="openEditDialog(row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  :disabled="!canSubmitAudit(row.status) || actionLoadingId === String(row.id)"
                  @click="handleSubmitAudit(row)"
                >
                  提交审核
                </el-button>
                <el-button
                  size="small"
                  type="success"
                  :disabled="!canOnShelf(row.status) || actionLoadingId === String(row.id)"
                  @click="handleOnShelf(row)"
                >
                  上架
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  :disabled="!canOffShelf(row.status) || actionLoadingId === String(row.id)"
                  @click="handleOffShelf(row)"
                >
                  下架
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-button size="small" :disabled="pager.page <= 1" @click="setPage(pager.page - 1)">上一页</el-button>
          <span>第 {{ pager.page }} / {{ pageCount }} 页，共 {{ pager.total }} 条</span>
          <el-button size="small" :disabled="pager.page >= pageCount" @click="setPage(pager.page + 1)">下一页</el-button>
        </div>
      </el-card>
    </template>

    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑商品草稿' : '创建商品草稿'" width="640px">
      <el-form label-width="90px">
        <el-form-item label="分类编号">
          <el-input v-model="form.categoryId" placeholder="请输入分类编号" />
        </el-form-item>
        <el-form-item label="商品标题">
          <el-input v-model="form.title" placeholder="请输入商品标题" maxlength="100" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.detail" type="textarea" :rows="3" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="售价">
          <el-input v-model="form.price" type="number" min="0.01" placeholder="请输入售价" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input v-model="form.oldPrice" type="number" min="0.01" placeholder="选填" />
        </el-form-item>
        <el-form-item label="成色">
          <el-input v-model="form.quality" type="number" min="1" max="5" placeholder="请输入 1-5" />
        </el-form-item>
        <el-form-item label="交易地点">
          <el-input v-model="form.location" placeholder="例如：图书馆门口" />
        </el-form-item>
        <el-form-item label="封面图片">
          <el-input v-model="form.cover" placeholder="请输入封面图片地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDraft">保存草稿</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.goods-manage-page {
  max-width: 1080px;
  margin: 0 auto;
  padding-bottom: 28px;
}

.toolbar-card,
.table-card,
.empty-card {
  margin-bottom: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.toolbar h3 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  color: #666;
}
</style>
