<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeliveryreqPrint from '@/components/print/DeliveryreqPrint.vue'
import RequestPrint from '@/components/print/RequestPrint.vue'
import type { MerchantRequisitionItem } from '@/api/merchant'
import type { DeliveryPrintItem } from '@/utils/merchant-order-print'
import type { RequestPrintCustomer } from '@/utils/merchant-order-print'
import { printBySelector } from '@/utils/print'

interface Props {
  visible: boolean
  model?: MerchantRequisitionItem | null
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '打印',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  closed: []
}>()

const amountHidden = ref(false)
const titleHidden = ref(false)
const doubleCopy = ref(true)
const printType = ref(0)
const printKey = ref('')
const today = ref(new Date())

const deliveryList = ref<DeliveryPrintItem[]>([])
const requestCustomers = ref<RequestPrintCustomer[]>([])
const totalList = ref<Record<string, Record<string, number>>>({})
const taxTotal = ref<Record<string, number>>({})
const moneyTotal = ref<Record<string, number>>({})
const ld = ref<Record<string, number>>({})
const yf = ref<Record<string, number>>({})
const svf = ref<Record<string, number>>({})
const point = ref<Record<string, number>>({})
const pointTotal = ref<Record<string, number>>({})
const datalist = ref<Record<string, Record<string, Record<string, unknown>>>>({})
const depositmoney = ref<Record<string, number>>({})
const reqmoney = ref<Record<string, number>>({})
const refunder = ref<Record<string, Array<{ rid: string; total: number }>>>({})
const otherCost = ref<Record<string, Record<string, string>>>({})

const canPrint = computed(() => Boolean(printKey.value))

function safeParse<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') {
    return fallback
  }
  if (typeof raw !== 'string') {
    return raw as T
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function extractKey(id: string | number, type: number) {
  const text = String(id)
  const parts = text.split('-')
  if (type === 0) {
    return parts[2] || parts[parts.length - 1] || text
  }
  return parts[1] || parts[parts.length - 1] || text
}

watch(
  () => [props.visible, props.model] as const,
  ([visible, model]) => {
    if (!visible || !model) {
      return
    }
    amountHidden.value = false
    titleHidden.value = false
    doubleCopy.value = true
    printType.value = Number(model.type ?? 0)
    printKey.value = extractKey(model.id, printType.value)
    today.value = model.createtime ? new Date(model.createtime) : new Date()

    const key = printKey.value
    const requestob = safeParse<DeliveryPrintItem | Record<string, unknown>>(model.requestob, {})
    const mtotal = safeParse<Record<string, number>>(model.mtotal, {})
    const dataMap = safeParse<Record<string, Record<string, unknown>>>(model.datalist, {})
    const refundMap = safeParse<Array<{ rid: string; total: number }> | Record<string, unknown>>(
      model.refundertotal,
      [],
    )
    const costMap = safeParse<Record<string, string>>(model.othercost, {})

    totalList.value = { [key]: mtotal }
    taxTotal.value = { [key]: Number(model.taxtotal ?? 0) }
    moneyTotal.value = { [key]: Number(model.moneytotal ?? 0) }
    ld.value = { [key]: Number(model.ld ?? 0) }
    yf.value = { [key]: Number(model.yf ?? 0) }
    svf.value = { [key]: Number(model.svf ?? 0) }
    point.value = { [key]: Number(model.point ?? 0) }
    pointTotal.value = { [key]: Number(model.pointtotal ?? 0) }
    depositmoney.value = { [key]: Number(model.depositmoney ?? 0) }
    reqmoney.value = { [key]: Number(model.reqmoney ?? 0) }
    otherCost.value = { [key]: costMap }
    refunder.value = {
      [key]: Array.isArray(refundMap)
        ? refundMap
        : Object.entries(refundMap).map(([rid, total]) => ({
            rid,
            total: Number(total),
          })),
    }
    datalist.value = { [key]: dataMap as Record<string, Record<string, unknown>> }

    if (printType.value === 0) {
      const oid =
        Number((requestob as DeliveryPrintItem).oid ?? key) || Number(key) || 0
      const item = {
        ...(requestob as DeliveryPrintItem),
        id: Number((requestob as DeliveryPrintItem).id ?? key) || oid,
        oid,
      }
      // 金额 map 与组件取值统一用 oid 做 key
      if (oid !== Number(key)) {
        moneyTotal.value = { [oid]: moneyTotal.value[key] ?? 0 }
        taxTotal.value = { [oid]: taxTotal.value[key] ?? 0 }
        totalList.value = { [oid]: totalList.value[key] ?? {} }
        ld.value = { [oid]: ld.value[key] ?? 0 }
        yf.value = { [oid]: yf.value[key] ?? 0 }
        svf.value = { [oid]: svf.value[key] ?? 0 }
        point.value = { [oid]: point.value[key] ?? 0 }
      }
      deliveryList.value = [item]
      requestCustomers.value = []
    } else {
      deliveryList.value = []
      requestCustomers.value = [
        {
          ...(requestob as RequestPrintCustomer),
          id: Number((requestob as RequestPrintCustomer).id ?? key) || Number(key) || 0,
        },
      ]
    }
  },
)

function handlePrint() {
  if (printType.value === 0) {
    printBySelector('#deliveryreqPrintRoot', {
      pageMargin: '30px',
      useOuterHtml: true,
    })
    return
  }
  printBySelector('#requestPrintRoot', {
    pageMargin: '0mm',
    useOuterHtml: true,
  })
}

function closeDialog() {
  handleVisibleChange(false)
}

function handleVisibleChange(value: boolean) {
  emit('update:visible', value)
  if (!value) {
    emit('closed')
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="80%"
    top="0"
    :modal="false"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
    <div v-if="canPrint" class="requisition-print">
      <DeliveryreqPrint
        v-if="printType === 0"
        :list="deliveryList"
        :total-list="totalList as never"
        :tax-total="taxTotal as never"
        :money-total="moneyTotal as never"
        :ld="ld as never"
        :yf="yf as never"
        :svf="svf as never"
        :point="point as never"
        :today="today"
        :double="doubleCopy"
        :amount-hidden="amountHidden"
        :title-hidden="titleHidden"
      />
      <RequestPrint
        v-else
        :customers="requestCustomers"
        :datalist="datalist as never"
        :total-list="totalList as never"
        :tax-total="taxTotal as never"
        :money-total="moneyTotal as never"
        :depositmoney="depositmoney as never"
        :reqmoney="reqmoney as never"
        :refunder="refunder as never"
        :ld="ld as never"
        :yf="yf as never"
        :svf="svf as never"
        :point-total="pointTotal as never"
        :other-cost="otherCost as never"
        :today="today"
        :req-id="String(model?.id ?? '')"
        :amount-hidden="amountHidden"
        :title-hidden="titleHidden"
      />
    </div>
    <el-empty v-else description="无可打印数据" />

    <template #footer>
      <el-checkbox v-model="amountHidden" label="隐藏价格" />
      <el-checkbox v-model="titleHidden" label="标题显示(兼領収書)" />
      <el-checkbox v-if="printType === 0" v-model="doubleCopy" label="(控)" />
      <el-button @click="closeDialog">关闭</el-button>
      <el-button type="primary" :disabled="!canPrint" @click="handlePrint">打印</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.requisition-print {
  max-height: 70vh;
  overflow: auto;
}
</style>
