<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteInventoryOrder,
  getInventoryOrderList,
  type InventoryOrderListParams,
} from '@/api/inventory/order'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import type { InventoryOrderListItem } from '@/types/inventory-order'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatOrderTimestamp } from '@/utils/merchant-order'
import InventoryOrderCreateDialog from './components/InventoryOrderCreateDialog.vue'
import InventoryOrderShowDialog from './components/InventoryOrderShowDialog.vue'

const statusOptions = getDictionaryOptions('order_status')

const searchForm = reactive({
  name: '',
  id: '',
  statusList: [] as number[],
})

const showDialogVisible = ref(false)
const createDialogVisible = ref(false)
const activeOrderId = ref<number>()

const { buttons, hasButton } = usePageButtons()

const listParams = computed<InventoryOrderListParams>(() => ({
  name: searchForm.name || undefined,
  id: searchForm.id || undefined,
  statusList: searchForm.statusList.length ? searchForm.statusList : undefined,
}))

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getInventoryOrderList({ ...params, ...listParams.value }),
    () => listParams.value,
  )

const orderIds = computed(() => list.value.map((row) => row.id))

const summaryTotal = computed(() =>
  list.value.reduce((sum, row) => sum + Number(row.total ?? 0) + Number(row.svf ?? 0), 0),
)

function resetSearch() {
  searchForm.name = ''
  searchForm.id = ''
  searchForm.statusList = []
  handleSearch()
}

function openShow(id: number) {
  activeOrderId.value = id
  showDialogVisible.value = true
}

async function handleDelete(row: InventoryOrderListItem) {
  await ElMessageBox.confirm(`确认删除订单 #${row.id} 吗？`, '删除', { type: 'warning' })
  await deleteInventoryOrder(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

function openCreateOrder() {
  createDialogVisible.value = true
}

onMounted(() => fetchList())
</script>

<template>
  <div class="inventory-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="订单ID">
          <el-input v-model="searchForm.id" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="用户名称">
          <el-input v-model="searchForm.name" clearable placeholder="请输入用户名称" />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select
            v-model="searchForm.statusList"
            multiple
            collapse-tags
            clearable
            placeholder="全部"
            style="width: 180px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.display"
              :value="Number(item.value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openCreateOrder">
            {{ buttons.add?.authName ?? '新增' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="inventory-page__summary">列表合计金额：¥{{ summaryTotal }}</div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty>
          <el-empty description="暂无订单数据" />
        </template>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户名称" min-width="180">
          <template #default="{ row }">{{ row.name }} [¥{{ row.total }}]</template>
        </el-table-column>
        <el-table-column label="订单状态" width="120">
          <template #default="{ row }">
            {{ formatDictionary('order_status', row.status) }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">¥{{ Number(row.total) + Number(row.svf) }}</template>
        </el-table-column>
        <el-table-column label="最后更新" min-width="180">
          <template #default="{ row }">
            <div>{{ formatOrderTimestamp(row.authenmodify ?? row.updatedAt) }}</div>
            <div>{{ row.uname }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="primary"
              link
              @click="openShow(row.id)"
            >
              {{ buttons.query?.authName ?? '查看' }}
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

    <InventoryOrderShowDialog
      v-model:visible="showDialogVisible"
      :order-id="activeOrderId"
      :order-ids="orderIds"
      @changed="fetchList"
    />

    <InventoryOrderCreateDialog v-model:visible="createDialogVisible" @success="fetchList" />
  </div>
</template>

<style scoped lang="scss">
.inventory-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__summary {
    margin-top: 4px;
    color: #606266;
    font-size: 14px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
