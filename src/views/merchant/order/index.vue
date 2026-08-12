<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantOrder,
  getMerchantOrderList,
  updateMerchantOrderPayBatch,
  updateMerchantOrderStatusBatch,
  type MerchantOrderListParams,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import type { MerchantOrderListItem } from '@/types/merchant-order'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import {
  enrichMerchantOrderRow,
  formatMerchantOrderReceiver,
} from '@/utils/merchant-order'
import {
  exportMerchantCollectionSheetExcel,
  exportMerchantOrdersExcel,
} from '@/utils/merchant-order-export'
import { formatDateTimeSec, formatMoneyJp } from '@/utils/format'
import { saveDictionary } from '@/utils/storage'
import MerchantDeliveryPrintDialog from './components/MerchantDeliveryPrintDialog.vue'
import MerchantOrderCreateDialog from './components/MerchantOrderCreateDialog.vue'
import MerchantRequestPrintDialog from './components/MerchantRequestPrintDialog.vue'
import MerchantOrderShowDialog from './components/MerchantOrderShowDialog.vue'

const dictTick = ref(0)
const statusOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('order_status')
})
const payOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('pay_type')
})

const searchForm = reactive({
  id: '',
  unick: '',
  ucode: '',
  statusList: [] as Array<number | string>,
  payList: [] as Array<number | string>,
  dateRange: [] as string[],
})

const selectedRows = ref<MerchantOrderListItem[]>([])
const showDialogVisible = ref(false)
const createDialogVisible = ref(false)
const copyFromId = ref<number>()
const deliveryPrintVisible = ref(false)
const requestPrintVisible = ref(false)
const activeOrderId = ref<number>()
const batchStatusVisible = ref(false)
const batchStatus = ref<number | string | ''>('')
const batchPayVisible = ref(false)
const batchPay = ref<number | string | ''>('')

const { buttons, hasButton } = usePageButtons()

const listParams = computed<MerchantOrderListParams>(() => ({
  id: searchForm.id || undefined,
  unick: searchForm.unick || undefined,
  ucode: searchForm.ucode || undefined,
  statusList: searchForm.statusList.length
    ? searchForm.statusList.map((item) => Number(item))
    : undefined,
  payList: searchForm.payList.length
    ? searchForm.payList.map((item) => Number(item))
    : undefined,
  createTimeArr:
    searchForm.dateRange.length === 2
      ? [new Date(searchForm.dateRange[0]).getTime(), new Date(searchForm.dateRange[1]).getTime()]
      : undefined,
}))

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    async (params) => {
      const result = await getMerchantOrderList({ ...params, ...listParams.value })
      return {
        list: result.list.map((row) => enrichMerchantOrderRow(row)),
        total: result.total,
      }
    },
    () => listParams.value,
    20,
  )

const orderIds = computed(() => list.value.map((row) => row.id))

/** 对齐旧版：汇总基于勾选行；不含取消为 status !== 3 */
const summary = computed(() => {
  let totalAmount = 0
  let totalAmountWithTax = 0
  let totalAmountWithoutCancel = 0
  let totalAmountWithoutCancelWithoutTax = 0
  selectedRows.value.forEach((element) => {
    if (element.status !== 3) {
      totalAmountWithoutCancel += Number(element.totald ?? 0)
      totalAmountWithoutCancelWithoutTax += Number(element.total ?? 0)
    }
    totalAmount += Number(element.total ?? 0)
    totalAmountWithTax += Number(element.totald ?? 0)
  })
  return {
    totalAmount,
    totalAmountWithTax,
    totalAmountWithoutCancel,
    totalAmountWithoutCancelWithoutTax,
  }
})

function formatStatus(value?: number | string | null) {
  void dictTick.value
  return formatDictionary('order_status', value ?? '') || String(value ?? '-')
}

function formatPay(value?: number | string | null) {
  void dictTick.value
  return formatDictionary('pay_type', value ?? '') || String(value ?? '-')
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups([
      'order_status',
      'pay_type',
      'logistics_type',
      'take_time_type_merchant',
    ])
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

function resetSearch() {
  searchForm.id = ''
  searchForm.unick = ''
  searchForm.ucode = ''
  searchForm.statusList = []
  searchForm.payList = []
  searchForm.dateRange = []
  handleSearch()
}

function handleSelectionChange(rows: MerchantOrderListItem[]) {
  selectedRows.value = rows
}

function openShow(id: number) {
  activeOrderId.value = id
  showDialogVisible.value = true
}

function resolveCreatedOrderId(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : NaN
  }
  if (raw && typeof raw === 'object' && 'id' in raw) {
    return resolveCreatedOrderId((raw as { id: unknown }).id)
  }
  return NaN
}

