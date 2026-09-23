<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchFares } from '@/api/configure'
import { lookupPostcodeByPostcode } from '@/api/common/postcode'
import {
  addMerchantOrder,
  getMerchantCommodityByCode,
  queryMerchantOrder,
  searchMerchantUserByUcode,
  searchMerchantUserByUname,
  type MerchantUserOption,
} from '@/api/merchant'
import {
  formatMerchantOrderAddressText,
  queryMerchantUserAddressesByUserId,
  type MerchantUserAddressItem,
} from '@/api/merchant/user-address'
import { useUserStore } from '@/stores/user'
import {
  createEmptyOrderForm,
  DEFAULT_ORDER_TAX_RATE,
  prepareOrderSubmitPayload,
  recalcOrderTotals,
  type OrderFormLine,
} from '@/utils/order-form'
import { getDictionaryOptions } from '@/utils/dictionary'
import { calcMerchantCodSvf } from '@/utils/merchant-order-fee'
import { hydrateOrderLineCodes, merchantDetailToCreateForm } from '@/utils/merchant-order'
import { formatMoneyJp } from '@/utils/format'
import { queryDictionaryGroups } from '@/api/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  copyFromId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: [orderId?: number | string]
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const userLoading = ref(false)
const dictTick = ref(0)
const userOptions = ref<MerchantUserOption[]>([])
const userAddressList = ref<MerchantUserAddressItem[]>([])
const selectedUnameId = ref<number | string | ''>('')
const selectedUcodeId = ref<number | string | ''>('')
/** 所选用户当前可用积分 */
const availablePoint = ref(0)
/** 是否使用积分抵扣本单 */
const usePoint = ref(false)
const codeChangeTimer = ref<ReturnType<typeof setTimeout>>()
const fareList = ref<Awaited<ReturnType<typeof searchFares>>>([])
const codeInputRefs = new Map<number, { focus: () => void }>()
const countInputRefs = new Map<number, { focus: () => void }>()

const statusOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('order_status')
})
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

const form = reactive(createEmptyOrderForm())

const taxStateChecked = computed({
  get: () => form.taxState === 0,
  set: (checked: boolean) => {
    form.taxState = checked ? 0 : 1
  },
})

const rules: FormRules = {
  uname: [{ required: true, message: '请输入用户账号', trigger: 'blur' }],
  status: [{ required: true, message: '请选择订单状态', trigger: 'change' }],
  pay: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  shtime: [{ required: true, message: '请选择收货时间', trigger: 'change' }],
  name: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  address: [{ required: true, message: '请输入收货人地址', trigger: 'blur' }],
  zip: [{ required: true, message: '请输入邮编', trigger: 'blur' }],
}

function createEmptyCodeLine(): OrderFormLine {
  return {
    pid: 0,
    code: '',
    title: '',
    price: 0,
    count: 0,
    total: 0,
    stock: 0,
    tax: DEFAULT_ORDER_TAX_RATE,
    taxtype: 0,
    sku: '',
    pident: '',
    unit: '',
    home: '',
  }
}

function ensureEmptyCodeRow() {
  const last = form.orderlist[form.orderlist.length - 1]
  if (!last || last.code !== '') {
    form.orderlist.push(createEmptyCodeLine())
  }
}

function changeFee() {
  form.pointState = usePoint.value ? 0 : 1
  // 先按 0 积分算订单总额，再把可用积分封顶到不超过该总额
  form.point = 0
  recalcOrderTotals(form, false, true)
  if (usePoint.value) {
    const orderAmount = Number(
      (
        Number(form.svf || 0) +
        Number(form.total || 0) +
        Number(form.taxtotal || 0) +
        Number(form.yf || 0) +
        Number(form.ld || 0)
      ).toFixed(2),
    )
    form.point = Math.min(Number(availablePoint.value || 0), Math.max(0, orderAmount))
    recalcOrderTotals(form, false, true)
  }
}

function syncOrderPoint() {
  changeFee()
}

function applyUserPoint(user?: MerchantUserOption | null) {
  availablePoint.value = Number(user?.point ?? 0)
  syncOrderPoint()
}

function onUsePointChange() {
  syncOrderPoint()
}

function changePay() {
  if (Number(form.pay) === 3) {
    form.svf = calcMerchantCodSvf(form.total, fareList.value)
  } else {
    form.svf = 0
  }
  changeFee()
}

