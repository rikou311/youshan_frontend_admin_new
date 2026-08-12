import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'

export interface InventoryUserItem {
  id: number
  username?: string
  uname?: string
  unick?: string
  phone: string
  mobile?: string
  name?: string
  wechat?: string
  memo?: string
  address?: number | string
  /** 旧版字段命名：最后更新时间 */
  authenmodify?: string
  authenmodifyoperator?: string
  createdAt?: string
  createtime?: string
}

export interface InventoryUserForm {
  id?: number
  username?: string
  uname: string
  unick?: string
  upass?: string
  umail?: string
  phone: string
  mobile?: string
  name?: string
  wechat?: string
  memo?: string
  address?: number | string
  addressList?: import('@/api/merchant/user-address').UserAddressItem[]
  authenappendoperator?: string
  authenmodifyoperator?: string
}

export const getInventoryUserList = createListApi<
  InventoryUserItem,
  {
    /** 兼容：旧页面用 uname 条件过滤 */
    uname?: string
    /** 兼容：当前通用搜索字段 */
    keyword?: string
  }
>('youshanuser')

export const queryInventoryUser = createQueryApi<InventoryUserForm>('youshanuser')
export const addInventoryUser = createAddApi<InventoryUserForm>('youshanuser')
export const updateInventoryUser = createUpdateApi<InventoryUserForm>('youshanuser')
export const deleteInventoryUser = createDeleteApi('youshanuser')
