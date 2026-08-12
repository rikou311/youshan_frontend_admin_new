import type { MerchantOrderListItem } from '@/types/merchant-order'
import { formatDateToString } from '@/utils/format'
import { formatMerchantAddress } from '@/utils/merchant-order'

export interface PrintProductLine {
  pid?: number | string
  title: string
  count: number
  unit?: string
  price: number
  total: number
  tax?: number
  taxtype?: number
  home?: string
  time?: string | number
  pay?: number | string
}

export interface DeliveryPrintItem {
  id: number
  oid: number
  unick?: string
  ucode?: string
  address: string
  zip: string | number
  phone: string
  requestid: string
  memo?: string
  data: Record<string, PrintProductLine>
}

export interface RequestPrintCustomer {
  id: number
  unick?: string
  ucode?: string
  address: string
  zip?: string | number
  phone?: string
  requestid?: string
  name?: string
}

export interface RequestPrintRow extends PrintProductLine {
  orderId: string | number
  showDate?: boolean
  showOrderId?: boolean
  dateRowspan?: number
  orderIdRowspan?: number
}

export interface DeliveryPrintState {
  list: DeliveryPrintItem[]
  moneyTotal: Record<number, number>
  taxTotal: Record<number, number>
  totalList: Record<number, Record<string, number>>
  ld: Record<number, number>
  yf: Record<number, number>
  svf: Record<number, number>
  point: Record<number, number>
}

export interface RequestPrintState {
  list: Record<number, RequestPrintCustomer>
  datalist: Record<number, Record<string, Record<string, PrintProductLine>>>
  moneyTotal: Record<number, number>
  taxTotal: Record<number, number>
  totalList: Record<number, Record<string, number>>
  depositmoney: Record<number, number>
  reqmoney: Record<number, number>
  refunder: Record<number, Array<{ rid: string; total: number }>>
  ld: Record<number, number>
  yf: Record<number, number>
  svf: Record<number, number>
  point: Record<number, number>
  pointTotal: Record<number, number>
  otherCost: Record<number, Record<string, string>>
  pid: Record<number, unknown>
}

function parseOrderData(data: MerchantOrderListItem['data']) {
  if (!data) {
    return {} as Record<string, PrintProductLine>
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, PrintProductLine>
    } catch {
      return {}
    }
  }
  return data as Record<string, PrintProductLine>
}

function buildAddress(order: MerchantOrderListItem) {
  const formatted = formatMerchantAddress(order)
  if (order.merchantAddress) {
    return formatted
  }
  return order.address ?? formatted
}

/** 納品書旧版不含都道府県 */
function buildDeliveryAddress(order: MerchantOrderListItem) {
  const address = order.merchantAddress
  if (address) {
    return [address.city, address.town, address.address, address.building, address.roomnumber]
      .filter(Boolean)
      .join(' ')
  }
  return order.address ?? ''
}

function buildZip(order: MerchantOrderListItem) {
  if (order.merchantAddress?.postcode) {
    return order.merchantAddress.postcode
  }
  return order.zip ?? ''
}

function buildPhone(order: MerchantOrderListItem) {
  if (order.merchantAddress?.phone) {
    return order.merchantAddress.phone
  }
  return String(order.phone ?? '')
}

function accumulateTaxTotals(
  order: MerchantOrderListItem,
  dt: Record<string, PrintProductLine>,
  totalMoney: Record<string, number>,
) {
  let moneyTotal = 0
  let taxTotal = 0
  Object.values(dt).forEach((line) => {
    moneyTotal += Number(line.total ?? 0)
    const tax = order.taxState === 0 ? Number(line.tax ?? 0) : 0
    taxTotal += order.taxState === 0 ? (Number(line.total ?? 0) * tax) / 100 : 0
    const key = `${tax}_${line.taxtype ?? 0}`
    totalMoney[key] = (totalMoney[key] ?? 0) + Number(line.total ?? 0)
  })
  return { moneyTotal, taxTotal: Math.ceil(taxTotal), totalMoney }
}

