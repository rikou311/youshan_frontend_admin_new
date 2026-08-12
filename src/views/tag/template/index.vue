<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addTagTemplate,
  deleteTagTemplate,
  getTagPrintList,
  getTagTemplateList,
  queryTagLabel,
  queryTagTemplate,
} from '@/api/tag'
import TagTemplatePrintDialog from '@/components/tag/TagTemplatePrintDialog.vue'
import type { TagTemplateItem } from '@/types/api'
import type { TagLabelRecord } from '@/types/tag-label'
import { parseTagTemplateLayout } from '@/types/tag-template-layout'
import type { TagTemplateLayoutForm } from '@/types/tag-template-layout'
import { useTableList } from '@/composables/useTableList'
import { formatDateTimeSec } from '@/utils/format'
import { normalizeSelectedLabel, recordToTagTemplateLayout, resolveTemplateLabel } from '@/utils/tag-template-print'

const router = useRouter()
const searchForm = reactive({ name: '' })
const printVisible = ref(false)
const printLayout = ref<TagTemplateLayoutForm | null>(null)
const printLabel = ref<TagLabelRecord | null>(null)
const labelOptions = ref<TagLabelRecord[]>([])

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) =>
      getTagTemplateList({
        ...params,
        name: searchForm.name || undefined,
      }),
    () => ({}),
    20,
  )

function parseConfig(row: TagTemplateItem) {
  return parseTagTemplateLayout(row.config)
}

function displayPaperSize(row: TagTemplateItem) {
  if (row.paperSize) {
    return row.paperSize
  }
  const config = parseConfig(row)
  if (config.paperSize && config.paperSize !== 'custom') {
    return config.paperSize
  }
  if (config.paperWidth && config.paperHeight) {
    return `${config.paperWidth}×${config.paperHeight}mm`
  }
  return '-'
}

function displayLabelSize(row: TagTemplateItem) {
  if (row.labelSize) {
    return row.labelSize
  }
  const config = parseConfig(row)
  const width = row.width || config.labelWidth
  const height = row.height || config.labelHeight
  if (width && height) {
    return `${width}×${height}mm`
  }
  return '-'
}

function displayLayout(row: TagTemplateItem) {
  if (row.layout) {
    return row.layout
  }
  const config = parseConfig(row)
  if (config.rows && config.columns) {
    return `${config.rows}×${config.columns}`
  }
  return '-'
}

function displayCreateTime(row: TagTemplateItem) {
  const raw =
    row.createTime ??
    row.createtime ??
    row.updatedAt ??
    (row as { create_time?: string }).create_time
  return formatDateTimeSec(raw) || String(raw ?? '-')
}

const settingsFrom = '/inventory/tagManagement/tag/print'

function goCreateTemplate() {
  router.push({ path: '/tag/print/template/settings', query: { from: settingsFrom } })
}

function editTemplate(row: TagTemplateItem) {
  router.push({
    path: '/tag/print/template/settings',
    query: { id: String(row.id), from: settingsFrom },
  })
}

async function handleDelete(row: TagTemplateItem) {
  await ElMessageBox.confirm('确认要删除此模板吗?', '删除', { type: 'warning' })
  await deleteTagTemplate(row.id)
  ElMessage.success('删除成功')
  await fetchList()
}

async function exportTemplate(row: TagTemplateItem) {
  const detail = await queryTagTemplate(row.id)
  const payload = {
    name: detail.name,
    config: detail.config ?? detail,
    labelSize: detail.labelSize ?? row.labelSize,
    layout: detail.layout ?? row.layout,
    paperSize: detail.paperSize ?? row.paperSize,
    exportTime: new Date().toLocaleString(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${detail.name || 'template'}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('模板导出成功')
}

async function copyTemplate(row: TagTemplateItem) {
  const { value } = await ElMessageBox.prompt('请输入新模板名称', '复制模板', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^.{1,50}$/,
    inputErrorMessage: '模板名称长度应在1-50个字符之间',
    inputValue: `${row.name}_副本`,
  })
  const detail = await queryTagTemplate(row.id)
  const config = parseTagTemplateLayout(detail.config)
  config.templateName = value
  await addTagTemplate({
    name: value,
    width: detail.width ?? config.labelWidth,
    height: detail.height ?? config.labelHeight,
    config: JSON.stringify(config),
    paperSize: detail.paperSize ?? row.paperSize ?? config.paperSize,
    labelSize: detail.labelSize ?? row.labelSize ?? `${config.labelWidth}×${config.labelHeight}mm`,
    layout: detail.layout ?? row.layout ?? `${config.rows}×${config.columns}`,
    selectedLabel: detail.selectedLabel ?? row.selectedLabel,
    createTime: new Date(),
    createtime: new Date(),
  })
  ElMessage.success('模板复制成功')
  await fetchList()
}

async function printTemplate(row: TagTemplateItem) {
  const detail = await queryTagTemplate(row.id)
  const layout = recordToTagTemplateLayout({
    ...detail,
    selectedLabel: detail.selectedLabel ?? row.selectedLabel,
  })

  if (!labelOptions.value.length) {
    const result = await getTagPrintList({ page: 1, pageSize: 200 })
    labelOptions.value = result.list
  }
  layout.selectedLabel = normalizeSelectedLabel(layout.selectedLabel, labelOptions.value)

  if (layout.selectedLabel === '') {
    ElMessage.warning('该模板未关联标签，请先进入编辑设置')
    return
  }

  let label = resolveTemplateLabel(layout, labelOptions.value)
  if (!label) {
    try {
      label = await queryTagLabel(layout.selectedLabel)
    } catch {
      label = null
    }
  }
  if (!label) {
    ElMessage.warning('关联的标签不存在，请重新选择')
    return
  }

  printLayout.value = layout
  printLabel.value = label
  printVisible.value = true
}

onMounted(async () => {
  await fetchList()
  try {
    const result = await getTagPrintList({ page: 1, pageSize: 200 })
    labelOptions.value = result.list
  } catch {
    // ignore
  }
})
</script>

<template>
  <div class="tag-template-page">
    <div class="tag-template-page__filter">
      <el-input
        v-model="searchForm.name"
        clearable
        placeholder="请输入模板名称"
        style="width: 200px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button type="success" @click="goCreateTemplate">新建模板</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe highlight-current-row height="700">
      <template #empty><el-empty description="暂无数据" /></template>
      <el-table-column label="序号" width="80" align="center">
        <template #default="{ $index }">
          {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="模板名称" min-width="150" />
      <el-table-column label="纸张大小" width="120" align="center">
        <template #default="{ row }">{{ displayPaperSize(row) }}</template>
      </el-table-column>
      <el-table-column label="标签尺寸" width="120" align="center">
        <template #default="{ row }">{{ displayLabelSize(row) }}</template>
      </el-table-column>
      <el-table-column label="布局" width="100" align="center">
        <template #default="{ row }">{{ displayLayout(row) }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="180" align="center">
        <template #default="{ row }">{{ displayCreateTime(row) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="320" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="info" link @click="printTemplate(row)">打印</el-button>
          <el-button type="primary" link @click="editTemplate(row)">编辑</el-button>
          <el-button type="warning" link @click="copyTemplate(row)">复制</el-button>
          <el-button type="success" link @click="exportTemplate(row)">导出</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="tag-template-page__pagination">
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

    <TagTemplatePrintDialog
      v-model:visible="printVisible"
      :layout="printLayout"
      :label="printLabel"
    />
  </div>
</template>

<style scoped lang="scss">
.tag-template-page {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
