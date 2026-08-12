<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantRefund,
  getMerchantRefundList,
  type MerchantRefundItem,
} from '@/api/merchant'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatMoneyJp } from '@/utils/format'
import RefundFormDialog from './components/RefundFormDialog.vue'

const searchForm = reactive({
  oid: '',
  uname: '',
  state: '' as string | number | '',
  category: '' as string | number | '',
})
const dialogVisible = ref(false)
const editingRow = ref<MerchantRefundItem | null>(null)
const { buttons, hasButton } = usePageButtons()
const stateOptions = getDictionaryOptions('refunder_state')
const categoryOptions = getDictionaryOptions('refunder_category')

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantRefundList({
        ...params,
        oid: searchForm.oid || undefined,
        uname: searchForm.uname || undefined,
        state: searchForm.state === '' ? undefined : searchForm.state,
        category: searchForm.category === '' ? undefined : searchForm.category,
      }),
    () => ({}),
  )

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

function openEdit(row: MerchantRefundItem) {
  editingRow.value = row
  dialogVisible.value = true
}

async function handleDelete(row: MerchantRefundItem) {
  const id = Number(row.rid ?? row.id)
  await ElMessageBox.confirm(`确认删除退款单 #${id} 吗？`, '删除', { type: 'warning' })
  await deleteMerchantRefund(id)
  ElMessage.success('删除成功')
  await fetchList()
}

function canDelete(row: MerchantRefundItem) {
  return Number(row.state ?? row.status) === 3
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="订单号">
          <el-input v-model="searchForm.oid" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="searchForm.uname" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.state" clearable placeholder="全部" style="width: 130px">
            <el-option
              v-for="item in stateOptions"
              :key="item.value"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="searchForm.category"
            clearable
            placeholder="全部"
            style="width: 130px"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="ID" width="90">
          <template #default="{ row }">{{ row.rid ?? row.id }}</template>
        </el-table-column>
        <el-table-column prop="oid" label="订单号" width="100" />
        <el-table-column label="用户名" min-width="120">
          <template #default="{ row }">{{ row.uname || row.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            {{ formatDictionary('refunder_state', row.state ?? row.status) }}
          </template>
        </el-table-column>
        <el-table-column label="总额(円)" width="120">
          <template #default="{ row }">{{ formatMoneyJp(row.total) }}</template>
        </el-table-column>
        <el-table-column label="已退款(円)" width="120">
          <template #default="{ row }">{{ formatMoneyJp(row.refunded) }}</template>
        </el-table-column>
        <el-table-column prop="updater" label="操作人" width="100" />
        <el-table-column label="更新时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatetime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || hasButton('update') || buttons.query || buttons.update"
              type="primary"
              link
              @click="openEdit(row)"
            >
              {{ buttons.query?.authName ?? buttons.update?.authName ?? '查看' }}
            </el-button>
            <el-button
              v-if="(hasButton('delete') || buttons.delete) && canDelete(row)"
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
    <RefundFormDialog
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
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
