<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  getDashboardMerchantDetail,
  getDashboardMerchantRanking,
  type DashboardFilterParams,
  type DashboardMerchantDetailItem,
  type DashboardMerchantRankingItem,
} from '@/api/dashboard'
import { formatMoneyJp } from '@/utils/format'

interface Props {
  filterParams?: DashboardFilterParams | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'data-updated': [
    data: { merchantData: DashboardMerchantRankingItem[]; pagination: typeof pagination },
  ]
  'page-change': [page: number]
}>()

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDayTimestamp(value: string | number | Date) {
  if (typeof value === 'number') {
    return value
  }
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const today = new Date()
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const list = ref<DashboardMerchantRankingItem[]>([])
const loading = ref(false)
const filters = reactive({ time: 'month' })
const dateRange = ref<Array<string | number>>([
  formatDate(firstDayOfMonth),
  formatDate(today),
])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})
const createTimeArr = ref<number[]>([
  toDayTimestamp(firstDayOfMonth),
  toDayTimestamp(today),
])

const detailDialogVisible = ref(false)
const detailDialogLoading = ref(false)
const detailList = ref<DashboardMerchantDetailItem[]>([])
const currentMerchantName = ref('')

const dateRangeText = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    return ''
  }
  const start =
    typeof dateRange.value[0] === 'number'
      ? formatDate(new Date(dateRange.value[0]))
      : String(dateRange.value[0])
  const end =
    typeof dateRange.value[1] === 'number'
      ? formatDate(new Date(dateRange.value[1]))
      : String(dateRange.value[1])
  return `${start} 至 ${end}`
})

const totalAmount = computed(() =>
  detailList.value.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const total = Number(item.total) || 0
    return sum + price * total
  }, 0),
)

function getRankNumber(index: number) {
  return index + 1 + (pagination.page - 1) * pagination.pageSize
}

function syncCreateTimeArr(range: Array<string | number>) {
  createTimeArr.value = range.map((item) => toDayTimestamp(item))
}

