<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMerchantCommodityDis,
  getMerchantCommodityDisList,
  type MerchantCommodityDisForm,
  type MerchantCommodityDisItem,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'
import CommoditydisFormDialog from './components/CommoditydisFormDialog.vue'

const searchForm = reactive({
  uname: '',
  unick: '',
  state: '' as string | number,
})

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<MerchantCommodityDisForm | null>(null)
const dictTick = ref(0)

const { buttons, hasButton } = usePageButtons()

const stateOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('merchant_user_state_type')
})

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getMerchantCommodityDisList({
        ...params,
        uname: searchForm.uname || undefined,
        unick: searchForm.unick || undefined,
        state: searchForm.state !== '' ? searchForm.state : undefined,
      }),
    () => ({}),
  )

function formatState(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('merchant_user_state_type', value ?? '') || String(value ?? '-')
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

function openEdit(row: MerchantCommodityDisItem) {
  dialogMode.value = 'edit'
  editingRow.value = {
    id: row.id,
    userid: row.userid ?? '',
    commodityid: row.commodityid ?? '',
    price: row.price,
    state: row.state != null ? Number(row.state) : '',
  }
  dialogVisible.value = true
}

async function handleDelete(row: MerchantCommodityDisItem) {
  await ElMessageBox.confirm(`确认删除分销关联 #${row.id} 吗？`, '删除', { type: 'warning' })
  await deleteMerchantCommodityDis(row.id)
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
        <el-form-item label="用户名">
          <el-input v-model="searchForm.uname" clearable />
        </el-form-item>
        <el-form-item label="店铺名">
          <el-input v-model="searchForm.unick" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.state" clearable placeholder="全部" style="width: 140px">
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
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="uname" label="用户名" min-width="120" />
        <el-table-column prop="unick" label="店铺名" min-width="120" />
        <el-table-column prop="ctitle" label="商品名" min-width="160" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="state" label="状态" width="100">
          <template #default="{ row }">
            {{ formatState(row.state) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
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

    <CommoditydisFormDialog
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