function openCreateOrder() {
  copyFromId.value = undefined
  createDialogVisible.value = true
}

function handleCopyFromShow(orderId: number) {
  copyFromId.value = orderId
  createDialogVisible.value = true
}

/** 对齐旧版：保存成功后 showOrder(response.data) 打开新建订单 */
async function handleCreateSuccess(orderId?: number | string | Record<string, unknown>) {
  const id = resolveCreatedOrderId(orderId)
  await fetchList()
  if (Number.isFinite(id) && id > 0) {
    activeOrderId.value = id
    showDialogVisible.value = true
  }
}

async function handleDelete(row: MerchantOrderListItem) {
  if (row.status === 9 || row.status === 6) {
    return
  }
  await ElMessageBox.confirm('确认要删除此记录吗?', '删除', { type: 'warning' })
  await deleteMerchantOrder(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

function openBatchStatus() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  batchStatus.value = ''
  batchStatusVisible.value = true
}

async function confirmBatchStatus() {
  if (batchStatus.value === '') {
    ElMessage.warning('请选择订单状态')
    return
  }
  const idStatus: Record<string, number> = {}
  selectedRows.value.forEach((row) => {
    idStatus[String(row.id)] = Number(batchStatus.value)
  })
  await updateMerchantOrderStatusBatch(idStatus)
  ElMessage.success('更新成功')
  batchStatusVisible.value = false
  await fetchList()
}

function openBatchPay() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  batchPay.value = ''
  batchPayVisible.value = true
}

async function confirmBatchPay() {
  if (batchPay.value === '') {
    ElMessage.warning('请选择付款方式')
    return
  }
  const idPay: Record<string, string> = {}
  selectedRows.value.forEach((row) => {
    idPay[String(row.id)] = String(batchPay.value)
  })
  await updateMerchantOrderPayBatch(idPay)
  ElMessage.success('更新成功')
  batchPayVisible.value = false
  await fetchList()
}

function handleShowDeliveryreq(order: MerchantOrderListItem) {
  selectedRows.value = [order]
  deliveryPrintVisible.value = true
}

function handleShowRequest(order: MerchantOrderListItem) {
  selectedRows.value = [order]
  requestPrintVisible.value = true
}

function openRequestPrint() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  requestPrintVisible.value = true
}

function openDeliveryPrint() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  deliveryPrintVisible.value = true
}

async function handleExportExcel() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  await exportMerchantOrdersExcel(selectedRows.value)
}

async function handleExportCollectionSheet() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选订单')
    return
  }
  await exportMerchantCollectionSheetExcel(selectedRows.value)
}

function rowClassName({ row }: { row: MerchantOrderListItem }) {
  if (row.status === 0 || row.status === 1 || row.status === 5) {
    return 'merchant-order-row--muted'
  }
  return ''
}

