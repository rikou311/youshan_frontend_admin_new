<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addAccess, queryAccess, updateAccess, type AccessForm } from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  getAccessResourcesTypeOptions,
  getDictionaryOptions,
  getOauth2AuthorityOptions,
  getYesNoOptions,
} from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  accessId?: string | number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const loadingDetail = ref(false)
const dictTick = ref(0)

const form = reactive<AccessForm>({
  resourceName: '',
  resource: '',
  type: 'uri',
  method: '',
  moduleCode: '',
  sort: 1,
  ispublic: '0',
  active: '1',
  authority: '',
})

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})
const resourceTypeOptions = computed(() => {
  void dictTick.value
  return getAccessResourcesTypeOptions()
})
const requestTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('request_type')
})
const oauth2AuthorityOptions = computed(() => {
  void dictTick.value
  return getOauth2AuthorityOptions()
})

const rules: FormRules<AccessForm> = {
  resourceName: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的资源名称', trigger: 'blur' },
  ],
  resource: [
    { required: true, min: 1, max: 100, message: '请输入1-100位的资源值', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  method: [{ required: true, message: '请选择请求类型', trigger: 'change' }],
  authority: [{ required: true, message: '请选择权限', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  ispublic: [{ required: true, message: '请选择是否为公共资源', trigger: 'change' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

async function ensureAccessDictionaries() {
  // 与旧版一致：始终用后端字典覆盖本地缓存，避免错误 mock/旧缓存残留
  const groups = ['access_resources_type', 'request_type', 'oauth2_authority', 'yesno']
  try {
    const data = await queryDictionaryGroups(groups)
    groups.forEach((groupId) => {
      const values = data?.[groupId]
      if (Array.isArray(values) && values.length) {
        saveDictionary(groupId, values)
      }
    })
  } catch {
    // 使用内置兜底
  } finally {
    dictTick.value += 1
  }
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    resourceName: '',
    resource: '',
    type: resourceTypeOptions.value[0]?.value ?? 'uri',
    method: '',
    moduleCode: '',
    sort: 1,
    ispublic: '0',
    active: '1',
    authority: '',
  })
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    formRef.value?.clearValidate()
    await ensureAccessDictionaries()
    if (props.mode === 'edit' && props.accessId != null && props.accessId !== '') {
      loadingDetail.value = true
      try {
        const detail = await queryAccess(props.accessId)
        Object.assign(form, {
          id: detail.id,
          resourceName: detail.resourceName || '',
          resource: detail.resource || '',
          type: detail.type ?? resourceTypeOptions.value[0]?.value ?? 'uri',
          method: detail.method ?? '',
          moduleCode: detail.moduleCode || '',
          sort: Number(detail.sort ?? 1),
          ispublic: String(detail.ispublic ?? '0'),
          active: String(detail.active ?? '1'),
          authority: detail.authority ?? '',
        })
      } finally {
        loadingDetail.value = false
      }
    } else {
      resetForm()
    }
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
    const payload: AccessForm = {
      ...form,
      type: String(form.type),
      method: String(form.method),
      authority: String(form.authority),
      sort: Number(form.sort),
      ispublic: Number(form.ispublic),
      active: Number(form.active),
    }
    if (props.mode === 'add') {
      await addAccess(payload)
      ElMessage.success('新增成功')
    } else {
      await updateAccess(payload)
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
    :title="mode === 'add' ? '添加' : '编辑'"
    width="800px"
    destroy-on-close
    @close="closeDialog"
  >
    <el-skeleton :loading="loadingDetail" animated>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="资源名称" prop="resourceName">
              <el-input v-model="form.resourceName" placeholder="请输入资源名" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资源值" prop="resource">
              <el-input v-model="form.resource" placeholder="请输入资源值" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资源类型" prop="type">
              <el-select
                v-model="form.type"
                filterable
                clearable
                placeholder="请选择资源类型"
                style="width: 100%"
              >
                <el-option
                  v-for="item in resourceTypeOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="请求类型" prop="method">
              <el-select
                v-model="form.method"
                filterable
                clearable
                placeholder="请选择请求类型"
                style="width: 100%"
              >
                <el-option
                  v-for="item in requestTypeOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="权限" prop="authority">
              <el-select
                v-model="form.authority"
                filterable
                clearable
                placeholder="请选择权限"
                style="width: 100%"
              >
                <el-option
                  v-for="item in oauth2AuthorityOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模块编码" prop="moduleCode">
              <el-input v-model="form.moduleCode" placeholder="请输入模块编码" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input v-model="form.sort" placeholder="请输入排序" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公共权限" prop="ispublic">
              <el-radio-group v-model="form.ispublic">
                <el-radio
                  v-for="item in yesNoOptions"
                  :key="String(item.value)"
                  :value="String(item.value)"
                >
                  {{ item.display }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效" prop="active">
              <el-radio-group v-model="form.active">
                <el-radio
                  v-for="item in yesNoOptions"
                  :key="String(item.value)"
                  :value="String(item.value)"
                >
                  {{ item.display }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-skeleton>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
