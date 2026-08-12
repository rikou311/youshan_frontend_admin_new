<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  addInventoryCategory,
  updateInventoryCategory,
  type InventoryCategoryForm,
} from '@/api/inventory/category'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: InventoryCategoryForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

/** 对齐旧版：kind → 产品类型字典组 */
const TYPE_DICT_BY_KIND = ['commodity_category_type', 'merchant_commodity_category_type'] as const

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const categoryTypeDisable = ref(true)

const form = reactive<InventoryCategoryForm>({
  id: undefined,
  title: '',
  url: '',
  titleen: '',
  kind: '',
  type: '',
  image: '',
  imagedel: [],
})

const categoryKindOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('category_kind_type')
})

const categoryTypeOptions = computed(() => {
  void dictTick.value
  const kindIndex = Number(form.kind)
  if (!Number.isFinite(kindIndex) || kindIndex < 0 || kindIndex >= TYPE_DICT_BY_KIND.length) {
    return []
  }
  return getDictionaryOptions(TYPE_DICT_BY_KIND[kindIndex])
})

const rules: FormRules = {
  kind: [{ required: true, message: '请选择类型', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  image: [{ required: true, message: '请上传图片', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups([
      'category_kind_type',
      'commodity_category_type',
      'merchant_commodity_category_type',
    ])
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
    titleen: '',
    kind: '',
    type: '',
    image: '',
    imagedel: [],
  })
  categoryTypeDisable.value = true
  formRef.value?.clearValidate()
}

function applyModel(model: InventoryCategoryForm) {
  Object.assign(form, {
    id: model.id,
    title: model.title ?? '',
    url: model.url ?? '',
    titleen: model.titleen ?? '',
    kind: model.kind === undefined || model.kind === null ? '' : String(model.kind),
    type: model.type === undefined || model.type === null ? '' : String(model.type),
    image: model.image ?? '',
    imagedel: [],
  })
  categoryTypeDisable.value = form.kind === ''
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    if (props.mode === 'edit' && props.model) {
      applyModel(props.model)
    } else {
      resetFields()
    }
  },
)

watch(
  () => form.kind,
  (kind, prev) => {
    if (kind === '' || kind === undefined || kind === null) {
      categoryTypeDisable.value = true
      return
    }
    categoryTypeDisable.value = false
    dictTick.value += 1
    // 切换类型分类时清空产品类型（编辑初次回填除外）
    if (prev !== undefined && String(prev) !== String(kind) && props.visible) {
      if (!(props.mode === 'edit' && prev === '' && form.type)) {
        form.type = ''
      }
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

function reset() {
  if (props.mode === 'edit' && props.model) {
    applyModel(props.model)
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
    const payload: InventoryCategoryForm = {
      title: form.title,
      url: form.url,
      titleen: form.titleen,
      kind: form.kind,
      type: form.type,
      image: form.image,
      imagedel: form.imagedel?.length ? form.imagedel : undefined,
    }
    if (props.mode === 'add') {
      await addInventoryCategory(payload)
      ElMessage.success('保存成功')
    } else {
      await updateInventoryCategory({ ...payload, id: form.id })
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
    :title="mode === 'add' ? '创建产品类型' : '更新产品类型'"
    width="80%"
    top="0"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      class="category-form"
      :model="form"
      :rules="rules"
      label-position="right"
      label-width="150px"
    >
      <el-form-item
        :label="mode === 'add' ? '类型文字' : '内容'"
        prop="title"
        style="width: 80%"
      >
        <el-input
          v-model="form.title"
          :placeholder="mode === 'add' ? '类型文字' : '内容'"
        />
      </el-form-item>
      <el-form-item label="链接地址" prop="url" style="width: 80%">
        <el-input v-model="form.url" placeholder="链接地址" />
      </el-form-item>
      <el-form-item label="标题" prop="titleen" style="width: 50%">
        <el-input v-model="form.titleen" placeholder="标题" />
      </el-form-item>
      <el-form-item label="类型分类" prop="kind" style="width: 70%">
        <el-select v-model="form.kind" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in categoryKindOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品类型" prop="type" style="width: 70%">
        <el-select
          v-model="form.type"
          placeholder="请选择"
          :disabled="categoryTypeDisable"
          style="width: 100%"
        >
          <el-option
            v-for="item in categoryTypeOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="mode === 'add' ? '图片' : '展示图片'"
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
.category-form {
  :deep(.el-select) {
    width: 100%;
  }
}
</style>
