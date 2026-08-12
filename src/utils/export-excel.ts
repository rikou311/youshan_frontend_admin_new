import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const CENTER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
}

export interface ExportExcelOptions {
  header: string[]
  data: Array<Array<string | number | null | undefined>>
  filename: string
  merges?: string[]
  autoWidth?: boolean
  centerAlign?: boolean
}

function calcColumnWidths(rows: Array<Array<string | number | null | undefined>>) {
  const widths: number[] = []
  rows.forEach((row) => {
    row.forEach((val, colIndex) => {
      if (val === null || val === undefined || val === '') {
        return
      }
      const text = String(val)
      const len = text.charCodeAt(0) > 255 ? text.length * 2 : text.length
      widths[colIndex] = Math.max(widths[colIndex] ?? 10, len + 2)
    })
  })
  return widths
}

export async function exportJsonToExcel({
  header,
  data,
  filename,
  merges = [],
  autoWidth = true,
  centerAlign = false,
}: ExportExcelOptions) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sheet1')
  const rows = [header, ...data]

  rows.forEach((row) => {
    const excelRow = sheet.addRow(row)
    if (centerAlign) {
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = CENTER_ALIGNMENT
      })
    }
  })

  merges.forEach((range) => {
    sheet.mergeCells(range)
  })

  if (autoWidth) {
    calcColumnWidths(rows).forEach((width, index) => {
      sheet.getColumn(index + 1).width = width
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `${filename}.xlsx`)
}

export function promptExportFilename(defaultName: string) {
  const filename = window.prompt('请输入导出文件名', defaultName)
  if (!filename?.trim()) {
    return null
  }
  return filename.trim()
}
