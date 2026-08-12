<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { getInventoryCommodityList } from '@/api/inventory/commodity'
import { updateInventoryOrder } from '@/api/inventory/order'
import { useUserStore } from '@/stores/user'
import type { InventoryOrderDetail } from '@/types/inventory-order'
import { getDictionaryOptions } from '@/utils/dictionary'
import { merchantOrderDataToLines } from '@/utils/merchant-order'
import {
  createEmptyOrderForm,
  prepareOrderUpdatePayload,
  recalcLineTotal,
  recalcOrderTotals,
  type OrderFormLine,
} from '@/utils/order-form'

interface Props {
  visible: boolean
  order: InventoryOrderDetail | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const pickerVisible = ref(false)
const commodityKeyword = ref('')
const commodityLoading = ref(false)
const commodityOptions = ref<Array<{ id: number; title: string; price: number; total?: number }>>([])

const statusOptions = getDictionaryOptions('order_status')
const payOptions = getDictionaryOptions('pay_type')
const logisticsOptions = getDictionaryOptions('logistics_type')
const takeTimeOptions = getDictionaryOptions('take_time_type')

const form = reactive(createEmptyOrderForm())
const editingId = ref(0)

const rules: FormRules = {
  uname: [{ required: true, message: '请输入订单用户', trigger: 'blur' }],
  status: [{ required: true, message: '请选择订单状态', trigger: 'change' }],
  pay: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  shtimeArr: [{ required: true, message: '请选择收货时间段', trigger: 'change', type: 'array' }],
  name: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  address: [{ required: true, message: '请输入收货地址', trigger: 'blur' }],
  zip: [{ required: true, message: '请输入邮编', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
}

const canSubmit = computed(() => form.orderlist.length > 0)

function getTableSummary({ columns, data }: { columns: Array<{ property?: string }>; data: OrderFormLine[] }) {
  const sums: string[] = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    if (column.property !== 'total') {
      sums[index] = ''
      return
    }
    const total = data.reduce((sum, row) => sum + Number(row.total || 0), 0)
    sums[index] = `¥${total.toFixed(2)}`
  })
  return sums
}

function resetFormFromOrder(order: InventoryOrderDetail) {
  editingId.value = order.id
  form.status = order.status
  form.pay = Number(order.pay ?? 0)
  form.uname = order.uname ?? order.name ?? ''
  form.wechat = order.wechat ?? ''
  form.wuliu = Number(order.wuliu ?? 0)
  form.pi = order.pi ?? ''
  form.shtimeArr = order.shtimeArr?.length
    ? [...order.shtimeArr]
    : []
  form.memo = order.memo ?? ''
  form.name = order.name ?? ''
  form.phone = order.phone ?? ''
  form.zip = order.zip ?? ''
  form.address = order.address ?? ''
  form.yf = Number(order.yf ?? 0)
  form.svf = Number(order.svf ?? 0)
  form.ld = Number(order.ld ?? 0)
  form.lc = Number(order.lc ?? 0)
  form.orderlist =
    order.orderlist?.length
      ? order.orderlist.map((line) => {
          const item = line as OrderFormLine
          const pid = item.pid ?? 0
          return {
            pid,
            title: item.title,
            price: Number(item.price ?? 0),
            count: Number(item.count ?? 1),
            total: Number(item.total ?? 0),
            sku: item.sku ?? `YS${pid}`,
            tax: item.tax,
            taxtype: item.taxtype,
          }
        })
      : merchantOrderDataToLines(order.data)
  recalcOrderTotals(form, true)
}

watch(
  () => [props.visible, props.order] as const,
  ([visible, order]) => {
    if (!visible || !order) {
      return
    }
    resetFormFromOrder(order)
    formRef.value?.clearValidate()
  },
)

watch(
  () => [form.yf, form.svf, form.ld, form.lc, form.orderlist] as const,
  () => recalcOrderTotals(form, true),
  { deep: true },
)

async function searchCommodities() {
  commodityLoading.value = true
  try {
    const result = await getInventoryCommodityList({
      page: 1,
      pageSize: 20,
      title: commodityKeyword.value || undefined,
    })
    commodityOptions.value = result.list.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      total: item.total,
    }))
  } finally {
    commodityLoading.value = false
  }
}

function addCommodity(row: { id: number; title: string; price: number }) {
  const exists = form.orderlist.some((line) => line.pid === row.id)
  if (exists) {
    ElMessage.warning('该商品已在列表中')
    return
  }
  form.orderlist.push({
    pid: row.id,
    title: row.title,
    price: row.price,
    count: 1,
    total: row.price,
    sku: `YS${row.id}`,
  })
  recalcOrderTotals(form, true)
}

