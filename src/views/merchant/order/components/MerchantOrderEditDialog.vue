<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { lookupPostcodeByPostcode } from '@/api/common/postcode'
import { searchFares } from '@/api/configure'
import { queryDictionaryGroups } from '@/api/dictionary'
import { updateMerchantOrder } from '@/api/merchant'
import {
  formatMerchantAddress,
  formatOrderTimestamp,
  merchantOrderDataToLines,
} from '@/utils/merchant-order'
import {
  formatMerchantOrderAddressApply,
  formatMerchantOrderAddressLabel,
  queryMerchantUserAddressesByUserId,
  type MerchantUserAddressItem,
} from '@/api/merchant/user-address'
import { useUserStore } from '@/stores/user'
import type { MerchantOrderDetail } from '@/types/merchant-order'
import { getDictionaryOptions } from '@/utils/dictionary'
import {
  prepareOrderUpdatePayload,
  recalcLineTotal,
  recalcOrderTotals,
  DEFAULT_ORDER_TAX_RATE,
  type OrderFormLine,
} from '@/utils/order-form'
import { calcMerchantOrderFees } from '@/utils/merchant-order-fee'
import { saveDictionary } from '@/utils/storage'
import MerchantCommodityPickerDialog, {
  type MerchantCommodityCartItem,
} from './MerchantCommodityPickerDialog.vue'

interface Props {
  visible: boolean
  order: MerchantOrderDetail | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const activeTab = ref('basic')
const addressList = ref<MerchantUserAddressItem[]>([])
const selectedAddressId = ref<number | string | ''>('')
const addAddressVisible = ref(false)
const pickerVisible = ref(false)
const fareList = ref<Awaited<ReturnType<typeof searchFares>>>([])
const dictTick = ref(0)

const orderUid = computed(() => props.order?.uid ?? 0)

const payOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('pay_type')
})
const logisticsOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('logistics_type')
})
const takeTimeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('take_time_type_merchant')
})

const form = reactive({
  id: 0,
  status: 0,
  pay: 0,
  uid: 0,
  uname: '',
  ucode: '',
  wechat: '',
  wuliu: 0 as number | string,
  pi: '',
  shtime: '' as string | number,
  memo: '',
  name: '',
  phone: '' as string | number,
  zip: '',
  city: '',
  address: '',
  addressid: '' as number | string | '',
  yf: 0,
  svf: 0,
  ld: 0,
  taxtotal: 0,
  taxState: 0,
  total: 0,
  totalJp: 0,
  orderlist: [] as OrderFormLine[],
})

const taxStateChecked = computed({
  get: () => form.taxState === 0,
  set: (checked: boolean) => {
    form.taxState = checked ? 0 : 1
    recalcOrderTotals(form, false, true)
  },
})

function normalizeShtime(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const options = takeTimeOptions.value
  const matched = options.find((item) => String(item.value) === String(value))
  return matched ? Number(matched.value) : Number(value)
}

