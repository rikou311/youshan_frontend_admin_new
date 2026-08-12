<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteCashManagement,
  deleteCashTakeRecord,
  getCashList,
  getCashManagementList,
  getCashTakeRecordList,
  type CashListItem,
  type CashManagementForm,
  type CashManagementItem,
  type CashTakeRecordForm,
  type CashTakeRecordItem,
} from '@/api/cash'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { exportJsonToExcel, promptExportFilename } from '@/utils/export-excel'
import { formatDateTimeSec, formatMoneyJp, formatTimestampJp } from '@/utils/format'
import CashListCountDialog from './components/CashListCountDialog.vue'
import CashListFormDialog from './components/CashListFormDialog.vue'
import CashManagementFormDialog from './components/CashManagementFormDialog.vue'
import CashTakeRecordFormDialog from './components/CashTakeRecordFormDialog.vue'

const activeTab = ref('cashManagement')
const { buttons } = usePageButtons()

const managementSearch = reactive({
  id: '',
  mdate: '',
  year: '',
  month: '',
  week: '',
  type: '' as string | number,
})

const takeSearch = reactive({
  id: '',
  takeTime: '',
  amount: '',
  content: '',
})

const managementDialogVisible = ref(false)
const managementDialogMode = ref<'add' | 'edit'>('add')
const managementEditing = ref<CashManagementForm | null>(null)
const managementSelection = ref<CashManagementItem[]>([])

const listDialogVisible = ref(false)
const listDialogMode = ref<'add' | 'edit'>('add')
const listEditing = ref<CashListItem | null>(null)

const countDialogVisible = ref(false)
const countType = ref(0)
const countEditing = ref<CashListItem | null>(null)

const takeDialogVisible = ref(false)
const takeDialogMode = ref<'add' | 'edit'>('add')
const takeEditing = ref<CashTakeRecordForm | null>(null)

const managementTable = useTableList(
  (params) =>
    getCashManagementList({
      ...params,
      id: managementSearch.id || undefined,
      mdate: managementSearch.mdate || undefined,
      year: managementSearch.year || undefined,
      month: managementSearch.month || undefined,
      week: managementSearch.week || undefined,
      type: managementSearch.type !== '' ? managementSearch.type : undefined,
    }),
  () => ({}),
  20,
)

const cashListTable = useTableList((params) => getCashList(params), () => ({}), 100)
const takeRecordTable = useTableList(
  (params) =>
    getCashTakeRecordList({
      ...params,
      id: takeSearch.id || undefined,
      takeTime: takeSearch.takeTime || undefined,
      amount: takeSearch.amount || undefined,
      content: takeSearch.content || undefined,
    }),
  () => ({}),
  20,
)

const managementTotalAmount = computed(() =>
  managementTable.list.value.reduce((sum, row) => sum + Number(row.amount || 0), 0),
)

const cashListTotals = computed(() => {
  let total = 0
  let totalY = 0
  let totalZ = 0
  cashListTable.list.value.forEach((element) => {
    const line = Number(element.amount || 0) * Number(element.quantity || 0)
    total += line
    if ([1000, 5000, 10000].includes(Number(element.amount))) {
      totalZ += line
    } else {
      totalY += line
    }
  })
  return { total, totalY, totalZ }
})

function formatCashDate(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value).trim()
  const num = Number(raw)
  if (Number.isFinite(num) && /^\d+$/.test(raw)) {
    return formatTimestampJp(raw) || '-'
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  return formatTimestampJp(date.getTime()) || '-'
}

function formatCashDateTime(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value).trim()
  const num = Number(raw)
  if (Number.isFinite(num) && /^\d+$/.test(raw)) {
    return formatDateTimeSec(raw) || '-'
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  return formatDateTimeSec(date.getTime()) || '-'
}

function onTabChange(name: string | number) {
  if (name === 'cashManagement') {
    void managementTable.fetchList()
  } else if (name === 'cashList') {
    void cashListTable.fetchList()
  } else if (name === 'cashRecord') {
    void takeRecordTable.fetchList()
  }
}

function openManagementAdd() {
  managementDialogMode.value = 'add'
  managementEditing.value = null
  managementDialogVisible.value = true
}

function openManagementEdit(row: CashManagementItem) {
  managementDialogMode.value = 'edit'
  managementEditing.value = { ...row, type: String(row.type) }
  managementDialogVisible.value = true
}

async function deleteManagement(row: CashManagementItem) {
  await ElMessageBox.confirm('确认删除吗?', '确认', { type: 'warning' })
  await deleteCashManagement(row.id)
  ElMessage.success('删除成功')
  await managementTable.fetchList()
}

function handleManagementSelectionChange(rows: CashManagementItem[]) {
  managementSelection.value = rows
}

