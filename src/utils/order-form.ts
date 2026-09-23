import type { MerchantOrderLine } from '@/types/merchant-order'

export const DEFAULT_ORDER_TAX_RATE = 8

export interface OrderFormLine extends MerchantOrderLine {
  pid: number
  pident?: string
  unit?: string
  code?: string
  /** 库存（扫码查商品后写入；勿与行金额 total 混淆） */
  stock?: number
}

export interface OrderCreateForm {
  paid?: number
  payid?: number | string
  oid?: string
  status: number | string
  pay: number | string
  uid?: number
  uname: string
  ucode?: string
  unick?: string
  umail?: string
  mobile?: string
  wechat?: string
  fapiao?: string
  taitou?: string
  wuliu: number | string
  pi?: string
  view?: string
  view2?: string
  shtime?: string | number
  shtimeArr?: Array<string | number>
  memo?: string
  name: string
  phone: string | number
  zip: string
  city?: string
  address: string
  addressid?: number | string | ''
  yf: number
  svf: number
  ld: number
  lc?: number
  total: number
  totald?: number
  taxtotal?: number
  taxState?: number
  /** 本单使用的积分（从用户积分带出，由勾选控制是否使用） */
  point?: number
  totalJp: number
  rate?: number
  pointState?: number
  saleStatState?: number
  orderlist: OrderFormLine[]
  data?: string
  authenip?: string
  authenua?: string
  authenoperator?: string
  authenstamp?: string
  authenaddress?: string
  authenlocation?: string
  authenappendip?: string
  authenappendua?: string
  authenappendoperator?: string
  /** 下单时间：秒/毫秒时间戳或字符串 */
  authenappend?: string | number
  authenappendaddress?: string
  authenappendlocation?: string
  authenmodifyip?: string
  authenmodifyua?: string
  authenmodifyoperator?: string
  authenmodify?: string
  authenmodifyaddress?: string
  authenmodifylocation?: string
}

export function createEmptyOrderForm(): OrderCreateForm {
  return {
    paid: 0,
    payid: 0,
    oid: '',
    status: 0,
    pay: 0,
    uid: 0,
    uname: '',
    ucode: '',
    unick: '',
    umail: '',
    mobile: '',
    wechat: '',
    fapiao: '',
    taitou: '',
    wuliu: '',
    pi: '',
    view: '',
    view2: '',
    shtime: '',
    shtimeArr: [],
    memo: '',
    name: '',
    phone: '',
    zip: '',
    city: '',
    address: '',
    addressid: '',
    yf: 0,
    svf: 0,
    ld: 0,
    lc: 0,
    total: 0,
    totald: 0,
    totalJp: 0,
    taxtotal: 0,
    rate: 0,
    taxState: 0,
    point: 0,
    pointState: 1,
    saleStatState: 0,
    orderlist: [],
    data: '',
    authenip: '',
    authenua: '',
    authenoperator: '',
    authenstamp: '',
    authenaddress: '',
    authenlocation: '',
    authenappendip: '',
    authenappendua: '',
    authenappendoperator: '',
    authenappend: '',
    authenappendaddress: '',
    authenappendlocation: '',
    authenmodifyip: '',
    authenmodifyua: '',
    authenmodifyoperator: '',
    authenmodify: '',
    authenmodifyaddress: '',
    authenmodifylocation: '',
  }
}

export function recalcLineTotal(line: OrderFormLine) {
  line.total = Number((line.price * line.count).toFixed(2))
}

export function recalcOrderTotals(form: OrderCreateForm, includeLc = true, includeTax = false) {
  form.total = form.orderlist.reduce((sum, line) => {
    if (!line.pid) {
      return sum
    }
    return sum + Number(line.price || 0) * Number(line.count || 0)
  }, 0)

  let taxtotal = 0
  if (includeTax) {
    taxtotal = form.orderlist.reduce((sum, line) => {
      if (!line.pid) {
        return sum
      }
      const rate = Number(line.tax ?? DEFAULT_ORDER_TAX_RATE)
      return sum + line.price * line.count * (rate / 100)
    }, 0)
    taxtotal = Math.ceil(taxtotal)
    form.taxtotal = form.taxState === 0 ? taxtotal : 0
  }

  form.totalJp = Number(
    (
      Number(form.svf || 0) +
      Number(form.total || 0) +
      Number(includeTax ? form.taxtotal || 0 : 0) +
      Number(form.yf || 0) +
      Number(form.ld || 0) +
      (includeLc ? Number(form.lc || 0) : 0) -
      Number(form.point || 0)
    ).toFixed(2),
  )
}

