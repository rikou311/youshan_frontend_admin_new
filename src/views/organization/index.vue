<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteOrganization,
  queryOrganization,
  searchOrganizationTrees,
  type OrganizationForm,
  type OrganizationItem,
} from '@/api/system'
import { queryDictionaryGroups } from '@/api/dictionary'
import OrganizationTreeChart from '@/components/organization/OrganizationTreeChart.vue'
import { usePageButtons } from '@/composables/usePageButtons'
import { formatDictionary } from '@/utils/dictionary'
import { normalizeOrganizationForest } from '@/utils/organization-tree'
import { saveDictionary } from '@/utils/storage'
import OrganizationFormDialog from './components/OrganizationFormDialog.vue'

const loading = ref(false)
const treeData = ref<OrganizationItem[]>([])
const dictTick = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<OrganizationForm | null>(null)

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<OrganizationItem | null>(null)

const { buttons, hasButton } = usePageButtons()

function formatActive(value?: string | number | null) {
  void dictTick.value
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

function formatOrganizationType(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('organization_type', value ?? '') || String(value ?? '-')
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['yesno', 'organization_type'])
    Object.entries(data).forEach(([groupId, values]) => {
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

async function loadData() {
  loading.value = true
  try {
    const data = await searchOrganizationTrees({})
    treeData.value = normalizeOrganizationForest(data)
  } finally {
    loading.value = false
  }
}

function openAdd(parent?: OrganizationItem | null) {
  dialogMode.value = 'add'
  editingRow.value = {
    name: '',
    type: '',
    superid: parent ? String(parent.id) : '0',
    superName: parent ? parent.name || parent.orgName || '' : '无',
    sort: 1,
    address: '',
    active: '1',
  }
  dialogVisible.value = true
}

async function openEdit(id: OrganizationItem['id']) {
  dialogMode.value = 'edit'
  dialogVisible.value = true
  editingRow.value = null
  try {
    const detail = await queryOrganization(id)
    editingRow.value = {
      id: detail.id,
      name: detail.name || detail.orgName || '',
      type: detail.type != null ? String(detail.type) : '',
      superid: detail.superid != null ? String(detail.superid) : '0',
      superName: detail.superName || '无',
      sort: detail.sort ?? 1,
      address: detail.address || '',
      active: String(detail.active ?? '1'),
    }
  } catch {
    dialogVisible.value = false
  }
}

async function openShow(id: OrganizationItem['id']) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await queryOrganization(id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(id: OrganizationItem['id']) {
  await ElMessageBox.confirm('确认要删除此记录吗？', '删除', { type: 'warning' })
  await deleteOrganization(id)
  ElMessage.success('删除成功')
  await loadData()
}

onMounted(async () => {
  await ensureDictionaries()
  await loadData()
})
</script>

<template>
  <div class="biz-page" v-loading="loading">
    <el-card shadow="never">
      <el-button
        v-if="hasButton('add') || buttons.add"
        type="success"
        @click="openAdd(null)"
      >
        {{ buttons.add?.authName ?? '添加' }}
      </el-button>
    </el-card>

    <el-card v-if="treeData.length" shadow="never" class="biz-page__tree">
      <div v-for="(organization, index) in treeData" :key="String(organization.id ?? index)" class="organization">
        <OrganizationTreeChart
          :json="organization"
          :buttons="buttons"
          @add="openAdd"
          @update="openEdit"
          @show="openShow"
          @del="handleDelete"
        />
      </div>
    </el-card>
    <el-card v-else-if="!loading" shadow="never">
      <el-empty description="暂无组织数据" />
    </el-card>

    <OrganizationFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :model="editingRow"
      @success="loadData"
    />

    <el-dialog v-model="showVisible" title="查看" width="800px" destroy-on-close>
      <el-skeleton :loading="showLoading" animated>
        <el-form v-if="showData" label-width="90px" class="show-form">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="名称">{{ showData.name || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="类型">{{ formatOrganizationType(showData.type) }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上级">{{ showData.superName || '无' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序">{{ showData.sort ?? '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="地址">{{ showData.address || '-' }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否有效">{{ formatActive(showData.active) }}</el-form-item>
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

  &__tree {
    overflow-x: auto;
  }
}

.organization {
  width: 100%;
}

.show-form {
  display: flex;
  flex-wrap: wrap;
}
</style>
