<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addCashManagement,
  updateCashManagement,
  type CashManagementForm,
} from '@/api/cash'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: CashManagementForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const typeOptions = [
  { label: '入金', value: '0' },
  { label: '出金', value: '1' },
]

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<CashManagementForm>({
  mdate: '',
  week: undefined,
  amount: 0,
  type: '0',
  staff: '',
  content: '',
  remark: '',
})

const rules: FormRules<CashManagementForm> = {
  mdate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

function calcWeek(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const dayOfWeek = firstDay.getDay() || 7
  const offsetDate = date.getDate() + dayOfWeek - 1
  return Math.ceil(offsetDate / 7)
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
        : {
            id: undefined,
            mdate: '',
            week: undefined,
            amount: 0,
            type: '0',
            staff: '',
            content: '',
            remark: '',
          },
    )
  },
)

watch(
  () => form.mdate,
  (value) => {
    if (!value) {
      form.week = undefined
      return
    }
    form.week = calcWeek(value)
    form.month = new Date(value).getMonth() + 1
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
      await addCashManagement({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateCashManagement({ ...form })
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
    :title="mode === 'add' ? '添加现金记录' : '编辑现金记录'"
    width="720px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="日期" prop="mdate">
        <el-date-picker v-model="form.mdate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="周">
        <span>{{ form.week ? `第${form.week}周` : '-' }}</span>
      </el-form-item>
      <el-form-item label="金额" prop="amount">
        <el-input-number v-model="form.amount" :min="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="form.type" style="width: 100%">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="人员" prop="staff">
        <el-input v-model="form.staff" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
