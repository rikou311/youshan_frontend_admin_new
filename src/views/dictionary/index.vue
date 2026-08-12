<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules, TableInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addDictionary,
  deleteDictionary,
  queryDictionary,
  searchDictionaryNodes,
  updateDictionary,
  type DictionaryForm,
  type DictionaryItem,
} from '@/api/system'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { formatDictionary, getYesNoOptions } from '@/utils/dictionary'
import { unwrapArrayData } from '@/utils/legacy'
import { saveDictionary } from '@/utils/storage'

const searchForm = reactive({ display: '' })
const loading = ref(false)
const tableData = ref<DictionaryItem[]>([])
const tableRef = ref<TableInstance>()
const currentRow = ref<DictionaryItem | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const dialogTitle = ref('添加')
const formLoading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<DictionaryForm>({
  display: '',
  groupCode: '',
  value: '',
  moduleCode: '',
  sort: 1,
  active: '1',
  superId: '0',
})

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<DictionaryItem | null>(null)
const dictTick = ref(0)

const { buttons, hasButton } = usePageButtons()

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})

const rules: FormRules<DictionaryForm> = {
  display: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的显示值', trigger: 'blur' },
  ],
  groupCode: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的分组编码', trigger: 'blur' },
  ],
  moduleCode: [
    { required: true, min: 1, max: 40, message: '请输入1-40位的模块编码', trigger: 'blur' },
  ],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

