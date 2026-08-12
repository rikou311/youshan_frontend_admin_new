<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addRawFood, updateRawFood, type RawFoodForm } from '@/api/stock'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: RawFoodForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<{
  id: number | string
  title: string
  price: number
  weight?: string | number
}>({
  id: '',
  title: '',
  price: 0,
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入商品名', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
}

function toPrice(value?: number | string | null) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function resetFields() {
  Object.assign(form, {
    id: '',
    title: '',
    price: 0,
    weight: undefined,
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, {
        id: props.model.id ?? '',
        title: props.model.title ?? '',
        price: toPrice(props.model.price),
        weight: props.model.weight,
      })
    } else {
      resetFields()
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

function reset() {
  if (props.mode === 'edit' && props.model) {
    Object.assign(form, {
      id: props.model.id ?? '',
      title: props.model.title ?? '',
      price: toPrice(props.model.price),
      weight: props.model.weight,
    })
  } else {
    resetFields()
  }
  formRef.value?.clearValidate()
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    const payload: RawFoodForm = {
      title: form.title,
      price: form.price,
    }
    if (props.mode === 'add' || form.id === '' || form.id === undefined || form.id === null) {
      await addRawFood(payload)
      ElMessage.success('新增成功')
    } else {
      await updateRawFood({ ...payload, id: form.id })
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
    :title="mode === 'add' ? '添加商品' : '编辑商品'"
    width="80%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="raw-food-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item label="商品名" prop="title">
        <el-input v-model="form.title" placeholder="商品名" />
      </el-form-item>
      <el-form-item label="价格" prop="price">
        <el-input-number v-model="form.price" placeholder="价格" :min="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reset">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.raw-food-form {
  :deep(.el-input-number) {
    width: 220px;
  }
}
</style>
