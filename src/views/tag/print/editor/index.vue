<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import TagTemplatePrintDialog from '@/components/tag/TagTemplatePrintDialog.vue'
import {
  getTagPrintList,
  getTagTemplateList,
  queryTagLabel,
  queryTagTemplate,
} from '@/api/tag'
import type { TagLabelRecord } from '@/types/tag-label'
import { parseLabelConfig, parseLabelElements } from '@/types/tag-label'
import type { TagTemplateLayoutForm } from '@/types/tag-template-layout'
import { recordToTagTemplateLayout } from '@/utils/tag-template-print'
import { printBySelector } from '@/utils/print'
import {
  downloadTagLabelImportTemplate,
  exportTagLabelsToExcel,
  parseTagLabelExcelFile,
  resolveTagLabelsFromImportRows,
} from '@/utils/tag-label-excel'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const pickerVisible = ref(false)
const pickerLoading = ref(false)
const printDialogVisible = ref(false)
const pickerKeyword = ref('')
const pickerList = ref<TagLabelRecord[]>([])
const pickerSelection = ref<TagLabelRecord[]>([])
const fileInputRef = ref<HTMLInputElement>()
const importLoading = ref(false)

const label = ref<TagLabelRecord | null>(null)
const selectedLabels = ref<TagLabelRecord[]>([])
const templateOptions = ref<Array<{ id: number | string; name: string; layout?: string }>>([])
const selectedTemplateId = ref<number | string | ''>('')
const printLayout = ref<TagTemplateLayoutForm | null>(null)