function normalizeNodes(payload: unknown): DictionaryItem[] {
  return unwrapArrayData<Record<string, unknown>>(payload).map((item) => {
    const isLeafRaw = item.isLeaf ?? item.isleaf
    const isLeaf = Boolean(isLeafRaw === true || isLeafRaw === 1 || isLeafRaw === '1')
    return {
      ...(item as unknown as DictionaryItem),
      id: (item.id ?? '') as DictionaryItem['id'],
      display: String(item.display ?? ''),
      groupCode: String(item.groupCode ?? item.groupId ?? ''),
      value: item.value != null ? String(item.value) : '',
      hasChildren: !isLeaf,
      isLeaf,
    }
  })
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

function formatActive(value?: string | number | null) {
  void dictTick.value
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

async function loadRoot() {
  loading.value = true
  try {
    const data = await searchDictionaryNodes({
      superId: '0',
      display: searchForm.display || undefined,
    })
    tableData.value = normalizeNodes(data)
  } finally {
    loading.value = false
  }
}

function findNodeById(
  nodes: DictionaryItem[],
  id: DictionaryItem['id'],
): DictionaryItem | null {
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

function syncLazyTreeChildren(parentId: DictionaryItem['id'], children: DictionaryItem[]) {
  const table = tableRef.value as TableInstance & {
    store?: {
      states?: {
        lazyTreeNodeMap?: { value: Record<string, DictionaryItem[]> }
      }
    }
  }
  const map = table.store?.states?.lazyTreeNodeMap?.value
  if (map) {
    map[String(parentId)] = children
  }
}

function removeNodeFromTree(row: DictionaryItem) {
  const targetId = String(row.id)
  const parentId = row.superId != null ? String(row.superId) : '0'

  if (parentId === '0' || parentId === '') {
    tableData.value = tableData.value.filter((item) => String(item.id) !== targetId)
    return
  }

  const parent = findNodeById(tableData.value, parentId)
  const table = tableRef.value as TableInstance & {
    store?: {
      states?: {
        lazyTreeNodeMap?: { value: Record<string, DictionaryItem[]> }
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
  row: DictionaryItem,
  _treeNode: unknown,
  resolve: (data: DictionaryItem[]) => void,
) {
  try {
    const data = await searchDictionaryNodes({ superId: row.id })
    const children = normalizeNodes(data)
    row.children = children
    syncLazyTreeChildren(row.id, children)
    resolve(children)
  } catch {
    resolve([])
  }
}

function onRowClick(row: DictionaryItem) {
  currentRow.value = row
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    display: '',
    groupCode: '',
    value: '',
    moduleCode: '',
    sort: 1,
    active: '1',
    superId: '0',
  })
}

async function refreshParentChildren(parent: DictionaryItem) {
  const children = normalizeNodes(await searchDictionaryNodes({ superId: parent.id }))
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

function patchNodeFields(row: DictionaryItem, detail: DictionaryItem) {
  row.display = detail.display || row.display
  row.groupCode = detail.groupCode || detail.groupId || row.groupCode
  row.groupId = detail.groupId || row.groupId
  row.value = detail.value ?? row.value
  row.moduleCode = detail.moduleCode || row.moduleCode
  row.sort = detail.sort ?? row.sort
  row.active = detail.active ?? row.active
  tableData.value = [...tableData.value]
}

async function openAdd(parent?: DictionaryItem | null) {
  resetForm()
  dialogMode.value = 'add'
  dialogTitle.value = '添加'
  if (parent) {
    form.superId = String(parent.id)
    form.groupCode = parent.groupCode || parent.groupId || ''
    form.moduleCode = parent.moduleCode || ''
    currentRow.value = parent
  } else {
    form.superId = '0'
    currentRow.value = null
  }
  dialogVisible.value = true
}

async function openEdit(row: DictionaryItem) {
  resetForm()
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑'
  currentRow.value = row
  formLoading.value = true
  dialogVisible.value = true
  try {
    const detail = await queryDictionary(row.id)
    Object.assign(form, {
      id: detail.id,
      display: detail.display || '',
      groupCode: detail.groupCode || detail.groupId || '',
      value: detail.value || '',
      moduleCode: detail.moduleCode || '',
      sort: detail.sort ?? 1,
      active: String(detail.active ?? '1'),
      superId: detail.superId != null ? String(detail.superId) : '0',
    })
  } finally {
    formLoading.value = false
  }
}

async function openShow(row: DictionaryItem) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await queryDictionary(row.id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(row: DictionaryItem) {
  await ElMessageBox.confirm(`确认删除字典「${row.display}」吗？`, '删除', { type: 'warning' })
  await deleteDictionary(row.id)
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
    const parentId = String(form.superId ?? '0')
    const payload: DictionaryForm = {
      display: form.display,
      groupCode: form.groupCode,
      value: form.value,
      moduleCode: form.moduleCode,
      sort: Number(form.sort),
      active: Number(form.active),
      superId: parentId,
    }
    if (dialogMode.value === 'edit' && form.id != null && form.id !== '') {
      payload.id = form.id
    }

    if (dialogMode.value === 'add') {
      await addDictionary(payload)
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
      await updateDictionary(payload)
      ElMessage.success('更新成功')
      closeDialog()
      if (currentRow.value && form.id != null && String(currentRow.value.id) === String(form.id)) {
        const detail = await queryDictionary(form.id)
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
        <el-form-item label="显示名">
          <el-input
            v-model="searchForm.display"
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
        <el-table-column prop="display" label="显示" min-width="180" />
        <el-table-column prop="groupCode" label="分组编码" min-width="160" />
        <el-table-column prop="value" label="值" min-width="120" align="center" />
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
              <el-form-item label="字典名称" prop="display">
                <el-input v-model="form.display" placeholder="请输入字典名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分组编码" prop="groupCode">
                <el-input v-model="form.groupCode" placeholder="请输入分组编码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="值" prop="value">
                <el-input v-model="form.value" placeholder="请输入值" />
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
        <el-form v-if="showData" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="字典名称">{{ showData.display || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分组编码">
                {{ showData.groupCode || showData.groupId || '-' }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="叶子">
                {{ formatActive(showData.isLeaf ? 1 : 0) }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="值">{{ showData.value || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模块编码">{{ showData.moduleCode || '-' }}</el-form-item>
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
