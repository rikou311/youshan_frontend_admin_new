<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import {
  deleteStaticResource,
  deleteStaticResources,
  getStaticResourceList,
  queryStaticResource,
  type StaticResourceItem,
} from '@/api/platform'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import { formatDictionary } from '@/utils/dictionary'
import {
  getPublicUploadUrl,
  getUploadHeaders,
  resolveUploadImageUrl,
} from '@/utils/upload'

const searchForm = reactive({ name: '' })
const selectedIds = ref<number[]>([])
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<StaticResourceItem | null>(null)
const uploadVisible = ref(false)
const uploadRef = ref<UploadInstance>()
const uploading = ref(false)

const uploadUrl = getPublicUploadUrl()
const uploadHeaders = getUploadHeaders()

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getStaticResourceList({
        ...params,
        fileName: searchForm.name || undefined,
        name: searchForm.name || undefined,
      }),
    () => ({}),
  )

function displayName(row: StaticResourceItem) {
  return row.name || row.fileName || '-'
}

function displayPath(row: StaticResourceItem) {
  return row.path || row.filePath || row.uploadUri || '-'
}

function displayType(row: StaticResourceItem) {
  return row.type || row.mimeType || '-'
}

function displayTime(row: StaticResourceItem) {
  return row.createTime || row.createdAt || '-'
}

/** 旧后端 size 已是 MB 数值；mock 为字节 */
function formatSize(row: StaticResourceItem) {
  const size = row.size ?? row.fileSize
  if (size == null) {
    return '-'
  }
  if (row.size != null && row.fileSize == null) {
    return `${Number(size).toFixed(2)} MB`
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function yesNoText(value: number | boolean | undefined) {
  if (value === undefined || value === null) {
    return '-'
  }
  const num = typeof value === 'boolean' ? Number(value) : Number(value)
  return formatDictionary('yes_no', num) || (num === 1 ? '是' : '否')
}

function handleSelectionChange(rows: StaticResourceItem[]) {
  selectedIds.value = rows.map((row) => row.id)
}

async function openDetail(id: number) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await queryStaticResource(id)
  } finally {
    detailLoading.value = false
  }
}

function openUpload() {
  uploadVisible.value = true
  uploading.value = false
  uploadRef.value?.clearFiles()
}

async function handleDelete(row: StaticResourceItem) {
  await ElMessageBox.confirm(`确认删除「${displayName(row)}」吗？`, '删除', { type: 'warning' })
  await deleteStaticResource(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择文件')
    return
  }
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个文件吗？`, '批量删除', {
    type: 'warning',
  })
  await deleteStaticResources(selectedIds.value)
  ElMessage.success('删除成功')
  selectedIds.value = []
  await fetchList()
}

function handleUploadSuccess(response: { code?: number; data?: Array<{ url: string }> }) {
  uploading.value = false
  const url = resolveUploadImageUrl(response)
  if (!url && response.code !== 200) {
    ElMessage.error('上传失败')
    return
  }
  ElMessage.success(url ? `上传成功：${url}` : '上传成功')
  uploadVisible.value = false
  uploadRef.value?.clearFiles()
  fetchList()
}

function handleUploadError() {
  uploading.value = false
  ElMessage.error('上传失败')
}

function beforeUpload(file: File) {
  if (file.size > 50 * 1024 * 1024) {
    ElMessage.error('文件不能超过 50MB')
    return false
  }
  uploading.value = true
  return true
}

function handleUploadChange(file: UploadFile) {
  if (file.status === 'fail') {
    uploading.value = false
  }
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="文件名">
          <el-input v-model="searchForm.name" clearable placeholder="请输入文件名" />
        </el-form-item>
        <el-form-item>
          <el-button v-if="hasButton('index') || buttons.index" type="primary" @click="handleSearch">
            {{ buttons.index?.authName ?? '查询' }}
          </el-button>
          <el-button v-if="hasButton('add') || buttons.add" type="success" @click="openUpload">
            {{ buttons.add?.authName ?? '上传' }}
          </el-button>
          <el-button
            v-if="hasButton('deletes') || hasButton('delete') || buttons.delete"
            type="danger"
            :disabled="!selectedIds.length"
            @click="handleBatchDelete"
          >
            {{ buttons.deletes?.authName ?? '批量删除' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="list"
        stripe
        @selection-change="handleSelectionChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column type="selection" width="48" />
        <el-table-column label="文件名" min-width="160">
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">{{ displayType(row) }}</template>
        </el-table-column>
        <el-table-column label="空间" width="110" align="center">
          <template #default="{ row }">{{ formatSize(row) }}</template>
        </el-table-column>
        <el-table-column label="模块编码" width="110" align="center">
          <template #default="{ row }">{{ row.moduleCode || '-' }}</template>
        </el-table-column>
        <el-table-column label="上传时间" min-width="170">
          <template #default="{ row }">{{ displayTime(row) }}</template>
        </el-table-column>
        <el-table-column label="可删" width="70" align="center">
          <template #default="{ row }">{{ yesNoText(row.delete) }}</template>
        </el-table-column>
        <el-table-column label="有效" width="70" align="center">
          <template #default="{ row }">{{ yesNoText(row.active) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasButton('query') || buttons.query"
              type="primary"
              link
              @click="openDetail(row.id)"
            >
              {{ buttons.query?.authName ?? '详情' }}
            </el-button>
            <el-button
              v-if="(hasButton('delete') || buttons.delete) && row.delete !== false && row.delete !== 0"
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

    <el-drawer v-model="detailVisible" title="资源详情" size="480px">
      <el-skeleton :loading="detailLoading" animated>
        <el-descriptions v-if="detail" :column="1" border>
          <el-descriptions-item label="文件名">{{ displayName(detail) }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ displayType(detail) }}</el-descriptions-item>
          <el-descriptions-item label="节点">{{ detail.endpoint || '-' }}</el-descriptions-item>
          <el-descriptions-item label="空间">{{ formatSize(detail) }}</el-descriptions-item>
          <el-descriptions-item label="模块编码">{{ detail.moduleCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="上传 URI">{{ detail.uploadUri || '-' }}</el-descriptions-item>
          <el-descriptions-item label="路径">{{ displayPath(detail) }}</el-descriptions-item>
          <el-descriptions-item label="绝对路径">{{ detail.absolutePath || '-' }}</el-descriptions-item>
          <el-descriptions-item label="有效">{{ yesNoText(detail.active) }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ displayTime(detail) }}</el-descriptions-item>
        </el-descriptions>
      </el-skeleton>
    </el-drawer>

    <el-dialog v-model="uploadVisible" title="上传静态资源" width="480px" destroy-on-close>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="上传至默认资源节点"
        description="文件会提交到 /jee-fk/resource/public，上传成功后刷新列表。"
        class="static-upload__alert"
      />
      <el-upload
        ref="uploadRef"
        drag
        :action="uploadUrl"
        :headers="uploadHeaders"
        :show-file-list="true"
        :limit="5"
        :before-upload="beforeUpload"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        :on-change="handleUploadChange"
      >
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
      <template #footer>
        <el-button @click="uploadVisible = false">关闭</el-button>
      </template>
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

.static-upload__alert {
  margin-bottom: 16px;
}
</style>
