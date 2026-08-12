<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  addTagTemplate,
  getTagPrintList,
  queryTagTemplate,
  updateTagTemplate,
  type TagTemplateForm,
} from '@/api/tag'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import TagTemplatePrintDialog from '@/components/tag/TagTemplatePrintDialog.vue'
import type { TagLabelRecord } from '@/types/tag-label'
import {
  TAG_PAPER_SIZES,
  buildLabelGrid,
  buildTagTemplateSavePayload,
  createDefaultTagTemplateLayout,
  parseTagTemplateLayout,
  type TagTemplateLayoutForm,
} from '@/types/tag-template-layout'
import {
  buildTemplateLabelConfig,
  buildTemplateLabelElements,
  normalizeSelectedLabel,
  resolveTemplateLabel,
} from '@/utils/tag-template-print'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const labelOptions = ref<TagLabelRecord[]>([])
const zoomLevel = ref(0.75)
const printVisible = ref(false)

const form = reactive<TagTemplateLayoutForm>(createDefaultTagTemplateLayout())
/** 编辑时保留原创建时间 */
const existingCreateTime = ref<string | Date | number | undefined>()

const templateId = computed(() => Number(route.query.id || 0))

const previewStyle = computed(() => ({
  width: `${form.paperWidth}mm`,
  height: `${form.paperHeight}mm`,
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: 'top center',
}))

const labelCells = computed(() => buildLabelGrid(form))

const selectedLabelData = computed(() => resolveTemplateLabel(form, labelOptions.value))

const previewLabelConfig = computed(() => buildTemplateLabelConfig(form, selectedLabelData.value))

const previewElements = computed(() => buildTemplateLabelElements(selectedLabelData.value))

function onPaperSizeChange(size: TagTemplateLayoutForm['paperSize']) {
  if (size === 'A4' || size === 'A5') {
    form.paperWidth = TAG_PAPER_SIZES[size].width
    form.paperHeight = TAG_PAPER_SIZES[size].height
  }
}

async function loadLabels() {
  const result = await getTagPrintList({ page: 1, pageSize: 200 })
  labelOptions.value = result.list
}

