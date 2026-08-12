<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addSysUser,
  getAllClients,
  getAllRoles,
  getCurrentOrganizationTree,
  getOrganizationList,
  getRoleList,
  querySysUser,
  updateSysUser,
  type ClientOption,
  type EntityId,
  type OrganizationItem,
  type RoleItem,
  type SysUserForm,
  type SysUserItem,
} from '@/api/system'
import { getClientList } from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import { getDictionaryOptions, getSexOptions, getYesNoOptions } from '@/utils/dictionary'
import { unwrapArrayData, unwrapTreeData } from '@/utils/legacy'
import {
  buildOrganizationTreeFromList,
  flattenOrganizationOptions,
  prepareOrganizationTreeFromApi,
} from '@/utils/organization-tree'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  userId?: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const loadingDetail = ref(false)
const roleOptions = ref<RoleItem[]>([])
const clientOptions = ref<ClientOption[]>([])
const organizationTree = ref<OrganizationItem[]>([])

const form = reactive<SysUserForm>({
  username: '',
  password: '',
  name: '',
  sex: 'MALE',
  mobile: '',
  email: '',
  avatar: '',
  expireDate: '',
  title: '',
  active: '1',
  roleId: undefined,
  clientId: undefined,
  organizationId: undefined,
})

const sexOptions = computed(() => getSexOptions())
const yesNoOptions = computed(() => getYesNoOptions())
const organizationOptions = computed(() => flattenOrganizationOptions(organizationTree.value))

function isMissingId(value: unknown) {
  return value === undefined || value === null || value === ''
}

function dedupeById<T extends { id: string | number }>(items: T[]) {
  const map = new Map<string, T>()
  items.forEach((item) => {
    map.set(String(item.id), item)
  })
  return [...map.values()]
}

function normalizeRoleOptions(raw: unknown): RoleItem[] {
  const items = unwrapArrayData<Record<string, unknown>>(raw)
    .map((item) => {
      const id = String(item.id ?? item.roleId ?? '')
      if (!id) {
        return null
      }
      const roleName = String(item.roleName ?? item.name ?? '')
      if (!roleName) {
        return null
      }
      const role: RoleItem = {
        id: id as EntityId,
        roleName,
        active: item.active != null ? Number(item.active) : null,
      }
      return role
    })
    .filter((item): item is RoleItem => item != null)
  return dedupeById(items)
}

function normalizeClientOptions(raw: unknown): ClientOption[] {
  const items = unwrapArrayData<Record<string, unknown>>(raw)
    .map((item) => {
      const id = String(item.id ?? '')
      if (!id) {
        return null
      }
      const option: ClientOption = {
        id: id as EntityId,
        clientId: String(item.clientId ?? item.clientName ?? id),
        clientName: item.clientName ? String(item.clientName) : undefined,
        active: item.active != null ? Number(item.active) : null,
      }
      return option
    })
    .filter((item): item is ClientOption => item != null)
  return dedupeById(items)
}

async function loadRoleOptions() {
  const merged: RoleItem[] = []
  try {
    merged.push(...normalizeRoleOptions(await getAllRoles()))
  } catch {
    // ignore
  }
  if (!merged.length) {
    try {
      const result = await getRoleList({ page: 1, pageSize: 500 })
      merged.push(...normalizeRoleOptions(result.list))
    } catch {
      // ignore
    }
  }
  return dedupeById(merged)
}

async function loadClientOptions() {
  const merged: ClientOption[] = []
  try {
    merged.push(...normalizeClientOptions(await getAllClients()))
  } catch {
    // ignore
  }
  try {
    const result = await getClientList({ page: 1, pageSize: 500 })
    merged.push(...normalizeClientOptions(result.list))
  } catch {
    // ignore
  }
  return dedupeById(merged)
}

function createRequiredIdRule(message: string) {
  return {
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      if (isMissingId(value)) {
        callback(new Error(message))
        return
      }
      callback()
    },
    trigger: 'change' as const,
  }
}

function normalizeFormIds() {
  form.organizationId = toFormId(form.organizationId)
  form.roleId = toFormId(form.roleId)
  form.clientId = toFormId(form.clientId)
}

