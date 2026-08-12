<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateMerchantOrderStatusBatch } from '@/api/merchant'
import { addRequisitionBatch } from '@/api/merchant/requisition'
import DeliveryreqPrint from '@/components/print/DeliveryreqPrint.vue'
import type { MerchantOrderListItem } from '@/types/merchant-order'
import {
  buildDeliveryPrintState,
  buildDeliveryRequisitionPayload,
  getDeliveryStatusUpdateMap,
  type DeliveryPrintState,
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
const double = ref(true)
const saveDisabled = ref(false)
const today = ref(new Date())
const printState = ref<DeliveryPrintState>(buildDeliveryPrintState([]))

const printAreaKey = computed(() => props.orders.map((item) => item.id).join('-'))

watch(
  () => [props.visible, props.orders] as const,
  ([visible]) => {
    if (!visible) {
      return
    }
    saveDisabled.value = false
    today.value = new Date()
    printState.value = buildDeliveryPrintState(props.orders, today.value)
    if (!printState.value.list.length) {
      ElMessage.warning('所选订单中没有可打印納品書的记录（需状态为待处理/处理中/待发货）')
    }
  },
  { deep: true },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSave() {
  if (!printState.value.list.length) {
    return
  }
  await ElMessageBox.confirm('确定要保存吗？', '保存納品書', { type: 'warning' })
  const operator = userStore.userInfo?.username ?? 'admin'
  const payload = buildDeliveryRequisitionPayload(printState.value, operator, today.value)
  await addRequisitionBatch(payload)
  saveDisabled.value = true
  ElMessage.success('保存成功')
  emit('saved')
}

async function handlePrint() {
  if (!printState.value.list.length) {
    return
  }
  printBySelector('#deliveryreqPrintRoot', { pageMargin: '30px', useOuterHtml: true })
  const idStatus = getDeliveryStatusUpdateMap(printState.value)
  if (Object.keys(idStatus).length) {
    await updateMerchantOrderStatusBatch(idStatus)
    emit('saved')
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="納品書"
    width="90%"
    top="0"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <DeliveryreqPrint
      :key="printAreaKey"
      :list="printState.list"
      :total-list="printState.totalList"
      :tax-total="printState.taxTotal"
      :money-total="printState.moneyTotal"
      :ld="printState.ld"
      :yf="printState.yf"
      :svf="printState.svf"
      :point="printState.point"
      :today="today"
      :double="double"
      :amount-hidden="amountHidden"
      :title-hidden="titleHidden"
    />

    <template #footer>
      <el-checkbox v-model="amountHidden" label="隐藏价格" />
      <el-checkbox v-model="titleHidden" label="标题显示(兼領収書)" />
      <el-checkbox v-model="double" label="(控)" />
      <el-button type="primary" :disabled="saveDisabled || !printState.list.length" @click="handleSave">
        保存
      </el-button>
      <el-button type="primary" :disabled="!printState.list.length" @click="handlePrint">
        打印
      </el-button>
      <el-button @click="closeDialog">关闭</el-button>
    </template>
  </el-dialog>
</template>