function makeData() {
  changeFee()
  changePay()
}

function setCodeInputRef(el: unknown, index: number) {
  if (el) {
    codeInputRefs.set(index, el as { focus: () => void })
    return
  }
  codeInputRefs.delete(index)
}

function setCountInputRef(el: unknown, index: number) {
  if (el) {
    countInputRefs.set(index, el as { focus: () => void })
    return
  }
  countInputRefs.delete(index)
}

function bindCodeInputRef(index: number) {
  return (el: unknown) => setCodeInputRef(el, index)
}

function bindCountInputRef(index: number) {
  return (el: unknown) => setCountInputRef(el, index)
}

function focusCountInputForRow(index: number) {
  nextTick(() => {
    countInputRefs.get(index)?.focus?.()
  })
}

function focusCodeInputForRow(index: number) {
  nextTick(() => {
    codeInputRefs.get(index)?.focus?.()
  })
}

function focusNextRowCode(currentIndex: number) {
  const next = currentIndex + 1
  if (next < form.orderlist.length) {
    focusCodeInputForRow(next)
  }
}

function resetFormState() {
  Object.assign(form, createEmptyOrderForm())
  form.orderlist = [createEmptyCodeLine()]
  userOptions.value = []
  userAddressList.value = []
  selectedUnameId.value = ''
  selectedUcodeId.value = ''
  availablePoint.value = 0
  usePoint.value = false
  formRef.value?.clearValidate()
}

