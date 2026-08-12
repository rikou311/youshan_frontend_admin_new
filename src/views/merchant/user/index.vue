<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantUser,
  getMerchantUserList,
  queryMerchantUser,
  type MerchantUserForm,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import type { MerchantUserItem } from '@/types/api'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import MerchantUserFormDialog from './components/MerchantUserFormDialog.vue'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { formatDateTimeSec, formatMoneyJp } from '@/utils/format'
import { saveDictionary } from '@/utils/storage'

const searchForm = reactive({
  uname: '',
  ucode: '',
  unick: '',
  name: '',
  state: '' as string | number,
})
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<MerchantUserForm | null>(null)
const dictTick = ref(0)
const { buttons, hasButton } = usePageButtons()

const stateOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('merchant_user_state_type')
})

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantUserList({
        ...params,
        uname: searchForm.uname || undefined,
        ucode: searchForm.ucode || undefined,
        unick: searchForm.unick || undefined,
        name: searchForm.name || undefined,
        state: searchForm.state === '' ? undefined : searchForm.state,
      }),
    () => ({}),
  )

function formatState(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('merchant_user_state_type', value ?? '') || String(value ?? '-')
}

function formatLastUpdate(row: MerchantUserItem) {
  const raw = row.authenmodify ?? row.createtime ?? row.createdAt
  return formatDateTimeSec(raw) || '-'
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['merchant_user_state_type'])
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

function openAdd() {
  dialogMode.value = 'add'
  editingRow.value = null
  dialogVisible.value = true
}

async function openEdit(row: MerchantUserItem) {
  dialogMode.value = 'edit'
  try {
    const detail = await queryMerchantUser(row.id)
    editingRow.value = {
      ...detail,
      id: detail.id ?? row.id,
      uname: detail.uname || detail.username || row.uname || row.username || '',
      unick: detail.unick || row.unick || '',
      username: detail.uname || detail.username || row.uname || row.username || '',
      umail: detail.umail ?? '',
      phone: detail.phone || row.phone || '',
      level: detail.level ?? row.level ?? '普通',
      ucode: detail.ucode ?? row.ucode ?? 0,
      name: detail.name ?? row.name,
      wechat: detail.wechat ?? row.wechat,
      memo: detail.memo ?? row.memo,
      state: detail.state != null ? String(detail.state) : String(row.state ?? '1'),
      address: detail.address ?? row.address ?? '',
      upass: '',
    }
    dialogVisible.value = true
  } catch {
    editingRow.value = null
  }
}

async function handleDelete(row: MerchantUserItem) {
  await ElMessageBox.confirm(`确认删除用户「${row.uname || row.username}」吗？`, '删除', {
    type: 'warning',
  })
  await deleteMerchantUser(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(async () => {
  await ensureDictionaries()
  await fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item>
          <el-input
            v-model="searchForm.uname"
            clearable
            placeholder="请输入用户名"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.ucode"
            clearable
            placeholder="请输入CODE"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.unick"
            clearable
            placeholder="请输入店铺"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.name"
            clearable
            placeholder="请输入公司名"
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="searchForm.state"
            clearable
            placeholder="请选择"
            style="width: 200px"
          >
            <el-option
              v-for="item in stateOptions"
              :key="String(item.value)"
              :label="item.display"
              :value="String(item.value)"
            />
          </el-select>
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
      <el-table v-loading="loading" :data="list" highlight-current-row>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="id" label="用户ID" width="100" align="left" />
        <el-table-column label="账号" min-width="120" align="left">
          <template #default="{ row }">{{ row.uname || row.username }}</template>
        </el-table-column>
        <el-table-column label="CODE" width="100" align="left">
          <template #default="{ row }">{{ row.ucode ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="店铺名称" min-width="140" align="left">
          <template #default="{ row }">{{ row.unick || '-' }}</template>
        </el-table-column>
        <el-table-column label="公司名" min-width="140" align="left">
          <template #default="{ row }">{{ row.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="微信" min-width="120" align="left">
          <template #default="{ row }">{{ row.wechat || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="left">
          <template #default="{ row }">
            {{ formatState(row.state) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120" align="left">
          <template #default="{ row }">
            {{ row.money != null ? formatMoneyJp(row.money) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="积分" width="100" align="left">
          <template #default="{ row }">{{ row.point ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="最后更新" min-width="180" align="left">
          <template #default="{ row }">
            <span>
              {{ formatLastUpdate(row) }}
              <br>
              {{ row.authenmodifyoperator ?? '' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
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
    <MerchantUserFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :model="editingRow"
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
