<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addRequisitionBatch,
  getRefundGoodsByUserIds,
  getReqIdsByUids,
  getReqMoneyDepositMoney,
} from '@/api/merchant/requisition'
import RequestPrint from '@/components/print/RequestPrint.vue'
import type { MerchantOrderListItem } from '@/types/merchant-order'
import { formatDateToString } from '@/utils/format'
import {
  applyRefundAdjustments,
  buildRequestPrintState,
  buildRequestRequisitionPayload,
  getRequestCustomers,
  type RequestPrintState,
} from '@/utils/merchant-order-print'
import { printBySelector } from '@/utils/print'
import { useUserStore } from '@/stores/user'

interface Props {
  visible: boolean
  orders: MerchantOrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const userStore = useUserStore()
const amountHidden = ref(false)
const titleHidden = ref(false)
const saveDisabled = ref(false)
const loading = ref(false)
const today = ref(new Date())
const printState = ref<RequestPrintState>(buildRequestPrintState([]))

watch(
  () => [props.visible, props.orders] as const,
  ([visible]) => {
    if (!visible) {
      return
    }
    today.value = new Date()
    void loadPrintData()
  },
  { deep: true },
)

async function loadPrintData(date?: Date) {
  if (date) {
    today.value = date
  }
  loading.value = true
  saveDisabled.value = false
  try {
    const state = buildRequestPrintState(props.orders)
    const uids = Object.keys(state.list).map(Number)
    if (!uids.length) {
      printState.value = state
      ElMessage.warning('所选订单中没有可打印請求書的记录（需振込支付且状态符合）')
      return
    }

    const dateStr = formatDateToString(today.value)
    const [reqIds, moneyDeposit, refunds] = await Promise.all([
      getReqIdsByUids({ ids: uids, date: dateStr }),
      getReqMoneyDepositMoney({ ids: uids, date: dateStr }),
      getRefundGoodsByUserIds({ uids }),
    ])

    uids.forEach((uid) => {
      if (reqIds[uid]) {
        state.list[uid].requestid = reqIds[uid]
      }
      const moneyRow = moneyDeposit[uid]
      if (moneyRow?.length) {
        state.reqmoney[uid] = Math.ceil(Number(moneyRow[0] ?? 0))
        state.depositmoney[uid] = Number(moneyRow[1] ?? 0)
        state.pid[uid] = moneyRow[2]
      }
    })

    state.refunder = {}
    refunds.forEach((item) => {
      if (!item || !item.uid) {
        return
      }
      if (!state.refunder[item.uid]) {
        state.refunder[item.uid] = []
      }
      state.refunder[item.uid].push({
        rid: item.rid,
        total: Number(item.total ?? 0) - Number(item.refunded ?? 0),
      })
    })
    applyRefundAdjustments(state)
    printState.value = state
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleSave() {
  const customers = getRequestCustomers(printState.value)
  if (!customers.length) {
    return
  }
  await ElMessageBox.confirm('确定要保存吗？', '保存請求書', { type: 'warning' })
  const operator = userStore.userInfo?.username ?? 'admin'
  const payload = buildRequestRequisitionPayload(printState.value, operator, today.value)
  await addRequisitionBatch(payload)
  saveDisabled.value = true
  ElMessage.success('保存成功')
  emit('saved')
}

function handlePrint() {
  if (!getRequestCustomers(printState.value).length) {
    return
  }
  printBySelector('#requestPrintRoot', { pageMargin: '0mm', useOuterHtml: true })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="請求書"
    width="90%"
    top="0"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-loading="loading">
      <RequestPrint
        :customers="getRequestCustomers(printState)"
        :datalist="printState.datalist"
        :total-list="printState.totalList"
        :tax-total="printState.taxTotal"
        :money-total="printState.moneyTotal"
        :depositmoney="printState.depositmoney"
        :reqmoney="printState.reqmoney"
        :refunder="printState.refunder"
        :ld="printState.ld"
        :yf="printState.yf"
        :svf="printState.svf"
        :point-total="printState.pointTotal"
        :other-cost="printState.otherCost"
        :today="today"
        :amount-hidden="amountHidden"
        :title-hidden="titleHidden"
      />
    </div>

    <template #footer>
      <el-checkbox v-model="amountHidden" label="隐藏价格" />
      <el-checkbox v-model="titleHidden" label="标题显示(兼領収書)" />
      <el-date-picker
        v-model="today"
        type="date"
        placeholder="选择日期"
        style="margin: 0 12px; width: 180px"
        @change="loadPrintData"
      />
      <el-button
        type="primary"
        :disabled="saveDisabled || !getRequestCustomers(printState).length"
        @click="handleSave"
      >
        保存
      </el-button>
      <el-button
        type="primary"
        :disabled="!getRequestCustomers(printState).length"
        @click="handlePrint"
      >
        打印
      </el-button>
      <el-button @click="closeDialog">关闭</el-button>
    </template>
  </el-dialog>
</template>
