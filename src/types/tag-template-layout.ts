export type TagPaperSize = 'A4' | 'A5' | 'custom'

export interface TagTemplateLayoutForm {
  id?: number | string
  templateName: string
  paperSize: TagPaperSize
  paperWidth: number
  paperHeight: number
  labelWidth: number
  labelHeight: number
  rows: number
  columns: number
  marginLeft: number
  marginTop: number
  spacing: number
  /** 关联标签 id（兼容旧数据里可能是名称） */
  selectedLabel: string | number
}

export const TAG_PAPER_SIZES: Record<Exclude<TagPaperSize, 'custom'>, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
}

export function createDefaultTagTemplateLayout(): TagTemplateLayoutForm {
  return {
    templateName: '',
    paperSize: 'A4',
    paperWidth: 210,
    paperHeight: 297,
    labelWidth: 60,
    labelHeight: 40,
    rows: 5,
    columns: 3,
    marginLeft: 5,
    marginTop: 5,
    spacing: 2,
    selectedLabel: '',
  }
}

export function parseTagTemplateLayout(raw?: string | TagTemplateLayoutForm | null): TagTemplateLayoutForm {
  const defaults = createDefaultTagTemplateLayout()
  if (!raw) {
    return defaults
  }
  if (typeof raw === 'string') {
    try {
      return { ...defaults, ...JSON.parse(raw) }
    } catch {
      return defaults
    }
  }
  return { ...defaults, ...raw }
}

export function buildLabelGrid(layout: TagTemplateLayoutForm) {
  const cells: Array<{ row: number; col: number; left: number; top: number }> = []
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.columns; col += 1) {
      cells.push({
        row,
        col,
        left: layout.marginLeft + col * (layout.labelWidth + layout.spacing),
        top: layout.marginTop + row * (layout.labelHeight + layout.spacing),
      })
    }
  }
  return cells
}

export function buildTagTemplateSavePayload(layout: TagTemplateLayoutForm) {
  const now: string | number | Date = new Date()
  return {
    id: layout.id,
    name: layout.templateName,
    width: layout.labelWidth,
    height: layout.labelHeight,
    config: JSON.stringify(layout),
    paperSize: layout.paperSize,
    labelSize: `${layout.labelWidth}×${layout.labelHeight}mm`,
    layout: `${layout.rows}×${layout.columns}`,
    selectedLabel: layout.selectedLabel,
    // 对齐旧版/后端：保存必传创建时间
    createTime: now,
    createtime: now,
  }
}
