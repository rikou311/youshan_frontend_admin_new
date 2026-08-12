/**
 * 出勤報告書 Excel 数据与合并单元格配置
 * @param {Object} opts
 * @param {[Date, Date]} opts.dateRange - [start, end] 报告期间
 * @param {Object} opts.employee - { empId, name, hireDate?, companyName? }
 * @param {Array} opts.records - 该员工在 dateRange 内的考勤记录 [{ createdAt, type, basicGive, hourlyWage, socialSecurity, startDate }, ...]
 * @param {Object} opts.typeLabels - 考勤类型字典 { '0': '出勤', '1': '年休', ... }
 * @param {string} opts.baseSalary - 基本給 如 '350,000'
 * @param {string} opts.payDate - 支給日 如 '2026/2/28'
 */
// @ts-nocheck
export function buildAttendanceReportSheet(opts) {
  const {
    dateRange,
    employee = {},
    records = [],
    typeLabels = {},
    baseSalary = '',
    payDate = ''
  } = opts

  const [start, end] = dateRange
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n
  }
  const year = startDate.getFullYear()
  const month = startDate.getMonth() + 1
  const periodStr = `${year}/${month}/${pad2(startDate.getDate())} ~ ${end.getFullYear()}/${end.getMonth() + 1}/${pad2(end.getDate())}`
  const titlePeriod = `${year}年${month}月度 (期間 ${periodStr})`
  const nextMonth = end.getMonth() + 2
  const payYear = nextMonth > 12 ? end.getFullYear() + 1 : end.getFullYear()
  const payMonth = nextMonth > 12 ? 1 : nextMonth
  const payDateStr = payDate || `${payYear}/${pad2(payMonth)}/28 支給`

  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const empName = employee.name ? (employee.empId ? employee.empId + ' ' + employee.name : employee.name) : (employee.empId || '')
  const hireDate = employee.hireDate || ''
  const companyName = employee.companyName || '株式会社 有善'
  const profileRecord = records && records.length > 0 ? records[0] : {}
  const basicGive = profileRecord.basicGive || ''
  const hourlyWage = Number(profileRecord.hourlyWage || 0)
  const socialSecurity = profileRecord.socialSecurity || ''
  const startDateRaw = profileRecord.startDate || hireDate || ''
  const employmentStartDate = startDateRaw
    ? String(startDateRaw).split('T')[0].replace(/-/g, '/')
    : ''
  const transportationExpense = profileRecord.transportationExp || ''
  const overtime = profileRecord.overtime || ''
  const specialAllowance = profileRecord.specialAllowance || ''

  function formatHHmm(dateObj) {
    return `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`
  }
  // 按日期聚合记录：dateKey -> { type0Time, type3Time, typeLabel }
  const recordByDate = {}
  records.forEach(r => {
    if (!r || !r.createdAt) return
    const rawCreatedAt = r.createdAt
    const d = new Date(typeof rawCreatedAt === 'string' ? rawCreatedAt.replace('T', ' ') : rawCreatedAt)
    if (Number.isNaN(d.getTime())) return
    const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    if (!recordByDate[dateKey]) {
      recordByDate[dateKey] = { type0Time: '', type3Time: '', typeLabel: '' }
    }
    const typeKey = String(r.type)
    if (typeKey === '0') {
      recordByDate[dateKey].type0Time = formatHHmm(d)
    } else if (typeKey === '3') {
      recordByDate[dateKey].type3Time = formatHHmm(d)
    } else {
      recordByDate[dateKey].typeLabel = typeLabels[typeKey] || ''
    }
  })

  const rows = []
  const merges = []

  // Row 0: 空
  rows.push([])

  // Row 1: 出勤報告書 (D1 起，合并多列)
  const row1 = []
  row1[3] = '出勤報告書'
  rows.push(row1)
  merges.push({ s: { r: 1, c: 3 }, e: { r: 1, c: 7 }})

  // Row 2: 期间 + 入社日/社保/扶養
  const row2 = []
  row2[0] = titlePeriod
  row2[8] = '入社日'
  row2[9] = employmentStartDate
  row2[12] = '社保'
  row2[13] = socialSecurity
  rows.push(row2)

  // Row 3: 支給日 + 会社名
  const row3 = []
  row3[0] = payDateStr
  row3[8] = '会社名'
  row3[9] = companyName
  rows.push(row3)

  // Row 4: 名前
  const row4 = []
  row4[8] = '名前'
  row4[9] = empName
  rows.push(row4)

  // Row 5: 基本給 + 給与支給サイクル
  const row5 = []
  row5[3] = hourlyWage > 0 ? '時給' : '基本給'
  row5[4] = hourlyWage > 0 ? hourlyWage : (basicGive || baseSalary)
  row5[5] = '残業代なし'
  row5[8] = '給与支給サイクル'
  row5[9] = '月末締、翌月末支払'
  rows.push(row5)

  // Row 6: 交通費 + 退職日
  const row6 = []
  row6[3] = '交通費'
  row6[4] = transportationExpense
  row6[8] = '退職日'
  row6[9] = ''
  rows.push(row6)

  // Row 7: 残業
  const row7 = []
  row7[3] = '残業'
  row7[4] = overtime
  rows.push(row7)

  // Row 8: 控除
  const row8 = []
  row8[3] = '控除'
  rows.push(row8)

  // Row 9: 特別手当
  const row9 = []
  row9[3] = '特別手当'
  row9[4] = specialAllowance
  rows.push(row9)

  // Row 10: 表头第一行
  const header1 = [
    '月/日', '', '祝日等',
    'タイムカード時刻', null, '就業時刻', null,
    '休憩時間', '勤務時間',
    '出勤時間詳細', null, null, null, null,
    '備考'
  ]
  rows.push(header1)
  merges.push({ s: { r: 10, c: 3 }, e: { r: 10, c: 4 }}) // タイムカード時刻
  merges.push({ s: { r: 10, c: 5 }, e: { r: 10, c: 6 }}) // 就業時刻
  merges.push({ s: { r: 10, c: 9 }, e: { r: 10, c: 13 }}) // 出勤時間詳細

  // Row 11: 表头第二行（子标题）
  const header2 = [
    '曜日', null, null,
    '開始', '終了', '開始', '終了',
    null, null,
    '日常', '日常残業', '深夜', '土曜日', '日曜日',
    null
  ]
  rows.push(header2)

  // 生成当月每一天，并记录周末行索引（0-based，用于背景色）
  const dataStartRow = 12
  const weekendRowIndices = []
  let rowIndex = dataStartRow
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()

  for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
    const d = new Date(time)
    const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendRowIndices.push(rowIndex)
    }
    const rec = recordByDate[dateKey]
    const monthDay = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
    const weekLabel = `(${weekdays[dayOfWeek]})`

    let timeCardStart = ''
    let timeCardEnd = ''
    let workStart = ''
    let workEnd = ''
    let breakTime = ''
    let workHours = ''
    let regular = ''
    let regularOvertime = ''
    let remark = ''

    if (rec) {
      // type=0 -> C列（左移后），type=3 -> D列（左移后）
      timeCardStart = rec.type0Time || ''
      timeCardEnd = rec.type3Time || ''
      remark = rec.typeLabel || ''
      if (timeCardStart || timeCardEnd) {
        workStart = '8:00'
        workEnd = '17:00'
        breakTime = '1:00'
        workHours = '8:00'
        regular = '8:00'
        regularOvertime = '0:00'
      }
    }

    const dataRow = [
      `${monthDay}${weekLabel}`, '', '',
      timeCardStart, timeCardEnd, workStart, workEnd,
      breakTime, workHours,
      regular, regularOvertime, '', '', '',
      remark
    ]
    rows.push(dataRow)
    rowIndex++
  }

  // 统一每行长度为 15 列，便于 XLSX 写入
  const colCount = 15
  const normalizedRows = rows.map(row => {
    const r = []
    for (let c = 0; c < colCount; c++) {
      r[c] = row[c] !== undefined && row[c] !== null ? row[c] : ''
    }
    return r
  })

  // 从 C 列开始整体左移 1 列（A、B 保持；C->B，D->C ...），避免 B 列空白
  const shiftedRows = normalizedRows.map((row) => {
    const next = []
    // A 列不动
    next[0] = row[0]
    // C 及其后全部左移一列到 B 开始
    for (let c = 2; c < row.length; c++) {
      next[c - 1] = row[c]
    }
    return next
  })
  const shiftedMerges = merges.map((m) => {
    const shiftCol = (col) => (col >= 2 ? col - 1 : col)
    return {
      s: { r: m.s.r, c: shiftCol(m.s.c) },
      e: { r: m.e.r, c: shiftCol(m.e.c) }
    }
  })

  return { rows: shiftedRows, merges: shiftedMerges, weekendRowIndices }
}

/** 判断是否为周末（用于后续可扩展橙色背景等） */
export function isWeekend(date) {
  const d = new Date(date)
  const day = d.getDay()
  return day === 0 || day === 6
}

/** 周末/节假日行背景色（浅橙），供 ExcelJS 使用 */
export const FILL_WEEKEND = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFFCE4D6' },
}

/** 表头行背景色（第 11、12 行：月/日～備考 两行标题），供 ExcelJS 使用 */
export const FILL_HEADER = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFE0E0E0' },
}

/** 单元格细边框，供 ExcelJS 使用 */
export const BORDER_THIN = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

/** 表格起始行（0-based），此行及以下才加边框；第 11、12 行（0-based 即 10、11）为表头加 FILL_HEADER */
export const TABLE_START_ROW = 10