function onOrganizationChange(value: unknown) {
  form.organizationId = toFormId(value)
  formRef.value?.validateField('organizationId').catch(() => undefined)
}

function onRoleChange(value: unknown) {
  form.roleId = toFormId(value)
  formRef.value?.validateField('roleId').catch(() => undefined)
}

function onClientChange(value: unknown) {
  form.clientId = toFormId(value)
  formRef.value?.validateField('clientId').catch(() => undefined)
}

function defaultSexValue() {
  return String(sexOptions.value[0]?.value ?? 'MALE')
}

function normalizeSexForForm(value?: string | number | null) {
  const raw = value != null && value !== '' ? String(value) : ''
  if (!raw) {
    return defaultSexValue()
  }
  const options = sexOptions.value
  if (options.some((item) => String(item.value) === raw)) {
    return raw
  }
  const upper = raw.toUpperCase()
  if (upper === 'MALE' || raw === '1' || raw === '男') {
    const male = options.find((item) => ['MALE', '1', 'male'].includes(String(item.value)))
    return male ? String(male.value) : defaultSexValue()
  }
  if (upper === 'FEMALE' || raw === '2' || raw === '女') {
    const female = options.find((item) => ['FEMALE', '2', 'female'].includes(String(item.value)))
    return female ? String(female.value) : defaultSexValue()
  }
  return raw
}

async function ensureUserDictionaries() {
  const needSex = !getDictionaryOptions('sex').length
  const needYesNo = !getDictionaryOptions('yes_no').length && !getDictionaryOptions('yesno').length
  if (!needSex && !needYesNo) {
    return
  }
  try {
    const data = await queryDictionaryGroups(['sex', 'yesno'])
    Object.entries(data).forEach(([groupId, values]) => {
      saveDictionary(groupId, values)
    })
  } catch {
    // 使用 getSexOptions / getYesNoOptions 内置兜底
  }
}

const rules = computed<FormRules<SysUserForm>>(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (props.mode === 'add') {
          if (!value) {
            callback(new Error('请输入密码'))
            return
          }
          if (String(value).length < 5 || String(value).length > 20) {
            callback(new Error('请输入5-20位的密码'))
            return
          }
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  expireDate: [{ required: true, message: '请选择过期时间', trigger: 'change' }],
  sex: [{ required: true, message: '请选择性别', trigger: 'change' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
  organizationId: [createRequiredIdRule('请选择组织')],
  clientId: [createRequiredIdRule('请选择客户端')],
  roleId: [createRequiredIdRule('请选择角色')],
}))

function toFormId(value: unknown): string | undefined {
  if (value === '' || value == null) {
    return undefined
  }
  return String(value)
}

function pickRoleId(detail: SysUserItem) {
  const direct = toFormId(detail.roleId ?? detail.role?.id)
  if (direct) {
    return direct
  }
  if (detail.roleName) {
    const matched = roleOptions.value.find((item) => item.roleName === detail.roleName)
    return matched ? String(matched.id) : undefined
  }
  return undefined
}

function pickOrganizationId(detail: SysUserItem) {
  const direct = toFormId(detail.organizationId ?? detail.organization?.id)
  if (direct) {
    return direct
  }
  const orgName = detail.organization?.name || detail.organization?.orgName
  if (!orgName) {
    return undefined
  }
  const findInTree = (nodes: OrganizationItem[]): string | undefined => {
    for (const node of nodes) {
      if (node.name === orgName || node.orgName === orgName) {
        return String(node.id)
      }
      const childId = node.children?.length ? findInTree(node.children) : undefined
      if (childId) {
        return childId
      }
    }
    return undefined
  }
  return findInTree(organizationTree.value)
}

function pickClientId(detail: SysUserItem) {
  return toFormId(detail.clientId)
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    username: '',
    password: '',
    name: '',
    sex: defaultSexValue(),
    mobile: '',
    email: '',
    avatar: '',
    expireDate: '',
    title: '',
    active: '1',
    roleId: undefined,
    clientId: undefined,
    organizationId: undefined,
  })
}

