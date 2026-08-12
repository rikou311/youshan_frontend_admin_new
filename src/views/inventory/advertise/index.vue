<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  deleteInventoryAdvertise,
  getInventoryAdvertiseList,
  type InventoryAdvertiseForm,
  type InventoryAdvertiseItem,
} from '@/api/inventory/advertise'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { getResourceImgUrl } from '@/utils/upload'
import { saveDictionary } from '@/utils/storage'
import AdvertiseFormDialog from './components/AdvertiseFormDialog.vue'

const searchForm = reactive({ title: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<InventoryAdvertiseForm | null>(null)
const dictTick = ref(0)

const { buttons } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getInventoryAdvertiseList({
        ...params,
        title: searchForm.title || undefined,
      }),
    () => ({}),
    20,
  )

const typeOptionsReady = computed(() => {
  void dictTick.value
  return getDictionaryOptions('advertise_type').length > 0
})

function formatType(value?: number | string | null) {
  void dictTick.value
  return formatDictionary('advertise_type', value ?? '') || String(value ?? '-')
}

function displayImage(path?: string) {
  return getResourceImgUrl(path)
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['advertise_type'])
    Object.entries(data || {}).forEach(([groupId, values]) => {
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

function openEdit(row: InventoryAdvertiseItem) {
  dialogMode.value = 'edit'
  editingRow.value = {
    id: row.id,
    title: row.title ?? '',
    url: row.url ?? '',
    type: row.type ?? '',
    image: row.image ?? '',
  }
  dialogVisible.value = true
}

async function handleDelete(row: InventoryAdvertiseItem) {
  await ElMessageBox.confirm('确认要删除此记录吗?', '删除', { type: 'warning' })
  await deleteInventoryAdvertise(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

onMounted(async () => {
  await ensureDictionaries()
  void fetchList()
})
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <div class="biz-page__filter">
        <el-input
          v-model="searchForm.title"
          clearable
          placeholder="请输入内容"
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          {{ buttons.index?.authName ?? '查询' }}
        </el-button>
        <el-button type="success" @click="openAdd">
          {{ buttons.add?.authName ?? '新增' }}
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        fit
        highlight-current-row
        height="700"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column width="80" align="center" />
        <el-table-column prop="image" label="" width="100" align="left">
          <template #default="{ row }">
            <img
              v-if="row.image"
              :src="displayImage(row.image)"
              class="user-avatar"
              alt=""
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="内容" width="300" />
        <el-table-column prop="url" label="链接" width="150" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            {{ typeOptionsReady ? formatType(row.type) : row.type }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">
              {{ buttons.update?.authName ?? '编辑' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
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

    <AdvertiseFormDialog
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

  &__filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.user-avatar {
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}
</style>
