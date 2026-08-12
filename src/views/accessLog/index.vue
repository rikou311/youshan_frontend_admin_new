<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getAccessLogList, queryAccessLog, type AccessLogItem } from '@/api/platform'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'

const searchForm = reactive({ uri: '' })
const detailVisible = ref(false)
const detailLoading = ref(false)
const logDetail = ref<AccessLogItem | null>(null)

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getAccessLogList({ ...params, uri: searchForm.uri || undefined }),
    () => ({}),
  )

const headerRows = computed(() => {
  const header = logDetail.value?.header
  if (!header) {
    return []
  }
  if (Array.isArray(header)) {
    return header
  }
  try {
    const parsed = JSON.parse(header) as Record<string, string>
    return Object.entries(parsed).map(([name, value]) => ({ name, value }))
  } catch {
    return []
  }
})

function displayUri(row: AccessLogItem) {
  return row.uri ?? row.resource ?? '-'
}

function displayUser(row: AccessLogItem) {
  return row.cuname ?? row.username ?? '-'
}

function displayTime(row: AccessLogItem) {
  return row.createTime ?? row.createdAt ?? '-'
}

function displayStatus(row: AccessLogItem) {
  return row.statusCode ?? row.status ?? '-'
}

async function openDetail(id: number) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    logDetail.value = await queryAccessLog(id)
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="请求 URI">
          <el-input v-model="searchForm.uri" clearable placeholder="请输入请求 uri" />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column label="URI 地址" min-width="260">
          <template #default="{ row }">{{ displayUri(row) }}</template>
        </el-table-column>
        <el-table-column prop="method" label="方法" width="100" />
        <el-table-column prop="type" label="访问类型" width="120" />
        <el-table-column label="返回状态" width="100">
          <template #default="{ row }">{{ displayStatus(row) }}</template>
        </el-table-column>
        <el-table-column label="请求时间" min-width="180">
          <template #default="{ row }">{{ displayTime(row) }}</template>
        </el-table-column>
        <el-table-column label="操作人员" min-width="120">
          <template #default="{ row }">{{ displayUser(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="primary"
              link
              @click="openDetail(row.id)"
            >
              {{ buttons.query?.authName ?? '详情' }}
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

    <el-dialog v-model="detailVisible" title="访问日志详情" width="800px" destroy-on-close>
      <el-skeleton :loading="detailLoading" animated>
        <template v-if="logDetail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="URI 地址">{{ displayUri(logDetail) }}</el-descriptions-item>
            <el-descriptions-item label="请求参数">{{ logDetail.param ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="请求类型">{{ logDetail.type ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="方法">{{ logDetail.method }}</el-descriptions-item>
            <el-descriptions-item label="返回状态">{{ displayStatus(logDetail) }}</el-descriptions-item>
            <el-descriptions-item label="操作人员">{{ displayUser(logDetail) }}</el-descriptions-item>
            <el-descriptions-item label="请求时间">{{ displayTime(logDetail) }}</el-descriptions-item>
          </el-descriptions>
          <el-table v-if="headerRows.length" :data="headerRows" style="margin-top: 16px">
            <el-table-column prop="name" label="请求头键" min-width="180" />
            <el-table-column prop="value" label="请求头值" min-width="260" />
          </el-table>
        </template>
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
