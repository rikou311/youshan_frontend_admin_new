<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteSysUser,
  getSysUserList,
  querySysUser,
  type SysUserItem,
} from '@/api/system'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import { getResourceImgUrl } from '@/utils/upload'
import SysUserFormDialog from './components/SysUserFormDialog.vue'

const searchForm = reactive({ username: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingUserId = ref<number | null>(null)

const showVisible = ref(false)
const showLoading = ref(false)
const showData = ref<SysUserItem | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getSysUserList({ ...params, username: searchForm.username || undefined }),
    () => ({}),
  )

function displayName(row: SysUserItem) {
  return row.name || row.realName || '-'
}

function displayAvatar(row: SysUserItem | null) {
  if (!row?.avatar) {
    return ''
  }
  return getResourceImgUrl(row.avatar)
}

function formatSex(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value)
  const mapped = formatDictionary('sex', raw)
  if (mapped && mapped !== raw) {
    return mapped
  }
  const lower = raw.toLowerCase()
  if (lower === 'male' || raw === '1' || raw === '男') {
    return '男'
  }
  if (lower === 'female' || raw === '2' || raw === '女') {
    return '女'
  }
  return raw
}

function formatActive(value?: string | number) {
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

function openAdd() {
  dialogMode.value = 'add'
  editingUserId.value = null
  dialogVisible.value = true
}

function openEdit(row: SysUserItem) {
  dialogMode.value = 'edit'
  editingUserId.value = row.id
  dialogVisible.value = true
}

async function openShow(row: SysUserItem) {
  showVisible.value = true
  showLoading.value = true
  showData.value = null
  try {
    showData.value = await querySysUser(row.id)
  } finally {
    showLoading.value = false
  }
}

async function handleDelete(row: SysUserItem) {
  await ElMessageBox.confirm(`确认删除用户「${row.username}」吗？`, '删除', { type: 'warning' })
  await deleteSysUser(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.username"
            clearable
            placeholder="请输入用户名"
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
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="头像" width="80" align="center">
          <template #default="{ row }">
            <el-avatar v-if="displayAvatar(row)" :size="40" :src="displayAvatar(row)" />
            <el-avatar v-else :size="40">{{ displayName(row).slice(0, 1) }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="姓名" min-width="100">
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column label="性别" width="90">
          <template #default="{ row }">{{ formatSex(row.sex) }}</template>
        </el-table-column>
        <el-table-column prop="roleName" label="角色" min-width="120" />
        <el-table-column prop="client" label="客户端" min-width="120" />
        <el-table-column prop="title" label="职称" min-width="120" />
        <el-table-column prop="mobile" label="手机号" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="expireDate" label="过期日期" width="120" align="center" />
        <el-table-column label="有效" width="70" align="center">
          <template #default="{ row }">{{ formatActive(row.active) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="primary"
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

    <SysUserFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :user-id="editingUserId"
      @success="fetchList"
    />

    <el-dialog v-model="showVisible" title="查看" width="800px" destroy-on-close>
      <el-skeleton :loading="showLoading" animated>
        <el-form v-if="showData" class="show-form" label-width="100px">
          <el-form-item label="头像">
            <el-avatar
              v-if="displayAvatar(showData)"
              :size="64"
              :src="displayAvatar(showData)"
            />
            <el-avatar v-else :size="64">{{ displayName(showData).slice(0, 1) }}</el-avatar>
          </el-form-item>
          <el-form-item label="用户名">{{ showData.username }}</el-form-item>
          <el-form-item label="姓名">{{ displayName(showData) }}</el-form-item>
          <el-form-item label="组织">
            {{ showData.organization?.name || showData.organization?.orgName || '-' }}
          </el-form-item>
          <el-form-item label="角色">{{ showData.roleName || '-' }}</el-form-item>
          <el-form-item label="职称">{{ showData.title || '-' }}</el-form-item>
          <el-form-item label="手机号">{{ showData.mobile || '-' }}</el-form-item>
          <el-form-item label="邮箱">{{ showData.email || '-' }}</el-form-item>
          <el-form-item label="过期日期">{{ showData.expireDate || '-' }}</el-form-item>
          <el-form-item label="性别">{{ formatSex(showData.sex) }}</el-form-item>
          <el-form-item label="客户端">{{ showData.client || '-' }}</el-form-item>
          <el-form-item label="有效">{{ formatActive(showData.active) }}</el-form-item>
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

.show-form {
  :deep(.el-form-item) {
    width: 50%;
    display: inline-flex;
    margin-right: 0;
  }
}
</style>
