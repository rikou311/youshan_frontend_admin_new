<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantDeposit,
  getMerchantDepositList,
  updateMerchantDeposit,
  type MerchantDepositItem,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { useUserStore } from '@/stores/user'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatMoneyJp } from '@/utils/format'
import { saveDictionary } from '@/utils/storage'
import DepositFormDialog from './components/DepositFormDialog.vue'

const searchForm = reactive({
  username: '',
  state: '' as string | number | '',
})
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<MerchantDepositItem | null>(null)
const dictTick = ref(0)
const userStore = useUserStore()
const { buttons, hasButton } = usePageButtons()

const stateOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('deposit_state')
})

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantDepositList({
        ...params,
        username: searchForm.username || undefined,
        state: searchForm.state === '' ? undefined : searchForm.state,
      }),
    () => ({}),
  )

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatBank(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('deposit_type', value ?? '') || String(value ?? '-')
}

function formatState(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('deposit_state', value ?? '') || String(value ?? '-')
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['deposit_state', 'deposit_type'])
    Object.entries(data).forEach(([groupId, values]) => {
      if (Array.isArray(values) && values.length) {
        saveDictionary(groupId, values)
      }
    })
  } catch {
    // ignore
  } finally {
    dictTick.value += 1
  }
}

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

function openEdit(row: MerchantDepositItem) {
  dialogMode.value = 'edit'
  editingRow.value = row
  dialogVisible.value = true
}

async function handleDelete(row: MerchantDepositItem) {
  await ElMessageBox.confirm(`确认删除入金记录「${row.unick || row.sender || row.id}」吗？`, '删除', {
    type: 'warning',
  })
  await deleteMerchantDeposit(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

function getRowState(row: MerchantDepositItem) {
  return Number(row.state ?? row.status)
}

async function handlePass(row: MerchantDepositItem) {
  await ElMessageBox.confirm('确认要通过吗?', '通过', { type: 'success' })
  await updateMerchantDeposit({
    ...row,
    sender: row.sender ?? '',
    bank: row.bank ?? '0',
    username: row.username ?? '',
    deposit: Number(row.deposit ?? row.total ?? 0),
    deposittime: row.deposittime ?? '',
    type: Number(row.type ?? 0),
    createtime: row.createtime ?? '',
    creater: row.creater ?? '',
    state: 0,
    updateuser: userStore.userInfo?.username ?? 'admin',
  })
  ElMessage.success('已通过')
  await fetchList()
}

async function handleDiscard(row: MerchantDepositItem) {
  await ElMessageBox.confirm('确认要废弃此记录吗?', '废弃', { type: 'info' })
  await updateMerchantDeposit({
    ...row,
    sender: row.sender ?? '',
    bank: row.bank ?? '0',
    username: row.username ?? '',
    deposit: Number(row.deposit ?? row.total ?? 0),
    deposittime: row.deposittime ?? '',
    type: Number(row.type ?? 0),
    createtime: row.createtime ?? '',
    creater: row.creater ?? '',
    state: 1,
    updateuser: userStore.userInfo?.username ?? 'admin',
  })
  ElMessage.success('已废弃')
  await fetchList()
}

onMounted(async () => {
  await ensureDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="商家">
          <el-input
            v-model="searchForm.username"
            clearable
            placeholder="商家昵称/账号"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.state" clearable placeholder="全部" style="width: 140px">
            <el-option
              v-for="item in stateOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="String(item.value)"
            />
          </el-select>
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
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="打款时间" width="120">
          <template #default="{ row }">{{ formatDate(row.deposittime) }}</template>
        </el-table-column>
        <el-table-column prop="sender" label="打款人" width="110" />
        <el-table-column label="银行" width="110">
          <template #default="{ row }">
            {{ formatBank(row.bank) }}
          </template>
        </el-table-column>
        <el-table-column label="商家" min-width="120">
          <template #default="{ row }">{{ row.unick || row.name || row.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ formatMoneyJp(row.deposit ?? row.total) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            {{ formatState(row.state ?? row.status) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120">
          <template #default="{ row }">{{ formatDate(row.createtime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
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
              v-if="(hasButton('pass') || buttons.pass) && (getRowState(row) === 2 || getRowState(row) === 1)"
              type="success"
              link
              @click="handlePass(row)"
            >
              {{ buttons.pass?.authName ?? '通过' }}
            </el-button>
            <el-button
              v-if="(hasButton('discard') || buttons.discard) && getRowState(row) === 2"
              type="info"
              link
              @click="handleDiscard(row)"
            >
              {{ buttons.discard?.authName ?? '废弃' }}
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
    <DepositFormDialog
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
</style>
