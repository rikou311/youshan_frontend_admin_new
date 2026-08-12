<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules, TableInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addAuthority,
  deleteAuthority,
  queryAuthority,
  searchAuthorityNodes,
  updateAuthority,
  type AuthorityForm,
  type AuthorityItem,
} from '@/api/system'
import { getAllAccess, type AccessItem } from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import {
  formatDictionary,
  getDictionaryOptions,
  getYesNoOptions,
} from '@/utils/dictionary'
import { unwrapArrayData } from '@/utils/legacy'
import { saveDictionary } from '@/utils/storage'

const searchForm = reactive({ authName: '' })
const loading = ref(false)
const tableData = ref<AuthorityItem[]>([])
const tableRef = ref<TableInstance>()
const currentRow = ref<AuthorityItem | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const dialogTitle = ref('添加')
const formLoading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<AuthorityForm>({
  authName: '',
  path: '',
  icon: '',
  type: '',
  moduleCode: '',
  sort: 1,
  ispublic: '0',
  active: '1',
  superid: '0',
  resourceId: null,
})

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<AuthorityItem | null>(null)

const accessOptions = ref<AccessItem[]>([])
const dictTick = ref(0)

const { buttons, hasButton } = usePageButtons()

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})
const authorityTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('authority_type')
})

const rules: FormRules<AuthorityForm> = {
  authName: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的权限名称', trigger: 'blur' },
  ],
  path: [{ required: true, min: 1, max: 100, message: '请输入1-100位的路径', trigger: 'blur' }],
  icon: [{ required: true, min: 1, max: 40, message: '请输入1-40位的icon', trigger: 'blur' }],
  moduleCode: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的模块编码', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  ispublic: [{ required: true, message: '请选择是否为公共权限', trigger: 'change' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

function normalizeNodes(payload: unknown): AuthorityItem[] {
  return unwrapArrayData<Record<string, unknown>>(payload).map((item) => {
    const isLeafRaw = item.isLeaf ?? item.isleaf
    // 旧版：后端 isLeaf=true 表示叶子；表格 hasChildren 需要取反
    const isLeaf = Boolean(isLeafRaw === true || isLeafRaw === 1 || isLeafRaw === '1')
    return {
      ...(item as unknown as AuthorityItem),
      id: (item.id ?? '') as AuthorityItem['id'],
      authName: String(item.authName ?? ''),
      path: String(item.path ?? ''),
      hasChildren: !isLeaf,
      isLeaf,
    }
  })
}

