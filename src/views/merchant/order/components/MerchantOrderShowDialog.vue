<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryMerchantOrder, updateMerchantOrder } from '@/api/merchant'
import { usePageButtons } from '@/composables/usePageButtons'
import { useUserStore } from '@/stores/user'
import type { MerchantOrderDetail, MerchantOrderListItem } from '@/types/merchant-order'
import { formatDictionary } from '@/utils/dictionary'
import { formatDateTimeSec, formatMoneyJp } from '@/utils/format'
import { formatMerchantAddress, merchantOrderDataToLines } from '@/utils/merchant-order'
import MerchantOrderEditDialog from './MerchantOrderEditDialog.vue'

interface Props {
  visible: boolean
  orderId?: number
  orderIds?: number[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  changed: []
  copy: [orderId: number]
  deliveryreq: [order: MerchantOrderListItem]
  request: [order: MerchantOrderListItem]
}>()

const { buttons, hasButton } = usePageButtons()
const userStore = useUserStore()
const loading = ref(false)
const order = ref<MerchantOrderDetail | null>(null)
const currentId = ref<number>()
const editVisible = ref(false)

const statusActionButtons = [
  { key: 'update_0', status: 0 },
  { key: 'update_1', status: 1 },
  { key: 'update_2', status: 2 },
  { key: 'update_3', status: 3 },
  { key: 'update_4', status: 4 },
  { key: 'update_5', status: 5 },
  { key: 'update_6', status: 6 },
  { key: 'update_7', status: 7 },
  { key: 'update_8', status: 8 },
] as const

watch(
  () => props.orderId,
  (orderId) => {
    if (orderId) {
      currentId.value = orderId
    }
  },
  { immediate: true },
)

const currentIndex = computed(() => {
  if (!currentId.value || !props.orderIds?.length) {
    return -1
  }
  return props.orderIds.findIndex((id) => String(id) === String(currentId.value))
})

const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(
  () => currentIndex.value >= 0 && currentIndex.value < (props.orderIds?.length ?? 0) - 1,
)

const receiverName = computed(() => {
  if (!order.value) {
    return '-'
  }
  return order.value.merchantAddress?.receive ?? order.value.name ?? '-'
})

const receiverPhone = computed(() => order.value?.merchantAddress?.phone ?? order.value?.phone ?? '-')
const receiverZip = computed(() => order.value?.merchantAddress?.postcode ?? order.value?.zip ?? '-')

const receiverAddress = computed(() => {
  if (!order.value) {
    return '-'
  }
  if (order.value.merchantAddress) {
    return formatMerchantAddress(order.value)
  }
  return order.value.address ?? '-'
})

const taxStateChecked = computed({
  get() {
    return order.value?.taxState === 0
  },
  set(checked: boolean) {
    if (order.value) {
      order.value.taxState = checked ? 0 : 1
    }
  },
})

function calcTaxSumFromOrderlist() {
  if (!order.value?.orderlist?.length) {
    return 0
  }
  let taxSum = 0
  order.value.orderlist.forEach((item) => {
    const taxRate = item.tax != null ? item.tax : 8
    taxSum += item.count * item.price * (taxRate / 100)
  })
  return Math.ceil(taxSum)
}

/** 对齐旧版 showDialog.applyTaxState：按商品重算税与日币总金额 */
function applyTaxState() {
  if (!order.value) {
    return
  }
  if (order.value.taxState == null || (order.value.taxState as unknown) === '') {
    order.value.taxState = 0
  }
  const taxSum = calcTaxSumFromOrderlist()
  order.value.taxtotal = order.value.taxState === 0 ? taxSum : 0
  order.value.totalJp =
    Number(order.value.svf || 0) +
    Number(order.value.total || 0) +
    Number(order.value.taxtotal || 0) +
    Number(order.value.ld || 0) +
    Number(order.value.yf || 0) -
    Number(order.value.point || 0)
}

function isStatusButtonDisabled(targetStatus: number) {
  if (!order.value) {
    return true
  }
  const current = order.value.status
  if (targetStatus === 6) {
    return current === 6
  }
  return current === targetStatus || current === 9
}

function statusButtonType(targetStatus: number) {
  return isStatusButtonDisabled(targetStatus) ? 'info' : 'primary'
}

async function loadOrder(id: number) {
  loading.value = true
  order.value = null
  try {
    const detail = await queryMerchantOrder(id)
    if (!detail.orderlist?.length) {
      detail.orderlist = merchantOrderDataToLines(detail.data)
    }
    order.value = detail
    applyTaxState()
  } finally {
    loading.value = false
  }
}

watch(
  () => props.orderId,
  (orderId) => {
    if (orderId) {
      currentId.value = orderId
    }
  },
  { immediate: true },
)

watch(
  () => [props.visible, currentId.value] as const,
  ([visible, orderId]) => {
    if (visible && orderId) {
      void loadOrder(orderId)
    }
    if (!visible) {
      order.value = null
    }
  },
  { immediate: true },
)

function closeDialog() {
  emit('update:visible', false)
}

function goPrevious() {
  if (!hasPrevious.value || !props.orderIds) {
    ElMessage.warning('已是当前列表第一条')
    return
  }
  currentId.value = props.orderIds[currentIndex.value - 1]
}

function goNext() {
  if (!hasNext.value || !props.orderIds) {
    ElMessage.warning('已是当前列表最后一条')
    return
  }
  currentId.value = props.orderIds[currentIndex.value + 1]
}

async function saveOrder() {
  if (!order.value) {
    return
  }
  const payload = { ...order.value } as Record<string, unknown>
  if (payload.data && typeof payload.data !== 'string') {
    payload.data = JSON.stringify(payload.data)
  }
  if (!payload.mobile) {
    payload.mobile = ''
  }
  payload.authenmodifyoperator = userStore.userInfo?.username ?? 'admin'
  delete payload.pointState
  await updateMerchantOrder(payload)
  ElMessage.success('保存成功')
  await loadOrder(order.value.id)
  emit('changed')
}

async function changeStatus(status: number) {
  if (!order.value || status === order.value.status) {
    return
  }
  await ElMessageBox.confirm('确定要保存吗？', '警告', { type: 'warning' })
  order.value.status = status
  await saveOrder()
}

async function changeTaxState() {
  if (!order.value) {
    return
  }
  if (!(order.value.status === 0 || order.value.status === 1 || order.value.status === 2)) {
    return
  }
  applyTaxState()
  await saveOrder()
}

function openEdit() {
  editVisible.value = true
}

function handleCopy() {
  if (!order.value) {
    return
  }
  emit('copy', order.value.id)
  closeDialog()
}

function handleDeliveryreq() {
  if (!order.value) {
    return
  }
  emit('deliveryreq', order.value)
}

function handleRequest() {
  if (!order.value) {
    return
  }
  emit('request', order.value)
}

async function handleEditSaved() {
  if (order.value) {
    await loadOrder(order.value.id)
  }
  emit('changed')
}

const canEditTax = computed(() => {
  const status = order.value?.status
  return status === 0 || status === 1 || status === 2
})

const deliveryreqDisabled = computed(() => {
  const status = order.value?.status
  return !(status === 0 || status === 1 || status === 4)
})

const requestDisabled = computed(() => {
  const status = order.value?.status
  return !(status === 2 || status === 10 || status === 12)
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="order ? `订单详情 #${order.id}` : '订单详情'"
    width="80%"
    top="4vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-skeleton :loading="loading" animated>
      <template v-if="order">
        <el-descriptions title="基本信息" :column="2" border>
          <template #extra>
            <el-button v-if="hasButton('update') || buttons.update" type="primary" @click="openEdit">
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
          </template>
          <el-descriptions-item label="订单编号">{{ order.id }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            {{ formatDictionary('order_status', order.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">
            {{ formatDictionary('pay_type', order.pay ?? '') }}
          </el-descriptions-item>
          <el-descriptions-item label="订单用户">
            {{ order.uname }} [{{ order.ucode }}]
          </el-descriptions-item>
          <el-descriptions-item label="微信号">{{ order.wechat || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流方式">
            {{ formatDictionary('logistics_type', order.wuliu ?? '') }}
          </el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ order.pi || '-' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatDateTimeSec(order.authenappend) }}
          </el-descriptions-item>
          <el-descriptions-item label="收获时间段">
            {{ formatDictionary('take_time_type_merchant', order.shtime ?? '') }}
          </el-descriptions-item>
          <el-descriptions-item label="订单备注" :span="2">{{ order.memo || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="收货人信息" :column="2" border class="merchant-order-show__section">
          <el-descriptions-item label="收货人姓名">{{ receiverName }}</el-descriptions-item>
          <el-descriptions-item label="收货人电话">{{ receiverPhone }}</el-descriptions-item>
          <el-descriptions-item label="收货人邮编">{{ receiverZip }}</el-descriptions-item>
          <el-descriptions-item label="收货人地址" :span="2">{{ receiverAddress }}</el-descriptions-item>
        </el-descriptions>

        <div class="merchant-order-show__section">
          <div class="merchant-order-show__section-head">
            <h4>商品信息</h4>
            <el-button v-if="hasButton('update') || buttons.update" type="primary" @click="openEdit">
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
          </div>
          <el-table :data="order.orderlist ?? []" stripe>
            <el-table-column type="index" label="序列号" width="70" align="center" />
            <el-table-column label="商品名称" min-width="180">
              <template #default="{ row }">
                {{ row.title }}
                <span v-if="String(row.home).includes('3')" class="new-tag">活动</span>
              </template>
            </el-table-column>
            <el-table-column prop="sku" label="SKU" min-width="120" />
            <el-table-column label="价格" width="120">
              <template #default="{ row }">{{ formatMoneyJp(row.price) }}</template>
            </el-table-column>
            <el-table-column prop="count" label="数量" width="80" />
            <el-table-column label="税费" width="80">
              <template #default="{ row }">{{ row.tax ?? 8 }}%</template>
            </el-table-column>
            <el-table-column label="税类" width="80">
              <template #default="{ row }">{{ row.taxtype === 0 ? '軽減' : '' }}</template>
            </el-table-column>
            <el-table-column label="总额" width="120">
              <template #default="{ row }">{{ formatMoneyJp(row.total) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <el-descriptions title="费用信息" :column="2" border class="merchant-order-show__section">
          <el-descriptions-item label="订单金额">{{ formatMoneyJp(order.total) }}</el-descriptions-item>
          <el-descriptions-item label="货到付款运费">{{ formatMoneyJp(order.svf) }}</el-descriptions-item>
          <el-descriptions-item label="运费">{{ formatMoneyJp(order.yf) }}</el-descriptions-item>
          <el-descriptions-item label="保鲜(冷冻)">{{ formatMoneyJp(order.ld) }}</el-descriptions-item>
          <el-descriptions-item label="税">
            {{ formatMoneyJp(order.taxtotal) }}
            <el-checkbox
              v-model="taxStateChecked"
              :disabled="!canEditTax"
              style="margin-left: 12px"
              @change="changeTaxState"
            >
              含税
            </el-checkbox>
          </el-descriptions-item>
          <el-descriptions-item label="积分">-{{ formatMoneyJp(order.point) }}</el-descriptions-item>
          <el-descriptions-item label="订单总金额(日币)">
            {{ formatMoneyJp(order.totalJp) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="merchant-order-show__section">
          <h4>当前可操作</h4>
          <el-space wrap>
            <template v-for="item in statusActionButtons" :key="item.key">
              <el-button
                v-if="hasButton(item.key) || buttons[item.key]"
                round
                :type="statusButtonType(item.status)"
                :disabled="isStatusButtonDisabled(item.status)"
                @click="changeStatus(item.status)"
              >
                {{ buttons[item.key]?.authName ?? formatDictionary('order_status', item.status) }}
              </el-button>
            </template>
            <el-button
              v-if="hasButton('deliveryreq') || buttons.deliveryreq"
              round
              :type="deliveryreqDisabled ? 'info' : 'primary'"
              :disabled="deliveryreqDisabled"
              @click="handleDeliveryreq"
            >
              {{ buttons.deliveryreq?.authName ?? '納品書' }}
            </el-button>
            <el-button
              v-if="hasButton('request') || buttons.request"
              round
              :type="requestDisabled ? 'info' : 'primary'"
              :disabled="requestDisabled"
              @click="handleRequest"
            >
              {{ buttons.request?.authName ?? '請求書' }}
            </el-button>
          </el-space>
        </div>
      </template>
    </el-skeleton>

    <template #footer>
      <el-button :disabled="!hasPrevious" @click="goPrevious">上一个订单</el-button>
      <el-button type="primary" :disabled="!hasNext" @click="goNext">下一个订单</el-button>
      <el-button v-if="hasButton('add') || buttons.add" @click="handleCopy">复制订单</el-button>
    </template>

    <MerchantOrderEditDialog
      v-model:visible="editVisible"
      :order="order"
      @saved="handleEditSaved"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
.merchant-order-show {
  &__section {
    margin-top: 20px;

    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
    }
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    h4 {
      margin: 0;
    }
  }
}

.new-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 12px;
}
</style>
