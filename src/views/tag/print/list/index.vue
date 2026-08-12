<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addTagLabel,
  deleteTagLabel,
  getTagPrintList,
  queryTagLabel,
  updateTagLabel,
} from '@/api/tag'
import { usePageButtons } from '@/composables/usePageButtons'
import { useTableList } from '@/composables/useTableList'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import type { LabelElement, TagLabelRecord } from '@/types/tag-label'
import { parseLabelConfig, parseLabelElements } from '@/types/tag-label'
import { printBySelector } from '@/utils/print'
import { exportTagLabelsToExcel } from '@/utils/tag-label-excel'

const router = useRouter()
const searchForm = reactive({ name: '' })
const previewVisible = ref(false)
const previewRecord = ref<TagLabelRecord | null>(null)
const tableRef = ref<{ clearSelection: () => void }>()
const multipleSelection = ref<TagLabelRecord[]>([])
const expiryDialogVisible = ref(false)
const expiryForm = reactive({ expiryDate: '' })

const { buttons, hasButton } = usePageButtons()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getTagPrintList({
        ...params,
        name: searchForm.name || undefined,
        keyword: searchForm.name || undefined,
      }),
    () => ({}),
  )

function resetSearch() {
  searchForm.name = ''
  handleSearch()
}

function goCreate() {
  router.push('/tag/print/designer/index')
}

function goEdit(row: TagLabelRecord) {
  router.push({ path: '/tag/print/designer/index', query: { id: String(row.id) } })
}

async function openPreview(row: TagLabelRecord) {
  previewRecord.value = await queryTagLabel(row.id)
  previewVisible.value = true
}

