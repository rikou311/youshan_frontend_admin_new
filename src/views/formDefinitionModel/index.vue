<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addFormDefinitionModel,
  deleteFormDefinitionModel,
  getFormDefinitionModelList,
  queryFormDefinitionModel,
  updateFormDefinitionModel,
  type FormDefinitionModelForm,
  type ProcessDefinitionItem,
} from '@/api/platform'
import FormDesigner from '@/components/workflow/FormDesigner.vue'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import {
  parseFormModelData,
  serializeFormOptions,
  type FormDesignOptions,
} from '@/utils/form-design'

const searchForm = reactive({ name: '' })
const viewVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref<ProcessDefinitionItem | null>(null)
const designerVisible = ref(false)
const designerLoading = ref(false)
const designerSaving = ref(false)
const designerMode = ref<'add' | 'edit'>('add')
const designerModel = ref<string | Record<string, unknown> | null>(null)
const editingId = ref<number | null>(null)
const editingRev = ref<number | undefined>()

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getFormDefinitionModelList({ ...params, name: searchForm.name || undefined }),
    () => ({}),
  )

const modelDataPreview = computed(() => {
  const raw = viewRecord.value?.modelData
  if (!raw) {
    return ''
  }
  if (typeof raw === 'string') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }
  return JSON.stringify(raw, null, 2)
})

const designerTitle = computed(() =>
  designerMode.value === 'add' ? '新建表单模型' : '编辑表单模型',
)

function versionText(row: ProcessDefinitionItem) {
  return row.rev ?? row.version ?? '-'
}

async function openView(row: ProcessDefinitionItem) {
  viewLoading.value = true
  viewVisible.value = true
  try {
    viewRecord.value = await queryFormDefinitionModel(row.id)
  } finally {
    viewLoading.value = false
  }
}

function openAdd() {
  designerMode.value = 'add'
  editingId.value = null
  editingRev.value = undefined
  designerModel.value = null
  designerVisible.value = true
}

async function openEdit(row: ProcessDefinitionItem) {
  designerMode.value = 'edit'
  editingId.value = row.id
  designerVisible.value = true
  designerLoading.value = true
  try {
    const detail = await queryFormDefinitionModel(row.id)
    editingRev.value = detail.rev
    designerModel.value =
      typeof detail.modelData === 'string'
        ? detail.modelData
        : (detail.modelData as Record<string, unknown> | null)
  } finally {
    designerLoading.value = false
  }
}

async function handleSaveModel(options: FormDesignOptions) {
  const form: FormDefinitionModelForm = {
    id: editingId.value ?? undefined,
    rev: editingRev.value,
    name: options.name || '',
    key: options.key || '',
    description: options.description || '',
    modelData: serializeFormOptions(options),
  }

  designerSaving.value = true
  try {
    if (designerMode.value === 'add') {
      await addFormDefinitionModel(form)
      ElMessage.success('新建成功')
    } else {
      await updateFormDefinitionModel(form)
      ElMessage.success('保存成功')
    }
    designerVisible.value = false
    await fetchList()
  } finally {
    designerSaving.value = false
  }
}

async function handleDelete(row: ProcessDefinitionItem) {
  await ElMessageBox.confirm(`确认删除表单模型「${row.name}」吗？`, '删除', { type: 'warning' })
  await deleteFormDefinitionModel(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

function fieldCount(row: ProcessDefinitionItem) {
  return parseFormModelData(row.modelData as string | Record<string, unknown> | null).column.length
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="表单名称">
          <el-input v-model="searchForm.name" clearable />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index')" type="primary" @click="handleSearch">
            {{ buttons.index?.authName || '查询' }}
          </el-button>
          <el-button v-if="hasButton('add')" type="success" @click="openAdd">
            {{ buttons.add?.authName || '新建' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="name" label="表单名称" min-width="160" />
        <el-table-column prop="key" label="表单 Key" min-width="140" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="字段数" width="90" align="center">
          <template #default="{ row }">{{ fieldCount(row) }}</template>
        </el-table-column>
        <el-table-column label="版本" width="80" align="center">
          <template #default="{ row }">{{ versionText(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="hasButton('query')" type="primary" link @click="openView(row)">
              {{ buttons.query?.authName || '查看' }}
            </el-button>
            <el-button v-if="hasButton('update')" type="primary" link @click="openEdit(row)">
              {{ buttons.update?.authName || '编辑' }}
            </el-button>
            <el-button v-if="hasButton('delete')" type="danger" link @click="handleDelete(row)">
              {{ buttons.delete?.authName || '删除' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="biz-page__pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="viewVisible" title="表单模型详情" width="760px">
      <div v-loading="viewLoading">
        <el-descriptions v-if="viewRecord" :column="1" border>
          <el-descriptions-item label="ID">{{ viewRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ viewRecord.name }}</el-descriptions-item>
          <el-descriptions-item label="Key">{{ viewRecord.key }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ versionText(viewRecord) }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ viewRecord.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="modelDataPreview" class="form-model-page__json">
          <div class="form-model-page__json-title">表单结构 (modelData)</div>
          <el-scrollbar max-height="360px">
            <pre class="form-model-page__json-content">{{ modelDataPreview }}</pre>
          </el-scrollbar>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="designerVisible"
      :title="designerTitle"
      width="94%"
      top="2vh"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div v-loading="designerLoading || designerSaving">
        <FormDesigner
          v-if="designerVisible && !designerLoading"
          :model-value="designerModel"
          height="72vh"
          @save="handleSaveModel"
        />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.biz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.form-model-page {
  &__json {
    margin-top: 16px;
  }

  &__json-title {
    margin-bottom: 8px;
    color: #606266;
    font-size: 14px;
  }

  &__json-content {
    margin: 0;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
