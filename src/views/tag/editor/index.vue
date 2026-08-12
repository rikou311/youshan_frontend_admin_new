<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTagPrintList, getTagTemplateList, queryTagLabel, updateTagLabel } from '@/api/tag'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import type { LabelConfig, LabelElement, TagLabelRecord } from '@/types/tag-label'
import { parseLabelConfig, parseLabelElements } from '@/types/tag-label'
import { printBySelector } from '@/utils/print'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const templateOptions = ref<Array<{ id: number | string; name: string }>>([])
const labelOptions = ref<TagLabelRecord[]>([])
const selectedLabelIds = ref<Array<number | string>>([])
const previewLabels = ref<
  Array<{
    id: number | string
    name: string
    labelConfig: LabelConfig
    designElements: LabelElement[]
  }>
>([])

const form = reactive({
  templateId: '' as number | string | '',
  productName: '',
  rawMaterial: '',
  quantity: '',
  expiryDate: '',
  barcode: '',
})

const selectedCount = computed(() => selectedLabelIds.value.length)

async function loadOptions() {
  loading.value = true
  try {
    const [templates, labels] = await Promise.all([
      getTagTemplateList({ page: 1, pageSize: 100 }),
      getTagPrintList({ page: 1, pageSize: 200 }),
    ])
    templateOptions.value = templates.list.map((item) => ({ id: item.id, name: item.name }))
    labelOptions.value = labels.list
  } finally {
    loading.value = false
  }
}

function patchElements(elements: LabelElement[]): LabelElement[] {
  return elements.map((item) => {
    if (item.type === 'text') {
      const content = String(item.content ?? '')
      if (!content || /商品|名称|品名/.test(content)) {
        return { ...item, content: form.productName || content }
      }
      if (/原料|材料/.test(content)) {
        return { ...item, content: form.rawMaterial || content }
      }
      if (/数量|qty/i.test(content)) {
        return { ...item, content: form.quantity || content }
      }
      return item
    }
    if (item.type === 'expiryDate' && form.expiryDate) {
      return { ...item, expiryDate: form.expiryDate }
    }
    if (item.type === 'barcode' && form.barcode) {
      return { ...item, content: form.barcode }
    }
    return item
  })
}

async function applyToSelected() {
  if (!selectedLabelIds.value.length) {
    ElMessage.warning('请先选择要更新的标签')
    return
  }
  saving.value = true
  try {
    for (const id of selectedLabelIds.value) {
      const detail = await queryTagLabel(id)
      const elements = patchElements(parseLabelElements(detail.elements))
      await updateTagLabel({
        id: detail.id,
        name: detail.name,
        barcode: form.barcode || detail.barcode,
        config:
          typeof detail.config === 'string' ? detail.config : JSON.stringify(detail.config),
        elements: JSON.stringify(elements),
        updateTime: new Date(),
        updatetime: new Date(),
      })
    }
    ElMessage.success(`已更新 ${selectedLabelIds.value.length} 个标签`)
    await refreshPreview()
  } finally {
    saving.value = false
  }
}

async function refreshPreview() {
  if (!selectedLabelIds.value.length) {
    previewLabels.value = []
    return
  }
  const rows = await Promise.all(selectedLabelIds.value.slice(0, 6).map((id) => queryTagLabel(id)))
  previewLabels.value = rows.map((item) => ({
    id: item.id,
    name: item.name,
    labelConfig: parseLabelConfig(item.config),
    designElements: parseLabelElements(item.elements),
  }))
}

function handlePrint() {
  if (!previewLabels.value.length) {
    ElMessage.warning('请先选择标签并刷新预览')
    return
  }
  printBySelector('#tag-editor-print-area')
}

function goDesigner() {
  router.push('/tag/print/designer/index')
}

function goList() {
  router.push({ path: '/inventory/tagManagement/tag/print', query: { tab: 'list' } })
}

onMounted(() => {
  void loadOptions()
})
</script>

<template>
  <div class="tag-editor-page">
    <el-card shadow="never">
      <template #header>
        <div class="tag-editor-page__header">
          <span>标签内容编辑</span>
          <div>
            <el-button @click="goList">标签列表</el-button>
            <el-button type="primary" @click="goDesigner">打开设计器</el-button>
          </div>
        </div>
      </template>

      <el-row v-loading="loading" :gutter="16">
        <el-col :span="10">
          <el-form label-width="90px">
            <el-form-item label="模板筛选">
              <el-select v-model="form.templateId" clearable placeholder="全部模板" style="width: 100%">
                <el-option
                  v-for="item in templateOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="商品名称">
              <el-input v-model="form.productName" />
            </el-form-item>
            <el-form-item label="原材料">
              <el-input v-model="form.rawMaterial" />
            </el-form-item>
            <el-form-item label="数量">
              <el-input v-model="form.quantity" />
            </el-form-item>
            <el-form-item label="有效期">
              <el-date-picker
                v-model="form.expiryDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="条形码">
              <el-input v-model="form.barcode" />
            </el-form-item>
            <el-form-item label="目标标签">
              <el-select
                v-model="selectedLabelIds"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择标签"
                style="width: 100%"
                @change="refreshPreview"
              >
                <el-option
                  v-for="item in labelOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-space wrap>
                <el-button type="primary" :loading="saving" @click="applyToSelected">
                  批量写入 ({{ selectedCount }})
                </el-button>
                <el-button @click="refreshPreview">刷新预览</el-button>
                <el-button type="success" @click="handlePrint">打印预览</el-button>
              </el-space>
            </el-form-item>
          </el-form>
        </el-col>
        <el-col :span="14">
          <div id="tag-editor-print-area" class="tag-editor-page__preview">
            <el-empty v-if="!previewLabels.length" description="选择标签后显示预览" />
            <div v-for="item in previewLabels" :key="item.id" class="tag-editor-page__preview-item">
              <div class="tag-editor-page__preview-title">{{ item.name }}</div>
              <LabelPreview
                :design-elements="item.designElements"
                :label-config="item.labelConfig"
              />
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.tag-editor-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__preview {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 420px;
    max-height: 72vh;
    overflow: auto;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;
  }

  &__preview-item {
    padding: 12px;
    background: #fff;
    border-radius: 8px;
  }

  &__preview-title {
    margin-bottom: 8px;
    color: #606266;
    font-size: 13px;
  }
}
</style>
