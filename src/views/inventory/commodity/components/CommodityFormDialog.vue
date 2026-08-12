<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addInventoryCommodity,
  updateInventoryCommodity,
  type InventoryCommodityForm,
} from '@/api/inventory/commodity'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import {
  createEmptyCommodityForm,
  parseCommodityArrays,
  prepareCommodityPayload,
  type CommodityFormBase,
} from '@/utils/commodity-form'
import { getDictionaryOptions } from '@/utils/dictionary'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: InventoryCommodityForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<CommodityFormBase>(createEmptyCommodityForm())
const homeOptions = getDictionaryOptions('home_section_type')
const categoryParentOptions = getDictionaryOptions('commodity_category_type_p')
const categoryOptions = getDictionaryOptions('commodity_category_type')

const categoryGroups = computed(() => {
  if (!categoryParentOptions.length) {
    return [
      {
        label: '分类',
        options: categoryOptions.map((item) => ({
          label: item.display,
          value: item.value,
        })),
      },
    ]
  }
  return categoryParentOptions.map((parent) => ({
    label: parent.display,
    options: categoryOptions
      .filter((item) => String(item.value).startsWith(String(parent.value)))
      .map((item) => ({ label: item.display, value: item.value })),
  }))
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  weight: [{ required: true, message: '请输入商品排序', trigger: 'blur' }],
  categoryArr: [{ required: true, message: '请选择商品分类', trigger: 'change', type: 'array' }],
  limittime: [{ required: true, message: '请选择赏味期限', trigger: 'change' }],
  price: [{ required: true, message: '请输入当前售价', trigger: 'blur' }],
  priced: [{ required: true, message: '请输入市场售价', trigger: 'blur' }],
  total: [{ required: true, message: '请输入库存总量', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    if (props.mode === 'edit' && props.model) {
      const arrays = parseCommodityArrays(props.model)
      Object.assign(form, createEmptyCommodityForm(), props.model, arrays)
    } else {
      Object.assign(form, createEmptyCommodityForm())
    }
    formRef.value?.clearValidate()
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
    const payload = prepareCommodityPayload(form) as InventoryCommodityForm
    if (props.mode === 'add') {
      await addInventoryCommodity(payload)
      ElMessage.success('新增成功')
    } else {
      await updateInventoryCommodity(payload)
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
    :title="mode === 'add' ? '新增商品' : '更新商品'"
    width="860px"
    top="3vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="商品名称" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="商品排序" prop="weight">
        <el-input-number v-model="form.weight" :min="0" style="width: 220px" />
      </el-form-item>
      <el-form-item label="首页板块">
        <el-checkbox-group v-model="form.homeArr">
          <el-checkbox
            v-for="item in homeOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.display }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="商品分类" prop="categoryArr">
        <el-select v-model="form.categoryArr" multiple filterable style="width: 100%">
          <el-option-group
            v-for="group in categoryGroups"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="item in group.options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="储藏方式">
            <el-input v-model="form.special" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="商品品牌">
            <el-input v-model="form.brand" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="产品口味">
            <el-input v-model="form.vender" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="产品重量">
            <el-input v-model="form.pid" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="赏味期限" prop="limittime">
            <el-date-picker
              v-model="form.limittime"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="税费">
            <el-input v-model="form.tax" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="当前售价" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="市场售价" prop="priced">
            <el-input-number v-model="form.priced" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="商品单位">
            <el-input v-model="form.unit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="库存总量" prop="total">
            <el-input-number v-model="form.total" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="卖点信息">
        <el-input v-model="form.summary" />
      </el-form-item>
      <el-form-item label="商品详情">
        <RichTextEditor v-model="form.content" :height="320" placeholder="请输入商品详情" />
      </el-form-item>
      <el-form-item label="专项服务">
        <RichTextEditor v-model="form.serviceview" :height="240" placeholder="请输入专项服务说明" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="广告图片">
            <ImageUploadField v-model="form.banner" tip="建议 390x200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="封面图片">
            <ImageUploadField v-model="form.image" tip="建议 261x183" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="展示图1">
            <ImageUploadField v-model="form.image1" tip="建议 800x800" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="展示图2">
            <ImageUploadField v-model="form.image2" tip="建议 800x800" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="展示图3">
            <ImageUploadField v-model="form.image3" tip="建议 800x800" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="展示图4">
            <ImageUploadField v-model="form.image4" tip="建议 800x800" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="展示图5">
            <ImageUploadField v-model="form.image5" tip="建议 800x800" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