onMounted(async () => {
  await ensureDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" class="filter-form" @submit.prevent="handleSearch">
        <template v-if="hasButton('index') || buttons.index">
          <el-form-item>
            <el-input
              v-model="searchForm.id"
              clearable
              placeholder="请输入订单ID"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="searchForm.unick"
              clearable
              placeholder="请输入商家"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="searchForm.ucode"
              clearable
              placeholder="请输入商家CODE"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-select
              v-model="searchForm.statusList"
              multiple
              collapse-tags
              clearable
              placeholder="订单状态"
              style="width: 200px"
            >
              <el-option
                v-for="item in statusOptions"
                :key="String(item.value)"
                :label="item.display"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select
              v-model="searchForm.payList"
              multiple
              collapse-tags
              clearable
              placeholder="付款方式"
              style="width: 200px"
            >
              <el-option
                v-for="item in payOptions"
                :key="String(item.value)"
                :label="item.display"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="创建订单开始日期"
              end-placeholder="创建订单结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              {{ buttons.index?.authName ?? '查询' }}
            </el-button>
          </el-form-item>
        </template>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openCreateOrder">
            创建订单
          </el-button>
          <el-button
            v-if="hasButton('deliveryreq') || buttons.deliveryreq"
            type="primary"
            @click="openDeliveryPrint"
          >
            {{ buttons.deliveryreq?.authName ?? '納品書' }}
          </el-button>
          <el-button
            v-if="hasButton('request') || buttons.request"
            type="primary"
            @click="openRequestPrint"
          >
            {{ buttons.request?.authName ?? '請求書' }}
          </el-button>
          <el-button type="primary" @click="handleExportExcel">Excel导出</el-button>
          <el-button type="primary" @click="handleExportCollectionSheet">收款单子导出</el-button>
          <el-button type="primary" @click="openBatchStatus">批量状态修改</el-button>
          <el-button type="primary" @click="openBatchPay">批量修改付款方式</el-button>
        </el-form-item>
      </el-form>
      <div class="biz-page__summary">
        总金额：{{ formatMoneyJp(summary.totalAmountWithTax) }} （含税）,
        总金额：{{ formatMoneyJp(summary.totalAmount) }} （不含税）,
        总金额：{{ formatMoneyJp(summary.totalAmountWithoutCancel) }}（含税/不含取消金额）,
        总金额：{{ formatMoneyJp(summary.totalAmountWithoutCancelWithoutTax) }}（不含税/不含取消金额）
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="list"
        fit
        highlight-current-row
        :row-class-name="rowClassName"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" align="center" sortable />
        <el-table-column label="商家" prop="unick" width="200" align="center">
          <template #default="{ row }">{{ row.unick }} [{{ row.ucode }}]</template>
        </el-table-column>
        <el-table-column label="收货人" prop="name" width="200" align="left">
          <template #default="{ row }">{{ formatMerchantOrderReceiver(row) }}</template>
        </el-table-column>
        <el-table-column label="订单状态" prop="status" width="200" align="left">
          <template #default="{ row }">{{ formatStatus(row.status) }}</template>
        </el-table-column>
        <el-table-column label="付款方式" prop="pay" width="200" align="left" sortable>
          <template #default="{ row }">{{ formatPay(row.pay) }}</template>
        </el-table-column>
        <el-table-column label="最后更新" prop="authenmodify" width="200" align="left" sortable>
          <template #default="{ row }">
            <div>{{ formatDateTimeSec(row.authenmodify) }}</div>
            <div>{{ row.uname }}</div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="authenappend" width="200" align="left" sortable>
          <template #default="{ row }">{{ formatDateTimeSec(row.authenappend) }}</template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              size="small"
              @click="openShow(row.id)"
            >
              {{ buttons.query?.authName ?? '查看' }}
            </el-button>
            <el-button
              v-if="(hasButton('delete') || buttons.delete) && row.status !== 9 && row.status !== 6"
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
          :page-sizes="[10, 20, 50, 100, 500]"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <MerchantOrderShowDialog
      :key="activeOrderId ?? 'order-show'"
      v-model:visible="showDialogVisible"
      :order-id="activeOrderId"
      :order-ids="orderIds"
      @changed="fetchList"
      @copy="handleCopyFromShow"
      @deliveryreq="handleShowDeliveryreq"
      @request="handleShowRequest"
    />

    <MerchantOrderCreateDialog
      v-model:visible="createDialogVisible"
      :copy-from-id="copyFromId"
      @success="handleCreateSuccess"
    />

    <MerchantDeliveryPrintDialog
      v-model:visible="deliveryPrintVisible"
      :orders="selectedRows"
      @saved="fetchList"
    />

    <MerchantRequestPrintDialog
      v-model:visible="requestPrintVisible"
      :orders="selectedRows"
      @saved="fetchList"
    />

    <el-dialog v-model="batchStatusVisible" title="批量修改订单状态" width="420px">
      <el-form label-width="100px">
        <el-form-item label="订单状态">
          <el-select v-model="batchStatus" placeholder="请选择状态" style="width: 100%">
            <el-option
              v-for="item in statusOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="已选订单">{{ selectedRows.length }} 条</el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchStatusVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchStatus">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchPayVisible" title="批量修改付款方式" width="420px">
      <el-form label-width="100px">
        <el-form-item label="付款方式">
          <el-select v-model="batchPay" placeholder="请选择付款方式" style="width: 100%">
            <el-option
              v-for="item in payOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="已选订单">{{ selectedRows.length }} 条</el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchPayVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchPay">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.biz-page {
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

.filter-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

:deep(.el-table__body tr.merchant-order-row--muted td) {
  background-color: #ddd8d8 !important;
}
</style>
