<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  addAttendanceRecord,
  getEmployeeList,
  type AttendanceRecordForm,
  type EmployeeItem,
} from '@/api/employee'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const loadingEmp = ref(false)
const empOptions = ref<EmployeeItem[]>([])
const dictTick = ref(0)

const form = reactive<AttendanceRecordForm>({
  id: undefined,
  empId: '',
  type: '',
  createdAt: null as unknown as string,
  similarity: 1,
})

const checkinOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('employee_checkin')
})

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['employee_checkin'])
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

const rules: FormRules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  type: [{ required: true, message: '请选择状态', trigger: 'change' }],
  createdAt: [{ required: true, message: '请选择创建时间', trigger: 'change' }],
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    empId: '',
    type: '',
    createdAt: new Date(),
    similarity: 1,
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    resetForm()
    void loadEmployees('')
  },
)

async function loadEmployees(query: string) {
  loadingEmp.value = true
  try {
    const result = await getEmployeeList({
      page: 1,
      pageSize: 1000,
      name: query || undefined,
    })
    empOptions.value = result.list
  } finally {
    loadingEmp.value = false
  }
}

function closeDialog() {
  emit('update:visible', false)
}

function reset() {
  formRef.value?.resetFields()
  form.createdAt = new Date() as unknown as string
  form.similarity = 1
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    const createdAt =
      form.createdAt instanceof Date
        ? form.createdAt.toISOString()
        : form.createdAt
          ? new Date(form.createdAt as string).toISOString()
          : new Date().toISOString()
    await addAttendanceRecord({
      empId: form.empId,
      type: form.type,
      createdAt,
      similarity: form.similarity ?? 1,
    })
    ElMessage.success('保存成功')
    emit('success')
    closeDialog()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void ensureDictionaries()
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="创建考勤记录"
    width="70%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="attendance-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item label="创建时间" prop="createdAt" style="width: 80%">
        <el-date-picker
          v-model="form.createdAt"
          type="datetime"
          placeholder="请选择创建时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="员工" prop="empId" style="width: 80%">
        <el-select
          v-model="form.empId"
          filterable
          clearable
          remote
          reserve-keyword
          :remote-method="loadEmployees"
          :loading="loadingEmp"
          placeholder="请选择或搜索员工"
          style="width: 100%"
        >
          <el-option
            v-for="item in empOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="type" style="width: 80%">
        <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in checkinOptions"
            :key="item.value"
            :label="item.display"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reset">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.attendance-form {
  :deep(.el-select) {
    width: 100%;
  }
}
</style>
