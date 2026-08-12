export function formatPostcode(value?: string | number | null) {
  if (!value) {
    return ''
  }
  const result = String(value)
  if (result.length !== 7) {
    return result
  }
  return `${result.substring(0, 3)}-${result.substring(3)}`
}

export function formatMoneyJp(value?: number | string | null) {
  const num = Math.ceil(parseFloat(String(value ?? 0)))
  if (Number.isNaN(num)) {
    return '0円'
  }
  return `${num.toString().replace(/\d(?=(\d{3})+$)/g, '$&,')}円`
}

export function formatTimestampJp(value?: string | number | null, format = 'YYYY/MM/DD') {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const raw = String(value)
  const multiplier = raw.length > 10 ? 1 : 1000
  const date = new Date(Number(raw) * multiplier)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (format === 'YYYY/MM/DD') {
    return `${year}/${month}/${day}`
  }
  return `${year}${month}${day}`
}

/** 对齐旧版 date_format_sec：秒/毫秒时间戳 → YYYY-MM-DD HH:mm:ss */
export function formatDateTimeSec(
  value?: string | number | null,
  formatStr = 'YYYY-MM-DD HH:mm:ss',
) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const raw = String(value).trim()
  if (!raw) {
    return ''
  }
  const num = Number(raw)
  if (!Number.isFinite(num)) {
    return raw
  }
  const multiplier = raw.length > 10 ? 1 : 1000
  const date = new Date(num * multiplier)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  if (formatStr === 'YYYY-MM-DD HH:mm:ss') {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

export function formatDateToString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonthRangeLabel(today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return `${formatTimestampJp(start.getTime())} - ${formatTimestampJp(end.getTime())}`
}