async function exportExcelCashManagement() {
  if (!managementSelection.value.length) {
    ElMessage.warning('请先勾选要导出的记录')
    return
  }
  const filename = promptExportFilename('出入金选中导出')
  if (!filename) {
    return
  }
  const header = ['ID', '月份', '日期', '周', '金额', '类型', '人员', '内容', '备注', '创建时间']
  const data = managementSelection.value.map((row) => [
    row.id,
    row.month != null && String(row.month) !== '' ? `${row.month}月` : '',
    formatCashDate(row.mdate),
    row.week != null && String(row.week) !== '' ? `第${row.week}周` : '',
    `¥ ${formatMoneyJp(row.amount)}`,
    row.type === 0 ? '入金' : row.type === 1 ? '出金' : '',
    row.staff ?? '',
    row.content ?? '',
    row.remark ?? '',
    formatCashDate(row.createTime),
  ])
  await exportJsonToExcel({ header, data, filename, autoWidth: true })
}

function openListEdit(row: CashListItem) {
  listDialogMode.value = 'edit'
  listEditing.value = { ...row }
  listDialogVisible.value = true
}

function openListCount(row: CashListItem, type: number) {
  countType.value = type
  countEditing.value = { ...row }
  countDialogVisible.value = true
}

function openTakeAdd() {
  takeDialogMode.value = 'add'
  takeEditing.value = null
  takeDialogVisible.value = true
}

function openTakeEdit(row: CashTakeRecordItem) {
  takeDialogMode.value = 'edit'
  takeEditing.value = { ...row }
  takeDialogVisible.value = true
}

async function deleteTake(row: CashTakeRecordItem) {
  await ElMessageBox.confirm('确认删除吗?', '确认', { type: 'warning' })
  await deleteCashTakeRecord(row.id)
  ElMessage.success('删除成功')
  await takeRecordTable.fetchList()
}

