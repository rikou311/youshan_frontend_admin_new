<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addMerchantCommodityDis,
  queryMerchantCommodity,
  queryMerchantUser,
  searchMerchantCommodityByTitle,
  searchMerchantUserByUname,
  updateMerchantCommodityDis,
  type MerchantCommodityDisForm,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: MerchantCommodityDisForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const userLoading = ref(false)
const commodityLoading = ref(false)
const userOptions = ref<Array<{ label: string; value: number }>>([])
const commodityOptions = ref<Array<{ label: string; value: number }>>([])
const dictTick = ref(0)

const stateOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('merchant_user_state_type')
})

const form = reactive<MerchantCommodityDisForm>({
  userid: '',
  commodityid: '',
  price: 0,
  state: '',
})

const rules: FormRules<MerchantCommodityDisForm> = {
  userid: [{ required: true, message: '请选择用户', trigger: 'change' }],
  commodityid: [{ required: true, message: '请选择商品', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['merchant_user_state_type'])
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

async function loadEditOptions(model: MerchantCommodityDisForm) {
  if (model.userid) {
    const user = await queryMerchantUser(Number(model.userid))
    userOptions.value = [
      {
        label: (user as { uname?: string; username?: string }).uname ?? user.username ?? '',
        value: Number(model.userid),
      },
    ]
  }
  if (model.commodityid) {
    const commodity = await queryMerchantCommodity(Number(model.commodityid))
    commodityOptions.value = [{ label: commodity.title, value: Number(model.commodityid) }]
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    userOptions.value = []
    commodityOptions.value = []
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, props.model, {
        state: props.model.state != null && props.model.state !== '' ? String(props.model.state) : '',
      })
      await loadEditOptions(props.model)
    } else {
      Object.assign(form, { id: undefined, userid: '', commodityid: '', price: 0, state: '' })
    }
  },
)

async function remoteUser(query: string) {
  if (!query) {
    userOptions.value = []
    return
  }
  userLoading.value = true
  try {
    const rows = await searchMerchantUserByUname(query)
    userOptions.value = rows.map((item) => ({
      label: item.uname,
      value: item.id,
    }))
  } finally {
    userLoading.value = false
  }
}

async function remoteCommodity(query: string) {
  if (!query) {
    commodityOptions.value = []
    return
  }
  commodityLoading.value = true
  try {
    const rows = await searchMerchantCommodityByTitle(query)
    commodityOptions.value = rows.map((item) => ({
      label: item.title,
      value: item.id,
    }))
  } finally {
    commodityLoading.value = false
  }
}

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
      await addMerchantCommodityDis({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateMerchantCommodityDis({ ...form })
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
    :title="mode === 'add' ? '创建关联' : '更新关联'"
    width="720px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="用户名" prop="userid">
        <el-select
          v-model="form.userid"
          filterable
          remote
          reserve-keyword
          placeholder="请输入关键词"
          :remote-method="remoteUser"
          :loading="userLoading"
          style="width: 100%"
        >
          <el-option
            v-for="item in userOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="商品" prop="commodityid">
        <el-select
          v-model="form.commodityid"
          filterable
          remote
          reserve-keyword
          placeholder="请输入关键词"
          :remote-method="remoteCommodity"
          :loading="commodityLoading"
          style="width: 100%"
        >
          <el-option
            v-for="item in commodityOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="价格" prop="price">
        <el-input-number v-model="form.price" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="状态" prop="state">
        <el-select v-model="form.state" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in stateOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