export function buildDeliveryPrintState(
  orders: MerchantOrderListItem[],
  today = new Date(),
): DeliveryPrintState {
  const state: DeliveryPrintState = {
    list: [],
    moneyTotal: {},
    taxTotal: {},
    totalList: {},
    ld: {},
    yf: {},
    svf: {},
    point: {},
  }

  const requestPrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  orders.forEach((order) => {
    if (![0, 1, 4].includes(order.status)) {
      return
    }
    const dt = parseOrderData(order.data)
    const { moneyTotal, taxTotal, totalMoney } = accumulateTaxTotals(order, dt, {})

    state.list.push({
      id: order.uid ?? order.id,
      oid: order.id,
      unick: order.unick,
      ucode: order.ucode,
      address: buildDeliveryAddress(order),
      zip: buildZip(order),
      phone: buildPhone(order),
      requestid: `${requestPrefix}-${order.uid ?? order.id}-${order.id}`,
      memo: order.memo,
      data: dt,
    })

    state.moneyTotal[order.id] = moneyTotal
    state.taxTotal[order.id] = taxTotal
    state.totalList[order.id] = totalMoney
    state.ld[order.id] = Number(order.ld ?? 0)
    state.yf[order.id] = Number(order.yf ?? 0)
    state.svf[order.id] = Number(order.svf ?? 0)
    state.point[order.id] = Number(order.point ?? 0)
  })

  return state
}

export function buildRequestPrintState(
  orders: MerchantOrderListItem[],
): RequestPrintState {
  const state: RequestPrintState = {
    list: {},
    datalist: {},
    moneyTotal: {},
    taxTotal: {},
    totalList: {},
    depositmoney: {},
    reqmoney: {},
    refunder: {},
    ld: {},
    yf: {},
    svf: {},
    point: {},
    pointTotal: {},
    otherCost: {},
    pid: {},
  }

  orders
    .filter(
      (order) =>
        String(order.pay) === '1' &&
        [5, 2, 10, 12].includes(order.status),
    )
    .forEach((order) => {
      const uid = order.uid
      if (!uid) {
        return
      }

      // 旧版：status=5 会进入客户列表过滤，但不聚合明细（仅 2/10/12）
      const customer = state.list[uid] ?? {
        id: uid,
        unick: order.unick,
        ucode: order.ucode,
        address: buildAddress(order),
        zip: buildZip(order),
        phone: buildPhone(order),
        name: order.name,
      }
      state.list[uid] = customer

      if (![2, 10, 12].includes(order.status)) {
        return
      }

      const dt = parseOrderData(order.data)
      Object.values(dt).forEach((line) => {
        line.time = order.authenappend
        line.pay = order.pay
      })

      const totalMoney = { ...(state.totalList[uid] ?? {}) }
      const { moneyTotal, taxTotal } = accumulateTaxTotals(order, dt, totalMoney)
      state.totalList[uid] = totalMoney

      const orderMap = { ...(state.datalist[uid] ?? {}) }
      orderMap[String(order.id)] = dt
      state.datalist[uid] = orderMap

      state.moneyTotal[uid] = (state.moneyTotal[uid] ?? 0) + moneyTotal
      state.taxTotal[uid] = (state.taxTotal[uid] ?? 0) + taxTotal
      state.pointTotal[uid] = (state.pointTotal[uid] ?? 0) + Number(order.point ?? 0)
      state.ld[uid] = (state.ld[uid] ?? 0) + Number(order.ld ?? 0)
      state.yf[uid] = (state.yf[uid] ?? 0) + Number(order.yf ?? 0)
      state.svf[uid] = (state.svf[uid] ?? 0) + Number(order.svf ?? 0)
      state.point[uid] = (state.point[uid] ?? 0) + Number(order.point ?? 0)

      const otherCost = { ...(state.otherCost[uid] ?? {}) }
      if (order.yf || order.ld || order.point || order.svf) {
        otherCost[String(order.id)] =
          `${order.ld ? ` 运费:\t${order.yf}円  ` : ''}` +
          `${order.ld ? ` 冷藏费:\t${order.ld}円  ` : ''}` +
          `${order.point ? `积分:\t-${order.point}円  ` : ''}` +
          `${order.svf ? `货到付款费:\t${order.svf}円  ` : ''}`
      }
      state.otherCost[uid] = otherCost
    })

  return state
}

