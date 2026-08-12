<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteRole,
  getAllRoles,
  getRoleList,
  type RoleForm,
  type RoleItem,
} from '@/api/system'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import { unwrapArrayData } from '@/utils/legacy'
import RoleFormDialog from './components/RoleFormDialog.vue'
import RoleGrantDialog from './components/RoleGrantDialog.vue'

const searchForm = reactive({ roleName: '' })
const dialogVisible = ref(false)
const grantVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<RoleForm | null>(null)
const grantingRole = ref<RoleItem | null>(null)

const { buttons, hasButton } = usePageButtons()

function normalizeRoleItem(raw: Record<string, unknown>): RoleItem | null {
  const id = raw.id ?? raw.roleId
  if (id == null || id === '') {
    return null
  }
  return {
    id: id as RoleItem['id'],
    roleName: String(raw.roleName ?? raw.name ?? ''),
    active: raw.active == null ? null : Number(raw.active),
  }
}

function normalizeRoleList(payload: unknown): RoleItem[] {
  return unwrapArrayData<Record<string, unknown>>(payload)
    .map((item) => normalizeRoleItem(item))
    .filter((item): item is RoleItem => item != null)
}

async function fetchRolePage(params: {
  page: number
  pageSize: number
  roleName?: string
}) {
  try {
    const result = await getRoleList({
      page: params.page,
      pageSize: params.pageSize,
      roleName: params.roleName || undefined,
    })
    const list = normalizeRoleList(result.list)
    if (list.length || result.total > 0) {
      return {
        list,
        total: result.total || list.length,
      }
    }
  } catch {
    // 回退 all 接口
  }

  const all = normalizeRoleList(await getAllRoles())
  const keyword = (params.roleName || '').trim()
  const filtered = keyword
    ? all.filter((item) => item.roleName.includes(keyword))
    : all
  const start = (params.page - 1) * params.pageSize
  return {
    list: filtered.slice(start, start + params.pageSize),
    total: filtered.length,
  }
}

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      fetchRolePage({
        page: params.page,
        pageSize: params.pageSize,
        roleName: searchForm.roleName || undefined,
      }),
    () => ({}),
  )

function formatActive(value?: number | null) {
  if (value == null) {
    return '-'
  }
  const a = formatDictionary('yes_no', value)
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value) || String(value)
}

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

function openEdit(row: RoleItem) {
  dialogMode.value = 'edit'
  editingRow.value = { id: row.id, roleName: row.roleName, active: row.active ?? 1 }
  dialogVisible.value = true
}

function openGrant(row: RoleItem) {
  grantingRole.value = row
  grantVisible.value = true
}

async function handleDelete(row: RoleItem) {
  await ElMessageBox.confirm(`确认删除角色「${row.roleName}」吗？`, '删除', { type: 'warning' })
  await deleteRole(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="角色名">
          <el-input
            v-model="searchForm.roleName"
            clearable
            placeholder="请输入角色名"
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
        <el-table-column prop="roleName" label="角色名称" min-width="180" align="center" />
        <el-table-column label="有效" width="100" align="center">
          <template #default="{ row }">
            {{ formatActive(row.active) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('update') || buttons.update"
              type="primary"
              link
              @click="openEdit(row)"
            >
              {{ buttons.update?.authName ?? '编辑' }}
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

    <RoleFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :model="editingRow"
      @success="fetchList"
    />
    <RoleGrantDialog
      v-model:visible="grantVisible"
      :role-id="grantingRole?.id"
      :role-name="grantingRole?.roleName"
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
</style>
