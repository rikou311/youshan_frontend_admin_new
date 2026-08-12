<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateCashList, type CashListForm, type CashListItem } from '@/api/cash'
import { formatMoneyJp } from '@/utils/format'

interface Props {
  visible: boolean
  model?: CashListItem | null
  /** 0=增加 1=减少 */
  typeC: number
}

const props = withDefaults(defineProps<Props>(), {
  model: null,
  typeC: 0,
})

const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const quantity = ref(1)
const form = reactive<CashListForm>({
  amount: 0,
  quantity: 0,
  beforequantity: 0,
})

const rules: FormRules = {
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
}

const dialogTitle = () => (props.typeC === 0 ? '增加' : '减少')

watch(
  () => props.visible,
  (visible) => {
    if (!visible || !props.model) {
      return
    }
    quantity.value = 1
    Object.assign(form, {
      id: props.model.id,
      amount: props.model.amount,
      quantity: props.model.quantity,
      beforequantity: props.model.beforequantity,
    })
  },
)

function closeDialog() {
  emit('update:visible', false)
}

function resetData() {
  quantity.value = 1
}

async function handleSubmit() {
  if (!form.id) {
    closeDialog()
    return
  }
  if (props.typeC === 1 && Number(form.quantity) < quantity.value) {
    ElMessage.error('不能大于原个数')
    return
  }
  try {
    await ElMessageBox.confirm('确认提交吗?', '确认', { type: 'warning' })
  } catch {
    return
  }
  loading.value = true
  try {
    const beforequantity = Number(form.quantity)
    const nextQuantity =
      props.typeC === 0 ? beforequantity + quantity.value : beforequantity - quantity.value
    await updateCashList({
      id: form.id,
      amount: Number(form.amount),
      quantity: nextQuantity,
      beforequantity,
    })
    ElMessage.success('更新成功')
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
    :title="dialogTitle()"
    width="720px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="金额" prop="amount">
        <el-input-number v-model="form.amount" :min="1" disabled style="width: 100%" />
      </el-form-item>
      <el-form-item label="原个数">
        <span>{{ form.quantity }}{{ typeC === 0 ? ' + ' : ' - ' }}{{ quantity }}</span>
      </el-form-item>
      <el-form-item label="个数">
        <el-input-number v-model="quantity" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="总额">
        <span>
          {{ formatMoneyJp(Number(form.amount) * Number(form.quantity)) }}
          =>
          {{
            formatMoneyJp(
              Number(form.amount) *
                (typeC === 0 ? Number(form.quantity) + quantity : Number(form.quantity) - quantity),
            )
          }}
        </span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="resetData">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
