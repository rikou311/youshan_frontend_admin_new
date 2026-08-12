<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  addInventoryAdvertise,
  updateInventoryAdvertise,
  type InventoryAdvertiseForm,
} from '@/api/inventory/advertise'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: InventoryAdvertiseForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)

const form = reactive<InventoryAdvertiseForm>({
  id: undefined,
  title: '',
  url: '',
  type: '',
  image: '',
  imagedel: [],
})

const advertiseTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('advertise_type')
})

const rules: FormRules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  image: [{ required: true, message: '请上传图片', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['advertise_type'])
    Object.entries(data || {}).forEach(([groupId, values]) => {
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

function resetFields() {
  Object.assign(form, {
    id: undefined,
    title: '',
    url: '',
    type: '',
    image: '',
    imagedel: [],
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, {
        id: props.model.id,
        title: props.model.title ?? '',
        url: props.model.url ?? '',
        type: props.model.type === undefined || props.model.type === null
          ? ''
          : String(props.model.type),
        image: props.model.image ?? '',
        imagedel: [],
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
      id: props.model.id,
      title: props.model.title ?? '',
      url: props.model.url ?? '',
      type: props.model.type === undefined || props.model.type === null
        ? ''
        : String(props.model.type),
      image: props.model.image ?? '',
      imagedel: [],
    })
  } else {
    resetFields()
  }
  formRef.value?.clearValidate()
}

function handleImageUpdate(value: string) {
  if (!value && form.image) {
    form.imagedel = [...(form.imagedel || []), form.image]
  }
  form.image = value
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    const payload: InventoryAdvertiseForm = {
      title: form.title,
      url: form.url,
      type: form.type,
      image: form.image,
      imagedel: form.imagedel?.length ? form.imagedel : undefined,
    }
    if (props.mode === 'add') {
      await addInventoryAdvertise(payload)
      ElMessage.success('保存成功')
    } else {
      await updateInventoryAdvertise({ ...payload, id: form.id })
      ElMessage.success('保存成功')
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
    :title="mode === 'add' ? '创建广告' : '更新广告'"
    width="80%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="advertise-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item :label="mode === 'add' ? '广告文字' : '内容'" prop="title" style="width: 80%">
        <el-input
          v-model="form.title"
          :placeholder="mode === 'add' ? '广告文字' : '内容'"
        />
      </el-form-item>
      <el-form-item label="链接地址" style="width: 80%">
        <el-input v-model="form.url" placeholder="链接地址" />
      </el-form-item>
      <el-form-item label="广告类型" prop="type" style="width: 70%">
        <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in advertiseTypeOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="mode === 'add' ? '广告图片' : '展示图片'"
        prop="image"
        style="width: 80%"
      >
        <ImageUploadField :model-value="form.image" @update:model-value="handleImageUpdate" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reset">重置</el-button>
      <el-button type="primary" :loading="loading" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.advertise-form {
  :deep(.el-select) {
    width: 100%;
  }
}
</style>