function applyDefaultShtime() {
  const first = takeTimeOptions.value[0]
  if (!first) {
    return
  }
  form.shtime = Number(first.value)
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

watch(
  () => [props.visible, props.copyFromId] as const,
  async ([visible, copyFromId]) => {
    if (!visible) {
      return
    }
    // 先重置，再拉字典，避免 await 期间用户已点击却被 reset 清掉
    resetFormState()
    await ensureDictionaries()

    if (copyFromId) {
      loading.value = true
      try {
        const detail = await queryMerchantOrder(copyFromId)
        const copied = merchantDetailToCreateForm(detail)
        Object.assign(form, copied, {
          uid: detail.uid ?? 0,
          umail: '',
          mobile: '',
          pointState: 1,
          saleStatState: 0,
        })
        await hydrateOrderLineCodes(form.orderlist)
        if (detail.uid) {
          userOptions.value = [
            {
              id: detail.uid,
              uname: detail.uname ?? '',
              ucode: detail.ucode,
            },
          ]
          selectedUnameId.value = detail.uid
          selectedUcodeId.value = detail.uid
          await loadUserAddresses({ id: detail.uid, uname: detail.uname ?? '' }, false)
          if (detail.uname) {
            try {
              const users = await searchMerchantUserByUname(detail.uname)
              const matched = users.find((item) => item.id === detail.uid) ?? users[0]
              if (matched) {
                userOptions.value = [matched]
                applyUserPoint(matched)
              }
            } catch {
              applyUserPoint(null)
            }
          }
        }
        ensureEmptyCodeRow()
        makeData()
      } finally {
        loading.value = false
      }
    } else {
      applyDefaultShtime()
    }
  },
)

async function queryUserInfo(keyword: string) {
  if (!keyword) {
    userOptions.value = []
    return
  }
  userLoading.value = true
  try {
    userOptions.value = await searchMerchantUserByUname(keyword)
    if (!userOptions.value.length) {
      form.uname = ''
      selectedUnameId.value = ''
    }
  } finally {
    userLoading.value = false
  }
}

async function queryUserCodeInfo(keyword: string) {
  if (!keyword) {
    userOptions.value = []
    return
  }
  userLoading.value = true
  try {
    userOptions.value = await searchMerchantUserByUcode(keyword)
  } finally {
    userLoading.value = false
  }
}

async function loadUserAddresses(user: MerchantUserOption, applyDefault = true) {
  try {
    const addresses = await queryMerchantUserAddressesByUserId(user.id)
    userAddressList.value = addresses
    if (!applyDefault) {
      return
    }
    if (!addresses.length) {
      form.address = ''
      form.zip = ''
      form.city = ''
      form.name = ''
      form.addressid = ''
      makeData()
      return
    }
    let matched = false
    for (const item of addresses) {
      if (item.id === user.address) {
        form.address = formatMerchantOrderAddressText(item)
        form.zip = item.postcode
        form.city = item.city ?? ''
        form.name = item.receive
        form.addressid = item.id
        matched = true
        break
      }
    }
    if (!matched) {
      // 对齐旧版：无默认地址匹配时不自动选第一条
    }
    makeData()
  } catch {
    userAddressList.value = []
  }
}

async function unameChange(userId: number | string | '') {
  if (userId === '' || userId === null || userId === undefined) {
    form.uid = 0
    form.umail = ''
    form.mobile = ''
    form.wechat = ''
    form.name = ''
    form.phone = ''
    form.zip = ''
    form.city = ''
    form.address = ''
    form.addressid = ''
    form.uname = ''
    form.ucode = ''
    selectedUnameId.value = ''
    selectedUcodeId.value = ''
    userAddressList.value = []
    applyUserPoint(null)
    return
  }
  if (typeof userId === 'string' && Number.isNaN(Number(userId))) {
    form.uname = userId
    form.uid = 0
    selectedUnameId.value = ''
    applyUserPoint(null)
    return
  }
  const id = Number(userId)
  const user = userOptions.value.find((item) => item.id === id)
  if (!user) {
    return
  }
  selectedUnameId.value = id
  selectedUcodeId.value = id
  form.uid = id
  form.umail = user.umail ?? ''
  form.mobile = user.mobile ?? ''
  form.wechat = user.wechat ?? ''
  form.name = user.unick ?? ''
  form.phone = user.phone ?? ''
  form.uname = user.uname
  form.ucode = user.ucode ?? ''
  applyUserPoint(user)
  await loadUserAddresses(user, true)
}

async function ucodeChange(userId: number | string | '') {
  if (userId === '' || userId === null || userId === undefined) {
    return
  }
  if (typeof userId === 'string' && Number.isNaN(Number(userId))) {
    form.ucode = userId
    selectedUcodeId.value = ''
    return
  }
  const id = Number(userId)
  const user = userOptions.value.find((item) => item.id === id)
  if (!user) {
    return
  }
  selectedUcodeId.value = id
  await unameChange(user.id)
}

function userAddressChange(receive: string) {
  const address = userAddressList.value.find((item) => item.receive === receive)
  if (address) {
    form.address = formatMerchantOrderAddressText(address)
    form.addressid = address.id
    form.zip = address.postcode
  } else {
    form.addressid = ''
  }
}

function onAddressSelect(addressId: number | string | '') {
  if (addressId === '' || addressId === null || addressId === undefined) {
    return
  }
  // allow-create 时可能直接是地址字符串
  if (typeof addressId === 'string' && Number.isNaN(Number(addressId))) {
    form.address = addressId
    form.addressid = ''
    return
  }
  const address = userAddressList.value.find((item) => String(item.id) === String(addressId))
  if (address) {
    form.address = formatMerchantOrderAddressText(address)
    form.addressid = address.id
    form.zip = address.postcode
    form.city = address.city ?? ''
    form.name = address.receive
    if (address.phone) {
      form.phone = address.phone
    }
  }
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

function debouncedCodeChange(row: OrderFormLine, index: number) {
  if (codeChangeTimer.value) {
    clearTimeout(codeChangeTimer.value)
  }
  codeChangeTimer.value = setTimeout(() => {
    void lookupCommodityByCode(row, index)
  }, 500)
}

async function lookupCommodityByCode(row: OrderFormLine, index: number) {
  if (!row.code) {
    return
  }
  try {
    const result = await getMerchantCommodityByCode({
      code: row.code,
      userid: form.uid || '',
    })
    if (!result.length) {
      Object.assign(form.orderlist[index], createEmptyCodeLine())
      makeData()
      return
    }
    const data = result[0]
    form.orderlist[index] = {
      code: data.code,
      pid: data.id,
      title: data.title,
      count: 0,
      pident: '',
      price: data.price,
      total: 0,
      stock: data.total ?? 0,
      unit: data.unit,
      tax: data.tax ?? DEFAULT_ORDER_TAX_RATE,
      taxtype: data.taxtype ?? 0,
      sku: `YS${data.id}`,
      home: data.home ?? '',
    }
    const last = form.orderlist[form.orderlist.length - 1]
    if (last?.code !== '') {
      form.orderlist.push(createEmptyCodeLine())
    }
    makeData()
    focusCountInputForRow(index)
  } catch {
    Object.assign(form.orderlist[index], createEmptyCodeLine())
    makeData()
  }
}

function removeLine(index: number) {
  form.orderlist.splice(index, 1)
  ensureEmptyCodeRow()
  makeData()
}

function onCountChange() {
  makeData()
}

function closeDialog() {
  emit('update:visible', false)
}

function handleReset() {
  formRef.value?.resetFields()
  resetFormState()
}

async function handleSubmit() {
  try {
    await ElMessageBox.confirm('确定要保存吗？', '警告', { type: 'warning' })
  } catch {
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  const lines = form.orderlist.filter((line) => line.pid > 0)
  if (!lines.length) {
    ElMessage.warning('请至少添加一个商品')
    return
  }

  loading.value = true
  try {
    makeData()
    const operator = userStore.userInfo?.username ?? 'admin'
    const payload = prepareOrderSubmitPayload(
      { ...form, orderlist: lines },
      operator,
      {
        includeLc: false,
        useShtimeArray: false,
        includeTax: true,
      },
    )
    // 创建单禁止带旧 id，避免后端按已有主键落库/回写错单
    delete payload.id
    const orderId = await addMerchantOrder(payload)
    ElMessage.success('保存成功')
    handleReset()
    emit('success', orderId)
    closeDialog()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fareList.value = await searchFares({ usertype: 1 })
})

onUnmounted(() => {
  if (codeChangeTimer.value) {
    clearTimeout(codeChangeTimer.value)
  }
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="创建订单"
    width="80%"
    destroy-on-close
    :close-on-click-modal="false"
    class="merchant-order-create"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="jee-fk-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
      v-loading="loading"
    >
      <el-form-item label="订单状态" style="width: 50%" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio-button
            v-for="item in statusOptions"
            :key="String(item.value)"
            :value="Number(item.value)"
          >
            {{ item.display }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="支付方式" style="width: 50%" prop="pay">
        <el-radio-group v-model="form.pay" @change="makeData">
          <el-radio-button
            v-for="item in payOptions"
            :key="String(item.value)"
            :value="Number(item.value)"
          >
            {{ item.display }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="订单用户" style="width: 25%" prop="uname">
        <el-select
          v-model="selectedUnameId"
          filterable
          remote
          reserve-keyword
          allow-create
          placeholder="订单用户"
          :remote-method="queryUserInfo"
          :loading="userLoading"
          style="width: 100%"
          @change="unameChange"
        >
          <el-option
            v-for="item in userOptions"
            :key="item.id"
            :label="item.uname"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="订单用户CODE" style="width: 25%">
        <el-select
          v-model="selectedUcodeId"
          filterable
          remote
          reserve-keyword
          allow-create
          placeholder="订单用户CODE"
          :remote-method="queryUserCodeInfo"
          :loading="userLoading"
          style="width: 100%"
          @change="ucodeChange"
        >
          <el-option
            v-for="item in userOptions"
            :key="item.id"
            :label="`${item.ucode} 【${item.uname}】`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="微信号" style="width: 50%">
        <el-input v-model="form.wechat" placeholder="微信号" />
      </el-form-item>
      <el-form-item label="物流方式" style="width: 50%">
        <el-radio-group v-model="form.wuliu">
          <el-radio-button
            v-for="item in logisticsOptions"
            :key="String(item.value)"
            :value="Number(item.value)"
          >
            {{ item.display }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="物流单号" style="width: 50%">
        <el-input v-model="form.pi" placeholder="物流单号" />
      </el-form-item>
      <el-form-item label="收获时间段" style="width: 100%" prop="shtime">
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
      <el-form-item label="客户备注" style="width: 100%">
        <el-input
          v-model="form.memo"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 15 }"
          placeholder="请输入内容"
        />
      </el-form-item>
      <el-form-item label="收货人姓名" style="width: 50%" prop="name">
        <el-select
          v-model="form.name"
          filterable
          remote
          reserve-keyword
          allow-create
          placeholder="收货人姓名"
          :loading="userLoading"
          style="width: 100%"
          @change="userAddressChange"
        >
          <el-option
            v-for="item in userAddressList"
            :key="item.id"
            :label="item.receive"
            :value="item.receive"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="收货人电话" style="width: 50%">
        <el-input v-model="form.phone" placeholder="收货人电话" />
      </el-form-item>
      <el-form-item label="收货人邮编" style="width: 50%" prop="zip">
        <el-input v-model="form.zip" placeholder="收货人邮编" @blur="changePostcode" />
      </el-form-item>
      <el-form-item label="收货人地址" style="width: 50%" prop="address">
        <el-select
          v-model="form.address"
          filterable
          remote
          reserve-keyword
          allow-create
          placeholder="收货人地址"
          :loading="userLoading"
          style="width: 100%"
          @change="onAddressSelect"
        >
          <el-option
            v-for="item in userAddressList"
            :key="item.id"
            :label="formatMerchantOrderAddressText(item)"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="商品信息" class="title" />
      <el-form-item class="orderlist" style="width: 100%">
        <el-table :data="form.orderlist" style="width: 100%">
          <el-table-column label="序列号" width="64" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="商品编码" width="180">
            <template #default="{ row, $index }">
              <el-input
                :ref="bindCodeInputRef($index)"
                v-model="row.code"
                size="small"
                @input="debouncedCodeChange(row, $index)"
                @keyup.enter="focusCountInputForRow($index)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="商品名称" width="180" />
          <el-table-column prop="sku" label="商品编号" width="100" />
          <el-table-column prop="price" label="价格" width="180" />
          <el-table-column label="库存" width="100">
            <template #default="{ row }">{{ row.pid ? row.stock ?? '' : '' }}</template>
          </el-table-column>
          <el-table-column label="数量" width="200">
            <template #default="{ row, $index }">
              <el-input-number
                :ref="bindCountInputRef($index)"
                :key="row.pid"
                v-model="row.count"
                :max="row.stock ?? 9999"
                :min="0"
                size="small"
                :controls="false"
                @change="onCountChange"
                @keyup.enter="focusNextRowCode($index)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="{ row, $index }">
              <el-button
                v-if="row.pid !== 0"
                size="small"
                type="danger"
                @click="removeLine($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item>

      <el-form-item label="运费" style="width: 50%">
        <el-input-number
          v-model="form.yf"
          :min="0"
          placeholder="运费"
          :controls="false"
          @change="changeFee"
        />
      </el-form-item>
      <el-form-item label="保鲜(冷冻)" style="width: 50%">
        <el-input-number
          v-model="form.ld"
          :min="0"
          placeholder="保鲜(冷冻)"
          :controls="false"
          @change="changeFee"
        />
      </el-form-item>
      <el-form-item label="货到付款手续费" style="width: 50%">
        <el-input-number v-model="form.svf" :min="0" :controls="false" @change="changeFee" />
      </el-form-item>
      <el-form-item label="总金额" style="width: 50%">
        {{ formatMoneyJp(form.total) }}
      </el-form-item>
      <el-form-item label="税" style="width: 50%">
        {{ formatMoneyJp(form.taxtotal) }}
        <el-checkbox v-model="taxStateChecked" style="margin-left: 12px" @change="changeFee">
          含税
        </el-checkbox>
      </el-form-item>
      <el-form-item label="积分" style="width: 50%">
        -{{ formatMoneyJp(form.point) }}
        <el-checkbox
          v-model="usePoint"
          style="margin-left: 12px"
          :disabled="!availablePoint"
          @change="onUsePointChange"
        >
          使用积分
        </el-checkbox>
        <span v-if="availablePoint" class="point-available">
          （可用 {{ formatMoneyJp(availablePoint) }}）
        </span>
      </el-form-item>
      <el-form-item label="订单总金额" style="width: 50%">
        {{ formatMoneyJp(form.totalJp) }}
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleReset">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.jee-fk-form {
  display: flex;
  flex-wrap: wrap;

  :deep(.el-form-item) {
    margin-right: 0;
  }

  :deep(.title) {
    background-color: #e5e5e5;
    color: #fff;
    width: 100% !important;
    text-align: end;
    padding-right: 1rem;
  }

  :deep(.orderlist) {
    width: 100% !important;

    .el-form-item__content {
      margin-left: 0 !important;
      display: block;
      width: 100%;
    }
  }
}

.point-available {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
