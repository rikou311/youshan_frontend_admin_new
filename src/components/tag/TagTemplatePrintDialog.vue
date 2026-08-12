<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import TagTemplateBatchSheets from '@/components/tag/TagTemplateBatchSheets.vue'
import TagTemplateSheet from '@/components/tag/TagTemplateSheet.vue'
import type { TagLabelRecord } from '@/types/tag-label'
import type { TagTemplateLayoutForm } from '@/types/tag-template-layout'
import { printBySelector } from '@/utils/print'

interface Props {
  visible: boolean
  layout: TagTemplateLayoutForm | null
  label?: TagLabelRecord | null
  labels?: TagLabelRecord[]
}

const props = withDefaults(defineProps<Props>(), {
  label: null,
  labels: () => [],
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const printing = ref(false)
const zoomLevel = ref(1)

const isBatchMode = computed(() => (props.labels?.length ?? 0) > 0)

const printLabels = computed(() => {
  if (isBatchMode.value) {
    return props.labels ?? []
  }
  return props.label ? [props.label] : []
})

const dialogTitle = computed(() => {
  if (isBatchMode.value) {
    return props.layout ? `打印：${props.layout.templateName || '未命名'}` : '打印'
  }
  return '模板预览'
})

const paperSizeText = computed(() => {
  if (!props.layout) {
    return '-'
  }
  const { paperSize, paperWidth, paperHeight } = props.layout
  return `${paperSize} (${paperWidth}mm × ${paperHeight}mm)`
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      printing.value = false
      return
    }
    zoomLevel.value = 1
  },
)

function closeDialog() {
  emit('update:visible', false)
}

function zoomIn() {
  zoomLevel.value = Math.min(Number((zoomLevel.value + 0.1).toFixed(1)), 2)
}

function zoomOut() {
  zoomLevel.value = Math.max(Number((zoomLevel.value - 0.1).toFixed(1)), 0.3)
}

function resetZoom() {
  zoomLevel.value = 0.8
}

async function handlePrint() {
  if (!props.layout) {
    return
  }
  if (!printLabels.value.length) {
    ElMessage.warning('没有可打印的标签')
    return
  }
  printing.value = true
  const prevZoom = zoomLevel.value
  zoomLevel.value = 1
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 300))
  // 对齐旧版：@page size:auto，避免固定纸张尺寸 + 全量样式撑出空白第二页
  printBySelector('#tagTemplatePrintSheet', {
    pageMargin: '0mm',
    useOuterHtml: true,
  })
  zoomLevel.value = prevZoom
  printing.value = false
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="90%"
    top="3vh"
    destroy-on-close
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <!-- 单模板：对齐旧版「模板预览」 -->
    <div v-if="layout && !isBatchMode" class="template-preview">
      <div class="preview-info">
        <h3>{{ layout.templateName || '未命名模板' }}</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>纸张大小:</label>
            <span>{{ paperSizeText }}</span>
          </div>
          <div class="info-item">
            <label>标签尺寸:</label>
            <span>{{ layout.labelWidth }}mm × {{ layout.labelHeight }}mm</span>
          </div>
          <div class="info-item">
            <label>布局:</label>
            <span>{{ layout.rows }}行 × {{ layout.columns }}列</span>
          </div>
          <div class="info-item">
            <label>边距:</label>
            <span>左边距: {{ layout.marginLeft }}mm, 上边距: {{ layout.marginTop }}mm</span>
          </div>
          <div class="info-item">
            <label>间距:</label>
            <span>{{ layout.spacing }}mm</span>
          </div>
        </div>
      </div>

      <div class="preview-visual">
        <h4>标签布局预览</h4>
        <div class="preview-controls">
          <el-button link type="primary" :disabled="zoomLevel <= 0.3" @click="zoomOut">缩小</el-button>
          <span class="preview-controls__zoom">{{ Math.round(zoomLevel * 100) }}%</span>
          <el-button link type="primary" :disabled="zoomLevel >= 2" @click="zoomIn">放大</el-button>
          <el-button link type="primary" @click="resetZoom">重置</el-button>
        </div>
        <div class="preview-container">
          <div
            class="preview-area"
            :style="{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
            }"
          >
            <TagTemplateSheet
              id="tagTemplatePrintSheet"
              :layout="layout"
              :label="label"
              :print-mode="printing"
              scale-mode="one"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 批量打印（标签编辑器） -->
    <div v-else-if="layout" class="tag-template-print-dialog__batch">
      <div class="tag-template-print-dialog__batch-wrap">
        <TagTemplateBatchSheets :layout="layout" :labels="printLabels" />
      </div>
      <div id="tagTemplatePrintSheet" class="tag-template-print-dialog__print-area">
        <TagTemplateBatchSheets :layout="layout" :labels="printLabels" print-mode />
      </div>
    </div>

    <template #footer>
      <el-button @click="closeDialog">关闭</el-button>
      <el-button
        type="primary"
        :loading="printing"
        :disabled="!printLabels.length"
        @click="handlePrint"
      >
        打印
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.template-preview {
  padding: 20px;
}

.preview-info {
  margin-bottom: 30px;

  h3 {
    margin: 0 0 20px;
    color: #303133;
    border-bottom: 2px solid #409eff;
    padding-bottom: 10px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;

  label {
    font-weight: bold;
    color: #606266;
    margin-right: 10px;
    min-width: 80px;
  }

  span {
    color: #303133;
  }
}

.preview-visual {
  margin-top: 30px;

  h4 {
    margin: 0 0 20px;
    color: #303133;
    text-align: center;
  }
}

.preview-controls {
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;

  &__zoom {
    margin: 0 10px;
    color: #666;
  }
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 600px;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: auto;
}

.preview-area {
  display: inline-block;
  background-color: #fff;
}

.tag-template-print-dialog {
  &__batch-wrap {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: #f5f7fa;
    overflow: auto;
    max-height: 70vh;
  }

  &__print-area {
    position: absolute;
    left: -10000px;
    top: 0;
    width: auto;
    height: auto;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }
}

@media print {
  .preview-info,
  .preview-controls,
  .preview-visual h4 {
    display: none !important;
  }

  .preview-container {
    padding: 0;
    background: transparent;
    min-height: auto;
  }

  .preview-area {
    box-shadow: none !important;
    transform: none !important;
  }
}
</style>
