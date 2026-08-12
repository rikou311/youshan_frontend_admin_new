import { queryMerchantCommodity } from '@/api/merchant'
import type { MerchantOrderDetail, MerchantOrderLine, MerchantOrderListItem } from '@/types/merchant-order'
import {
  createEmptyOrderForm,
  DEFAULT_ORDER_TAX_RATE,
  recalcOrderTotals,
  type OrderCreateForm,
  type OrderFormLine,
} from '@/utils/order-form'

function parseOrderData(data: MerchantOrderListItem['data']) {
  if (!data) {
    return null
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, { total: number; tax?: number }>
    } catch {
      return null
    }
  }
  return data
}

export function enrichMerchantOrderRow<T extends MerchantOrderListItem>(row: T): T {
  const next = { ...row }
  const data = parseOrderData(next.data)
  let totald = 0

  if (data) {
    Object.values(data).forEach((item) => {
      if (next.taxState === 0) {
        totald += item.total + (item.total * (item.tax ?? 0)) / 100
      } else {
        totald += item.total
      }
    })
    totald = Math.ceil(totald)
    totald += (next.yf ?? 0) + (next.ld ?? 0) + (next.svf ?? 0) - (next.point ?? 0)
  } else if (next.total !== undefined) {
    totald = next.total
  }

  next.totald = totald
  return next
}

export function formatOrderTimestamp(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const raw = String(value)
  const timestamp = raw.length > 10 ? Number(raw) : Number(raw) * 1000
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function formatMerchantAddress(order: MerchantOrderListItem) {
  const address = order.merchantAddress
  if (address) {
    return [
      address.prefecture,
      address.city,
      address.town,
      address.address,
      address.building,
      address.roomnumber,
    ]
      .filter(Boolean)
      .join(' ')
  }
  return order.address ?? '-'
}

/** 对齐旧版列表「收货人」列：姓名 + [¥金额] */
export function formatMerchantOrderReceiver(order: MerchantOrderListItem) {
  const name = order.merchantAddress?.receive ?? order.name ?? ''
  return `${name} [¥${order.totald ?? 0}]`
}

export function parseMerchantOrderData(data: unknown) {
  if (!data) {
    return null
  }
  let parsed: unknown = data
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
    } catch {
      return null
    }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }
  return parsed as Record<string, MerchantOrderLine & { pid?: number; code?: string }>
}

export function merchantOrderDataToLines(data: unknown): OrderFormLine[] {
  const map = parseMerchantOrderData(data)
  if (!map) {
    return []
  }
  return Object.values(map).map((item) => ({
    pid: item.pid ?? 0,
    title: item.title,
    price: item.price,
    count: item.count,
    total: item.total ?? Number((item.price * item.count).toFixed(2)),
    tax: item.tax ?? DEFAULT_ORDER_TAX_RATE,
    taxtype: item.taxtype ?? 0,
    sku: item.sku ?? (item.pid ? `YS${item.pid}` : ''),
    unit: item.unit,
    pident: item.pident,
    home: item.home,
    code: item.code != null && item.code !== '' ? String(item.code) : '',
  }))
}

export function merchantDetailToCreateForm(detail: MerchantOrderDetail): OrderCreateForm {
  const form = createEmptyOrderForm()
  const orderlist =
    detail.orderlist?.length && detail.orderlist.every((line) => line.title)
      ? detail.orderlist.map((item) => ({
          pid: (item as OrderFormLine).pid ?? 0,
          title: item.title,
          price: item.price,
          count: item.count,
          total: item.total ?? item.price * item.count,
          tax: item.tax ?? DEFAULT_ORDER_TAX_RATE,
          taxtype: item.taxtype ?? 0,
          sku: item.sku,
          unit: item.unit,
          pident: item.pident,
          home: item.home,
          code: item.code != null && item.code !== '' ? String(item.code) : '',
        }))
      : merchantOrderDataToLines(detail.data)

  Object.assign(form, {
    status: 0,
    pay: detail.pay ?? 0,
    uid: detail.uid ?? 0,
    uname: detail.uname ?? '',
    ucode: detail.ucode ?? '',
    wechat: detail.wechat ?? '',
    wuliu: detail.wuliu ?? 0,
    pi: '',
    shtime:
      detail.shtime === '' || detail.shtime === undefined || detail.shtime === null
        ? ''
        : Number(detail.shtime),
    memo: detail.memo ?? '',
    name: detail.merchantAddress?.receive ?? detail.name ?? '',
    phone: detail.merchantAddress?.phone ?? detail.phone ?? '',
    zip: detail.merchantAddress?.postcode ?? detail.zip ?? '',
    address: detail.address ?? formatMerchantAddress(detail),
    yf: detail.yf ?? 0,
    svf: detail.svf ?? 0,
    ld: detail.ld ?? 0,
    taxState: detail.taxState ?? 0,
    taxtotal: detail.taxtotal ?? 0,
    orderlist,
  })
  recalcOrderTotals(form, false, true)
  return form
}

/** 历史订单 data 往往未存 code；复制时按 pid 回填商品编码 */
export async function hydrateOrderLineCodes(lines: OrderFormLine[]): Promise<void> {
  await Promise.all(
    lines.map(async (line) => {
      if (line.code || !line.pid) {
        return
      }
      try {
        const item = await queryMerchantCommodity(Math.abs(line.pid))
        if (item?.code != null && String(item.code) !== '') {
          line.code = String(item.code)
        }
      } catch {
        // 商品不存在或接口失败时保留空编码
      }
    }),
  )
}
