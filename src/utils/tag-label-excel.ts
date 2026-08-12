import ExcelJS from 'exceljs'
import type { TagLabelRecord } from '@/types/tag-label'
import { parseLabelConfig } from '@/types/tag-label'
import { exportJsonToExcel } from '@/utils/export-excel'

export const TAG_LABEL_IMPORT_HEADERS = ['标签ID', '标签名称', '条形码'] as const

export interface TagLabelImportRow {
  id?: number
  name?: string
  barcode?: string
}

export interface ResolveTagLabelOptions {
  queryById: (id: number | string) => Promise<TagLabelRecord>
  searchLabels: (keyword: string) => Promise<TagLabelRecord[]>
}

export function tagLabelSizeText(record: TagLabelRecord): string {
  const config = parseLabelConfig(record.config)
  return `${config.width} × ${config.height} ${config.unit}`
}

export async function exportTagLabelsToExcel(labels: TagLabelRecord[], filename?: string) {
  const header = ['标签ID', '标签名称', '条形码', '尺寸', '更新时间']
  const data = labels.map((item) => [
    item.id,
    item.name,
    item.barcode || '',
    tagLabelSizeText(item),
    item.updateTime || item.updatedAt || '',
  ])
  await exportJsonToExcel({
    header,
    data,
    filename: filename || `标签数据_${new Date().toISOString().slice(0, 10)}`,
  })
}

export async function downloadTagLabelImportTemplate() {
  await exportJsonToExcel({
    header: [...TAG_LABEL_IMPORT_HEADERS],
    data: [[1, '示例标签', '1234567890']],
    filename: '标签导入模板',
  })
}

function normalizeHeader(value: ExcelJS.CellValue): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function cellText(row: ExcelJS.Row, headerMap: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const col = headerMap.get(name.toLowerCase())
    if (col) {
      return String(row.getCell(col).value ?? '').trim()
    }
  }
  return ''
}

export async function parseTagLabelExcelFile(file: File): Promise<TagLabelImportRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Excel 文件为空')
  }

  const headerMap = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headerMap.set(normalizeHeader(cell.value), colNumber)
  })

  const rows: TagLabelImportRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }
    const idStr = cellText(row, headerMap, '标签id', 'id')
    const name = cellText(row, headerMap, '标签名称', 'name', '商品名称', 'productname')
    const barcode = cellText(row, headerMap, '条形码', 'barcode')
    if (!idStr && !name && !barcode) {
      return
    }
    rows.push({
      id: idStr ? Number(idStr) : undefined,
      name: name || undefined,
      barcode: barcode || undefined,
    })
  })

  return rows
}

export async function resolveTagLabelsFromImportRows(
  rows: TagLabelImportRow[],
  options: ResolveTagLabelOptions,
): Promise<{ matched: TagLabelRecord[]; unmatched: TagLabelImportRow[] }> {
  const matched: TagLabelRecord[] = []
  const unmatched: TagLabelImportRow[] = []
  const seenIds = new Set<string | number>()

  for (const row of rows) {
    let record: TagLabelRecord | null = null

    if (row.id && row.id > 0) {
      try {
        record = await options.queryById(row.id)
      } catch {
        record = null
      }
    }

    if (!record && row.barcode) {
      const list = await options.searchLabels(row.barcode)
      record = list.find((item) => item.barcode === row.barcode) ?? list[0] ?? null
    }

    if (!record && row.name) {
      const list = await options.searchLabels(row.name)
      record = list.find((item) => item.name === row.name) ?? list[0] ?? null
    }

    if (record && !seenIds.has(record.id)) {
      seenIds.add(record.id)
      matched.push(record)
    } else if (!record) {
      unmatched.push(row)
    }
  }

  return { matched, unmatched }
}
