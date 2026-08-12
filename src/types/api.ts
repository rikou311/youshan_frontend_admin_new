export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export const USER_STATUS = {
  ACTIVE: 1,
  DISABLED: 0,
} as const

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export interface UserItem {
  id: number
  username: string
  nickname: string
  status: UserStatus
  createdAt: string
}

export interface UserListParams extends PageParams {
  keyword?: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  permissions?: string[]
  realName?: string
}

export interface InventoryCategoryItem {
  id: number | string
  title: string
  url?: string
  titleen?: string
  kind?: number | string
  type?: number | string
  image?: string
  updatedAt?: string
}

export interface InventoryCategoryListParams extends PageParams {
  title?: string
}

export interface InventoryCommodityItem {
  id: number
  title: string
  price: number
  priced: number
  sold: number
  total: number
  weight: number
  unit?: string
  brand?: string
  category?: string
  home?: string
  tax?: string | number
  image?: string
}

export interface InventoryCommodityListParams extends PageParams {
  title?: string
}

export interface InventoryOrderItem {
  id: number
  name: string
  status: number
  total: number
  svf: number
  uname: string
  updatedAt: string
}

export interface InventoryOrderListParams extends PageParams {
  name?: string
}

export interface MerchantOrderItem {
  id: number
  name: string
  total: number
  status: number
  updatedAt: string
}

export interface MerchantCommodityItem {
  id: number
  title: string
  price: number
  /** 列表库存字段：后端多为 total，兼容 stock */
  stock?: number
  sold?: number
  viewed?: number
  priced?: number
  total?: number
  weight?: number
  unit?: string
  brand?: string
  category?: string
  home?: string
  tax?: string | number
  taxtype?: number
  code?: number | string
  image?: string
}

export interface MerchantUserItem {
  id: number
  username?: string
  uname?: string
  unick?: string
  phone: string
  umail?: string
  level?: string
  ucode?: number
  name?: string
  wechat?: string
  memo?: string
  state?: number | string
  address?: number | string
  /** 金额（旧列表口径：money） */
  money?: number
  /** 积分（旧列表口径：point） */
  point?: number
  /** 最后更新时间（旧字段：authenmodify，秒/毫秒时间戳） */
  authenmodify?: string | number
  /** 最后更新人（旧字段：authenmodifyoperator） */
  authenmodifyoperator?: string
  createdAt?: string | number
  createtime?: string | number
}

export interface CashRecordItem {
  id: number
  userName: string
  amount: number
  status: number
  createdAt: string
}

export interface TagTemplateItem {
  id: number | string
  name: string
  width: number
  height: number
  updatedAt?: string
  createTime?: string
  createtime?: string
  config?: string
  paperSize?: string
  labelSize?: string
  layout?: string
  selectedLabel?: string | number
}
