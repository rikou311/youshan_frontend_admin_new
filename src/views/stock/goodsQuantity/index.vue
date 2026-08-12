<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import {
  getGoodsQuantityChangeHistory,
  getGoodsQuantityList,
  type GoodsQuantityChangeHistoryItem,
  type GoodsQuantityForm,
  type GoodsQuantityItem,
} from '@/api/stock'
import { useTableList } from '@/composables/useTableList'
import { formatTimestampJp } from '@/utils/format'
import { unwrapArrayData } from '@/utils/legacy'
import GoodsQuantityFormDialog from './components/GoodsQuantityFormDialog.vue'

const activeName = ref('goodsQuantity')
const sortState = reactive({ prop: '', order: '' })
const dialogVisible = ref(false)
const editingRow = ref<GoodsQuantityForm | null>(null)

const selectedMonth = ref('')
const dates = ref<string[]>([])
const historyLoading = ref(false)
const tableData = ref<GoodsQuantityChangeHistoryItem[]>([])

const { loading, list, pagination, fetchList, handlePageChange, handleSizeChange } = useTableList(
  (params) =>
    getGoodsQuantityList({
      ...params,
      sort:
        sortState.prop && sortState.order
          ? { prop: sortState.prop, order: sortState.order }
          : undefined,
    }),
  () => ({}),
  10,
)

function openEdit(row: GoodsQuantityItem) {
  editingRow.value = {
    id: row.id,
    quantity: Number(row.quantity) || 0,
    goodsId: row.rawFoodView?.id ?? row.goodsId,
    rawFoodView: {
      id: row.rawFoodView?.id,
      title: row.rawFoodView?.title,
      price: row.rawFoodView?.price,
    },
  }
  dialogVisible.value = true
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<GoodsQuantityItem>
  prop: string | null
  order: string | null
}) {
  sortState.prop = prop || ''
  if (order === 'descending') {
    sortState.order = 'DESC'
  } else if (order === 'ascending') {
    sortState.order = 'ASC'
  } else {
    sortState.order = ''
    sortState.prop = ''
  }
  void fetchList()
}

function tableRowClassName({ row }: { row: GoodsQuantityItem }) {
  const total = Number(row.total ?? row.quantity)
  if (Number.isFinite(total) && total < 50) {
    return 'warning-row'
  }
  return 'success-row'
}

function formatAmount(row: GoodsQuantityItem) {
  const price = Number(row.rawFoodView?.price ?? 0)
  const quantity = Number(row.quantity ?? 0)
  const amount = price * quantity
  if (!Number.isFinite(amount)) {
    return '-'
  }
  return `¥${amount}`
}

function formatUpdateTime(value?: string | null) {
  if (!value) {
    return ''
  }
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) {
    return ''
  }
  return formatTimestampJp(String(ts))
}

function generateDatesForMonth(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const next: string[] = []
  while (date.getMonth() === month - 1) {
    const day = String(date.getDate()).padStart(2, '0')
    const monthFormatted = String(month).padStart(2, '0')
    next.push(`${year}-${monthFormatted}-${day}`)
    date.setDate(date.getDate() + 1)
  }
  dates.value = next
}

async function loadHistoryData() {
  if (!selectedMonth.value) {
    return
  }
  historyLoading.value = true
  tableData.value = []
  try {
    const result = await getGoodsQuantityChangeHistory({
      updateTime: new Date(selectedMonth.value),
    })
    tableData.value = unwrapArrayData<GoodsQuantityChangeHistoryItem>(result)
  } finally {
    historyLoading.value = false
  }
}

function onMonthChange(month: string | null) {
  if (!month) {
    return
  }
  generateDatesForMonth(month)
  void loadHistoryData()
}

function handleTabChange(name: string | number) {
  if (String(name) !== 'goodsQuantityChange') {
    return
  }
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  selectedMonth.value = currentMonth
  generateDatesForMonth(currentMonth)
  void loadHistoryData()
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-tabs v-model="activeName" type="card" @tab-change="handleTabChange">
        <el-tab-pane label="商品库存" name="goodsQuantity">
          <el-table
            v-loading="loading"
            :data="list"
            fit
            highlight-current-row
            height="700"
            :row-class-name="tableRowClassName"
            @sort-change="handleSortChange"
          >
            <template #empty><el-empty description="暂无数据" /></template>
            <el-table-column width="80" align="center" />
            <el-table-column
              label="商品ID"
              prop="rawFoodView.id"
              width="100"
              sortable="custom"
            />
            <el-table-column
              label="商品"
              prop="rawFoodView.title"
              width="300"
              sortable="custom"
            />
            <el-table-column prop="quantity" label="数量" width="300" sortable="custom" />
            <el-table-column prop="amount" label="总额" width="150" sortable="custom">
              <template #default="{ row }">{{ formatAmount(row) }}</template>
            </el-table-column>
            <el-table-column prop="updateTime" label="最后编辑" width="120">
              <template #default="{ row }">{{ formatUpdateTime(row.updateTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="biz-page__pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50]"
              background
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="商品库存变动" name="goodsQuantityChange">
          <div class="biz-page__filter">
            <el-date-picker
              v-model="selectedMonth"
              type="month"
              placeholder="选择年月"
              format="YYYY-MM"
              value-format="YYYY-MM"
              style="width: 200px"
              @change="onMonthChange"
            />
          </div>
          <el-table v-loading="historyLoading" :data="tableData" border>
            <template #empty><el-empty description="暂无数据" /></template>
            <el-table-column prop="name" label="物品" fixed />
            <el-table-column v-for="date in dates" :key="date" :label="date" min-width="100">
              <template #default="{ row }">
                {{ row.record?.[date] ?? '' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <GoodsQuantityFormDialog
      v-model:visible="dialogVisible"
      :model="editingRow"
      @success="fetchList"
    />
  </div>
</template>

<style scoped lang="scss">
.biz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

:deep(.el-table .warning-row) {
  --el-table-tr-bg-color: var(--el-color-warning-light-9);
}

:deep(.el-table .success-row) {
  --el-table-tr-bg-color: var(--el-color-success-light-9);
}
</style>