function resetFormFromOrder(order: MerchantOrderDetail) {
  form.id = order.id
  form.status = order.status
  form.pay = Number(order.pay ?? 0)
  form.uid = order.uid ?? 0
  form.uname = order.uname ?? ''
  form.ucode = order.ucode ?? ''
  form.wechat = order.wechat ?? ''
  form.wuliu = order.wuliu ?? 0
  form.pi = order.pi ?? ''
  form.shtime = normalizeShtime(order.shtime)
  form.memo = order.memo ?? ''
  form.name = order.merchantAddress?.receive ?? order.name ?? ''
  form.phone = order.merchantAddress?.phone ?? order.phone ?? ''
  form.zip = order.merchantAddress?.postcode ?? order.zip ?? ''
  form.city = order.merchantAddress?.city ?? ''
  form.address = order.merchantAddress
    ? formatMerchantAddress(order)
    : (order.address ?? '')
  form.addressid = ''
  form.yf = Number(order.yf ?? 0)
  form.svf = Number(order.svf ?? 0)
  form.ld = Number(order.ld ?? 0)
  form.taxtotal = Number(order.taxtotal ?? 0)
  form.taxState = order.taxState ?? 0
  form.orderlist =
    order.orderlist?.length
      ? order.orderlist.map((line) => ({
          pid: (line as OrderFormLine).pid ?? 0,
          title: line.title,
          price: line.price,
          count: line.count,
          total: line.total ?? line.price * line.count,
          tax: line.tax ?? 8,
          taxtype: line.taxtype ?? 0,
          sku: line.sku,
          unit: line.unit,
          pident: line.pident,
          home: line.home,
          code: line.code != null && line.code !== '' ? String(line.code) : '',
        }))
      : merchantOrderDataToLines(order.data)
  addAddressVisible.value = false
  recalcOrderTotals(form, false, true)
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups([
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

async function loadAddresses(uid?: number) {
  addressList.value = []
  selectedAddressId.value = ''
  form.addressid = ''
  if (!uid) {
    return
  }
  try {
    addressList.value = await queryMerchantUserAddressesByUserId(uid)
    const matched = addressList.value.find(
      (item) =>
        item.receive === form.name ||
        formatMerchantOrderAddressLabel(item) === form.address ||
        formatMerchantOrderAddressApply(item) === form.address ||
        formatMerchantAddress({ merchantAddress: item } as unknown as MerchantOrderDetail) ===
          form.address,
    )
    if (matched) {
      selectedAddressId.value = matched.id
      form.addressid = matched.id
    }
  } catch {
    addressList.value = []
  }
}

watch(
  () => [props.visible, props.order] as const,
  async ([visible, order]) => {
    if (!visible || !order) {
      return
    }
    activeTab.value = 'basic'
    await ensureDictionaries()
    resetFormFromOrder(order)
    void loadAddresses(order.uid)
    if (!fareList.value.length) {
      void searchFares({ usertype: 1 }).then((rows) => {
        fareList.value = rows
      })
    }
  },
)

watch(
  () => [form.yf, form.svf, form.ld, form.orderlist, form.taxState] as const,
  () => recalcOrderTotals(form, false, true),
  { deep: true },
)

function applyAddress(address: MerchantUserAddressItem) {
  // 对齐旧版 orderInfo.changeAddress：只改地址字段，不重算运费
  form.address = formatMerchantOrderAddressApply(address)
  form.addressid = address.id
  form.zip = address.postcode
  form.city = address.city ?? ''
  form.name = address.receive
  form.phone = address.phone ?? form.phone
  selectedAddressId.value = address.id
}

function onAddressSelect(addressId: number | string | '') {
  if (!addressId) {
    form.addressid = ''
    return
  }
  const address = addressList.value.find((item) => String(item.id) === String(addressId))
  if (address) {
    applyAddress(address)
  }
}

function openAddAddressDialog() {
  form.addressid = ''
  selectedAddressId.value = ''
  form.name = ''
  form.phone = ''
  form.zip = ''
  form.address = ''
  form.city = ''
  addAddressVisible.value = true
}

function closeAddAddressDialog() {
  addAddressVisible.value = false
}

async function changePostcode() {
  if (!form.zip) {
    return
  }
  try {
    const rows = await lookupPostcodeByPostcode(form.zip)
    if (rows.length > 0 && rows[0].city) {
      form.city = rows[0].city
    }
  } catch {
    // ignore
  }
}

function onLineChange(line: OrderFormLine) {
  recalcLineTotal(line)
  recalcOrderTotals(form, false, true)
}

function removeLine(index: number) {
  form.orderlist.splice(index, 1)
  recalcOrderTotals(form, false, true)
}

function applyAutoFees(showMessage = true) {
  const fees = calcMerchantOrderFees(form.total, form.pay, form.address, fareList.value)
  form.svf = fees.svf
  form.yf = fees.yf
  form.ld = fees.ld
  recalcOrderTotals(form, false, true)
  if (showMessage) {
    ElMessage.success('已按规则重新计算费用')
  }
}

function handleCartAppend(cart: Record<number, MerchantCommodityCartItem>) {
  Object.entries(cart).forEach(([key, element]) => {
    const pid = Number(key)
    const existing = form.orderlist.find((item) => item.pid === pid || item.pid === Math.abs(pid))
    if (existing) {
      existing.count += element.addCount
      recalcLineTotal(existing)
      return
    }
    const line: OrderFormLine = {
      pid,
      title: element.title,
      count: element.addCount,
      price: element.price,
      total: element.price * element.addCount,
      tax: element.tax ?? DEFAULT_ORDER_TAX_RATE,
      taxtype: element.taxtype ?? 0,
      sku: `YS${element.id}`,
      unit: element.unit,
      home: element.home,
      code: element.code,
    }
    form.orderlist.push(line)
  })
  recalcOrderTotals(form, false, true)
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleSave() {
  await ElMessageBox.confirm('确定要保存订单修改吗？', '保存', { type: 'warning' })
  loading.value = true
  try {
    const operator = userStore.userInfo?.username ?? 'admin'
    const payload = prepareOrderUpdatePayload(form.id, form, operator, {
      includeLc: false,
      useShtimeArray: false,
      includeTax: true,
      baseOrder: props.order as unknown as Record<string, unknown>,
    })
    await updateMerchantOrder(payload)
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
    title="编辑订单"
    width="88%"
    top="3vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="基本信息" name="basic">
        <el-form ref="formRef" :model="form" label-width="120px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="订单编号">{{ form.id }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="订单用户">{{ form.uname }} [{{ form.ucode }}]</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="支付方式">
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
              <el-form-item label="微信号">
                <el-input v-model="form.wechat" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物流方式">
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
            <el-col :span="12">
              <el-form-item label="下单时间">
                {{ formatOrderTimestamp(order?.authenappend) }}
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="配送备注" name="delivery">
        <el-form :model="form" label-width="120px">
          <el-form-item label="收获时间段">
            <el-radio-group v-model="form.shtime">
              <el-radio-button
                v-for="item in takeTimeOptions"
                :key="String(item.value)"
                :value="Number(item.value)"
              >
                {{ item.display }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="客户备注">
            <el-input v-model="form.memo" type="textarea" :rows="8" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="收货地址" name="address">
        <el-form :model="form" label-width="120px">
          <template v-if="addAddressVisible">
            <el-form-item label="收货人姓名">
              <el-input v-model="form.name" placeholder="收货人姓名" />
            </el-form-item>
            <el-form-item label="收货人电话">
              <el-input v-model="form.phone" placeholder="收货人电话" />
            </el-form-item>
            <el-form-item label="收货人邮编">
              <el-input v-model="form.zip" placeholder="收货人邮编" @blur="changePostcode" />
            </el-form-item>
            <el-form-item label="收货人地址">
              <el-input v-model="form.address" placeholder="收货地址" />
            </el-form-item>
            <el-form-item>
              <el-button @click="closeAddAddressDialog">返回地址簿</el-button>
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="收货地址">
              <div class="merchant-order-edit__address-row">
                <el-select
                  v-model="selectedAddressId"
                  filterable
                  clearable
                  placeholder="请选择"
                  style="flex: 1"
                  @change="onAddressSelect"
                >
                  <el-option
                    v-for="item in addressList"
                    :key="item.id"
                    :label="formatMerchantOrderAddressLabel(item)"
                    :value="item.id"
                  />
                </el-select>
                <el-button type="primary" @click="openAddAddressDialog">修改地址</el-button>
              </div>
            </el-form-item>
            <el-form-item label="当前地址">
              <span>{{ form.address || '-' }}</span>
            </el-form-item>
            <el-form-item label="收货人">
              <span>{{ form.name || '-' }}</span>
            </el-form-item>
            <el-form-item label="电话">
              <span>{{ form.phone || '-' }}</span>
            </el-form-item>
            <el-form-item label="邮编">
              <span>{{ form.zip || '-' }}</span>
            </el-form-item>
          </template>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="商品费用" name="goods">
        <el-form :model="form" label-width="120px">
          <div class="merchant-order-edit__goods-toolbar">
            <el-button type="primary" :disabled="!orderUid" @click="pickerVisible = true">
              添加商品
            </el-button>
            <el-button @click="() => applyAutoFees()">自动计算运费</el-button>
          </div>
          <el-form-item label="含税">
            <el-checkbox v-model="taxStateChecked">计算消费税</el-checkbox>
          </el-form-item>
          <el-table :data="form.orderlist" stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="商品" min-width="160" />
            <el-table-column prop="sku" label="SKU" width="100" />
            <el-table-column label="价格" width="120">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.price"
                  :min="0"
                  size="small"
                  controls-position="right"
                  @change="onLineChange(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.count"
                  :min="1"
                  size="small"
                  controls-position="right"
                  @change="onLineChange(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="税率%" width="100">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.tax"
                  :min="0"
                  :max="100"
                  size="small"
                  controls-position="right"
                  @change="recalcOrderTotals(form, false, true)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="total" label="小计" width="90" />
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeLine($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-row :gutter="16" class="merchant-order-edit__fees">
            <el-col :span="8">
              <el-form-item label="运费">
                <el-input-number v-model="form.yf" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="货到付款费">
                <el-input-number v-model="form.svf" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="冷冻运费">
                <el-input-number v-model="form.ld" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="merchant-order-edit__summary">
            商品：¥{{ form.total }}，税费：¥{{ form.taxtotal ?? 0 }}，合计：¥{{ form.totalJp }}
          </div>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">保存</el-button>
    </template>
    <MerchantCommodityPickerDialog
      v-model:visible="pickerVisible"
      :uid="orderUid"
      mode="append"
      @append="handleCartAppend"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
.merchant-order-edit {
  &__goods-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__address-row {
    display: flex;
    gap: 8px;
    width: 100%;
    align-items: center;
  }

  &__fees {
    margin-top: 16px;
  }

  &__summary {
    margin-top: 8px;
    color: #606266;
    font-size: 14px;
    text-align: right;
  }
}
</style>