function removeLine(index: number) {
  form.orderlist.splice(index, 1)
  recalcOrderTotals(form, true)
}

function onCountChange(line: OrderFormLine) {
  recalcLineTotal(line)
  recalcOrderTotals(form, true)
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  if (!form.orderlist.length) {
    ElMessage.warning('请至少添加一个商品')
    return
  }

  loading.value = true
  try {
    const operator = userStore.userInfo?.username ?? 'admin'
    const payload = prepareOrderUpdatePayload(editingId.value, form, operator, {
      includeLc: true,
      useShtimeArray: true,
    })
    await updateInventoryOrder(payload)
    ElMessage.success('保存成功')
    emit('saved')
    closeDialog()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="editingId ? `编辑库存订单 #${editingId}` : '编辑库存订单'"
    width="90%"
    top="3vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="订单状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio-button
                v-for="item in statusOptions"
                :key="item.value"
                :value="Number(item.value)"
              >
                {{ item.display }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="支付方式" prop="pay">
            <el-radio-group v-model="form.pay">
              <el-radio-button
                v-for="item in payOptions"
                :key="item.value"
                :value="Number(item.value)"
              >
                {{ item.display }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="订单用户" prop="uname">
            <el-input v-model="form.uname" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="微信号">
            <el-input v-model="form.wechat" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物流方式" prop="wuliu">
            <el-radio-group v-model="form.wuliu">
              <el-radio-button
                v-for="item in logisticsOptions"
                :key="item.value"
                :value="Number(item.value)"
              >
                {{ item.display }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物流单号">
            <el-input v-model="form.pi" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="收货时间段" prop="shtimeArr">
            <el-checkbox-group v-model="form.shtimeArr">
              <el-checkbox
                v-for="item in takeTimeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.display }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="客户备注">
            <el-input v-model="form.memo" type="textarea" :rows="2" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="收货人" prop="name">
            <el-input v-model="form.name" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="电话" prop="phone">
            <el-input v-model="form.phone" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮编" prop="zip">
            <el-input v-model="form.zip" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="地址" prop="address">
            <el-input v-model="form.address" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="order-edit__toolbar">
        <el-button type="primary" @click="pickerVisible = true">添加商品</el-button>
        <span>商品总金额：¥{{ form.total }}，合计：¥{{ form.totalJp }}</span>
      </div>

      <el-table :data="form.orderlist" stripe show-summary :summary-method="getTableSummary">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="title" label="商品名称" min-width="160" />
        <el-table-column prop="sku" label="SKU" width="100" />
        <el-table-column prop="price" label="价格" width="100" />
        <el-table-column label="数量" width="140">
          <template #default="{ row }">
            <el-input-number
              v-model="row.count"
              :min="1"
              :max="999"
              size="small"
              @change="onCountChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="total" label="小计" width="100" />
        <el-table-column label="操作" width="90">
          <template #default="{ $index }">
            <el-button type="danger" link @click="removeLine($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-row :gutter="16" class="order-edit__fees">
        <el-col :span="6">
          <el-form-item label="运费">
            <el-input-number v-model="form.yf" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="货到付款费">
            <el-input-number v-model="form.svf" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="冷冻运费">
            <el-input-number v-model="form.ld" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="冷藏运费">
            <el-input-number v-model="form.lc" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="handleSubmit">
        保存
      </el-button>
    </template>

    <el-dialog v-model="pickerVisible" title="选择商品" width="720px" append-to-body>
      <el-form :inline="true" @submit.prevent="searchCommodities">
        <el-form-item label="商品名">
          <el-input v-model="commodityKeyword" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="commodityLoading" @click="searchCommodities">
            搜索
          </el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="commodityLoading" :data="commodityOptions" max-height="360">
        <el-table-column label="SKU" width="100">
          <template #default="{ row }">YS{{ row.id }}</template>
        </el-table-column>
        <el-table-column prop="title" label="商品" min-width="180" />
        <el-table-column prop="price" label="价格" width="100" />
        <el-table-column prop="total" label="库存" width="90" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button type="primary" link @click="addCommodity(row)">添加</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </el-dialog>
</template>

<style scoped lang="scss">
.order-edit {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 12px 0;
    color: #606266;
    font-size: 14px;
  }

  &__fees {
    margin-top: 16px;
  }
}
</style>