async function ensureDictionaries() {
  const groups = ['authority_type', 'access_resources_type', 'yesno']
  try {
    const data = await queryDictionaryGroups(groups)
    groups.forEach((groupId) => {
      const values = data?.[groupId]
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

function formatActive(value?: string | number | null) {
  void dictTick.value
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

function formatAuthorityType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('authority_type', value) || String(value ?? '-')
}

function formatResourceType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('access_resources_type', value) || String(value ?? '-')
}

async function loadRoot() {
  loading.value = true
  try {
    const data = await searchAuthorityNodes({
      superid: '0',
      authName: searchForm.authName || undefined,
    })
    tableData.value = normalizeNodes(data)
  } finally {
    loading.value = false
  }
}

function findNodeById(
  nodes: AuthorityItem[],
  id: AuthorityItem['id'],
): AuthorityItem | null {
  const target = String(id)
  for (const node of nodes) {
    if (String(node.id) === target) {
      return node
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

function syncLazyTreeChildren(parentId: AuthorityItem['id'], children: AuthorityItem[]) {
  const table = tableRef.value as TableInstance & {
    store?: {
      states?: {
        lazyTreeNodeMap?: { value: Record<string, AuthorityItem[]> }
      }
    }
  }
  const map = table.store?.states?.lazyTreeNodeMap?.value
  if (map) {
    map[String(parentId)] = children
  }
}

function removeNodeFromTree(row: AuthorityItem) {
  const targetId = String(row.id)
  const parentId = row.superid != null ? String(row.superid) : '0'

  if (parentId === '0' || parentId === '') {
    tableData.value = tableData.value.filter((item) => String(item.id) !== targetId)
    return
  }

  const parent = findNodeById(tableData.value, parentId)
  const table = tableRef.value as TableInstance & {
    store?: {
      states?: {
        lazyTreeNodeMap?: { value: Record<string, AuthorityItem[]> }
      }
    }
  }
  const lazyMap = table.store?.states?.lazyTreeNodeMap?.value
  const cachedChildren = lazyMap?.[parentId]
  const sourceChildren = parent?.children ?? cachedChildren ?? []
  const nextChildren = sourceChildren.filter((item) => String(item.id) !== targetId)

  if (parent) {
    parent.children = nextChildren.length ? nextChildren : undefined
    parent.hasChildren = nextChildren.length > 0
    parent.isLeaf = nextChildren.length === 0
  }
  syncLazyTreeChildren(parentId, nextChildren)
  tableData.value = [...tableData.value]
}

async function loadChildren(
  row: AuthorityItem,
  _treeNode: unknown,
  resolve: (data: AuthorityItem[]) => void,
) {
  try {
    const data = await searchAuthorityNodes({ superid: row.id })
    const children = normalizeNodes(data)
    row.children = children
    syncLazyTreeChildren(row.id, children)
    resolve(children)
  } catch {
    resolve([])
  }
}

function onRowClick(row: AuthorityItem) {
  currentRow.value = row
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    authName: '',
    path: '',
    icon: '',
    type: '',
    moduleCode: '',
    sort: 1,
    ispublic: '0',
    active: '1',
    superid: '0',
    resourceId: null,
    resource: '',
    groupCode: '',
  })
}

async function loadAccessOptions() {
  try {
    accessOptions.value = unwrapArrayData<AccessItem>(await getAllAccess())
  } catch {
    accessOptions.value = []
  }
}

async function refreshParentChildren(parent: AuthorityItem) {
  const children = normalizeNodes(await searchAuthorityNodes({ superid: parent.id }))
  parent.children = children.length ? children : undefined
  parent.hasChildren = children.length > 0
  parent.isLeaf = children.length === 0
  syncLazyTreeChildren(parent.id, children)
  tableData.value = [...tableData.value]
  await nextTick()
  if (children.length) {
    tableRef.value?.toggleRowExpansion(parent, true)
  }
}

function patchNodeFields(row: AuthorityItem, detail: AuthorityItem) {
  row.authName = detail.authName || row.authName
  row.path = detail.path || row.path
  row.icon = detail.icon || row.icon
  row.type = detail.type ?? row.type
  row.moduleCode = detail.moduleCode || row.moduleCode
  row.sort = detail.sort ?? row.sort
  row.ispublic = detail.ispublic ?? row.ispublic
  row.active = detail.active ?? row.active
  row.resource = detail.resource || row.resource
  row.resourceId = detail.resourceId ?? row.resourceId
  row.groupCode = detail.groupCode || row.groupCode
  tableData.value = [...tableData.value]
}

async function openAdd(parent?: AuthorityItem | null) {
  resetForm()
  dialogMode.value = 'add'
  dialogTitle.value = '添加'
  if (parent) {
    form.superid = String(parent.id)
    form.groupCode = parent.groupCode || ''
    currentRow.value = parent
  } else {
    form.superid = '0'
    currentRow.value = null
  }
  await loadAccessOptions()
  dialogVisible.value = true
}

async function openEdit(row: AuthorityItem) {
  resetForm()
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑'
  currentRow.value = row
  formLoading.value = true
  dialogVisible.value = true
  try {
    await loadAccessOptions()
    const detail = await queryAuthority(row.id)
    Object.assign(form, {
      id: detail.id,
      authName: detail.authName || '',
      path: detail.path || '',
      icon: detail.icon || '',
      type: detail.type != null ? String(detail.type) : '',
      moduleCode: detail.moduleCode || '',
      sort: detail.sort ?? 1,
      ispublic: String(detail.ispublic ?? '0'),
      active: String(detail.active ?? '1'),
      superid: detail.superid != null ? String(detail.superid) : '0',
      resourceId: detail.resourceId ?? null,
      resource: detail.resource || '',
      groupCode: detail.groupCode || '',
    })
  } finally {
    formLoading.value = false
  }
}

async function openShow(row: AuthorityItem) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await queryAuthority(row.id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(row: AuthorityItem) {
  await ElMessageBox.confirm(`确认删除权限「${row.authName}」吗？`, '删除', { type: 'warning' })
  await deleteAuthority(row.id)
  removeNodeFromTree(row)
  if (currentRow.value && String(currentRow.value.id) === String(row.id)) {
    currentRow.value = null
  }
  await nextTick()
  ElMessage.success('删除成功')
}

function closeDialog() {
  dialogVisible.value = false
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  formLoading.value = true
  try {
    const parentId = String(form.superid ?? '0')
    const payload: AuthorityForm = {
      authName: form.authName,
      path: form.path,
      icon: form.icon,
      type: form.type,
      moduleCode: form.moduleCode,
      sort: Number(form.sort),
      ispublic: Number(form.ispublic),
      active: Number(form.active),
      superid: parentId,
      resourceId: form.resourceId,
      resource: form.resource,
      groupCode: form.groupCode,
    }
    if (dialogMode.value === 'edit' && form.id != null && form.id !== '') {
      payload.id = form.id
    }

    if (dialogMode.value === 'add') {
      await addAuthority(payload)
      ElMessage.success('新增成功')
      closeDialog()
      if (parentId === '0') {
        await loadRoot()
      } else {
        const parent =
          (currentRow.value && String(currentRow.value.id) === parentId
            ? currentRow.value
            : null) ?? findNodeById(tableData.value, parentId)
        if (parent) {
          await refreshParentChildren(parent)
        } else {
          await loadRoot()
        }
      }
    } else {
      await updateAuthority(payload)
      ElMessage.success('更新成功')
      closeDialog()
      if (currentRow.value && form.id != null && String(currentRow.value.id) === String(form.id)) {
        const detail = await queryAuthority(form.id)
        patchNodeFields(currentRow.value, detail)
      } else {
        await loadRoot()
      }
    }
  } finally {
    formLoading.value = false
  }
}

onMounted(async () => {
  await ensureDictionaries()
  await loadRoot()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="loadRoot">
        <el-form-item label="权限名称">
          <el-input
            v-model="searchForm.authName"
            clearable
            placeholder="输入资源名称"
            @keyup.enter="loadRoot"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="loadRoot">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openAdd(null)">
            {{ buttons.add?.authName ?? '新增' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        row-key="id"
        lazy
        :load="loadChildren"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        highlight-current-row
        @row-click="onRowClick"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="authName" label="权限名称" min-width="180" />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            {{ formatAuthorityType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路径" min-width="180" />
        <el-table-column prop="resource" label="访问资源" width="140" align="center" show-overflow-tooltip />
        <el-table-column label="访问资源类型" width="120" align="center">
          <template #default="{ row }">
            {{ formatResourceType(row.resourceType) }}
          </template>
        </el-table-column>
        <el-table-column label="公共" width="70" align="center">
          <template #default="{ row }">
            {{ formatActive(row.ispublic) }}
          </template>
        </el-table-column>
        <el-table-column prop="moduleCode" label="模块编码" width="110" align="center" />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="有效" width="70" align="center">
          <template #default="{ row }">
            {{ formatActive(row.active) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="default"
              link
              @click.stop="openShow(row)"
            >
              {{ buttons.query?.authName ?? '查看' }}
            </el-button>
            <el-button
              v-if="hasButton('add') || buttons.add"
              type="success"
              link
              @click.stop="openAdd(row)"
            >
              {{ buttons.add?.authName ?? '新增' }}
            </el-button>
            <el-button
              v-if="hasButton('update') || buttons.update"
              type="primary"
              link
              @click.stop="openEdit(row)"
            >
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
            <el-button
              v-if="hasButton('delete') || buttons.delete"
              type="danger"
              link
              @click.stop="handleDelete(row)"
            >
              {{ buttons.delete?.authName ?? '删除' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      destroy-on-close
      @close="closeDialog"
    >
      <el-skeleton :loading="formLoading && dialogMode === 'edit'" animated>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="权限名称" prop="authName">
                <el-input v-model="form.authName" placeholder="请输入权限名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="路径" prop="path">
                <el-input v-model="form.path" placeholder="请输入路径" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="icon图标" prop="icon">
                <el-input v-model="form.icon" placeholder="请输入icon图标" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="类型" prop="type">
                <el-select
                  v-model="form.type"
                  filterable
                  clearable
                  placeholder="请选择权限类型"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in authorityTypeOptions"
                    :key="String(item.value)"
                    :label="item.display"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="访问资源" prop="resourceId">
                <el-select
                  v-model="form.resourceId"
                  filterable
                  clearable
                  placeholder="请选择访问资源"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in accessOptions"
                    :key="String(item.id)"
                    :label="item.resourceName"
                    :value="item.id"
                  >
                    <span>{{ item.resourceName }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px">
                      {{ item.resource }}
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模块编码" prop="moduleCode">
                <el-input v-model="form.moduleCode" placeholder="请输入模块编码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序" prop="sort">
                <el-input v-model="form.sort" placeholder="请输入排序" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="公共" prop="ispublic">
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
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showVisible" title="查看" width="800px" destroy-on-close>
      <el-skeleton :loading="showLoading" animated>
        <el-form v-if="showData" label-width="110px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="权限名称">{{ showData.authName || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="icon图标">{{ showData.icon || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="类型">{{ formatAuthorityType(showData.type) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="路径">{{ showData.path || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="访问资源">{{ showData.resource || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="访问资源类型">
                {{ formatResourceType(showData.resourceType) }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模块编码">{{ showData.moduleCode || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="公共">{{ formatActive(showData.ispublic) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序">{{ showData.sort ?? '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="有效">{{ formatActive(showData.active) }}</el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-skeleton>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.biz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
