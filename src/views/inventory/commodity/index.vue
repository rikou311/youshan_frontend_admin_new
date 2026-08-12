<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteInventoryCommodity,
  getInventoryCommodityList,
  queryInventoryCommodity,
  type InventoryCommodityForm,
} from '@/api/inventory/commodity'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import type { InventoryCommodityItem } from '@/types/api'
import CommodityFormDialog from './components/CommodityFormDialog.vue'

const searchForm = reactive({ title: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<InventoryCommodityForm | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getInventoryCommodityList({ ...params, title: searchForm.title || undefined }),
    () => ({}),
  )

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

async function openEdit(row: InventoryCommodityItem) {
  dialogMode.value = 'edit'
  editingRow.value = await queryInventoryCommodity(row.id)
  dialogVisible.value = true
}

async function handleDelete(row: InventoryCommodityItem) {
  await ElMessageBox.confirm(`确认删除商品「${row.title}」吗？`, '删除', { type: 'warning' })
  await deleteInventoryCommodity(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="inventory-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="商品名称">
          <el-input v-model="searchForm.title" placeholder="请输入商品名称" clearable />
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
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty>
          <el-empty description="暂无商品数据" />
        </template>
        <el-table-column prop="id" label="商品ID" width="100" />
        <el-table-column prop="title" label="商品名称" min-width="220" />
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="priced" label="划线价" width="120">
          <template #default="{ row }">¥{{ row.priced }}</template>
        </el-table-column>
        <el-table-column prop="sold" label="销量" width="100" />
        <el-table-column prop="total" label="库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.total < 50 ? 'danger' : 'success'">{{ row.total }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="排序" width="100" />
        <el-table-column label="操作" width="160" fixed="right">
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
      <div class="inventory-page__pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <CommodityFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :model="editingRow"
      @success="fetchList"
    />
  </div>
</template>

<style scoped lang="scss">
.inventory-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
