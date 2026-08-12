import type { MerchantOrderLine } from '@/types/merchant-order'

export interface InventoryOrderListItem {
  id: number
  name: string
  status: number
  total: number
  svf: number
  uname?: string
  pay?: number
  yf?: number
  ld?: number
  lc?: number
  authenmodify?: string | number
  authenappend?: string | number
  updatedAt?: string
}

export interface InventoryOrderDetail extends InventoryOrderListItem {
  wechat?: string
  wuliu?: number
  pi?: string
  shtimeArr?: Array<string | number>
  memo?: string
  phone?: string
  zip?: string
  address?: string
  orderlist?: MerchantOrderLine[]
  data?: string | Record<string, unknown>
  rate?: number
  totalJp?: number
}

export interface InventoryOrderListParams extends Record<string, unknown> {
  name?: string
  id?: string
  statusList?: number[]
}
