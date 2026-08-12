<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addClient,
  queryClient,
  updateClient,
  type ClientForm,
} from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  getDictionaryOptions,
  getOauth2AuthorityLevelOptions,
  getOauth2AuthorityOptions,
  getOauth2GrantTypeOptions,
  getYesNoOptions,
} from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  clientId?: string | number | null
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

const form = reactive<ClientForm>({
  clientId: '',
  secret: '',
  scope: '',
  authority: [],
  authorizedGrantType: [],
  authorityLevel: '',
  tokenValiditySeconds: '',
  refreshTokenSeconds: '',
  expireDate: '',
  mark: '',
  active: '1',
})

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})
const oauth2AuthorityOptions = computed(() => {
  void dictTick.value
  return getOauth2AuthorityOptions()
})
const oauth2GrantTypeOptions = computed(() => {
  void dictTick.value
  return getOauth2GrantTypeOptions()
})
const oauth2AuthorityLevelOptions = computed(() => {
  void dictTick.value
  return getOauth2AuthorityLevelOptions()
})

async function ensureClientDictionaries() {
  const groups = ['oauth2_authority', 'oauth2_grant_type', 'oauth2_authority_level', 'yesno']
  const missing = groups.filter((groupId) => !getDictionaryOptions(groupId).length)
  if (!missing.length) {
    return
  }
  try {
    const data = await queryDictionaryGroups(missing)
    Object.entries(data).forEach(([groupId, values]) => {
      saveDictionary(groupId, values)
    })
  } catch {
    // 使用内置兜底
  } finally {
    dictTick.value += 1
  }
}

const rules: FormRules<ClientForm> = {
  clientId: [
    {
      required: true,
      pattern: /^[a-zA-Z0-9_-]{3,50}$/,
      message: '请输入3-50位的客户端号(英文)',
      trigger: 'blur',
    },
  ],
  scope: [
    {
      required: true,
      pattern: /^[a-zA-Z0-9_-]{3,50}$/,
      message: '请输入3-50位的作用域(英文)',
      trigger: 'blur',
    },
  ],
  secret: [
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        if (!/^[a-zA-Z0-9_-]{3,200}$/.test(String(value))) {
          callback(new Error('请输入3-200位的密钥(英文)'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  authority: [{ required: true, message: '请选择权限', trigger: 'change' }],
  authorizedGrantType: [{ required: true, message: '请选择授权方式', trigger: 'change' }],
  tokenValiditySeconds: [
    {
      required: true,
      pattern: /^\d{1,5}$/,
      message: '请输入token失效时间',
      trigger: 'blur',
    },
  ],
  refreshTokenSeconds: [
    {
      required: true,
      pattern: /^\d{1,5}$/,
      message: '请输入刷新token时间',
      trigger: 'blur',
    },
  ],
  expireDate: [{ required: true, message: '请选择过期日期', trigger: 'change' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

function splitCsv(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map(String)
  }
  if (!value) {
    return []
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    clientId: '',
    secret: '',
    scope: '',
    authority: [],
    authorizedGrantType: [],
    authorityLevel: '',
    tokenValiditySeconds: '',
    refreshTokenSeconds: '',
    expireDate: '',
    mark: '',
    active: '1',
  })
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    formRef.value?.clearValidate()
    await ensureClientDictionaries()
    if (props.mode === 'edit' && props.clientId != null && props.clientId !== '') {
      loadingDetail.value = true
      try {
        const detail = await queryClient(props.clientId)
        Object.assign(form, {
          id: detail.id,
          clientId: detail.clientId || '',
          secret: '',
          scope: detail.scope || '',
          authority: splitCsv(detail.authority),
          authorizedGrantType: splitCsv(detail.authorizedGrantType),
          authorityLevel: detail.authorityLevel || '',
          tokenValiditySeconds: String(detail.tokenValiditySeconds ?? ''),
          refreshTokenSeconds: String(detail.refreshTokenSeconds ?? ''),
          expireDate: detail.expireDate || '',
          mark: detail.mark || '',
          active: String(detail.active ?? '1'),
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
    const payload: ClientForm = {
      ...form,
      authority: Array.isArray(form.authority) ? form.authority.join(',') : form.authority,
      authorizedGrantType: Array.isArray(form.authorizedGrantType)
        ? form.authorizedGrantType.join(',')
        : form.authorizedGrantType,
      active: Number(form.active),
    }
    if (props.mode === 'add') {
      await addClient(payload)
      ElMessage.success('新增成功')
    } else {
      await updateClient(payload)
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="client-form">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="客户端号(英文)" prop="clientId">
              <el-input
                v-model="form.clientId"
                placeholder="请输入客户端号(英文)"
                :readonly="mode === 'edit'"
                autocomplete="off"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密钥" prop="secret">
              <el-input v-model="form.secret" placeholder="请输入密钥" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="范围(英文)" prop="scope">
              <el-input v-model="form.scope" placeholder="请输入范围(英文)" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="权限" prop="authority">
              <el-select
                v-model="form.authority"
                multiple
                placeholder="请选择权限"
                style="width: 100%"
              >
                <el-option
                  v-for="item in oauth2AuthorityOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="String(item.value)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="授权方式" prop="authorizedGrantType">
              <el-select
                v-model="form.authorizedGrantType"
                multiple
                placeholder="请选择授权方式"
                style="width: 100%"
              >
                <el-option
                  v-for="item in oauth2GrantTypeOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="String(item.value)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="权限控制级别" prop="authorityLevel">
              <el-select
                v-model="form.authorityLevel"
                placeholder="请选择权限控制级别"
                style="width: 100%"
                clearable
              >
                <el-option
                  v-for="item in oauth2AuthorityLevelOptions"
                  :key="String(item.value)"
                  :label="item.display"
                  :value="String(item.value)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="token失效" prop="tokenValiditySeconds">
              <div class="client-form__inline">
                <el-input
                  v-model="form.tokenValiditySeconds"
                  placeholder="请输入token失效时间(秒)"
                  autocomplete="off"
                />
                <span>(小时)</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="刷新token失效" prop="refreshTokenSeconds">
              <div class="client-form__inline">
                <el-input
                  v-model="form.refreshTokenSeconds"
                  placeholder="请输入刷新token失效时间(秒)"
                  autocomplete="off"
                />
                <span>(小时)</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过期日期" prop="expireDate">
              <el-date-picker
                v-model="form.expireDate"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                placeholder="请选择过期日期"
                style="width: 100%"
                :editable="false"
              />
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
          <el-col :span="24">
            <el-form-item label="备注" prop="mark">
              <el-input
                v-model="form.mark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
                autocomplete="off"
              />
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

<style scoped lang="scss">
.client-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  &__inline {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
}
</style>
