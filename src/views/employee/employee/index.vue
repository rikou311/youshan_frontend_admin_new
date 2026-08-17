<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteEmployee,
  getEmployeeList,
  queryEmployee,
  type EmployeeForm,
  type EmployeeItem,
} from '@/api/employee'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import EmployeeFormDialog from './components/EmployeeFormDialog.vue'

const searchForm = reactive({ name: '' })
const sortState = reactive({ prop: '', order: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('edit')
const editingRow = ref<EmployeeForm | null>(null)

const { buttons } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getEmployeeList({
        ...params,
        name: searchForm.name || undefined,
        sort:
          sortState.prop && sortState.order
            ? { prop: sortState.prop, order: sortState.order }
            : undefined,
      }),
    () => ({}),
    20,
  )

/** 对齐旧版 parseIsoLocal + date_format_date */
function toYmd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatCreatedAt(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value).trim()
  if (!raw) {
    return '-'
  }
  if (/^\d+$/.test(raw)) {
    const multiplier = raw.length > 10 ? 1 : 1000
    const date = new Date(Number(raw) * multiplier)
    if (Number.isNaN(date.getTime())) {
      return '-'
    }
    return toYmd(date)
  }
  const date = new Date(raw.replace('T', ' '))
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  return toYmd(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
}

function formatStartDate(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value).trim()
  if (!raw) {
    return '-'
  }
  if (/^\d+$/.test(raw)) {
    const multiplier = raw.length > 10 ? 1 : 1000
    const date = new Date(Number(raw) * multiplier)
    if (Number.isNaN(date.getTime())) {
      return '-'
    }
    return toYmd(date)
  }
  return raw.replace('T', ' ').slice(0, 10)
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<EmployeeItem>
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

async function openEdit(row: EmployeeItem) {
  dialogMode.value = 'edit'
  try {
    const detail = await queryEmployee(row.id)
    editingRow.value = { ...row, ...detail }
  } catch {
    editingRow.value = { ...row }
  }
  dialogVisible.value = true
}

async function handleDelete(row: EmployeeItem) {
  await ElMessageBox.confirm('确认要删除此记录吗?', '删除', { type: 'warning' })
  await deleteEmployee(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <div class="biz-page__filter">
        <el-input
          v-model="searchForm.name"
          clearable
          placeholder="请输入用户名"
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          {{ buttons.index?.authName ?? '查询' }}
        </el-button>
        <el-button type="success" @click="openAdd">
          {{ buttons.add?.authName ?? '创建员工' }}
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
        <el-table-column prop="id" label="ID" width="100" sortable="custom" />
        <el-table-column prop="name" label="姓名" width="100" sortable="custom" />
        <el-table-column prop="empId" label="员工编号" width="100" sortable="custom" />
        <el-table-column
          prop="comprefaceSubjectId"
          label="照片ID"
          width="120"
          sortable="custom"
        />
        <el-table-column prop="basicGive" label="基本給" width="100" sortable="custom" />
        <el-table-column prop="hourlyWage" label="時給" width="100" sortable="custom" />
        <el-table-column prop="rent" label="家賃" width="100" sortable="custom" />
        <el-table-column label="入社日" width="120" sortable="custom" prop="startDate">
          <template #default="{ row }">{{ formatStartDate(row.startDate) }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" sortable="custom">
          <template #default="{ row }">
            {{ Number(row.type) === 0 || row.type === '0' || !row.type ? '普通' : '特殊' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120" sortable="custom" prop="createdAt">
          <template #default="{ row }">{{ formatCreatedAt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">
              {{ buttons.update?.authName ?? '更新' }}
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

    <EmployeeFormDialog
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
