<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { updateGoodsQuantity, type GoodsQuantityForm } from '@/api/stock'

interface Props {
  visible: boolean
  model?: GoodsQuantityForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<GoodsQuantityForm>({
  id: undefined,
  quantity: 0,
  goodsId: '',
  rawFoodView: {
    id: '',
    title: '',
  },
})

const rules: FormRules = {
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    quantity: 0,
    goodsId: '',
    rawFoodView: {
      id: '',
      title: '',
    },
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    if (!props.model) {
      resetForm()
      return
    }
    Object.assign(form, {
      id: props.model.id,
      quantity: Number(props.model.quantity) || 0,
      goodsId: props.model.goodsId ?? props.model.rawFoodView?.id ?? '',
      rawFoodView: {
        id: props.model.rawFoodView?.id ?? '',
        title: props.model.rawFoodView?.title ?? '',
        price: props.model.rawFoodView?.price,
      },
    })
  },
)

function closeDialog() {
  emit('update:visible', false)
  resetForm()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    await updateGoodsQuantity({
      ...form,
      goodsId: form.rawFoodView?.id ?? form.goodsId,
      quantity: form.quantity,
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
    title="编辑"
    width="80%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="goods-quantity-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item label="商品">
        <span>{{ form.rawFoodView?.title || '-' }}</span>
      </el-form-item>
      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="form.quantity" placeholder="数量" :min="0" :max="1000000000" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.goods-quantity-form {
  :deep(.el-input-number) {
    width: 220px;
  }
}
</style>
