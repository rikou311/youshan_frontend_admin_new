<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { queryInventoryOrder, updateInventoryOrder } from '@/api/inventory/order'
import { usePageButtons } from '@/composables/usePageButtons'
import type { InventoryOrderDetail } from '@/types/inventory-order'
import { formatDictionary } from '@/utils/dictionary'
import { formatOrderTimestamp } from '@/utils/merchant-order'
import InventoryOrderEditDialog from './InventoryOrderEditDialog.vue'

interface Props {
  visible: boolean
  orderId?: number
  orderIds?: number[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  changed: []
}>()

const { buttons, hasButton } = usePageButtons()
const loading = ref(false)
const order = ref<InventoryOrderDetail | null>(null)
const currentId = ref<number>()
const editVisible = ref(false)

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
  return props.orderIds.findIndex((id) => id === currentId.value)
})

const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(
  () => currentIndex.value >= 0 && currentIndex.value < (props.orderIds?.length ?? 0) - 1,
)

const takeTimeText = computed(() => {
  if (!order.value?.shtimeArr?.length) {
    return '-'
  }
  return order.value.shtimeArr
    .map((item) => formatDictionary('take_time_type', item))
    .join('、')
})

const grandTotal = computed(() => Number(order.value?.total ?? 0) + Number(order.value?.svf ?? 0))

async function loadOrder(id: number) {
  loading.value = true
  try {
    order.value = await queryInventoryOrder(id)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, currentId.value] as const,
  ([visible, orderId]) => {
    if (visible && orderId) {
      void loadOrder(orderId)
    }
  },
  { immediate: true },
)

function closeDialog() {
  emit('update:visible', false)
}

function goPrevious() {
  if (!hasPrevious.value || !props.orderIds) {
    return
  }
  currentId.value = props.orderIds[currentIndex.value - 1]
}

function goNext() {
  if (!hasNext.value || !props.orderIds) {
    return
  }
  currentId.value = props.orderIds[currentIndex.value + 1]
}

async function changeStatus(status: number) {
  if (!order.value) {
    return
  }
  await updateInventoryOrder({ ...order.value, status })
  ElMessage.success('状态已更新')
  await loadOrder(order.value.id)
  emit('changed')
}

function openEdit() {
  editVisible.value = true
}

async function handleEditSaved() {
  if (order.value) {
    await loadOrder(order.value.id)
  }
  emit('changed')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="order ? `库存订单详情 #${order.id}` : '库存订单详情'"
    width="86%"
    top="4vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="orderIds?.length" class="inventory-order-show__nav">
      <el-button :disabled="!hasPrevious" @click="goPrevious">上一条</el-button>
      <el-button :disabled="!hasNext" @click="goNext">下一条</el-button>
    </div>

    <el-skeleton :loading="loading" animated>
      <template v-if="order">
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="订单编号">{{ order.id }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            {{ formatDictionary('order_status', order.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">
            {{ formatDictionary('pay_type', order.pay ?? '') }}
          </el-descriptions-item>
          <el-descriptions-item label="订单用户">{{ order.uname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="微信号">{{ order.wechat || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流方式">
            {{ formatDictionary('logistics_type', order.wuliu ?? '') }}
          </el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ order.pi || '-' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatOrderTimestamp(order.authenappend) }}
          </el-descriptions-item>
          <el-descriptions-item label="收货时间段">{{ takeTimeText }}</el-descriptions-item>
          <el-descriptions-item label="订单备注" :span="2">{{ order.memo || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="收货人信息" :column="2" border class="inventory-order-show__section">
          <el-descriptions-item label="收货人">{{ order.name }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ order.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮编">{{ order.zip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{ order.address || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="inventory-order-show__section">
          <h4>商品信息</h4>
          <el-table :data="order.orderlist ?? []" stripe>
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="title" label="商品名称" min-width="180" />
            <el-table-column prop="sku" label="SKU" min-width="120" />
            <el-table-column prop="price" label="价格" width="100" />
            <el-table-column prop="count" label="数量" width="80" />
            <el-table-column prop="tax" label="税费%" width="80" />
            <el-table-column prop="total" label="总额" width="100" />
          </el-table>
        </div>

        <el-descriptions title="费用信息" :column="2" border class="inventory-order-show__section">
          <el-descriptions-item label="订单金额">¥{{ order.total ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="货到付款运费">¥{{ order.svf ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="运费">¥{{ order.yf ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="冷冻运费">¥{{ order.ld ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="冷藏运费">¥{{ order.lc ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="合计">¥{{ grandTotal }}</el-descriptions-item>
          <el-descriptions-item label="订单总金额(日币)">¥{{ order.totalJp ?? 0 }}</el-descriptions-item>
        </el-descriptions>

        <div class="inventory-order-show__section">
          <h4>状态操作</h4>
          <el-space wrap>
            <el-button
              v-for="status in 9"
              :key="status - 1"
              size="small"
              :type="order.status === status - 1 ? 'info' : 'primary'"
              :disabled="order.status === status - 1"
              @click="changeStatus(status - 1)"
            >
              {{ formatDictionary('order_status', status - 1) }}
            </el-button>
          </el-space>
        </div>
      </template>
    </el-skeleton>

    <template #footer>
      <el-button @click="closeDialog">关闭</el-button>
      <el-button
        v-if="hasButton('update') || buttons.update"
        type="primary"
        :disabled="!order"
        @click="openEdit"
      >
        {{ buttons.update?.authName ?? '编辑' }}
      </el-button>
    </template>

    <InventoryOrderEditDialog
      v-model:visible="editVisible"
      :order="order"
      @saved="handleEditSaved"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
.inventory-order-show {
  &__nav {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__section {
    margin-top: 20px;

    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
    }
  }
}
</style>