async function loadOrganizationTree() {
  try {
    const org = unwrapTreeData(await getCurrentOrganizationTree())
    const tree = prepareOrganizationTreeFromApi(org)
    if (tree.length) {
      return tree
    }
  } catch {
    // 回退到组织列表
  }

  try {
    const result = await getOrganizationList({ page: 1, pageSize: 500 })
    const tree = buildOrganizationTreeFromList(result.list)
    if (tree.length) {
      return tree
    }
  } catch {
    // ignore
  }

  return []
}

async function loadDictionaries() {
  await ensureUserDictionaries()
  const [roles, clients, orgTree] = await Promise.all([
    loadRoleOptions(),
    loadClientOptions(),
    loadOrganizationTree(),
  ])
  roleOptions.value = roles
  clientOptions.value = clients
  organizationTree.value = orgTree
  if (!orgTree.length) {
    ElMessage.warning('组织数据为空，请确认当前账号有组织权限')
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await loadDictionaries()
    if (props.mode === 'edit' && props.userId) {
      loadingDetail.value = true
      try {
        const detail = await querySysUser(props.userId)
        Object.assign(form, {
          id: detail.id,
          username: detail.username,
          password: '',
          name: detail.name || detail.realName || '',
          sex: normalizeSexForForm(detail.sex),
          mobile: detail.mobile || '',
          email: detail.email || '',
          avatar: detail.avatar || '',
          expireDate: detail.expireDate || '',
          title: detail.title || '',
          active: String(detail.active ?? '1'),
          roleId: pickRoleId(detail),
          clientId: pickClientId(detail),
          organizationId: pickOrganizationId(detail),
        })
      } finally {
        loadingDetail.value = false
      }
    } else {
      resetForm()
      form.sex = defaultSexValue()
    }
    formRef.value?.clearValidate()
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  normalizeFormIds()
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请完善表单信息')
    return
  }

  loading.value = true
  try {
    const payload: SysUserForm = {
      ...form,
      name: form.name,
      realName: form.name,
      active: Number(form.active),
      sex: String(form.sex),
      roleId: toFormId(form.roleId),
      clientId: toFormId(form.clientId),
      organizationId: toFormId(form.organizationId),
    }
    if (props.mode === 'edit' && !payload.password) {
      delete payload.password
    }
    if (props.mode === 'add') {
      await addSysUser(payload)
      ElMessage.success('新增成功')
    } else {
      await updateSysUser(payload)
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
    width="860px"
    destroy-on-close
    @close="closeDialog"
  >
    <el-skeleton :loading="loadingDetail" animated>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="sys-user-form">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="头像" prop="avatar">
              <ImageUploadField v-model="form.avatar" tip="建议正方形头像" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" :disabled="mode === 'edit'" autocomplete="off" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="mode === 'edit' ? '留空则不修改' : '请输入密码'"
              />
            </el-form-item>
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" />
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
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="sex">
              <el-radio-group v-model="form.sex">
                <el-radio
                  v-for="item in sexOptions"
                  :key="String(item.value)"
                  :value="String(item.value)"
                >
                  {{ item.display }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织" prop="organizationId" required>
              <el-select
                v-model="form.organizationId"
                filterable
                placeholder="请选择组织"
                style="width: 100%"
                @change="onOrganizationChange"
              >
                <el-option
                  v-for="item in organizationOptions"
                  :key="`org-${item.id}`"
                  :label="item.label"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户端" prop="clientId" required>
              <el-select
                v-model="form.clientId"
                placeholder="请选择客户端"
                style="width: 100%"
                @change="onClientChange"
              >
                <el-option
                  v-for="item in clientOptions"
                  :key="`client-${item.id}`"
                  :label="item.clientId"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId" required>
              <el-select
                v-model="form.roleId"
                placeholder="请选择角色"
                style="width: 100%"
                @change="onRoleChange"
              >
                <el-option
                  v-for="role in roleOptions"
                  :key="`role-${role.id}`"
                  :label="role.roleName"
                  :value="role.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职称" prop="title">
              <el-input v-model="form.title" placeholder="请输入职称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="mobile">
              <el-input v-model="form.mobile" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" />
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

<style scoped lang="scss">
.sys-user-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