async function handleDelete(row: TagLabelRecord) {
  await ElMessageBox.confirm(`确认删除标签「${row.name}」吗？`, '删除', { type: 'warning' })
  await deleteTagLabel(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

async function duplicateLabel(row: TagLabelRecord) {
  const detail = await queryTagLabel(row.id)
  const now = new Date()
  await addTagLabel({
    name: `${detail.name}_副本`,
    barcode: detail.barcode,
    config: typeof detail.config === 'string' ? detail.config : JSON.stringify(detail.config),
    elements:
      typeof detail.elements === 'string' ? detail.elements : JSON.stringify(detail.elements),
    updateTime: now,
    updatetime: now,
  })
  ElMessage.success('标签复制成功')
  await fetchList()
}

function handleSelectionChange(rows: TagLabelRecord[]) {
  multipleSelection.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
}

function goBatchPrint() {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请先选择要打印的标签')
    return
  }
  const labelIds = multipleSelection.value.map((row) => row.id).join(',')
  router.push({ path: '/tag/print/editor/index', query: { labelIds } })
}

function batchExport() {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请先选择要导出的标签')
    return
  }
  const exportRows = multipleSelection.value.map((row) => ({
    ...row,
    config: typeof row.config === 'string' ? row.config : JSON.stringify(row.config),
    elements: typeof row.elements === 'string' ? row.elements : JSON.stringify(row.elements),
  }))
  const dataStr = JSON.stringify(exportRows, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `选中标签数据_${new Date().toLocaleDateString()}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`成功导出 ${multipleSelection.value.length} 个标签`)
}

async function batchExportExcel() {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请先选择要导出的标签')
    return
  }
  await exportTagLabelsToExcel(multipleSelection.value)
  ElMessage.success(`成功导出 ${multipleSelection.value.length} 个标签`)
}

async function batchDelete() {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请先选择要删除的标签')
    return
  }
  await ElMessageBox.confirm(
    `确定要删除选中的 ${multipleSelection.value.length} 个标签吗？`,
    '批量删除',
    { type: 'warning' },
  )
  try {
    await Promise.all(multipleSelection.value.map((row) => deleteTagLabel(row.id)))
    ElMessage.success(`成功删除 ${multipleSelection.value.length} 个标签`)
    clearSelection()
    await fetchList()
  } catch {
    ElMessage.error('删除过程中出现错误')
  }
}

function showExpiryDialog() {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请先选择要修改保质期的标签')
    return
  }
  expiryForm.expiryDate = ''
  expiryDialogVisible.value = true
}

async function batchUpdateExpiry() {
  if (!expiryForm.expiryDate) {
    ElMessage.warning('请选择新的保质期')
    return
  }
  await ElMessageBox.confirm(
    `确定要将选中的 ${multipleSelection.value.length} 个标签的保质期修改为 ${expiryForm.expiryDate} 吗？`,
    '批量修改保质期',
    { type: 'warning' },
  )
  try {
    await Promise.all(
      multipleSelection.value.map(async (row) => {
        const detail = await queryTagLabel(row.id)
        const elements = parseLabelElements(detail.elements).map((element) => {
          if (element.type === 'expiryDate') {
            return { ...element, expiryDate: expiryForm.expiryDate }
          }
          return element
        }) as LabelElement[]
        const hasExpiry = elements.some((element) => element.type === 'expiryDate')
        if (!hasExpiry) {
          return
        }
        await updateTagLabel({
          id: detail.id,
          name: detail.name,
          barcode: detail.barcode,
          config:
            typeof detail.config === 'string' ? detail.config : JSON.stringify(detail.config),
          elements: JSON.stringify(elements),
          updateTime: new Date(),
          updatetime: new Date(),
        })
      }),
    )
    ElMessage.success(`成功修改 ${multipleSelection.value.length} 个标签的保质期`)
    expiryDialogVisible.value = false
    clearSelection()
    await fetchList()
  } catch {
    ElMessage.error('修改保质期过程中出现错误')
  }
}

function formatSize(row: TagLabelRecord) {
  const config = parseLabelConfig(row.config)
  return `${config.width}${config.unit} × ${config.height}${config.unit}`
}

function handlePrintPreview() {
  printBySelector('#tagListPreviewArea')
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <div class="biz-page__filter">
        <el-input
          v-model="searchForm.name"
          clearable
          placeholder="请输入标签名称"
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
        <el-button type="success" @click="goCreate">新建标签</el-button>
      </div>
    </el-card>

    <el-card v-if="multipleSelection.length" shadow="never" class="biz-page__batch">
      <span>已选 {{ multipleSelection.length }} 项</span>
      <div class="biz-page__batch-actions">
        <el-button size="small" type="primary" @click="goBatchPrint">批量打印</el-button>
        <el-button size="small" type="success" @click="batchExportExcel">导出 Excel</el-button>
        <el-button size="small" @click="batchExport">导出 JSON</el-button>
        <el-button size="small" type="warning" @click="showExpiryDialog">批量改保质期</el-button>
        <el-button
          v-if="hasButton('delete') || buttons.delete"
          size="small"
          type="danger"
          @click="batchDelete"
        >
          批量删除
        </el-button>
        <el-button size="small" link @click="clearSelection">清空选择</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="list"
        stripe
        @selection-change="handleSelectionChange"
      >
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="标签名称" min-width="180" />
        <el-table-column label="尺寸" width="140">
          <template #default="{ row }">{{ formatSize(row) }}</template>
        </el-table-column>
        <el-table-column prop="barcode" label="条码" min-width="140" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="180">
          <template #default="{ row }">{{ row.updatedAt ?? row.updateTime ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goEdit(row)">编辑</el-button>
            <el-button type="primary" link @click="openPreview(row)">预览</el-button>
            <el-button type="warning" link @click="duplicateLabel(row)">复制</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="previewVisible" title="标签预览" width="600px" append-to-body>
      <div v-if="previewRecord" id="tagListPreviewArea" class="biz-page__preview-wrap">
        <LabelPreview
          :design-elements="parseLabelElements(previewRecord.elements)"
          :label-config="parseLabelConfig(previewRecord.config)"
        />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="handlePrintPreview">打印</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="expiryDialogVisible" title="批量修改保质期" width="480px">
      <p class="biz-page__expiry-tip">将更新选中标签中「保质期」元素的日期。</p>
      <el-form :model="expiryForm" label-width="100px">
        <el-form-item label="新保质期">
          <el-date-picker
            v-model="expiryForm.expiryDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="expiryDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!expiryForm.expiryDate" @click="batchUpdateExpiry">
          确定
        </el-button>
      </template>
    </el-dialog>
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
  }

  &__batch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #606266;
    font-size: 14px;
  }

  &__batch-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__expiry-tip {
    margin: 0 0 12px;
    color: #909399;
    font-size: 13px;
  }

  &__preview-wrap {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