const labelId = computed(() => {
  const raw = route.query.labelId || route.query.templateId
  if (raw === undefined || raw === null || raw === '') {
    return '' as const
  }
  return Array.isArray(raw) ? String(raw[0]) : String(raw)
})
const labelIdsQuery = computed(() => {
  const raw = route.query.labelIds
  if (!raw || typeof raw !== 'string') {
    return [] as string[]
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
})

const isSingleMode = computed(() => Boolean(labelId.value) && !labelIdsQuery.value.length)

const labelConfig = computed(() => parseLabelConfig(label.value?.config))
const designElements = computed(() => parseLabelElements(label.value?.elements))

const labelsPerPage = computed(() => {
  if (!printLayout.value) {
    return 0
  }
  return printLayout.value.rows * printLayout.value.columns
})

const pageCount = computed(() => {
  if (!labelsPerPage.value) {
    return 0
  }
  return Math.ceil(selectedLabels.value.length / labelsPerPage.value)
})

async function loadSingleLabel() {
  if (!labelId.value) {
    return
  }
  loading.value = true
  try {
    label.value = await queryTagLabel(labelId.value)
    selectedLabels.value = label.value ? [label.value] : []
  } finally {
    loading.value = false
  }
}

async function loadLabelsByIds(ids: Array<string | number>) {
  if (!ids.length) {
    return
  }
  loading.value = true
  try {
    const rows = await Promise.all(ids.map((id) => queryTagLabel(id)))
    selectedLabels.value = rows
    label.value = rows[0] ?? null
  } finally {
    loading.value = false
  }
}

async function loadTemplateOptions() {
  const result = await getTagTemplateList({ page: 1, pageSize: 200 })
  templateOptions.value = result.list.map((item) => ({
    id: item.id,
    name: item.name,
    layout: item.layout,
  }))
}

async function fetchPickerList() {
  pickerLoading.value = true
  try {
    const result = await getTagPrintList({
      page: 1,
      pageSize: 200,
      keyword: pickerKeyword.value || undefined,
    })
    pickerList.value = result.list
  } finally {
    pickerLoading.value = false
  }
}

async function onTemplateChange(templateId: number | string | '') {
  if (!templateId) {
    printLayout.value = null
    return
  }
  const detail = await queryTagTemplate(templateId)
  printLayout.value = recordToTagTemplateLayout(detail)
}

function openPicker() {
  pickerVisible.value = true
  void fetchPickerList()
}

function confirmPicker() {
  if (!pickerSelection.value.length) {
    ElMessage.warning('请先选择标签')
    return
  }
  const map = new Map<string | number, TagLabelRecord>()
  ;[...selectedLabels.value, ...pickerSelection.value].forEach((item) => {
    map.set(item.id, item)
  })
  selectedLabels.value = [...map.values()]
  pickerVisible.value = false
  ElMessage.success(`已添加，当前共 ${selectedLabels.value.length} 个标签`)
}

function removeLabel(id: string | number) {
  selectedLabels.value = selectedLabels.value.filter((item) => item.id !== id)
}

function clearLabels() {
  selectedLabels.value = []
}

function handleSinglePrint() {
  printBySelector('#tagEditorPrintArea')
}

function openBatchPrint() {
  if (!selectedTemplateId.value) {
    ElMessage.warning('请先选择打印模板')
    return
  }
  if (!selectedLabels.value.length) {
    ElMessage.warning('请先添加要打印的标签')
    return
  }
  printDialogVisible.value = true
}

function goBack() {
  router.back()
}

function goBatchMode() {
  router.push({ path: '/tag/print/editor/index' })
}

async function handleExportExcel() {
  if (!selectedLabels.value.length) {
    ElMessage.warning('没有可导出的标签')
    return
  }
  await exportTagLabelsToExcel(selectedLabels.value)
  ElMessage.success('导出成功')
}

function triggerImportExcel() {
  fileInputRef.value?.click()
}

async function handleImportExcel(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  importLoading.value = true
  try {
    const rows = await parseTagLabelExcelFile(file)
    if (!rows.length) {
      ElMessage.warning('Excel 中没有有效数据')
      return
    }

    const { matched, unmatched } = await resolveTagLabelsFromImportRows(rows, {
      queryById: queryTagLabel,
      searchLabels: async (keyword) => {
        const result = await getTagPrintList({ page: 1, pageSize: 50, keyword })
        return result.list
      },
    })

    if (!matched.length) {
      ElMessage.error('未能匹配到任何标签，请检查 Excel 中的 ID/名称/条码')
      return
    }

    const map = new Map<string | number, TagLabelRecord>()
    ;[...selectedLabels.value, ...matched].forEach((item) => {
      map.set(item.id, item)
    })
    selectedLabels.value = [...map.values()]

    if (unmatched.length) {
      ElMessage.warning(`成功导入 ${matched.length} 个标签，${unmatched.length} 行未匹配`)
    } else {
      ElMessage.success(`成功导入 ${matched.length} 个标签`)
    }
  } catch {
    ElMessage.error('文件格式错误，请检查 Excel 文件')
  } finally {
    importLoading.value = false
  }
}

async function handleDownloadTemplate() {
  await downloadTagLabelImportTemplate()
  ElMessage.success('模板已下载')
}

watch(selectedTemplateId, (value) => {
  void onTemplateChange(value)
})

onMounted(async () => {
  await loadTemplateOptions()
  if (labelIdsQuery.value.length) {
    await loadLabelsByIds(labelIdsQuery.value)
    return
  }
  if (labelId.value) {
    await loadSingleLabel()
    return
  }
  await fetchPickerList()
})
</script>

<template>
  <div v-loading="loading" class="tag-editor-page">
    <el-card v-if="isSingleMode" shadow="never">
      <template #header>
        <div class="tag-editor-page__header">
          <span>标签打印</span>
          <div>
            <el-button @click="goBatchMode">批量打印</el-button>
            <el-button @click="goBack">返回</el-button>
            <el-button type="primary" :disabled="!label" @click="handleSinglePrint">打印</el-button>
          </div>
        </div>
      </template>

      <template v-if="label">
        <el-descriptions :column="2" border class="tag-editor-page__info">
          <el-descriptions-item label="标签名称">{{ label.name }}</el-descriptions-item>
          <el-descriptions-item label="条码">{{ label.barcode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="尺寸">
            {{ labelConfig.width }} × {{ labelConfig.height }} {{ labelConfig.unit }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="tag-editor-page__preview-wrap">
          <p class="tag-editor-page__label">打印预览</p>
          <div id="tagEditorPrintArea" class="tag-editor-page__preview-box">
            <LabelPreview :design-elements="designElements" :label-config="labelConfig" />
          </div>
        </div>
      </template>
    </el-card>

    <template v-else>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card shadow="never" class="tag-editor-page__panel">
            <template #header>模板与操作</template>
            <el-form label-width="90px" size="small">
              <el-form-item label="打印模板">
                <el-select
                  v-model="selectedTemplateId"
                  filterable
                  clearable
                  placeholder="选择模板"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in templateOptions"
                    :key="item.id"
                    :label="`${item.name}${item.layout ? ` (${item.layout})` : ''}`"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item v-if="printLayout" label="每页容量">
                {{ labelsPerPage }} 个 / 共 {{ pageCount }} 页
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="openPicker">添加标签</el-button>
                <el-button :disabled="!selectedLabels.length" @click="clearLabels">清空</el-button>
              </el-form-item>
              <el-form-item>
                <el-button :loading="importLoading" @click="triggerImportExcel">导入 Excel</el-button>
                <el-button :disabled="!selectedLabels.length" @click="handleExportExcel">导出 Excel</el-button>
                <el-button link type="primary" @click="handleDownloadTemplate">下载导入模板</el-button>
              </el-form-item>
              <el-form-item>
                <el-button type="success" :disabled="!printLayout || !selectedLabels.length" @click="openBatchPrint">
                  批量打印
                </el-button>
                <el-button @click="goBack">返回</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :span="16">
          <el-card shadow="never">
            <template #header>待打印标签（{{ selectedLabels.length }}）</template>
            <el-empty v-if="!selectedLabels.length" description="请添加标签" />
            <div v-else class="tag-editor-page__list">
              <div v-for="item in selectedLabels" :key="item.id" class="tag-editor-page__list-item">
                <div class="tag-editor-page__list-preview">
                  <LabelPreview
                    :design-elements="parseLabelElements(item.elements)"
                    :label-config="parseLabelConfig(item.config)"
                  />
                </div>
                <div class="tag-editor-page__list-meta">
                  <div>{{ item.name }}</div>
                  <div class="tag-editor-page__list-barcode">{{ item.barcode || '-' }}</div>
                  <el-button type="danger" link @click="removeLabel(item.id)">移除</el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-dialog v-model="pickerVisible" title="选择标签" width="760px">
      <el-form :inline="true" @submit.prevent="fetchPickerList">
        <el-form-item label="标签名">
          <el-input v-model="pickerKeyword" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="pickerLoading" @click="fetchPickerList">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table
        v-loading="pickerLoading"
        :data="pickerList"
        max-height="400"
        @selection-change="pickerSelection = $event"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="barcode" label="条码" min-width="140" />
      </el-table>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker">确定</el-button>
      </template>
    </el-dialog>

    <TagTemplatePrintDialog
      v-model:visible="printDialogVisible"
      :layout="printLayout"
      :labels="selectedLabels"
    />

    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleImportExcel"
    />
  </div>
</template>

<style scoped lang="scss">
.tag-editor-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__panel {
    margin-bottom: 16px;
  }

  &__info {
    margin-bottom: 20px;
  }

  &__label {
    margin: 0 0 12px;
    color: #606266;
    font-size: 14px;
  }

  &__preview-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  &__preview-box {
    padding: 24px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    max-height: 680px;
    overflow-y: auto;
  }

  &__list-item {
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    padding: 12px;
    background: #fff;
  }

  &__list-preview {
    height: 120px;
    overflow: hidden;
    margin-bottom: 8px;
    border: 1px dashed #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
  }

  &__list-meta {
    font-size: 13px;
    color: #606266;
  }

  &__list-barcode {
    color: #909399;
    font-size: 12px;
    margin: 4px 0;
  }
}
</style>