async function loadData(params?: DashboardFilterParams | null) {
  loading.value = true
  const range =
    params?.dateRange && params.dateRange.length === 2
      ? params.dateRange
      : dateRange.value
  syncCreateTimeArr(range)
  try {
    const result = await getDashboardMerchantRanking({
      page: pagination.page,
      rows: pagination.pageSize,
      condition: {
        createTimeArr: createTimeArr.value,
        categoryId:
          params?.category && params.category !== 'all'
            ? params.category
            : props.filterParams?.category && props.filterParams.category !== 'all'
              ? props.filterParams.category
              : null,
      },
    })
    list.value = result.list
    pagination.total = result.total
    emit('data-updated', { merchantData: list.value, pagination })
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  pagination.page = 1
  void loadData({ dateRange: dateRange.value })
}

function handleTimeChange() {
  const now = new Date()
  let startDate: Date
  let endDate: Date
  if (filters.time === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = now
  } else if (filters.time === 'week') {
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startDate = monday
    endDate = now
  } else if (filters.time === 'day') {
    startDate = now
    endDate = now
  } else {
    return
  }
  dateRange.value = [formatDate(startDate), formatDate(endDate)]
  void nextTick(() => handleFilterChange())
}

function handleDateRangeChange(value: string[] | null) {
  if (value && value.length === 2 && value[0] && value[1]) {
    dateRange.value = [...value]
    handleFilterChange()
  }
}

function handlePageChange(page: number) {
  pagination.page = page
  void loadData({ dateRange: dateRange.value })
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  void loadData({ dateRange: dateRange.value })
}

async function loadDetailData(uid?: string | number, merchantName?: string) {
  if (uid === undefined || uid === null || uid === '') {
    return
  }
  currentMerchantName.value = merchantName || ''
  detailDialogVisible.value = true
  detailDialogLoading.value = true
  detailList.value = []
  try {
    detailList.value = await getDashboardMerchantDetail({
      uid,
      createTimeArr: createTimeArr.value,
    })
  } finally {
    detailDialogLoading.value = false
  }
}

watch(
  () => props.filterParams,
  (newVal) => {
    if (!newVal) {
      return
    }
    if (newVal.dateRange) {
      dateRange.value = [...newVal.dateRange]
    }
    pagination.page = 1
    void loadData(newVal)
  },
  { deep: true },
)

onMounted(() => {
  if (props.filterParams?.dateRange) {
    dateRange.value = [...props.filterParams.dateRange]
  }
  void loadData(props.filterParams || { dateRange: dateRange.value })
})

defineExpose({ loadData })
</script>

<template>
  <div class="table-section">
    <div class="section-header">
      <h3 class="section-title">商家排行</h3>
      <div class="filter-group">
        <div class="filter-item">
          <span class="filter-label">时间:</span>
          <el-select
            v-model="filters.time"
            placeholder="请选择"
            style="width: 150px"
            @change="handleTimeChange"
          >
            <el-option label="本月" value="month" />
            <el-option label="本周" value="week" />
            <el-option label="本日" value="day" />
            <el-option label="自定义" value="custom" />
          </el-select>
          <el-date-picker
            v-if="filters.time === 'custom'"
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 300px; margin-left: 10px"
            @change="handleDateRangeChange"
          />
          <span
            v-if="filters.time !== 'custom'"
            style="margin-left: 10px; color: #909399; font-size: 12px"
          >
            {{ dateRangeText }}
          </span>
        </div>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" style="width: 100%" stripe>
      <el-table-column label="排名" width="100" align="center">
        <template #default="{ $index }">
          <span :class="['rank-number', `rank-${getRankNumber($index)}`]">
            {{ getRankNumber($index) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="商家名称" min-width="200">
        <template #default="{ row }">
          <span class="product-name">{{ row.unick }}</span>
        </template>
      </el-table-column>
      <el-table-column label="销售额" width="150" align="right">
        <template #default="{ row }">
          <span class="sales-volume">{{ formatMoneyJp(row.total) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="loadDetailData(row.uid, row.unick)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="detailDialogVisible"
      :title="`商家详情 - ${currentMerchantName || ''}${dateRangeText ? ` (${dateRangeText})` : ''}`"
      width="50%"
      append-to-body
    >
      <el-table v-loading="detailDialogLoading" :data="detailList" style="width: 100%" border>
        <el-table-column label="商品名称" prop="title">
          <template #default="{ row }">
            <div class="product-info">
              <div class="product-icon">
                <img
                  v-if="row.image"
                  :src="row.image"
                  alt="商品图片"
                  style="width: 100%; height: 100%; object-fit: cover"
                />
              </div>
              <span class="product-name">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="数量" prop="total" />
        <el-table-column label="单价" prop="price">
          <template #default="{ row }">{{ formatMoneyJp(row.price) }}</template>
        </el-table-column>
        <el-table-column label="总额">
          <template #default="{ row }">
            {{ formatMoneyJp(Number(row.price || 0) * Number(row.total || 0)) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <div class="detail-summary">
            <div class="summary-item">
              <span class="summary-label">总金额：</span>
              <span class="summary-value summary-amount">{{ formatMoneyJp(totalAmount) }}</span>
            </div>
          </div>
          <el-button @click="detailDialogVisible = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>

    <div class="pagination-wrapper">
      <span class="total-count">共{{ pagination.total }}条</span>
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.12),
    0 0 6px rgba(0, 0, 0, 0.04);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;

    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .filter-group {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: center;

      .filter-item {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;

        .filter-label {
          font-size: 14px;
          color: #606266;
          white-space: nowrap;
        }
      }
    }
  }

  .product-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .product-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      background: #f2f3f5;
      flex-shrink: 0;
    }

    .product-name {
      font-size: 14px;
      color: #303133;
    }
  }

  .product-name {
    font-size: 14px;
    color: #303133;
  }

  .rank-number {
    display: inline-block;
    width: 36px;
    height: 36px;
    line-height: 36px;
    text-align: center;
    border-radius: 50%;
    font-weight: 600;
    font-size: 16px;
    color: #fff;
    background: linear-gradient(135deg, #909399 0%, #606266 100%);

    &.rank-1 {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    &.rank-2 {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    &.rank-3 {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    &.rank-4,
    &.rank-5 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  }

  .sales-volume {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-summary {
    display: flex;
    justify-content: flex-start;
    gap: 30px;
    flex: 1;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .summary-label {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
      }

      .summary-value {
        font-size: 16px;
        color: #303133;
        font-weight: 600;

        &.summary-amount {
          color: #f56c6c;
          font-size: 18px;
        }
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .total-count {
      font-size: 14px;
      color: #606266;
    }
  }
}
</style>