async function loadTemplate() {
  if (!templateId.value) {
    return
  }
  loading.value = true
  try {
    const record = await queryTagTemplate(templateId.value)
    const layout = parseTagTemplateLayout(record.config)
    layout.id = record.id
    layout.templateName = layout.templateName || record.name
    layout.labelWidth = record.width || layout.labelWidth
    layout.labelHeight = record.height || layout.labelHeight
    layout.selectedLabel = normalizeSelectedLabel(
      record.selectedLabel ?? layout.selectedLabel,
      labelOptions.value,
    )
    existingCreateTime.value =
      record.createtime ??
      record.createTime ??
      (record as { create_time?: string }).create_time
    if (record.paperSize === 'A4' || record.paperSize === 'A5') {
      layout.paperSize = record.paperSize
      onPaperSizeChange(record.paperSize)
    }
    Object.assign(form, layout)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.templateName.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  saving.value = true
  try {
    const payload: TagTemplateForm = buildTagTemplateSavePayload(form)
    if (existingCreateTime.value !== undefined && existingCreateTime.value !== null && existingCreateTime.value !== '') {
      payload.createTime = existingCreateTime.value
      payload.createtime = existingCreateTime.value
    }
    if (templateId.value) {
      await updateTagTemplate(payload)
    } else {
      await addTagTemplate(payload)
    }
    ElMessage.success('保存成功')
    const from = typeof route.query.from === 'string' ? route.query.from : ''
    router.push(from || '/inventory/tagManagement/tag/print')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

function openPrint() {
  if (!form.selectedLabel) {
    ElMessage.warning('请先选择关联标签')
    return
  }
  printVisible.value = true
}

onMounted(async () => {
  await loadLabels()
  await loadTemplate()
})
</script>

<template>
  <div v-loading="loading" class="tag-template-settings">
    <el-card shadow="never">
      <template #header>
        <div class="tag-template-settings__header">
          <span>标签模板布局设置</span>
          <div>
            <el-button @click="goBack">返回</el-button>
            <el-button :disabled="!form.selectedLabel" @click="openPrint">打印</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form label-width="110px" size="small">
            <el-card shadow="never" class="tag-template-settings__section">
              <template #header>纸张设置</template>
              <el-form-item label="纸张大小">
                <el-select v-model="form.paperSize" @change="onPaperSizeChange">
                  <el-option label="A4 (210×297mm)" value="A4" />
                  <el-option label="A5 (148×210mm)" value="A5" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="form.paperSize === 'custom'" label="宽度(mm)">
                <el-input-number v-model="form.paperWidth" :min="50" :max="500" style="width: 100%" />
              </el-form-item>
              <el-form-item v-if="form.paperSize === 'custom'" label="高度(mm)">
                <el-input-number v-model="form.paperHeight" :min="50" :max="500" style="width: 100%" />
              </el-form-item>
            </el-card>

            <el-card shadow="never" class="tag-template-settings__section">
              <template #header>标签设置</template>
              <el-form-item label="标签宽度(mm)">
                <el-input-number v-model="form.labelWidth" :min="10" :max="200" style="width: 100%" />
              </el-form-item>
              <el-form-item label="标签高度(mm)">
                <el-input-number v-model="form.labelHeight" :min="10" :max="200" style="width: 100%" />
              </el-form-item>
            </el-card>

            <el-card shadow="never" class="tag-template-settings__section">
              <template #header>布局设置</template>
              <el-form-item label="行数">
                <el-input-number v-model="form.rows" :min="1" :max="20" style="width: 100%" />
              </el-form-item>
              <el-form-item label="列数">
                <el-input-number v-model="form.columns" :min="1" :max="10" style="width: 100%" />
              </el-form-item>
              <el-form-item label="左边距(mm)">
                <el-input-number v-model="form.marginLeft" :min="0" :max="50" style="width: 100%" />
              </el-form-item>
              <el-form-item label="上边距(mm)">
                <el-input-number v-model="form.marginTop" :min="0" :max="50" style="width: 100%" />
              </el-form-item>
              <el-form-item label="标签间距(mm)">
                <el-input-number v-model="form.spacing" :min="0" :max="20" style="width: 100%" />
              </el-form-item>
            </el-card>

            <el-card shadow="never" class="tag-template-settings__section">
              <template #header>模板信息</template>
              <el-form-item label="模板名称">
                <el-input v-model="form.templateName" />
              </el-form-item>
              <el-form-item label="关联标签">
                <el-select v-model="form.selectedLabel" filterable clearable style="width: 100%">
                  <el-option
                    v-for="item in labelOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
            </el-card>
          </el-form>
        </el-col>

        <el-col :span="16">
          <el-card shadow="never">
            <template #header>
              <div class="tag-template-settings__header">
                <span>布局预览</span>
                <el-slider v-model="zoomLevel" :min="0.4" :max="1.2" :step="0.05" style="width: 180px" />
              </div>
            </template>
            <div class="tag-template-settings__preview-wrap">
              <div class="tag-template-settings__paper" :style="previewStyle">
                <div
                  v-for="cell in labelCells"
                  :key="`${cell.row}-${cell.col}`"
                  class="tag-template-settings__cell"
                  :style="{
                    left: `${cell.left}mm`,
                    top: `${cell.top}mm`,
                    width: `${form.labelWidth}mm`,
                    height: `${form.labelHeight}mm`,
                  }"
                >
                  <LabelPreview
                    v-if="selectedLabelData"
                    :design-elements="previewElements"
                    :label-config="previewLabelConfig"
                  />
                  <span v-else class="tag-template-settings__placeholder">
                    {{ cell.row + 1 }}-{{ cell.col + 1 }}
                  </span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <TagTemplatePrintDialog
      v-model:visible="printVisible"
      :layout="form"
      :label="selectedLabelData"
    />
  </div>
</template>

<style scoped lang="scss">
.tag-template-settings {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__section {
    margin-bottom: 12px;
  }

  &__preview-wrap {
    display: flex;
    justify-content: center;
    padding: 24px;
    background: #f5f7fa;
    overflow: auto;
  }

  &__paper {
    position: relative;
    background: #fff;
    border: 2px solid #333;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  &__cell {
    position: absolute;
    border: 1px dashed #666;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
  }

  &__placeholder {
    color: #909399;
    font-size: 12px;
  }
}
</style>
