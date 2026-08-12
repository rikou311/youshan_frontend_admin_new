<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  updateMerchantRefund,
  type MerchantRefundForm,
  type MerchantRefundItem,
  type MerchantRefundLine,
} from '@/api/merchant'
import { useUserStore } from '@/stores/user'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatMoneyJp } from '@/utils/format'
import { merchantOrderDataToLines } from '@/utils/merchant-order'

interface Props {
  visible: boolean
  model?: MerchantRefundItem | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const loading = ref(false)
const stateOptions = getDictionaryOptions('refunder_state')

const form = reactive<MerchantRefundForm>({
  state: 1,
  total: 0,
  refunded: 0,
  orderlist: [],
})

const canEditRefunded = computed(() => [1, 2, 4].includes(Number(form.state)))

function parseLines(row: MerchantRefundItem): MerchantRefundLine[] {
  if (row.orderlist?.length) {
    return row.orderlist
  }
  if (!row.data) {
    return []
  }
  return merchantOrderDataToLines(row.data).map((line) => ({
    title: line.title,
    price: line.price,
    count: line.count,
    unit: line.unit,
    tax: line.tax,
    taxtype: line.taxtype,
    total: line.total,
  }))
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible || !props.model) {
      return
    }
    const row = props.model
    Object.assign(form, {
      rid: row.rid ?? row.id,
      id: row.id ?? row.rid,
      oid: row.oid,
      uname: row.uname ?? row.name,
      state: Number(row.state ?? row.status ?? 1),
      total: Number(row.total ?? 0),
      refunded: Number(row.refunded ?? 0),
      rate: Number(row.rate ?? 1),
      updater: row.updater,
      updatetime: row.updatetime,
      createtime: row.createtime,
      memo: row.memo,
      data: row.data,
      orderlist: parseLines(row),
    })
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  loading.value = true
  try {
    await updateMerchantRefund({
      ...form,
      updater: userStore.userInfo?.username ?? form.updater ?? 'admin',
    })
    ElMessage.success('保存成功')
    emit('success')
    closeDialog()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="退款详情"
    width="860px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions :column="2" border>
      <el-descriptions-item label="ID">{{ form.rid ?? form.id }}</el-descriptions-item>
      <el-descriptions-item label="订单号">{{ form.oid }}</el-descriptions-item>
      <el-descriptions-item label="用户名">{{ form.uname }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ form.updater || '-' }}</el-descriptions-item>
      <el-descriptions-item label="总额">
        {{ formatMoneyJp(form.total) }}
        <span v-if="form.rate && form.rate !== 1">
          （约 {{ formatMoneyJp(form.total * form.rate) }}）
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="备注">{{ form.memo || '-' }}</el-descriptions-item>
    </el-descriptions>

    <el-table :data="form.orderlist ?? []" stripe class="refund-dialog__table">
      <el-table-column prop="title" label="商品名称" min-width="160" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }">{{ formatMoneyJp(row.price) }}</template>
      </el-table-column>
      <el-table-column prop="count" label="数量" width="80" />
      <el-table-column prop="unit" label="单位" width="80" />
      <el-table-column label="税费" width="80">
        <template #default="{ row }">{{ row.tax ?? 0 }}%</template>
      </el-table-column>
      <el-table-column label="税类" width="80">
        <template #default="{ row }">{{ row.taxtype === 0 ? '軽減' : '' }}</template>
      </el-table-column>
      <el-table-column label="总额" width="100">
        <template #default="{ row }">{{ formatMoneyJp(row.total) }}</template>
      </el-table-column>
    </el-table>

    <el-form label-width="140px" class="refund-dialog__form">
      <el-form-item label="已退款金额（円）">
        <el-input-number
          v-model="form.refunded"
          :min="0"
          :max="form.total"
          :disabled="!canEditRefunded"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.state" style="width: 240px">
          <el-option
            v-for="item in stateOptions"
            :key="item.value"
            :label="item.display"
            :value="Number(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="当前状态">
        {{ formatDictionary('refunder_state', form.state) }}
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.refund-dialog {
  &__table {
    margin-top: 16px;
  }

  &__form {
    margin-top: 16px;
  }
}
</style>
