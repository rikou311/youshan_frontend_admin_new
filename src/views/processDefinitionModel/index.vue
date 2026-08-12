<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addProcessDefinitionModel,
  deleteProcessDefinitionModel,
  getProcessDefinitionModelList,
  queryProcessDefinitionModel,
  updateProcessDefinitionModel,
  type ProcessDefinitionItem,
  type ProcessDefinitionModelForm,
} from '@/api/platform'
import BpmnModeler, { type BpmnSavePayload } from '@/components/workflow/BpmnModeler.vue'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { downloadBpmnXml, extractBpmnXml } from '@/utils/bpmn-xml'

const searchForm = reactive({ name: '' })
const viewVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref<ProcessDefinitionItem | null>(null)
const designerVisible = ref(false)
const designerLoading = ref(false)
const designerSaving = ref(false)
const designerMode = ref<'add' | 'edit'>('add')
const designerXml = ref('')
const editingId = ref<number | null>(null)
const editingRev = ref<number | undefined>()

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getProcessDefinitionModelList({ ...params, name: searchForm.name || undefined }),
    () => ({}),
  )

const viewXml = computed(() => extractBpmnXml(viewRecord.value?.modelData))
const designerTitle = computed(() => (designerMode.value === 'add' ? '新建流程模型' : '编辑流程模型'))

async function openView(row: ProcessDefinitionItem) {
  viewVisible.value = true
  viewLoading.value = true
  try {
    viewRecord.value = await queryProcessDefinitionModel(row.id)
  } finally {
    viewLoading.value = false
  }
}

function openAdd() {
  designerMode.value = 'add'
  editingId.value = null
  editingRev.value = undefined
  designerXml.value = ''
  designerVisible.value = true
}

async function openEdit(row: ProcessDefinitionItem) {
  designerMode.value = 'edit'
  editingId.value = row.id
  designerVisible.value = true
  designerLoading.value = true
  try {
    const detail = await queryProcessDefinitionModel(row.id)
    editingRev.value = detail.rev
    designerXml.value = extractBpmnXml(detail.modelData)
  } finally {
    designerLoading.value = false
  }
}

function handleDownloadXml(record: ProcessDefinitionItem | null) {
  const xml = extractBpmnXml(record?.modelData)
  if (!xml) {
    ElMessage.warning('当前模型没有可下载的 BPMN XML')
    return
  }
  downloadBpmnXml(xml, record?.key || record?.name || 'process')
}

async function handleSaveModel(payload: BpmnSavePayload) {
  if (!payload.process.id || !payload.process.name) {
    ElMessage.warning('请填写流程标识与流程名称')
    return
  }

  const form: ProcessDefinitionModelForm = {
    id: editingId.value ?? undefined,
    rev: editingRev.value,
    key: payload.process.id,
    name: payload.process.name,
    category: payload.process.category || '',
    description: payload.process.description || '',
    modelData: payload.xml,
  }

  designerSaving.value = true
  try {
    if (designerMode.value === 'add') {
      await addProcessDefinitionModel(form)
      ElMessage.success('新建成功')
    } else {
      await updateProcessDefinitionModel(form)
      ElMessage.success('保存成功')
    }
    designerVisible.value = false
    await fetchList()
  } finally {
    designerSaving.value = false
  }
}

async function handleDelete(row: ProcessDefinitionItem) {
  await ElMessageBox.confirm(`确认删除流程模型「${row.name}」吗？`, '删除', { type: 'warning' })
  await deleteProcessDefinitionModel(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="流程名称">
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
        <el-table-column label="流程图" width="120" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.thumbnail"
              class="process-model-page__thumb"
              fit="contain"
              :src="row.thumbnail"
              :preview-src-list="[row.thumbnail]"
              :alt="row.name"
            />
            <span v-else class="process-model-page__no-thumb">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="流程名称" min-width="160" />
        <el-table-column prop="key" label="流程 Key" min-width="140" />
        <el-table-column prop="category" label="分类" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="version" label="版本" width="80" align="center" />
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

    <el-dialog v-model="viewVisible" title="流程模型详情" width="88%" top="4vh" destroy-on-close>
      <div v-loading="viewLoading">
        <el-descriptions v-if="viewRecord" :column="2" border class="process-model-page__info">
          <el-descriptions-item label="ID">{{ viewRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ viewRecord.version }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ viewRecord.name }}</el-descriptions-item>
          <el-descriptions-item label="Key">{{ viewRecord.key }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ viewRecord.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ viewRecord.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="process-model-page__view-actions">
          <el-button @click="handleDownloadXml(viewRecord)">下载 XML</el-button>
        </div>
        <BpmnModeler v-if="viewXml" :xml="viewXml" :is-view="true" :height="520" />
        <el-image
          v-else-if="viewRecord?.thumbnail"
          class="process-model-page__preview"
          fit="contain"
          :src="viewRecord.thumbnail"
          :preview-src-list="[viewRecord.thumbnail]"
        />
        <el-empty v-else description="暂无 BPMN 模型数据" />
      </div>
    </el-dialog>

    <el-dialog
      v-model="designerVisible"
      :title="designerTitle"
      width="92%"
      top="2vh"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div v-loading="designerLoading || designerSaving">
        <BpmnModeler
          v-if="designerVisible && !designerLoading"
          :xml="designerXml"
          :height="'70vh'"
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

.process-model-page {
  &__thumb {
    width: 80px;
    height: 48px;
  }

  &__no-thumb {
    color: #c0c4cc;
  }

  &__preview {
    width: 100%;
    max-height: 320px;
    margin-top: 16px;
  }

  &__info {
    margin-bottom: 12px;
  }

  &__view-actions {
    margin: 12px 0;
  }
}
</style>
