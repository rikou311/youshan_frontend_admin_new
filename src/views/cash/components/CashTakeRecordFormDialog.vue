<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addCashTakeRecord, updateCashTakeRecord, type CashTakeRecordForm } from '@/api/cash'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: CashTakeRecordForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<CashTakeRecordForm>({
  takeTime: '',
  amount: 0,
  content: '',
})

const rules: FormRules<CashTakeRecordForm> = {
  takeTime: [{ required: true, message: '请选择日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    Object.assign(
      form,
      props.mode === 'edit' && props.model
        ? props.model
        : { id: undefined, takeTime: '', amount: 0, content: '' },
    )
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
      await addCashTakeRecord({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateCashTakeRecord({ ...form })
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
    :title="mode === 'add' ? '添加取金记录' : '编辑取金记录'"
    width="640px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="日期" prop="takeTime">
        <el-date-picker
          v-model="form.takeTime"
          type="date"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="金额" prop="amount">
        <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
