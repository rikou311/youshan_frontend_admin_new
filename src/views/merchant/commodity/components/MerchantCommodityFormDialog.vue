<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addMerchantCommodity,
  updateMerchantCommodity,
  type MerchantCommodityForm,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import {
  createEmptyCommodityForm,
  parseCommodityArrays,
  prepareCommodityPayload,
  type CommodityFormBase,
} from '@/utils/commodity-form'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: MerchantCommodityForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const form = reactive<CommodityFormBase>(createEmptyCommodityForm())

const homeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('merchant_home_section_type')
})
const categoryOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('merchant_commodity_category_type')
})

const taxReduced = computed({
  get: () => Number(form.taxtype) === 0,
  set: (checked: boolean) => {
    form.taxtype = checked ? 0 : 1
  },
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  weight: [{ required: true, message: '请输入商品排序', trigger: 'blur' }],
  categoryArr: [{ required: true, message: '请选择商品分类', trigger: 'change', type: 'array' }],
  price: [{ required: true, message: '请输入当前售价', trigger: 'blur' }],
  priced: [{ required: true, message: '请输入市场售价', trigger: 'blur' }],
  total: [{ required: true, message: '请输入库存总量', trigger: 'blur' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups([
      'merchant_home_section_type',
      'merchant_commodity_category_type',
    ])
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

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    if (props.mode === 'edit' && props.model) {
      const arrays = parseCommodityArrays(props.model)
      Object.assign(form, createEmptyCommodityForm(), props.model, arrays, {
        total: Number(props.model.total ?? props.model.stock ?? 0),
        priced: Number(props.model.priced ?? props.model.price ?? 0),
        weight: Number(props.model.weight ?? 0),
        taxtype: props.model.taxtype ?? 1,
      })
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
    const payload = prepareCommodityPayload(form) as MerchantCommodityForm
    if (props.mode === 'add') {
      await addMerchantCommodity(payload)
      ElMessage.success('新增成功')
    } else {
      await updateMerchantCommodity(payload)
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
          <el-option
            v-for="item in categoryOptions"
            :key="item.value"
            :label="item.display"
            :value="item.value"
          />
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
          <el-form-item label="税费">
            <div class="tax-row">
              <el-input v-model="form.tax" style="width: 120px" />
              <el-checkbox v-model="taxReduced">軽減</el-checkbox>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="CODE">
            <el-input-number v-model="form.code" :min="0" style="width: 100%" />
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
      <el-form-item label="封面图片">
        <ImageUploadField v-model="form.image" tip="建议 261x183" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.tax-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