export function applyRefundAdjustments(state: RequestPrintState) {
  Object.keys(state.refunder).forEach((uidKey) => {
    const uid = Number(uidKey)
    const refunds = state.refunder[uid] ?? []
    let refundMoney = 0
    let orderMoney = (state.moneyTotal[uid] ?? 0) + (state.taxTotal[uid] ?? 0)

    refunds.forEach((item, index) => {
      refundMoney += item.total
      state.refunder[uid][index] = { ...item, total: item.total }
    })

    orderMoney -= refundMoney
    if (refundMoney > (state.moneyTotal[uid] ?? 0) + (state.taxTotal[uid] ?? 0)) {
      state.taxTotal[uid] = 0
    }
    state.moneyTotal[uid] = orderMoney - (state.taxTotal[uid] ?? 0)
  })
}

export function getRequestCustomers(state: RequestPrintState) {
  return Object.values(state.list).filter((item) => item.id)
}

function getOrderAuthenappend(dval: Record<string, PrintProductLine>) {
  const productKeys = Object.keys(dval)
  if (!productKeys.length) {
    return 0
  }
  return Number(dval[productKeys[0]]?.time ?? 0)
}

export function getRequestPagedRows(
  datalist: Record<string, Record<string, PrintProductLine>>,
  firstPageRows = 30,
  otherPageRows = 40,
) {
  const sortedOrderKeys = Object.keys(datalist).sort(
    (a, b) => getOrderAuthenappend(datalist[a]) - getOrderAuthenappend(datalist[b]),
  )

  const flatRows: Array<PrintProductLine & { orderId: string }> = []
  sortedOrderKeys.forEach((orderId) => {
    const orderData = datalist[orderId]
    Object.values(orderData).forEach((line) => {
      flatRows.push({ ...line, orderId })
    })
  })

  if (flatRows.length <= firstPageRows) {
    return [{ rows: processRequestRows(flatRows), isLastPage: true }]
  }

  const pages: Array<{ rows: RequestPrintRow[]; isLastPage: boolean }> = []
  let currentIndex = 0
  let pageIndex = 0
  while (currentIndex < flatRows.length) {
    const rowsPerPage = pageIndex === 0 ? firstPageRows : otherPageRows
    const pageRows = flatRows.slice(currentIndex, currentIndex + rowsPerPage)
    pages.push({
      rows: processRequestRows(pageRows),
      isLastPage: currentIndex + rowsPerPage >= flatRows.length,
    })
    currentIndex += rowsPerPage
    pageIndex += 1
  }
  return pages
}

