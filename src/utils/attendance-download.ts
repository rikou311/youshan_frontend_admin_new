import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { downloadAttendanceRecord, type AttendanceRecordItem } from '@/api/employee'
import { getDictionaryMap } from '@/utils/dictionary'
import {
  BORDER_THIN,
  FILL_HEADER,
  FILL_WEEKEND,
  TABLE_START_ROW,
  buildAttendanceReportSheet,
} from '@/utils/attendanceReportExcel'

function resolveDateRange(createTimeArr?: Array<Date | string | number> | null): [Date, Date] {
  if (createTimeArr && createTimeArr.length === 2) {
    return [new Date(createTimeArr[0]), new Date(createTimeArr[1])]
  }
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [start, end]
}

/** 对齐旧版 download(type)：0=普通 1=特殊 */
export async function downloadAttendanceReport(
  empType: number,
  createTimeArr?: Array<Date | string | number> | null,
) {
  const dateRange = resolveDateRange(createTimeArr)
  const start = new Date(dateRange[0])
  start.setHours(0, 0, 0, 0)
  const end = new Date(dateRange[1])
  end.setHours(23, 59, 59, 999)

  const list =
    (await downloadAttendanceRecord({
      createTimeArr: [start, end],
      empType,
      state: 0,
    })) || []

  const typeLabels = getDictionaryMap('employee_checkin')
  const byEmployee: Record<
    string,
    {
      employee: { empId?: string; name?: string; rent?: string | number }
      records: AttendanceRecordItem[]
    }
  > = {}

  list.forEach((row) => {
    const key = String(row.empId ?? row.name ?? 'unknown')
    if (!byEmployee[key]) {
      byEmployee[key] = {
        employee: {
          empId: row.empId2,
          name: row.name,
          rent: row.rent,
        },
        records: [],
      }
    }
    byEmployee[key].records.push(row)
  })

  const employees = Object.keys(byEmployee).length
    ? Object.values(byEmployee)
    : [{ employee: { empId: '', name: '未选择员工' }, records: [] as AttendanceRecordItem[] }]

  const wb = new ExcelJS.Workbook()
  employees.forEach(({ employee: emp, records }) => {
    const { rows, merges, weekendRowIndices } = buildAttendanceReportSheet({
      dateRange,
      employee: emp,
      records,
      typeLabels,
      baseSalary: '0',
      payDate: '',
    })
    const rawSheetName = `${emp.name || ''}` || '出勤報告書'
    const safeBaseSheetName = rawSheetName.replace(/[:\\/?*[\]]/g, '').trim() || 'Sheet'
    const sheetName = `${safeBaseSheetName}_${emp.empId || ''}`.slice(0, 31)
    const ws = wb.addWorksheet(sheetName)

    rows.forEach((row: unknown[], r: number) => {
      const rowNum = r + 1
      const isTableRow = r >= TABLE_START_ROW
      const isHeaderRow = r === TABLE_START_ROW || r === TABLE_START_ROW + 1
      const isDateRow = r >= 12
      row.forEach((val, c) => {
        const cell = ws.getCell(rowNum, c + 1)
        cell.value = val !== '' ? (val as ExcelJS.CellValue) : null
        if (isTableRow) {
          cell.border = BORDER_THIN
        }
        if (isHeaderRow) {
          cell.fill = FILL_HEADER
        } else if (weekendRowIndices && weekendRowIndices.indexOf(r) !== -1) {
          cell.fill = FILL_WEEKEND
        }
      })

      if (isDateRow) {
        const dateText = String(row[0] || '')
        const isSaturday = dateText.includes('(土)')
        const isSunday = dateText.includes('(日)')
        ws.getCell(`E${rowNum}`).value = {
          formula: `IF(C${rowNum}="","",CEILING(C${rowNum},TIME(0,15,0)))`,
        }
        ws.getCell(`F${rowNum}`).value = {
          formula: `IF(OR(D${rowNum}="",C${rowNum}=""),"",IF(MOD(D${rowNum}-C${rowNum},1)<TIME(0,15,0),"",FLOOR(D${rowNum},TIME(0,15,0))))`,
        }
        ws.getCell(`G${rowNum}`).value = {
          formula: `IF(OR(C${rowNum}="",D${rowNum}=""),"",IF(MOD(D${rowNum}-C${rowNum},1)>TIME(4,0,0),TIME(1,0,0),TIME(0,0,0)))`,
        }
        ws.getCell(`H${rowNum}`).value = {
          formula: `IF(OR(E${rowNum}="",F${rowNum}="",G${rowNum}=""),"",(IF(F${rowNum}<E${rowNum},F${rowNum}+1,F${rowNum})-E${rowNum})-G${rowNum})`,
        }
        if (isSaturday || isSunday) {
          ws.getCell(`I${rowNum}`).value = null
          ws.getCell(`J${rowNum}`).value = null
          ws.getCell(`K${rowNum}`).value = null
          if (isSaturday) {
            ws.getCell(`L${rowNum}`).value = { formula: `+H${rowNum}` }
            ws.getCell(`M${rowNum}`).value = null
            ws.getCell(`N${rowNum}`).value = '1.25残業計算'
          } else {
            ws.getCell(`L${rowNum}`).value = null
            ws.getCell(`M${rowNum}`).value = { formula: `+H${rowNum}` }
            ws.getCell(`N${rowNum}`).value = '1.35残業計算'
          }
        } else {
          ws.getCell(`I${rowNum}`).value = {
            formula: `IF(OR(E${rowNum}="",F${rowNum}="",G${rowNum}=""),"",MIN(TIME(8,0,0),MAX(0,MIN(IF(F${rowNum}<E${rowNum},F${rowNum}+1,F${rowNum}),INT(E${rowNum})+TIME(22,0,0))-MAX(E${rowNum},INT(E${rowNum})+TIME(5,0,0)))+MAX(0,MIN(IF(F${rowNum}<E${rowNum},F${rowNum}+1,F${rowNum}),INT(E${rowNum})+1+TIME(22,0,0))-MAX(E${rowNum},INT(E${rowNum})+1+TIME(5,0,0)))))`,
          }
          ws.getCell(`J${rowNum}`).value = {
            formula: `IF(H${rowNum}="","",IF(H${rowNum}-N(I${rowNum})-N(K${rowNum})>0,H${rowNum}-N(I${rowNum})-N(K${rowNum}),""))`,
          }
          ws.getCell(`K${rowNum}`).value = {
            formula: `IF(OR(E${rowNum}="",F${rowNum}="",G${rowNum}=""),"",MAX(0,MIN(IF(F${rowNum}<E${rowNum},F${rowNum}+1,F${rowNum}),INT(E${rowNum})+1+TIME(5,0,0))-MAX(E${rowNum},INT(E${rowNum})+TIME(22,0,0))-G${rowNum}))`,
          }
          ws.getCell(`L${rowNum}`).value = null
          ws.getCell(`M${rowNum}`).value = null
          ws.getCell(`N${rowNum}`).value = null
        }
        ;['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach((col) => {
          ws.getCell(`${col}${rowNum}`).numFmt = '[h]:mm'
        })
      }
    })

    if (merges?.length) {
      merges.forEach((m: { s: { r: number; c: number }; e: { r: number; c: number } }) => {
        ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1)
      })
    }

    for (let r = 6; r <= 10; r++) {
      const cCell = ws.getCell(r, 3)
      cCell.fill = FILL_HEADER
      cCell.border = BORDER_THIN
      ws.getCell(r, 4).border = BORDER_THIN
    }
    for (let r = 3; r <= 7; r++) {
      const hCell = ws.getCell(r, 8)
      hCell.fill = FILL_HEADER
      hCell.border = BORDER_THIN
      try {
        ws.mergeCells(`I${r}:J${r}`)
      } catch {
        // ignore already merged
      }
      ws.getCell(r, 9).border = BORDER_THIN
    }
    if (emp.rent !== undefined && emp.rent !== null && String(emp.rent) !== '') {
      ws.getCell('C9').value = '家賃'
      ws.getCell('D9').value = emp.rent as ExcelJS.CellValue
    }

    const lastDataRow = rows.length
    const totalRow = lastDataRow + 1
    ws.getCell(`C${totalRow}`).value = { formula: `COUNTA(C13:C${lastDataRow})` }
    ws.getCell(`H${totalRow}`).value = { formula: `SUM(H13:H${lastDataRow})` }
    ws.getCell(`I${totalRow}`).value = { formula: `SUM(I13:I${lastDataRow})` }
    ws.getCell(`J${totalRow}`).value = { formula: `SUM(J13:J${lastDataRow})` }
    ws.getCell(`K${totalRow}`).value = { formula: `SUM(K13:K${lastDataRow})` }
    ws.getCell(`L${totalRow}`).value = { formula: `SUM(L13:L${lastDataRow})` }
    ws.getCell(`M${totalRow}`).value = { formula: `SUM(M13:M${lastDataRow})` }
    ;['C', 'H', 'I', 'J', 'K', 'L', 'M'].forEach((col) => {
      ws.getCell(`${col}${totalRow}`).border = BORDER_THIN
    })
    ;['H', 'I', 'J', 'K', 'L', 'M'].forEach((col) => {
      ws.getCell(`${col}${totalRow}`).numFmt = '[h]:mm'
    })
  })

  const buf = await wb.xlsx.writeBuffer()
  const filename = `出勤報告書_${dateRange[0].getFullYear()}年${dateRange[0].getMonth() + 1}月.xlsx`
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  )
}
