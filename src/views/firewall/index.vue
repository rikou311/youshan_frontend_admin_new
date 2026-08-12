<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteFirewall,
  getFirewallList,
  type FirewallForm,
  type FirewallItem,
} from '@/api/platform'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import FirewallFormDialog from './components/FirewallFormDialog.vue'

const searchForm = reactive({ ruleName: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<FirewallForm | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getFirewallList({ ...params, ruleName: searchForm.ruleName || undefined }),
    () => ({}),
  )

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

function openEdit(row: FirewallItem) {
  dialogMode.value = 'edit'
  editingRow.value = { ...row }
  dialogVisible.value = true
}

async function handleDelete(row: FirewallItem) {
  await ElMessageBox.confirm(`确认删除规则「${row.ruleName}」吗？`, '删除', { type: 'warning' })
  await deleteFirewall(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="规则名称">
          <el-input v-model="searchForm.ruleName" clearable />
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
        <el-table-column prop="ruleName" label="规则名称" min-width="160" />
        <el-table-column prop="ip" label="IP" min-width="160" />
        <el-table-column prop="action" label="动作" width="100" />
        <el-table-column prop="active" label="状态" width="90">
          <template #default="{ row }">
            {{ formatDictionary('yes_no', row.active) }}
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

    <FirewallFormDialog
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
