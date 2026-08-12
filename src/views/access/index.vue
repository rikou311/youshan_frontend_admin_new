<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteAccess,
  getAccessList,
  queryAccess,
  type AccessItem,
} from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import {
  formatDictionary,
} from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'
import AccessFormDialog from './components/AccessFormDialog.vue'

const ACCESS_DICT_GROUPS = [
  'access_resources_type',
  'request_type',
  'oauth2_authority',
  'yesno',
]

const searchForm = reactive({ resourceName: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingAccessId = ref<string | number | null>(null)
const dictTick = ref(0)

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<AccessItem | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getAccessList({ ...params, resourceName: searchForm.resourceName || undefined }),
    () => ({}),
  )

function formatActive(value?: string | number | null) {
  void dictTick.value
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

function formatResourceType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('access_resources_type', value) || String(value ?? '-')
}

function formatRequestType(value?: string | null) {
  void dictTick.value
  return formatDictionary('request_type', value ?? '') || value || '-'
}

function formatAuthority(value?: string | null) {
  void dictTick.value
  return formatDictionary('oauth2_authority', value ?? '') || value || '-'
}

async function ensureAccessDictionaries() {
  // 与旧版一致：始终拉取后端字典覆盖本地缓存
  try {
    const data = await queryDictionaryGroups(ACCESS_DICT_GROUPS)
    ACCESS_DICT_GROUPS.forEach((groupId) => {
      const values = data?.[groupId]
      if (Array.isArray(values) && values.length) {
        saveDictionary(groupId, values)
      }
    })
    dictTick.value += 1
  } catch {
    dictTick.value += 1
  }
}

function openAdd() {
  dialogMode.value = 'add'
  editingAccessId.value = null
  dialogVisible.value = true
}

function openEdit(row: AccessItem) {
  dialogMode.value = 'edit'
  editingAccessId.value = row.id
  dialogVisible.value = true
}

async function openShow(row: AccessItem) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await queryAccess(row.id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(row: AccessItem) {
  await ElMessageBox.confirm(`确认删除资源「${row.resourceName}」吗？`, '删除', { type: 'warning' })
  await deleteAccess(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(async () => {
  await ensureAccessDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="资源名称">
          <el-input
            v-model="searchForm.resourceName"
            clearable
            placeholder="输入资源名称"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openAdd">
            {{ buttons.add?.authName ?? '新增' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe highlight-current-row>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="resourceName" label="资源名称" min-width="160" />
        <el-table-column prop="resource" label="资源值" min-width="220" />
        <el-table-column label="资源类型" width="110">
          <template #default="{ row }">
            {{ formatResourceType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="请求类型" width="100">
          <template #default="{ row }">
            {{ formatRequestType(row.method) }}
          </template>
        </el-table-column>
        <el-table-column prop="moduleCode" label="模块编码" width="110" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="公共权限" width="90" align="center">
          <template #default="{ row }">
            {{ formatActive(row.ispublic) }}
          </template>
        </el-table-column>
        <el-table-column label="有效" width="80" align="center">
          <template #default="{ row }">
            {{ formatActive(row.active) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="default"
              link
              @click="openShow(row)"
            >
              {{ buttons.query?.authName ?? '查看' }}
            </el-button>
            <el-button
              v-if="hasButton('update') || buttons.update"
              type="primary"
              link
              @click="openEdit(row)"
            >
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
            <el-button
              v-if="hasButton('delete') || buttons.delete"
              type="danger"
              link
              @click="handleDelete(row)"
            >
              {{ buttons.delete?.authName ?? '删除' }}
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

    <AccessFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :access-id="editingAccessId"
      @success="fetchList"
    />

    <el-dialog v-model="showVisible" title="查看" width="800px" destroy-on-close>
      <el-skeleton :loading="showLoading" animated>
        <el-form v-if="showData" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="资源名称">{{ showData.resourceName || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="资源值">{{ showData.resource || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="资源类型">{{ formatResourceType(showData.type) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="请求类型">{{ formatRequestType(showData.method) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="请求权限">{{ formatAuthority(showData.authority) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模块编码">{{ showData.moduleCode || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序">{{ showData.sort ?? '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="公共权限">{{ formatActive(showData.ispublic) }}</el-form-item>
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

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
