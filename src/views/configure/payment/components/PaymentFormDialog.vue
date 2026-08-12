<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addPayment, updatePayment, type PaymentForm } from '@/api/configure'
import { queryDictionaryGroups } from '@/api/dictionary'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import { getYesNoOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: PaymentForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const form = reactive<PaymentForm>({
  title: '',
  image: '',
  demoimage: '',
  demomemo: '',
  state: '1',
})

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})

const rules: FormRules<PaymentForm> = {
  title: [{ required: true, message: '请输入支付名称', trigger: 'blur' }],
  state: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['yesno'])
    if (Array.isArray(data?.yesno) && data.yesno.length) {
      saveDictionary('yesno', data.yesno)
    }
  } catch {
    // ignore
  } finally {
    dictTick.value += 1
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    Object.assign(
      form,
      props.mode === 'edit' && props.model
        ? {
            ...props.model,
            image: props.model.image ?? '',
            demoimage: props.model.demoimage ?? '',
            demomemo: props.model.demomemo ?? '',
            state: String(props.model.state ?? '1'),
          }
        : {
            id: undefined,
            title: '',
            image: '',
            demoimage: '',
            demomemo: '',
            state: '1',
          },
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
    const payload: PaymentForm = {
      ...form,
      state: Number(form.state),
    }
    if (props.mode === 'add') {
      await addPayment(payload)
      ElMessage.success('新增成功')
    } else {
      await updatePayment(payload)
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
    :title="mode === 'add' ? '创建支付方式' : '更新支付方式'"
    width="70%"
    destroy-on-close
    @close="closeDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="150px" class="payment-form">
      <el-form-item label="支付名称" prop="title">
        <el-input v-model="form.title" placeholder="支付名称" />
      </el-form-item>
      <el-form-item label="展示图片" prop="image">
        <ImageUploadField v-model="form.image" />
      </el-form-item>
      <el-form-item label="Demo" prop="demoimage">
        <ImageUploadField v-model="form.demoimage" />
      </el-form-item>
      <el-form-item label="提示语" prop="demomemo">
        <el-input v-model="form.demomemo" placeholder="提示语" />
      </el-form-item>
      <el-form-item label="有效" prop="state">
        <el-radio-group v-model="form.state">
          <el-radio
            v-for="item in yesNoOptions"
            :key="String(item.value)"
            :value="String(item.value)"
          >
            {{ item.display }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.payment-form {
  max-width: 720px;
}
</style>
