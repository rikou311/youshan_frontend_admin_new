<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deletePayment,
  getPaymentList,
  type PaymentForm,
  type PaymentItem,
} from '@/api/configure'
import { queryDictionaryGroups } from '@/api/dictionary'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'
import { getResourceImgUrl } from '@/utils/upload'
import PaymentFormDialog from './components/PaymentFormDialog.vue'

const searchForm = reactive({ title: '' })
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRow = ref<PaymentForm | null>(null)
const dictTick = ref(0)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getPaymentList({ ...params, title: searchForm.title || undefined }),
    () => ({}),
  )

function displayImage(path?: string) {
  return getResourceImgUrl(path)
}

function formatState(value?: string | number | null) {
  void dictTick.value
  const a = formatDictionary('yes_no', value ?? '')
  if (a && a !== String(value)) {
    return a
  }
  return formatDictionary('yesno', value ?? '') || String(value ?? '-')
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['yesno'])
    if (Array.isArray(data?.yesno) && data.yesno.length) {
      saveDictionary('yesno', data.yesno)
    }
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

function openEdit(row: PaymentItem) {
  dialogMode.value = 'edit'
  editingRow.value = {
    id: row.id,
    title: row.title,
    image: row.image ?? '',
    demoimage: row.demoimage ?? '',
    demomemo: row.demomemo ?? '',
    state: String(row.state ?? '1'),
  }
  dialogVisible.value = true
}

async function handleDelete(row: PaymentItem) {
  await ElMessageBox.confirm(`确认删除支付方式「${row.title}」吗？`, '删除', { type: 'warning' })
  await deletePayment(row.id)
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
        <el-form-item label="名称">
          <el-input
            v-model="searchForm.title"
            clearable
            placeholder="请输入名称"
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
        <el-table-column label="" width="80" align="center" />
        <el-table-column label="" prop="image" width="100" align="left">
          <template #default="{ row }">
            <img v-if="row.image" :src="displayImage(row.image)" class="payment-thumb" alt="">
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" min-width="120" />
        <el-table-column label="提示图片" prop="demoimage" width="100" align="left">
          <template #default="{ row }">
            <img v-if="row.demoimage" :src="displayImage(row.demoimage)" class="payment-thumb" alt="">
          </template>
        </el-table-column>
        <el-table-column prop="demomemo" label="提示语" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="left">
          <template #default="{ row }">
            {{ formatState(row.state) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
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

    <PaymentFormDialog
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

.payment-thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}
</style>
