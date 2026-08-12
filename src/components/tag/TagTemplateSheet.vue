<script setup lang="ts">
import { computed } from 'vue'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import type { TagLabelRecord } from '@/types/tag-label'
import { buildLabelGrid, type TagTemplateLayoutForm } from '@/types/tag-template-layout'
import { buildTemplateLabelConfig, buildTemplateLabelElements } from '@/utils/tag-template-print'

interface Props {
  layout: TagTemplateLayoutForm
  label?: TagLabelRecord | null
  cellLabels?: TagLabelRecord[]
  printMode?: boolean
  /** 旧版模板预览打印使用 1:1；设置页预览使用 fit */
  scaleMode?: 'fit' | 'one'
}

const props = withDefaults(defineProps<Props>(), {
  label: null,
  cellLabels: () => [],
  printMode: false,
  scaleMode: 'fit',
})

const cells = computed(() => buildLabelGrid(props.layout))

const paperStyle = computed(() => ({
  width: `${props.layout.paperWidth}mm`,
  height: `${props.layout.paperHeight}mm`,
}))

function resolveCellLabel(index: number) {
  if (props.cellLabels?.length) {
    return props.cellLabels[index] ?? null
  }
  return props.label
}

function cellElements(index: number) {
  return buildTemplateLabelElements(resolveCellLabel(index))
}

function cellConfig(index: number) {
  return buildTemplateLabelConfig(props.layout, resolveCellLabel(index), {
    scaleMode: props.scaleMode,
  })
}

function fallbackTitle(label: TagLabelRecord | null) {
  if (!label) {
    return '商品名称'
  }
  const row = label as TagLabelRecord & { productName?: string }
  return row.productName || label.name || '商品名称'
}

function fallbackField(label: TagLabelRecord | null, key: string, defaultValue: string) {
  if (!label) {
    return defaultValue
  }
  const row = label as unknown as Record<string, unknown>
  const value = row[key]
  return value === undefined || value === null || value === '' ? defaultValue : String(value)
}
</script>

<template>
  <div
    class="tag-template-sheet"
    :class="{ 'tag-template-sheet--print': printMode }"
    :style="paperStyle"
  >
    <div
      v-for="(cell, index) in cells"
      :key="`${cell.row}-${cell.col}`"
      class="tag-template-sheet__cell"
      :style="{
        left: `${cell.left}mm`,
        top: `${cell.top}mm`,
        width: `${layout.labelWidth}mm`,
        height: `${layout.labelHeight}mm`,
      }"
    >
      <LabelPreview
        v-if="resolveCellLabel(index) && cellElements(index).length > 0"
        :design-elements="cellElements(index)"
        :label-config="cellConfig(index)"
      />
      <div v-else-if="resolveCellLabel(index)" class="tag-template-sheet__fallback">
        <div class="tag-template-sheet__fallback-title">
          {{ fallbackTitle(resolveCellLabel(index)) }}
        </div>
        <div class="tag-template-sheet__fallback-info">
          原材料: {{ fallbackField(resolveCellLabel(index), 'rawMaterial', '未设置') }}
        </div>
        <div class="tag-template-sheet__fallback-info">
          数量: {{ fallbackField(resolveCellLabel(index), 'quantity', '未设置') }}
        </div>
        <div class="tag-template-sheet__fallback-info">
          有效期: {{ fallbackField(resolveCellLabel(index), 'expiryDate', '未设置') }}
        </div>
        <div class="tag-template-sheet__fallback-barcode">
          {{ fallbackField(resolveCellLabel(index), 'barcode', '无条码') }}
        </div>
      </div>
      <span v-else class="tag-template-sheet__placeholder">{{ cell.row + 1 }}-{{ cell.col + 1 }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tag-template-sheet {
  position: relative;
  background: #fff;
  box-sizing: border-box;

  &--print {
    border: none;
    box-shadow: none;
  }

  &:not(&--print) {
    border: 2px solid #333;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  &__cell {
    position: absolute;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    padding: 2px;

    .tag-template-sheet:not(.tag-template-sheet--print) & {
      border: 2px dashed #666;
    }
  }

  &__fallback {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 8px;
    line-height: 1.2;
    padding: 2px;
    box-sizing: border-box;
  }

  &__fallback-title {
    font-weight: bold;
    font-size: 10px;
    margin-bottom: 2px;
    color: #333;
  }

  &__fallback-info {
    font-size: 10px;
    margin-bottom: 1px;
    color: #666;
  }

  &__fallback-barcode {
    font-family: monospace;
    font-size: 8px;
    color: #999;
    text-align: center;
    margin-top: 2px;
  }

  &__placeholder {
    color: #909399;
    font-size: 12px;
  }
}

@media print {
  .tag-template-sheet {
    border: none !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }

  .tag-template-sheet__cell {
    border: none !important;
  }
}
</style>
