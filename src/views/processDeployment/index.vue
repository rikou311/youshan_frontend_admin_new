<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  activateProcessDeployment,
  deployProcessDeployment,
  getProcessDeploymentList,
  queryProcessDeployment,
  removeProcessDeployment,
  suspendProcessDeployment,
  type ProcessDefinitionItem,
} from '@/api/platform'
import WorkflowFileDeployDialog from '@/components/workflow/WorkflowFileDeployDialog.vue'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'

const searchForm = reactive({ name: '' })
const viewVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref<ProcessDefinitionItem | null>(null)
const deployVisible = ref(false)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getProcessDeploymentList({ ...params, name: searchForm.name || undefined }),
    () => ({}),
  )

function suspensionLabel(state?: number) {
  if (state === 1) {
    return '已激活'
  }
  if (state === 2) {
    return '已挂起'
  }
  return '-'
}

async function openView(row: ProcessDefinitionItem) {
  viewLoading.value = true
  viewVisible.value = true
  try {
    viewRecord.value = await queryProcessDeployment(row.id)
  } finally {
    viewLoading.value = false
  }
}

async function handleSuspend(row: ProcessDefinitionItem) {
  await ElMessageBox.confirm(`确认挂起流程「${row.name}」吗？`, '挂起', { type: 'warning' })
  await suspendProcessDeployment(row.id)
  ElMessage.success('挂起成功')
  await fetchList()
}

async function handleActivate(row: ProcessDefinitionItem) {
  await ElMessageBox.confirm(`确认激活流程「${row.name}」吗？`, '激活', { type: 'warning' })
  await activateProcessDeployment(row.id)
  ElMessage.success('激活成功')
  await fetchList()
}

async function handleDelete(row: ProcessDefinitionItem) {
  await ElMessageBox.confirm(`确认删除部署「${row.name}」吗？`, '删除', { type: 'warning' })
  const deleteId = row.deploymentId ?? row.id
  await removeProcessDeployment(deleteId)
  ElMessage.success('删除成功')
  await fetchList()
}

function openDeploy() {
  deployVisible.value = true
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
          <el-button v-if="hasButton('deployment')" type="success" @click="openDeploy">
            {{ buttons.deployment?.authName || '部署' }}
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
              class="process-deployment-page__thumb"
              fit="contain"
              :src="row.thumbnail"
              :preview-src-list="[row.thumbnail]"
              :alt="row.name"
            />
            <span v-else class="process-deployment-page__no-thumb">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="key" label="流程 Key" min-width="140" />
        <el-table-column prop="name" label="流程名称" min-width="160" />
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column prop="category" label="类别" min-width="120" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.suspensionState === 1 ? 'success' : 'info'" size="small">
              {{ suspensionLabel(row.suspensionState) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="hasButton('query')" type="primary" link @click="openView(row)">
              {{ buttons.query?.authName || '查看' }}
            </el-button>
            <el-button
              v-if="hasButton('active') && row.suspensionState === 2"
              type="success"
              link
              @click="handleActivate(row)"
            >
              {{ buttons.active?.authName || '激活' }}
            </el-button>
            <el-button
              v-if="hasButton('suspend') && row.suspensionState === 1"
              type="warning"
              link
              @click="handleSuspend(row)"
            >
              {{ buttons.suspend?.authName || '挂起' }}
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

    <el-dialog v-model="viewVisible" title="流程部署详情" width="640px">
      <div v-loading="viewLoading">
        <el-descriptions v-if="viewRecord" :column="1" border>
          <el-descriptions-item label="ID">{{ viewRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ viewRecord.name }}</el-descriptions-item>
          <el-descriptions-item label="Key">{{ viewRecord.key }}</el-descriptions-item>
          <el-descriptions-item label="部署ID">{{ viewRecord.deploymentId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="类别">{{ viewRecord.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ viewRecord.version }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ suspensionLabel(viewRecord.suspensionState) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述">{{ viewRecord.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-image
          v-if="viewRecord?.thumbnail"
          class="process-deployment-page__preview"
          fit="contain"
          :src="viewRecord.thumbnail"
          :preview-src-list="[viewRecord.thumbnail]"
        />
      </div>
    </el-dialog>

    <WorkflowFileDeployDialog
      v-model:visible="deployVisible"
      title="部署流程"
      accept=".xml"
      tip="只能上传 BPMN XML 文件，上传成功后将自动调用部署接口"
      :deploy="deployProcessDeployment"
      @success="fetchList"
    />
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

.process-deployment-page {
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
}
</style>
