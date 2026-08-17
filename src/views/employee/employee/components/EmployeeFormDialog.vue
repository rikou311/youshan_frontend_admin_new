<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addEmployee, updateEmployee, type EmployeeForm } from '@/api/employee'

interface Props {
  visible: boolean
  mode?: 'add' | 'edit'
  model?: EmployeeForm | null
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
  model: null,
})

const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)

const employeeDefault: EmployeeForm = {
  name: '',
  startDate: '',
  empId: '',
  comprefaceSubjectId: '',
  basicGive: 0,
  hourlyWage: 0,
  rent: '',
  transportationExp: 0,
  overtime: '',
  specialAllowance: '',
  socialSecurity: '',
  createdAt: '',
  type: '0',
}

/** 表单内日期字段用 Date，对齐旧版 el-date-picker 无 value-format */
const form = reactive({
  ...employeeDefault,
  startDate: null as Date | null,
  createdAt: null as Date | null,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  startDate: [{ required: true, message: '请选择入社日', trigger: 'change' }],
  empId: [{ required: true, message: '请输入员工ID', trigger: 'blur' }],
  createdAt: [{ required: true, message: '请选择创建时间', trigger: 'change' }],
}

const dialogTitle = computed(() => (props.mode === 'add' ? '创建员工' : '修改员工信息'))
const isEdit = computed(() => props.mode === 'edit')

const typeChecked = computed({
  get: () => String(form.type) === '1',
  set: (val: boolean) => {
    form.type = val ? '1' : '0'
  },
})

/** 对齐旧版：后端字符串 / 时间戳 → Date，供 datetime 选择器回显 */
function toPickerDate(value?: string | number | Date | null): Date | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const raw = String(value).trim()
  if (!raw) {
    return null
  }
  if (/^\d+$/.test(raw)) {
    const multiplier = raw.length > 10 ? 1 : 1000
    const date = new Date(Number(raw) * multiplier)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(raw.includes('T') || raw.includes(' ') ? raw : `${raw}T00:00:00`)
  if (!Number.isNaN(date.getTime())) {
    return date
  }
  const fallback = new Date(raw.replace('T', ' ').replace(/-/g, '/'))
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** 对齐旧版保存：Date → ISO 字符串（与 axios 序列化 Date 一致） */
function toSaveDate(value: Date | string | null | undefined) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  const date = toPickerDate(value)
  return date ? date.toISOString() : String(value)
}

function fillForm(source: EmployeeForm | Record<string, unknown>) {
  Object.assign(form, {
    ...employeeDefault,
    ...source,
    startDate: toPickerDate((source as EmployeeForm).startDate),
    createdAt: toPickerDate((source as EmployeeForm).createdAt),
    type:
      (source as EmployeeForm).type === undefined || (source as EmployeeForm).type === null
        ? '0'
        : String((source as EmployeeForm).type),
  })
}

function resetToEmpty(withNow = false) {
  Object.assign(form, {
    ...employeeDefault,
    id: undefined,
    startDate: null,
    createdAt: withNow ? new Date() : null,
  })
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    if (props.mode === 'add' || !props.model) {
      resetToEmpty(true)
      formRef.value?.clearValidate()
      return
    }
    fillForm(JSON.parse(JSON.stringify(props.model)) as EmployeeForm)
  },
)

function closeDialog() {
  emit('update:visible', false)
}

/** 员工ID变更时：照片ID为空或仍是 emp_ 自动值则同步（编辑时照片ID锁定，不同步） */
function onEmpIdChange() {
  if (isEdit.value) {
    return
  }
  const empId = String(form.empId || '').trim()
  const photoId = String(form.comprefaceSubjectId || '').trim()
  if (!empId) {
    return
  }
  if (!photoId || /^emp_/.test(photoId)) {
    form.comprefaceSubjectId = `emp_${empId}`
  }
}

function reset() {
  formRef.value?.resetFields()
  if (props.mode === 'edit' && props.model) {
    fillForm(JSON.parse(JSON.stringify(props.model)) as EmployeeForm)
  } else {
    resetToEmpty(true)
  }
}

function buildPayload(): EmployeeForm {
  const photoId =
    String(form.comprefaceSubjectId || '').trim() ||
    (form.empId ? `emp_${form.empId}` : '')
  return {
    ...(props.mode === 'edit' && form.id ? { id: form.id } : {}),
    name: form.name,
    empId: form.empId,
    comprefaceSubjectId: photoId,
    basicGive: form.basicGive,
    hourlyWage: form.hourlyWage,
    rent: form.rent,
    transportationExp: form.transportationExp,
    overtime: form.overtime,
    specialAllowance: form.specialAllowance,
    socialSecurity: form.socialSecurity,
    type: form.type,
    startDate: toSaveDate(form.startDate),
    createdAt: toSaveDate(form.createdAt),
  }
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    const payload = buildPayload()
    if (props.mode === 'add') {
      await addEmployee(payload)
    } else {
      await updateEmployee(payload)
    }
    ElMessage.success('保存成功')
    emit('success')
    closeDialog()
  } catch {
    // 错误文案已由 request 拦截器弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="70%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="employee-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item label="员工姓名" prop="name" style="width: 80%">
        <el-input v-model="form.name" placeholder="请输入员工姓名" />
      </el-form-item>
      <el-form-item label="入社日" prop="startDate" style="width: 80%">
        <el-date-picker
          v-model="form.startDate"
          type="datetime"
          placeholder="请选择入社日"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="员工ID" prop="empId" style="width: 80%">
        <el-input
          v-model="form.empId"
          placeholder="请输入员工ID"
          @change="onEmpIdChange"
        />
      </el-form-item>
      <el-form-item label="照片ID" prop="comprefaceSubjectId" style="width: 80%">
        <el-input
          v-model="form.comprefaceSubjectId"
          placeholder="请输入照片ID，默认 emp_员工ID"
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="基本給" prop="basicGive" style="width: 80%">
        <el-input-number v-model="form.basicGive" placeholder="请输入基本給" style="width: 100%" />
      </el-form-item>
      <el-form-item label="時給" prop="hourlyWage" style="width: 80%">
        <el-input-number v-model="form.hourlyWage" placeholder="请输入時給" style="width: 100%" />
      </el-form-item>
      <el-form-item label="家賃" prop="rent" style="width: 80%">
        <el-input v-model="form.rent" placeholder="请输入家賃" />
      </el-form-item>
      <el-form-item label="交通費" prop="transportationExp" style="width: 80%">
        <el-input-number
          v-model="form.transportationExp"
          :min="0"
          placeholder="请输入交通費"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="残業" prop="overtime" style="width: 80%">
        <el-input v-model="form.overtime" placeholder="请输入残業" />
      </el-form-item>
      <el-form-item label="特別手当" prop="specialAllowance" style="width: 80%">
        <el-input v-model="form.specialAllowance" placeholder="请输入特別手当" />
      </el-form-item>
      <el-form-item label="社会保険" prop="socialSecurity" style="width: 80%">
        <el-input v-model="form.socialSecurity" placeholder="社会保険" />
      </el-form-item>
      <el-form-item label="创建时间" prop="createdAt" style="width: 80%">
        <el-date-picker
          v-model="form.createdAt"
          type="datetime"
          placeholder="请选择创建时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="类型" prop="type" style="width: 80%">
        <el-checkbox v-model="typeChecked">特殊</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reset">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.employee-form {
  :deep(.el-input-number) {
    width: 100%;
  }
}
</style>
