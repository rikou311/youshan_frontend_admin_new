<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantCommodity,
  getMerchantCommodityList,
  queryMerchantCommodity,
  type MerchantCommodityForm,
} from '@/api/merchant'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import type { MerchantCommodityItem } from '@/types/api'
import MerchantCommodityFormDialog from './components/MerchantCommodityFormDialog.vue'

const searchForm = reactive({ title: '', code: '' })
const sortState = reactive({ prop: '', order: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<MerchantCommodityForm | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantCommodityList({
        ...params,
        title: searchForm.title || undefined,
        code: searchForm.code || undefined,
        sort:
          sortState.prop && sortState.order
            ? { prop: sortState.prop, order: sortState.order }
            : undefined,
      }),
    () => ({}),
  )

function resolveStock(row: MerchantCommodityItem) {
  return Number(row.total ?? row.stock ?? 0)
}

function tableRowClassName({ row }: { row: MerchantCommodityItem }) {
  return resolveStock(row) < 50 ? 'warning-row' : ''
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<MerchantCommodityItem>
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

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

async function openEdit(row: MerchantCommodityItem) {
  dialogMode.value = 'edit'
  const detail = await queryMerchantCommodity(row.id)
  editingRow.value = {
    ...detail,
    total: detail.total ?? detail.stock ?? row.total ?? row.stock,
    priced: detail.priced ?? detail.price ?? row.priced ?? row.price,
  }
  dialogVisible.value = true
}

async function handleDelete(row: MerchantCommodityItem) {
  await ElMessageBox.confirm(`确认删除商品「${row.title}」吗？`, '删除', { type: 'warning' })
  await deleteMerchantCommodity(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item>
          <el-input
            v-model="searchForm.title"
            clearable
            placeholder="请输入商品名"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.code"
            clearable
            placeholder="请输入CODE"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openAdd">
            {{ buttons.add?.authName ?? '新增' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="list"
        highlight-current-row
        :row-class-name="tableRowClassName"
        @sort-change="handleSortChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="" width="80" align="center" />
        <el-table-column prop="id" label="商品编号" width="100" align="left" sortable="custom">
          <template #default="{ row }">YS{{ row.id }}</template>
        </el-table-column>
        <el-table-column prop="title" label="商品名" min-width="220" align="left" sortable="custom" />
        <el-table-column prop="price" label="价格" width="150" align="left" sortable="custom">
          <template #default="{ row }">
            <span>¥{{ row.price }}</span>
            <span class="priced">¥{{ row.priced ?? row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="CODE" width="100" align="left" sortable="custom" />
        <el-table-column prop="weight" label="排序" width="100" align="left" sortable="custom" />
        <el-table-column prop="viewed" label="浏览" width="100" align="left" sortable="custom" />
        <el-table-column prop="sold" label="销量" width="100" align="left" sortable="custom" />
        <el-table-column prop="total" label="库存" width="100" align="left" sortable="custom">
          <template #default="{ row }">
            {{ resolveStock(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="最后编辑" width="100" align="left" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('update') || buttons.update"
              type="primary"
              link
              @click="openEdit(row)"
            >
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
            <el-button
              v-if="hasButton('delete') || buttons.delete"
              type="danger"
              link
              @click="handleDelete(row)"
            >
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

    <MerchantCommodityFormDialog
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

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.priced {
  margin-left: 6px;
  text-decoration: line-through;
  color: #909399;
}

:deep(.el-table .warning-row) {
  background: rgb(187, 79, 79);
  color: rgb(26, 22, 22);
}
</style>