onMounted(() => {
  void managementTable.fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-tabs v-model="activeTab" type="card" @tab-change="onTabChange">
        <!-- 出入金管理 -->
        <el-tab-pane label="出入金管理" name="cashManagement">
          <div class="biz-page__filter">
            <el-input
              v-model="managementSearch.id"
              placeholder="请输入ID"
              clearable
              style="width: 100px"
              @keyup.enter="managementTable.handleSearch"
            />
            <el-date-picker
              v-model="managementSearch.mdate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请输入日期"
              clearable
              style="width: 200px"
            />
            <el-input
              v-model="managementSearch.year"
              placeholder="请输入年份"
              clearable
              style="width: 100px"
              @keyup.enter="managementTable.handleSearch"
            />
            <el-input
              v-model="managementSearch.month"
              placeholder="请输入月份"
              clearable
              style="width: 100px"
              @keyup.enter="managementTable.handleSearch"
            />
            <el-input
              v-model="managementSearch.week"
              placeholder="请输入周"
              clearable
              style="width: 100px"
              @keyup.enter="managementTable.handleSearch"
            />
            <el-select v-model="managementSearch.type" placeholder="请选择" clearable style="width: 100px">
              <el-option label="入金" value="0" />
              <el-option label="出金" value="1" />
            </el-select>
            <el-button type="primary" @click="managementTable.handleSearch">
              {{ buttons.index?.authName ?? '查询' }}
            </el-button>
            <el-button type="success" @click="openManagementAdd">
              {{ buttons.add?.authName ?? '新增' }}
            </el-button>
            <el-button type="primary" @click="exportExcelCashManagement">Excel导出（选中）</el-button>
            <span class="biz-page__total">总额: {{ formatMoneyJp(managementTotalAmount) }}</span>
          </div>

          <el-table
            v-loading="managementTable.loading.value"
            :data="managementTable.list.value"
            stripe
            highlight-current-row
            @selection-change="handleManagementSelectionChange"
          >
            <template #empty><el-empty description="暂无数据" /></template>
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column prop="id" label="ID" width="80" align="center" />
            <el-table-column label="月份" width="80" align="center">
              <template #default="{ row }">{{ row.month != null ? `${row.month}月` : '-' }}</template>
            </el-table-column>
            <el-table-column label="日期" width="100" align="center">
              <template #default="{ row }">{{ formatCashDate(row.mdate) }}</template>
            </el-table-column>
            <el-table-column label="周" width="100" align="center">
              <template #default="{ row }">{{ row.week != null ? `第${row.week}周` : '-' }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="center">
              <template #default="{ row }">¥ {{ formatMoneyJp(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="100" align="center">
              <template #default="{ row }">{{ row.type === 0 ? '入金' : '出金' }}</template>
            </el-table-column>
            <el-table-column prop="staff" label="人员" width="100" align="center" />
            <el-table-column prop="content" label="内容" width="150" align="center" />
            <el-table-column prop="remark" label="备注" width="150" align="center" />
            <el-table-column label="创建时间" width="120" align="center">
              <template #default="{ row }">{{ formatCashDate(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openManagementEdit(row)">
                  {{ buttons.update?.authName ?? '更新' }}
                </el-button>
                <el-button type="danger" link @click="deleteManagement(row)">
                  {{ buttons.delete?.authName ?? '删除' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="biz-page__pagination">
            <el-pagination
              v-model:current-page="managementTable.pagination.page"
              v-model:page-size="managementTable.pagination.pageSize"
              :total="managementTable.pagination.total"
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50]"
              background
              @current-change="managementTable.handlePageChange"
              @size-change="managementTable.handleSizeChange"
            />
          </div>
        </el-tab-pane>

        <!-- 现金管理 -->
        <el-tab-pane label="现金管理" name="cashList" lazy>
          <div class="biz-page__filter">
            <span class="biz-page__total">
              总金额: {{ formatMoneyJp(cashListTotals.total) }}
              「总硬币:{{ formatMoneyJp(cashListTotals.totalY) }} 」
              「总纸币:{{ formatMoneyJp(cashListTotals.totalZ) }} 」
            </span>
          </div>
          <el-table
            v-loading="cashListTable.loading.value"
            :data="cashListTable.list.value"
            stripe
            highlight-current-row
          >
            <template #empty><el-empty description="暂无数据" /></template>
            <el-table-column label="金额" width="100" align="center">
              <template #default="{ row }">{{ row.amount }}円</template>
            </el-table-column>
            <el-table-column prop="quantity" label="个数" width="100" align="center" />
            <el-table-column label="合" width="120" align="center">
              <template #default="{ row }">
                {{ formatMoneyJp(Number(row.amount) * Number(row.quantity)) }}
              </template>
            </el-table-column>
            <el-table-column prop="beforequantity" label="更新前个数" width="110" align="center" />
            <el-table-column label="更新时间" width="180" align="center">
              <template #default="{ row }">{{ formatCashDateTime(row.updateTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openListCount(row, 0)">增加</el-button>
                <el-button type="primary" link @click="openListCount(row, 1)">减少</el-button>
                <el-button type="primary" link @click="openListEdit(row)">
                  {{ buttons.update?.authName ?? '更新' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 取现记录 -->
        <el-tab-pane label="取现记录" name="cashRecord" lazy>
          <div class="biz-page__filter">
            <el-input
              v-model="takeSearch.id"
              placeholder="请输入ID"
              clearable
              style="width: 200px"
              @keyup.enter="takeRecordTable.handleSearch"
            />
            <el-date-picker
              v-model="takeSearch.takeTime"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请输入日期"
              clearable
              style="width: 200px"
            />
            <el-input
              v-model="takeSearch.amount"
              placeholder="请输入金额"
              clearable
              style="width: 200px"
              @keyup.enter="takeRecordTable.handleSearch"
            />
            <el-input
              v-model="takeSearch.content"
              placeholder="请输入内容"
              clearable
              style="width: 200px"
              @keyup.enter="takeRecordTable.handleSearch"
            />
            <el-button type="primary" @click="takeRecordTable.handleSearch">
              {{ buttons.index?.authName ?? '查询' }}
            </el-button>
            <el-button type="success" @click="openTakeAdd">
              {{ buttons.add?.authName ?? '新增' }}
            </el-button>
          </div>
          <el-table
            v-loading="takeRecordTable.loading.value"
            :data="takeRecordTable.list.value"
            stripe
            highlight-current-row
          >
            <template #empty><el-empty description="暂无数据" /></template>
            <el-table-column prop="id" label="ID" width="80" align="center" />
            <el-table-column label="日期" width="120" align="center">
              <template #default="{ row }">{{ formatCashDate(row.takeTime) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="center">
              <template #default="{ row }">¥ {{ formatMoneyJp(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="content" label="内容" width="150" align="center" />
            <el-table-column label="创建时间" width="120" align="center">
              <template #default="{ row }">{{ formatCashDate(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openTakeEdit(row)">
                  {{ buttons.update?.authName ?? '更新' }}
                </el-button>
                <el-button type="danger" link @click="deleteTake(row)">
                  {{ buttons.delete?.authName ?? '删除' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="biz-page__pagination">
            <el-pagination
              v-model:current-page="takeRecordTable.pagination.page"
              v-model:page-size="takeRecordTable.pagination.pageSize"
              :total="takeRecordTable.pagination.total"
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50]"
              background
              @current-change="takeRecordTable.handlePageChange"
              @size-change="takeRecordTable.handleSizeChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <CashManagementFormDialog
      v-model:visible="managementDialogVisible"
      :mode="managementDialogMode"
      :model="managementEditing"
      @success="managementTable.fetchList"
    />
    <CashListFormDialog
      v-model:visible="listDialogVisible"
      :mode="listDialogMode"
      :model="listEditing"
      @success="cashListTable.fetchList"
    />
    <CashListCountDialog
      v-model:visible="countDialogVisible"
      :model="countEditing"
      :type-c="countType"
      @success="cashListTable.fetchList"
    />
    <CashTakeRecordFormDialog
      v-model:visible="takeDialogVisible"
      :mode="takeDialogMode"
      :model="takeEditing"
      @success="takeRecordTable.fetchList"
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

  &__total {
    margin-left: 8px;
    color: #606266;
    font-size: 14px;
  }
}
</style>
