<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteFare, getFareList, type FareForm, type FareItem } from '@/api/configure'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'
import FareFormDialog from './components/FareFormDialog.vue'

const searchForm = reactive({ title: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<FareForm | null>(null)
const dictTick = ref(0)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getFareList({ ...params, title: searchForm.title || undefined }),
    () => ({}),
  )

function resolveUserType(row: FareItem) {
  return row.usertype ?? row.userType
}

function formatFareType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('fare_type', value ?? '') || String(value ?? '-')
}

function formatUserType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('user_type', value ?? '') || String(value ?? '-')
}

function toFareForm(row: FareItem): FareForm {
  return {
    id: row.id,
    title: row.title,
    fare: row.fare,
    type: row.type != null && row.type !== '' ? String(row.type) : '',
    usertype:
      resolveUserType(row) != null && resolveUserType(row) !== ''
        ? String(resolveUserType(row))
        : '',
  }
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['fare_type', 'user_type'])
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

function openEdit(row: FareItem) {
  dialogMode.value = 'edit'
  editingRow.value = toFareForm(row)
  dialogVisible.value = true
}

async function handleDelete(row: FareItem) {
  await ElMessageBox.confirm(`确认删除运费「${row.title}」吗？`, '删除', { type: 'warning' })
  await deleteFare(row.id)
  ElMessage.success('删除成功')
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
        <el-form-item label="名称">
          <el-input
            v-model="searchForm.title"
            clearable
            placeholder="请输入名称"
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
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="" width="80" align="center" />
        <el-table-column prop="title" label="名称" min-width="180" />
        <el-table-column prop="fare" label="费用" min-width="120" />
        <el-table-column label="费用类型" min-width="140">
          <template #default="{ row }">
            {{ formatFareType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="用户类型" min-width="140">
          <template #default="{ row }">
            {{ formatUserType(resolveUserType(row)) }}
          </template>
        </el-table-column>
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

    <FareFormDialog
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
