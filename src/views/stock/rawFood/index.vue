<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteRawFood,
  getRawFoodList,
  type RawFoodForm,
  type RawFoodItem,
} from '@/api/stock'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import RawFoodFormDialog from './components/RawFoodFormDialog.vue'

const sortState = reactive({ prop: '', order: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<RawFoodForm | null>(null)
const { buttons } = usePageButtons()

const { loading, list, pagination, fetchList, handlePageChange, handleSizeChange } = useTableList(
  (params) =>
    getRawFoodList({
      ...params,
      sort:
        sortState.prop && sortState.order
          ? { prop: sortState.prop, order: sortState.order }
          : undefined,
    }),
  () => ({}),
  20,
)

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

function openEdit(row: RawFoodItem) {
  dialogMode.value = 'edit'
  editingRow.value = {
    id: row.id,
    title: row.title,
    price: row.price,
    weight: row.weight,
  }
  dialogVisible.value = true
}

async function handleDelete(row: RawFoodItem) {
  await ElMessageBox.confirm('确定删除该商品吗？', '提示', { type: 'warning' })
  await deleteRawFood(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<RawFoodItem>
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

function formatPrice(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  return `¥${value}`
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <div class="biz-page__filter">
        <el-button type="success" @click="openAdd">
          {{ buttons.add?.authName ?? '新增' }}
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        fit
        highlight-current-row
        height="700"
        @sort-change="handleSortChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column width="80" align="center" />
        <el-table-column prop="id" label="商品编号" width="100" sortable="custom" />
        <el-table-column prop="title" label="商品名" width="300" sortable="custom" />
        <el-table-column prop="price" label="价格" width="150" sortable="custom">
          <template #default="{ row }">{{ formatPrice(row.price) }}</template>
        </el-table-column>
        <el-table-column prop="weight" label="最后编辑" width="100" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              {{ buttons.delete?.authName ?? '删除' }}
            </el-button>
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
    </el-card>

    <RawFoodFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
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
    margin-bottom: 12px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
