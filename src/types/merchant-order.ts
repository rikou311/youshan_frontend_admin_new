export interface MerchantOrderLine {
  title: string
  sku?: string
  price: number
  count: number
  tax?: number
  taxtype?: number
  total?: number
  home?: string
  unit?: string
  pident?: string
  code?: string
}

export interface MerchantOrderAddress {
  receive?: string
  phone?: string
  postcode?: string
  prefecture?: string
  city?: string
  town?: string
  address?: string
  building?: string
  roomnumber?: string
}

export interface MerchantOrderListItem {
  id: number
  name?: string
  unick?: string
  ucode?: string
  uname?: string
  status: number
  pay?: number
  total?: number
  totald?: number
  uid?: number
  yf?: number
  ld?: number
  svf?: number
  point?: number
  taxState?: number
  memo?: string
  phone?: string
  zip?: string
  address?: string
  authenmodify?: string | number
  authenappend?: string | number
  updatedAt?: string
  merchantAddress?: MerchantOrderAddress
  data?: Record<string, { total: number; tax?: number }> | string
}

export interface MerchantOrderDetail extends MerchantOrderListItem {
  wechat?: string
  wuliu?: number
  pi?: string
  shtime?: string
  memo?: string
  phone?: string
  zip?: string
  address?: string
  orderlist?: MerchantOrderLine[]
  taxtotal?: number
  rate?: number
  totalJp?: number
}
