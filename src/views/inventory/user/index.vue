<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteInventoryUser,
  getInventoryUserList,
  type InventoryUserForm,
  type InventoryUserItem,
} from '@/api/inventory/user'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import InventoryUserFormDialog from './components/InventoryUserFormDialog.vue'

const searchForm = reactive({ uname: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<InventoryUserForm | null>(null)
const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getInventoryUserList({ ...params, uname: searchForm.uname || undefined }),
    () => ({}),
  )

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

function openEdit(row: InventoryUserItem) {
  dialogMode.value = 'edit'
  editingRow.value = {
    id: row.id,
    uname: row.uname || row.username || '',
    username: row.uname || row.username || '',
    unick: row.unick,
    phone: row.phone,
    mobile: row.mobile,
    name: row.name,
    wechat: row.wechat,
    memo: row.memo,
    address: row.address,
  }
  dialogVisible.value = true
}

async function handleDelete(row: InventoryUserItem) {
  await ElMessageBox.confirm(`确认删除用户「${row.uname || row.username}」吗？`, '删除', {
    type: 'warning',
  })
  await deleteInventoryUser(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.uname" clearable placeholder="请输入用户名" @keyup.enter="handleSearch" />
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
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="账号" min-width="140">
          <template #default="{ row }">{{ row.uname || row.username }}</template>
        </el-table-column>
        <el-table-column label="姓名" min-width="160">
          <template #default="{ row }">{{ row.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="微信" min-width="160">
          <template #default="{ row }">{{ row.wechat || '-' }}</template>
        </el-table-column>
        <el-table-column label="最后更新" min-width="220">
          <template #default="{ row }">
            {{ row.authenmodify ?? row.createtime ?? row.createdAt ?? '-' }}<br />
            {{ row.authenmodifyoperator ?? '' }}
          </template>
        </el-table-column>
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
    <InventoryUserFormDialog
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
