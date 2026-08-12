<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addCashList, updateCashList, type CashListForm } from '@/api/cash'
import { formatMoneyJp } from '@/utils/format'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: CashListForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<CashListForm>({
  amount: 0,
  quantity: 1,
  beforequantity: 1,
})

const totalAmount = computed(() => Number(form.amount || 0) * Number(form.quantity || 0))

const rules: FormRules<CashListForm> = {
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入个数', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, {
        ...props.model,
        // 对齐旧版：打开编辑时把更新前个数设为当前个数
        beforequantity: props.model.quantity,
      })
    } else {
      Object.assign(form, { id: undefined, amount: 0, quantity: 1, beforequantity: 1 })
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    if (props.mode === 'add') {
      await addCashList({ ...form, beforequantity: form.quantity })
      ElMessage.success('新增成功')
    } else {
      await updateCashList({ ...form })
      ElMessage.success('更新成功')
    }
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
    :title="mode === 'add' ? '添加现金List' : '编辑现金List'"
    width="640px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="金额" prop="amount">
        <el-input-number v-model="form.amount" :min="1" :disabled="Boolean(form.id)" style="width: 100%" />
      </el-form-item>
      <el-form-item label="个数" prop="quantity">
        <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="更新前个数">
        <el-input-number
          v-model="form.beforequantity"
          :min="1"
          :disabled="Boolean(form.id)"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="总额">
        <span>{{ formatMoneyJp(totalAmount) }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
