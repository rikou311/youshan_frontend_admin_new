<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteClient,
  getClientList,
  queryClient,
  type ClientItem,
} from '@/api/platform'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import {
  formatDictionary,
  formatMultiDictionary,
  getDictionaryOptions,
} from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'
import ClientFormDialog from './components/ClientFormDialog.vue'
import ClientGrantDialog from './components/ClientGrantDialog.vue'

const CLIENT_DICT_GROUPS = ['oauth2_authority', 'oauth2_grant_type', 'oauth2_authority_level', 'yesno']

const searchForm = reactive({ clientId: '' })
const dialogVisible = ref(false)
const grantVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingClientId = ref<string | number | null>(null)
const grantingClient = ref<ClientItem | null>(null)
/** 字典加载后触发列表重渲染 */
const dictTick = ref(0)

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<ClientItem | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getClientList({ ...params, clientId: searchForm.clientId || undefined }),
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

function formatAuthority(value?: string | null) {
  void dictTick.value
  return formatMultiDictionary('oauth2_authority', value) || value || '-'
}

function formatGrantType(value?: string | null) {
  void dictTick.value
  return formatMultiDictionary('oauth2_grant_type', value) || value || '-'
}

function formatAuthorityLevel(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('oauth2_authority_level', value) || String(value ?? '-')
}

async function ensureClientDictionaries() {
  const missing = CLIENT_DICT_GROUPS.filter((groupId) => !getDictionaryOptions(groupId).length)
  if (!missing.length) {
    return
  }
  try {
    const data = await queryDictionaryGroups(missing)
    Object.entries(data).forEach(([groupId, values]) => {
      saveDictionary(groupId, values)
    })
    dictTick.value += 1
  } catch {
    // 使用 dictionary.ts 内置兜底
    dictTick.value += 1
  }
}

function openAdd() {
  dialogMode.value = 'add'
  editingClientId.value = null
  dialogVisible.value = true
}

function openEdit(row: ClientItem) {
  dialogMode.value = 'edit'
  editingClientId.value = row.id
  dialogVisible.value = true
}

function openGrant(row: ClientItem) {
  grantingClient.value = row
  grantVisible.value = true
}

async function openShow(row: ClientItem) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await queryClient(row.id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(row: ClientItem) {
  await ElMessageBox.confirm(`确认删除客户端「${row.clientId}」吗？`, '删除', { type: 'warning' })
  await deleteClient(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(async () => {
  await ensureClientDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="客户端号">
          <el-input
            v-model="searchForm.clientId"
            clearable
            placeholder="输入客户端号"
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
      <el-table v-loading="loading" :data="list" border stripe highlight-current-row>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="clientId" label="客户端" min-width="120" align="center" />
        <el-table-column prop="scope" label="范围" min-width="100" align="center" />
        <el-table-column label="权限" min-width="140" align="center">
          <template #default="{ row }">
            {{ formatAuthority(row.authority) }}
          </template>
        </el-table-column>
        <el-table-column label="授权方式" min-width="160" align="center">
          <template #default="{ row }">
            {{ formatGrantType(row.authorizedGrantType) }}
          </template>
        </el-table-column>
        <el-table-column label="权限控制级别" min-width="120" align="center">
          <template #default="{ row }">
            {{ formatAuthorityLevel(row.authorityLevel) }}
          </template>
        </el-table-column>
        <el-table-column prop="expireDate" label="过期日期" width="130" align="center" />
        <el-table-column prop="mark" label="备注" min-width="120" align="center" show-overflow-tooltip />
        <el-table-column label="有效" width="70" align="center">
          <template #default="{ row }">
            {{ formatActive(row.active) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" align="center" fixed="right">
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
              v-if="hasButton('grant') || buttons.grant"
              type="warning"
              link
              @click="openGrant(row)"
            >
              {{ buttons.grant?.authName ?? '授权' }}
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

    <ClientFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :client-id="editingClientId"
      @success="fetchList"
    />
    <ClientGrantDialog
      v-model:visible="grantVisible"
      :client-id="grantingClient?.id"
      :client-label="grantingClient?.clientId"
      @success="fetchList"
    />

    <el-dialog v-model="showVisible" title="查看" width="800px" destroy-on-close>
      <el-skeleton :loading="showLoading" animated>
        <el-form v-if="showData" label-width="120px" class="client-show">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="客户端(英文)">{{ showData.clientId || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="范围(英文)">{{ showData.scope || '-' }}</el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="权限">
                {{ formatAuthority(showData.authority) }}
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="授权方式">
                {{ formatGrantType(showData.authorizedGrantType) }}
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="权限控制级别">
                {{ formatAuthorityLevel(showData.authorityLevel) }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="token失效">
                {{ showData.tokenValiditySeconds ?? '-' }}(小时)
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="刷新token失效">
                {{ showData.refreshTokenSeconds ?? '-' }}(小时)
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="过期日期">{{ showData.expireDate || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注">{{ showData.mark || '-' }}</el-form-item>
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

.client-show {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