function processRequestRows(rows: Array<PrintProductLine & { orderId: string }>) {
  const processedRows: RequestPrintRow[] = []
  let currentDate: string | number | undefined
  let currentOrderId: string | undefined
  let dateStartIndex = -1
  let orderIdStartIndex = -1

  rows.forEach((row) => {
    const processedRow: RequestPrintRow = { ...row, orderId: row.orderId }

    if (row.time !== currentDate) {
      if (dateStartIndex >= 0) {
        let dateCount = 0
        for (let i = dateStartIndex; i < processedRows.length; i += 1) {
          if (processedRows[i].time === currentDate) {
            dateCount += 1
          }
        }
        processedRows[dateStartIndex].dateRowspan = dateCount
      }
      currentDate = row.time
      dateStartIndex = processedRows.length
      processedRow.showDate = true
      processedRow.dateRowspan = 1
    } else {
      processedRow.showDate = false
    }

    if (row.orderId !== currentOrderId) {
      if (orderIdStartIndex >= 0) {
        let orderCount = 0
        for (let i = orderIdStartIndex; i < processedRows.length; i += 1) {
          if (processedRows[i].orderId === currentOrderId) {
            orderCount += 1
          }
        }
        processedRows[orderIdStartIndex].orderIdRowspan = orderCount
      }
      currentOrderId = row.orderId
      orderIdStartIndex = processedRows.length
      processedRow.showOrderId = true
      processedRow.orderIdRowspan = 1
    } else {
      processedRow.showOrderId = false
    }

    processedRows.push(processedRow)
  })

  if (dateStartIndex >= 0 && dateStartIndex < processedRows.length) {
    let dateCount = 0
    for (let i = dateStartIndex; i < processedRows.length; i += 1) {
      if (processedRows[i].time === currentDate) {
        dateCount += 1
      }
    }
    processedRows[dateStartIndex].dateRowspan = dateCount
  }

  if (orderIdStartIndex >= 0 && orderIdStartIndex < processedRows.length) {
    let orderCount = 0
    for (let i = orderIdStartIndex; i < processedRows.length; i += 1) {
      if (processedRows[i].orderId === currentOrderId) {
        orderCount += 1
      }
    }
    processedRows[orderIdStartIndex].orderIdRowspan = orderCount
  }

  return processedRows
}

export function truncatePrintTitle(title?: string) {
  if (!title) {
    return ''
  }
  if (title.length <= 18) {
    return title
  }
  return `${title.substring(0, 18)}...`
}

export function buildDeliveryRequisitionPayload(
  state: DeliveryPrintState,
  operator: string,
  today: Date,
) {
  const rdate = formatDateToString(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  return state.list.map((item) => ({
    id: item.requestid,
    requestob: JSON.stringify(item),
    datalist: '{}',
    moneytotal: state.moneyTotal[item.oid] ?? 0,
    taxtotal: state.taxTotal[item.oid] ?? 0,
    rdate,
    mtotal: JSON.stringify(state.totalList[item.oid] ?? {}),
    username: item.id,
    type: 0,
    creater: operator,
    updateuser: operator,
    state: 0,
    reqmoney: 0,
    depositmoney: 0,
    refundertotal: '{}',
    ld: state.ld[item.oid] ?? 0,
    yf: state.yf[item.oid] ?? 0,
    svf: state.svf[item.oid] ?? 0,
    pointtotal: 0,
    point: state.point[item.oid] ?? 0,
  }))
}

export function buildRequestRequisitionPayload(
  state: RequestPrintState,
  operator: string,
  today: Date,
) {
  const rdate = formatDateToString(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  return Object.values(state.list).map((customer) => {
    const uid = customer.id
    const refunds = state.refunder[uid] ?? []
    return {
      id: customer.requestid ?? '',
      requestob: JSON.stringify(customer),
      datalist: JSON.stringify(state.datalist[uid] ?? {}),
      moneytotal: state.moneyTotal[uid] ?? 0,
      taxtotal: state.taxTotal[uid] ?? 0,
      rdate,
      mtotal: JSON.stringify(state.totalList[uid] ?? {}),
      username: uid,
      type: 1,
      creater: operator,
      updateuser: operator,
      state: 0,
      reqmoney: state.reqmoney[uid] ?? 0,
      depositmoney: state.depositmoney[uid] ?? 0,
      refundertotal: refunds.length ? JSON.stringify(refunds) : null,
      pid: JSON.stringify(state.pid[uid] ?? {}),
      ld: state.ld[uid] ?? 0,
      yf: state.yf[uid] ?? 0,
      svf: state.svf[uid] ?? 0,
      othercost: JSON.stringify(state.otherCost[uid] ?? {}),
      pointtotal: state.pointTotal[uid] ?? 0,
      point: state.point[uid] ?? 0,
    }
  })
}

export function getDeliveryStatusUpdateMap(state: DeliveryPrintState) {
  const map: Record<string, number> = {}
  state.list.forEach((item) => {
    map[String(item.oid)] = 2
  })
  return map
}
