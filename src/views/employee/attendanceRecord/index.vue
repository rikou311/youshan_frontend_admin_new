<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  deleteAttendanceRecord,
  getAttendanceRecordList,
  updateAttendanceRecord,
  type AttendanceRecordItem,
} from '@/api/employee'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { downloadAttendanceReport } from '@/utils/attendance-download'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatDateTimeSec } from '@/utils/format'
import { saveDictionary } from '@/utils/storage'
import AttendanceRecordFormDialog from './components/AttendanceRecordFormDialog.vue'

const searchForm = reactive({
  name: '',
  typeList: [] as Array<string | number>,
  state: '' as string | number,
})
const createTimeArr = ref<Date[]>([])
const sortState = reactive({ prop: '', order: '' })
const dialogVisible = ref(false)
const multipleSelection = ref<AttendanceRecordItem[]>([])
const tableRef = ref<{ clearSelection: () => void }>()
const downloading = ref(false)
const dictTick = ref(0)

const { buttons } = usePageButtons()
const typeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('employee_checkin')
})
const stateOptions = [
  { value: 0, label: '通过' },
  { value: 1, label: '审核中' },
]

function formatCheckinType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('employee_checkin', value ?? '') || String(value ?? '-')
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['employee_checkin'])
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

function buildCreateTimeArr() {
  const range =
    createTimeArr.value && createTimeArr.value.length === 2
      ? createTimeArr.value
      : (() => {
          const now = new Date()
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          return [start, end]
        })()
  const start = new Date(range[0])
  start.setHours(0, 0, 0, 0)
  const end = new Date(range[1])
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getAttendanceRecordList({
        ...params,
        name: searchForm.name || undefined,
        typeList: searchForm.typeList.length ? searchForm.typeList : undefined,
        state: searchForm.state !== '' ? searchForm.state : undefined,
        createTimeArr: buildCreateTimeArr(),
        sort:
          sortState.prop && sortState.order
            ? { prop: sortState.prop, order: sortState.order }
            : undefined,
      }),
    () => ({}),
    20,
  )

function parseIsoLocal(str?: string | null) {
  if (!str) {
    return null
  }
  const d = new Date(String(str).replace('T', ' '))
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  )
}

function formatCreatedAt(value?: string | null) {
  const local = parseIsoLocal(value)
  if (!local) {
    return value || '-'
  }
  return formatDateTimeSec(local.getTime()) || '-'
}

function displayName(row: AttendanceRecordItem) {
  return row.name || row.employeeName || '-'
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<AttendanceRecordItem>
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

function handleSelectionChange(rows: AttendanceRecordItem[]) {
  multipleSelection.value = rows || []
}

function openAdd() {
  dialogVisible.value = true
}

async function pass(row: AttendanceRecordItem) {
  await ElMessageBox.confirm('确认要通过此考勤记录吗?', '通过确认', { type: 'warning' })
  await updateAttendanceRecord({ ...row, state: 0 })
  ElMessage.success('已通过')
  await fetchList()
}

async function batchPass() {
  const rows = multipleSelection.value.filter((r) => Number(r.state) === 1)
  if (!rows.length) {
    ElMessage.warning('请先勾选状态为「审核中」的记录')
    return
  }
  await ElMessageBox.confirm(`确认批量通过选中的 ${rows.length} 条考勤记录吗？`, '批量通过确认', {
    type: 'warning',
  })
  try {
    await Promise.all(rows.map((row) => updateAttendanceRecord({ ...row, state: 0 })))
    ElMessage.success('已批量通过')
    tableRef.value?.clearSelection()
    await fetchList()
  } catch {
    ElMessage.error('批量通过失败')
  }
}

async function handleDelete(row: AttendanceRecordItem) {
  await ElMessageBox.confirm('确认要删除此记录吗?', '删除', { type: 'warning' })
  await deleteAttendanceRecord(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

async function download(type: number) {
  downloading.value = true
  try {
    await downloadAttendanceReport(type, createTimeArr.value)
    ElMessage.success('下载成功')
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    ElMessage.error(`下载失败: ${message}`)
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  await ensureDictionaries()
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
        <el-date-picker
          v-model="createTimeArr"
          type="daterange"
          range-separator="至"
          start-placeholder="创建时间开始日期"
          end-placeholder="创建时间结束日期"
        />
        <el-select
          v-model="searchForm.typeList"
          multiple
          collapse-tags
          clearable
          placeholder="类型"
          style="width: 200px"
        >
          <el-option
            v-for="item in typeOptions"
            :key="item.value"
            :label="item.display"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="searchForm.state"
          clearable
          placeholder="状态"
          style="width: 200px"
        >
          <el-option
            v-for="item in stateOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">
          {{ buttons.index?.authName ?? '查询' }}
        </el-button>
        <el-button type="success" @click="openAdd">
          {{ buttons.add?.authName ?? '新增' }}
        </el-button>
        <el-button type="success" :loading="downloading" @click="download(0)">
          下载考勤记录
        </el-button>
        <el-button type="success" :loading="downloading" @click="download(1)">
          下载考勤记录(特殊)
        </el-button>
        <el-button type="success" @click="batchPass">批量通过</el-button>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="list"
        fit
        highlight-current-row
        height="700"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="100" sortable="custom" />
        <el-table-column label="姓名" width="100" sortable="custom" prop="name">
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column prop="empId" label="员工编号" width="100" sortable="custom" />
        <el-table-column prop="type" label="类型" width="100" sortable="custom">
          <template #default="{ row }">
            {{ formatCheckinType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="state" label="状态" width="100" sortable="custom">
          <template #default="{ row }">
            {{ Number(row.state) === 0 ? '通过' : '审核中' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180" sortable="custom" prop="createdAt">
          <template #default="{ row }">{{ formatCreatedAt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="Number(row.state) === 1"
              type="primary"
              link
              @click="pass(row)"
            >
              通过
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

    <AttendanceRecordFormDialog v-model:visible="dialogVisible" @success="fetchList" />
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