export function buildOrderDataPayload(orderlist: OrderFormLine[]) {
  const data: Record<string, unknown> = {}
  orderlist.forEach((item) => {
    if (!item.pid) {
      return
    }
    let pid = item.pid
    if (item.count < 0) {
      pid = -1 * item.pid
    }
    data[`PID${pid}`] = {
      pid,
      title: item.title,
      count: item.count,
      pident: item.pident ?? '',
      price: item.price,
      total: item.count * item.price,
      unit: item.unit ?? '',
      tax: item.tax ?? DEFAULT_ORDER_TAX_RATE,
      taxtype: item.taxtype ?? 0,
      home: item.home ?? '',
      code: item.code ?? '',
    }
  })
  return JSON.stringify(data)
}

export function prepareOrderSubmitPayload(
  form: OrderCreateForm,
  operator: string,
  options?: { includeLc?: boolean; useShtimeArray?: boolean; includeTax?: boolean },
) {
  const includeLc = options?.includeLc ?? true
  const useShtimeArray = options?.useShtimeArray ?? true
  const includeTax = options?.includeTax ?? true
  recalcOrderTotals(form, includeLc, includeTax)
  const payload: Record<string, unknown> = {
    ...form,
    paid: form.paid ?? 0,
    payid: form.payid ?? 0,
    oid: form.oid ?? '',
    fapiao: form.fapiao ?? '',
    taitou: form.taitou ?? '',
    view: form.view ?? '',
    view2: form.view2 ?? '',
    totald: form.totald ?? 0,
    rate: form.rate ?? 0,
    pointState: form.pointState ?? 1,
    saleStatState: form.saleStatState ?? 0,
    umail: form.umail ?? '',
    mobile: form.mobile ?? '',
    unick: form.uid ? form.uname : '',
    data: buildOrderDataPayload(form.orderlist),
    authenoperator: operator,
    authenappendoperator: operator,
    authenmodifyoperator: operator,
    authenip: form.authenip ?? '',
    authenua: form.authenua ?? '',
    authenstamp: form.authenstamp ?? '',
    authenaddress: form.authenaddress ?? '',
    authenlocation: form.authenlocation ?? '',
    authenappendip: form.authenappendip ?? '',
    authenappendua: form.authenappendua ?? '',
    authenappend: form.authenappend ?? '',
    authenappendaddress: form.authenappendaddress ?? '',
    authenappendlocation: form.authenappendlocation ?? '',
    authenmodifyip: form.authenmodifyip ?? '',
    authenmodifyua: form.authenmodifyua ?? '',
    authenmodify: form.authenmodify ?? '',
    authenmodifyaddress: form.authenmodifyaddress ?? '',
    authenmodifylocation: form.authenmodifylocation ?? '',
  }
  // 前端表格用，后端不需要
  delete payload.shtimeArr
  if (useShtimeArray) {
    payload.shtime = (form.shtimeArr ?? []).join(',')
  }
  return payload
}

export function prepareOrderUpdatePayload(
  id: number,
  form: OrderCreateForm,
  operator: string,
  options?: {
    includeLc?: boolean
    useShtimeArray?: boolean
    includeTax?: boolean
    /** 原始订单：保留创建/修改时间等审计字段，对齐旧版 update */
    baseOrder?: Record<string, unknown> | null
  },
) {
  const { baseOrder, ...submitOptions } = options ?? {}
  const formPayload = prepareOrderSubmitPayload(form, operator, submitOptions)

  // 更新时不要用空串覆盖原单的创建/修改时间等字段
  const auditKeys = [
    'authenip',
    'authenua',
    'authenoperator',
    'authenstamp',
    'authenaddress',
    'authenlocation',
    'authenappendip',
    'authenappendua',
    'authenappendoperator',
    'authenappend',
    'authenappendaddress',
    'authenappendlocation',
    'authenmodifyip',
    'authenmodifyua',
    'authenmodify',
    'authenmodifyaddress',
    'authenmodifylocation',
    'paid',
    'payid',
    'oid',
    'uid',
    'umail',
    'mobile',
    'rate',
    'totald',
    'fapiao',
    'taitou',
    'view',
    'view2',
  ] as const

  const preserved: Record<string, unknown> = {}
  if (baseOrder) {
    auditKeys.forEach((key) => {
      const formVal = formPayload[key]
      // 表单已填非空值时保留表单（如下单时间可改），空串不覆盖原单
      if (formVal !== undefined && formVal !== null && formVal !== '') {
        return
      }
      if (baseOrder[key] !== undefined && baseOrder[key] !== null) {
        preserved[key] = baseOrder[key]
      }
    })
  }

  const payload: Record<string, unknown> = {
    ...(baseOrder ?? {}),
    ...formPayload,
    ...preserved,
    id,
    authenmodifyoperator: operator,
  }

  if (!payload.mobile) {
    payload.mobile = ''
  }
  delete payload.pointState
  delete payload.shtimeArr
  delete payload.orderlist

  if (payload.data && typeof payload.data !== 'string') {
    payload.data = JSON.stringify(payload.data)
  }

  return payload
}
