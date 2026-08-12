import type { LabelConfig, LabelElement } from '@/types/tag-label'
import { parseLabelConfig, parseLabelElements } from '@/types/tag-label'
import type { TagLabelRecord } from '@/types/tag-label'
import {
  TAG_PAPER_SIZES,
  parseTagTemplateLayout,
  type TagTemplateLayoutForm,
} from '@/types/tag-template-layout'

export function buildTemplateLabelConfig(
  layout: TagTemplateLayoutForm,
  label: TagLabelRecord | null,
  options?: { scaleMode?: 'fit' | 'one' },
): LabelConfig {
  const baseConfig = label ? parseLabelConfig(label.config) : null
  let scale = 1
  if (options?.scaleMode !== 'one' && baseConfig) {
    const baseWidthMm = baseConfig.unit === 'mm' ? baseConfig.width : baseConfig.width / 3.78
    const baseHeightMm = baseConfig.unit === 'mm' ? baseConfig.height : baseConfig.height / 3.78
    const scaleX = layout.labelWidth / baseWidthMm
    const scaleY = layout.labelHeight / baseHeightMm
    scale = Math.min(scaleX, scaleY, 1)
  }
  return {
    name: label?.name ?? layout.templateName,
    width: layout.labelWidth,
    height: layout.labelHeight,
    unit: 'mm',
    backgroundColor: baseConfig?.backgroundColor ?? '#ffffff',
    scale,
  }
}

export function buildTemplateLabelElements(label: TagLabelRecord | null): LabelElement[] {
  if (!label) {
    return []
  }
  return parseLabelElements(label.elements)
}

export function recordToTagTemplateLayout(record: {
  id?: number | string
  name: string
  width: number
  height: number
  config?: string
  paperSize?: string
  selectedLabel?: string | number | null
}): TagTemplateLayoutForm {
  const layout = parseTagTemplateLayout(record.config)
  if (record.id !== undefined && record.id !== null && record.id !== '') {
    layout.id = record.id as TagTemplateLayoutForm['id']
  }
  layout.templateName = layout.templateName || record.name
  layout.labelWidth = record.width || layout.labelWidth
  layout.labelHeight = record.height || layout.labelHeight
  const selected = record.selectedLabel ?? layout.selectedLabel
  layout.selectedLabel = selected === undefined || selected === null ? '' : selected
  if (record.paperSize === 'A4' || record.paperSize === 'A5') {
    layout.paperSize = record.paperSize
    layout.paperWidth = TAG_PAPER_SIZES[record.paperSize].width
    layout.paperHeight = TAG_PAPER_SIZES[record.paperSize].height
  }
  return layout
}

/** 旧版 selectedLabel 存标签 id；兼容历史按名称保存的数据 */
export function findLabelBySelectedKey(
  selectedLabel: string | number | null | undefined,
  labels: TagLabelRecord[],
): TagLabelRecord | null {
  if (selectedLabel === undefined || selectedLabel === null || selectedLabel === '') {
    return null
  }
  const key = String(selectedLabel)
  return (
    labels.find((item) => String(item.id) === key) ??
    labels.find((item) => item.name === key) ??
    null
  )
}

export function resolveTemplateLabel(
  layout: TagTemplateLayoutForm,
  labels: TagLabelRecord[],
): TagLabelRecord | null {
  return findLabelBySelectedKey(layout.selectedLabel, labels)
}

/** 将 selectedLabel 规范为选项里的 id，便于 el-select 回显 */
export function normalizeSelectedLabel(
  value: string | number | null | undefined,
  labels: TagLabelRecord[],
): string | number {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const matched = findLabelBySelectedKey(value, labels)
  return matched ? matched.id : value
}

export function chunkLabelsByPage(layout: TagTemplateLayoutForm, labels: TagLabelRecord[]) {
  const perPage = Math.max(1, layout.rows * layout.columns)
  const pages: TagLabelRecord[][] = []
  for (let index = 0; index < labels.length; index += perPage) {
    pages.push(labels.slice(index, index + perPage))
  }
  return pages
}
