<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TableColumnCtx } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantRequisition,
  getMerchantRequisitionList,
  updateMerchantRequisition,
  type MerchantRequisitionItem,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatDateTimeSec, formatDateToString, formatMoneyJp } from '@/utils/format'
import { saveDictionary } from '@/utils/storage'
import RequisitionPrintDialog from './components/RequisitionPrintDialog.vue'

const searchForm = reactive({
  id: '',
  username: '',
  rdate: '',
  type: '' as string | number | '',
  state: '' as string | number | '',
})
/** 对齐旧版默认 createtime DESC */
const sortState = reactive({ prop: 'createtime', order: 'DESC' })
const printVisible = ref(false)
const selectedRow = ref<MerchantRequisitionItem | null>(null)
const dictTick = ref(0)
const { buttons, hasButton } = usePageButtons()

const typeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('requisition_type')
})

const stateOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('requisition_state')
})

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantRequisitionList({
        ...params,
        id: searchForm.id || undefined,
        username: searchForm.username || undefined,
        rdate: searchForm.rdate || undefined,
        type: searchForm.type === '' ? undefined : searchForm.type,
        state: searchForm.state === '' ? undefined : searchForm.state,
        sort:
          sortState.prop && sortState.order
            ? { prop: sortState.prop, order: sortState.order }
            : undefined,
      }),
    () => ({}),
  )

/** 对齐旧版 (Date.parse(x)/1000) | date_format_date */
function formatReqDate(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const ms = Date.parse(String(value))
  if (Number.isNaN(ms)) {
    return String(value)
  }
  return formatDateToString(new Date(ms))
}

/** 对齐旧版 (Date.parse(x)/1000) | date_format_sec */
function formatReqDateTime(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const ms = Date.parse(String(value))
  if (Number.isNaN(ms)) {
    return formatDateTimeSec(value) || String(value)
  }
  return formatDateTimeSec(Math.floor(ms / 1000)) || ''
}

function formatType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('requisition_type', value ?? '') || ''
}

function formatState(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('requisition_state', value ?? '') || ''
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['requisition_type', 'requisition_state'])
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

/** 对齐旧版：moneytotal + taxtotal + yf + ld + svf */
function grandTotal(row: MerchantRequisitionItem) {
  return (
    Number(row.moneytotal ?? 0) +
    Number(row.taxtotal ?? 0) +
    Number(row.yf ?? 0) +
    Number(row.ld ?? 0) +
    Number(row.svf ?? 0)
  )
}

function tableRowClassName({ row }: { row: MerchantRequisitionItem }) {
  return Number(row.total) < 50 ? 'warning-row' : ''
}

function handleSortChange({
  prop,
  order,
}: {
  column: TableColumnCtx<MerchantRequisitionItem>
  prop: string | null
  order: string | null
}) {
  if (order === 'descending') {
    sortState.prop = prop || ''
    sortState.order = 'DESC'
  } else if (order === 'ascending') {
    sortState.prop = prop || ''
    sortState.order = 'ASC'
  } else {
    sortState.prop = 'createtime'
    sortState.order = 'DESC'
  }
  void fetchList()
}

function openPrint(row: MerchantRequisitionItem) {
  selectedRow.value = row
  printVisible.value = true
}

async function handlePrintClosed() {
  await fetchList()
}

async function toggleState(row: MerchantRequisitionItem) {
  const current = Number(row.state ?? row.status ?? 0)
  const nextState = current === 0 ? 1 : 0
  const action = current === 0 ? '废弃' : '恢复'
  await ElMessageBox.confirm(`确认要${action}此记录吗?`, '删除', { type: 'warning' })
  await updateMerchantRequisition({ ...row, state: nextState })
  ElMessage.success('修改成功')
  await fetchList()
}

async function handleDelete(row: MerchantRequisitionItem) {
  await ElMessageBox.confirm('确认要删除此记录吗?', '删除', { type: 'warning' })
  await deleteMerchantRequisition(row.id)
  await fetchList()
}

onMounted(async () => {
  await ensureDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card v-if="hasButton('index') || buttons.index" shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item>
          <el-input
            v-model="searchForm.id"
            clearable
            placeholder="請求書番号"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.username"
            clearable
            placeholder="请输入商家"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="searchForm.rdate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请求时间"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="searchForm.type"
            clearable
            placeholder="请输入类型"
            style="width: 160px"
          >
            <el-option
              v-for="item in typeOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="searchForm.state"
            clearable
            placeholder="请选择状态"
            style="width: 160px"
          >
            <el-option
              v-for="item in stateOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="list"
        fit
        highlight-current-row
        height="700"
        :row-class-name="tableRowClassName"
        @sort-change="handleSortChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="rdate" label="请求时间" width="100" align="left" sortable="custom">
          <template #default="{ row }">{{ formatReqDate(row.rdate) }}</template>
        </el-table-column>
        <el-table-column prop="id" label="請求書番号" width="120" align="left" sortable="custom" />
        <el-table-column prop="unick" label="商家" width="100" align="left" />
        <el-table-column label="总额" width="100" align="left">
          <template #default="{ row }">{{ formatMoneyJp(grandTotal(row)) }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" align="left">
          <template #default="{ row }">{{ formatType(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="state" label="状态" width="100" align="left">
          <template #default="{ row }">{{ formatState(row.state ?? row.status) }}</template>
        </el-table-column>
        <el-table-column prop="creater" label="操作员" width="100" align="left" />
        <el-table-column
          prop="createtime"
          label="创建时间"
          width="150"
          align="left"
          sortable="custom"
        >
          <template #default="{ row }">{{ formatReqDateTime(row.createtime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openPrint(row)">打印</el-button>
            <el-button
              v-if="hasButton('update') || buttons.update"
              type="primary"
              size="small"
              @click="toggleState(row)"
            >
              {{ Number(row.state ?? row.status) === 0 ? '废弃' : '恢复' }}
            </el-button>
            <el-button
              v-if="hasButton('delete') || buttons.delete"
              type="danger"
              size="small"
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

    <RequisitionPrintDialog
      v-model:visible="printVisible"
      :model="selectedRow"
      :title="formatType(selectedRow?.type) || '打印'"
      @closed="handlePrintClosed"
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

  :deep(.el-table .warning-row) {
    background: rgb(187, 79, 79);
    color: rgb(26, 22, 22);
  }
}
</style>
