import { createAddApi, createDeleteApi, createListApi, createQueryApi, createUpdateApi } from '@/api/helpers/crud'
import request from '@/utils/request'
import { normalizeListResult, type LegacyListPayload } from '@/utils/legacy'
import type { MerchantCommodityItem, MerchantUserItem, PageParams, PageResult } from '@/types/api'
import type { MerchantOrderDetail, MerchantOrderListItem } from '@/types/merchant-order'

export interface MerchantUserForm {
  id?: number
  /** 兼容列表展示字段 */
  username?: string
  level?: string
  uname: string
  unick: string
  upass?: string
  umail?: string
  phone: string
  ucode?: number
  name?: string
  wechat?: string
  memo?: string
  state?: number | string
  address?: number | string
  addressList?: import('@/api/merchant/user-address').UserAddressItem[]
  authenappendoperator?: string
  authenmodifyoperator?: string
}

/** @deprecated 兼容旧瘦表单；业务页请用具体类型 */
export interface MerchantBizItem {
  id: number
  name: string
  total: number
  status: number
  updatedAt?: string
}

/** @deprecated 兼容旧瘦表单；业务页请用具体类型 */
export interface MerchantBizForm {
  id?: number
  name: string
  total: number
  status: number
}

export interface MerchantDepositItem {
  id: number
  sender?: string
  bank?: string | number
  username?: number | string
  unick?: string
  deposit?: number
  beforedeposit?: number
  deposittime?: string
  state?: number | string
  type?: number
  remark?: string
  createtime?: string
  creater?: string
  updateuser?: string
  /** 兼容瘦字段 */
  name?: string
  total?: number
  status?: number
}

export interface MerchantDepositForm {
  id?: number
  sender: string
  bank: string | number
  username: number | string
  unick?: string
  deposit: number
  beforedeposit?: number
  deposittime: string | Date
  state?: number | string
  type: number
  remark?: string
  createtime?: string
  creater?: string
  updateuser?: string
}

export interface MerchantDepositSenderOption {
  sender: string
  username?: string
}

export interface MerchantRefundLine {
  title: string
  price: number
  count: number
  unit?: string
  tax?: number
  taxtype?: number
  total?: number
}

export interface MerchantRefundItem {
  rid?: number
  id?: number
  oid?: number | string
  uname?: string
  state?: number
  total?: number
  refunded?: number
  rate?: number
  updater?: string
  updatetime?: string
  createtime?: string
  memo?: string
  data?: string
  orderlist?: MerchantRefundLine[]
  category?: number | string
  name?: string
  status?: number
}

export interface MerchantRefundForm {
  rid?: number
  id?: number
  oid?: number | string
  uname?: string
  state: number
  total: number
  refunded: number
  rate?: number
  updater?: string
  updatetime?: string
  createtime?: string
  memo?: string
  data?: string
  orderlist?: MerchantRefundLine[]
}

export interface MerchantRequisitionItem {
  id: string | number
  rdate?: string
  username?: string | number
  unick?: string
  moneytotal?: number
  taxtotal?: number
  yf?: number
  ld?: number
  svf?: number
  type?: number
  state?: number
  creater?: string
  createtime?: string
  requestob?: string
  mtotal?: string
  datalist?: string
  depositmoney?: number
  reqmoney?: number
  refundertotal?: string
  othercost?: string
  pointtotal?: number
  point?: number
  name?: string
  total?: number
  status?: number
}

export interface MerchantCommodityForm {
  id?: number
  title: string
  weight?: number
  homeArr?: Array<string | number>
  categoryArr?: Array<string | number>
  special?: string
  brand?: string
  vender?: string
  pid?: string
  tax?: string | number
  taxtype?: number
  price: number
  priced?: number
  unit?: string
  total?: number
  code?: number
  summary?: string
  content?: string
  serviceview?: string
  image?: string
  imagedel?: string[]
  category?: string
  home?: string
  /** 列表兼容 */
  stock?: number
  sold?: number | string
  viewed?: number | string
  /** 旧版后端必填兼容字段 */
  fl?: string
  authenaddress?: string
  authenip?: string
  authenlocation?: string
  authenoperator?: string
  authenstamp?: string
}

export interface MerchantCommodityDisItem {
  id: number
  uname: string
  unick: string
  ctitle: string
  price: number
  state: number
  userid?: number
  commodityid?: number
}

export interface MerchantCommodityDisForm {
  id?: number
  userid: number | ''
  commodityid: number | ''
  price: number
  state: number | ''
}

export interface MerchantCommodityDisListParams extends Record<string, unknown> {
  uname?: string
  unick?: string
  state?: string | number
  ctitle?: string
}

export interface MerchantUserOption {
  id: number
  uname: string
  ucode?: string
  unick?: string
  phone?: string
  mobile?: string
  umail?: string
  wechat?: string
  address?: number
}

export interface MerchantCommodityOption {
  id: number
  title: string
}

export interface MerchantCommodityByCodeItem {
  id: number
  code: string
  title: string
  price: number
  total?: number
  unit?: string
  tax?: number
  taxtype?: number
  home?: string
}

export interface MerchantCommodityPickerItem extends MerchantCommodityByCodeItem {
  priced?: number
  addCount?: number
}

export interface MerchantOrderListParams extends Record<string, unknown> {
  id?: string
  unick?: string
  ucode?: string
  name?: string
  statusList?: number[]
  payList?: number[]
  startDate?: string
  endDate?: string
  createTimeArr?: number[]
}

export const getMerchantOrderList = (params: PageParams & MerchantOrderListParams) =>
  createListApi<MerchantOrderListItem, Omit<MerchantOrderListParams, 'page' | 'pageSize'>>(
    'merchantorder',
  )(params)

export const queryMerchantOrder = createQueryApi<MerchantOrderDetail>('merchantorder')
export const addMerchantOrder = (data: Record<string, unknown>) =>
  request.post<number | string>('/jee-fk/merchantorder/add', data)
export const updateMerchantOrder = createUpdateApi<Record<string, unknown>>('merchantorder')
export const deleteMerchantOrder = createDeleteApi('merchantorder')

export function updateMerchantOrderStatusBatch(idStatus: Record<string, number>) {
  return request.post<void>('/jee-fk/merchantorder/updateStatusOrders', { idStatus })
}

export function updateMerchantOrderPayBatch(idPay: Record<string, string>) {
  return request.post<void>('/jee-fk/merchantorder/updatePayOrders', { idPay })
}

export const getMerchantCommodityList = (
  params: PageParams & {
    title?: string
    code?: string
    sort?: { prop: string; order: string }
  },
) =>
  createListApi<
    MerchantCommodityItem,
    { title?: string; code?: string; sort?: { prop: string; order: string } }
  >('merchantcommodity')(params)

export const queryMerchantCommodity = createQueryApi<MerchantCommodityForm>('merchantcommodity')
export const addMerchantCommodity = createAddApi<MerchantCommodityForm>('merchantcommodity')
export const updateMerchantCommodity = createUpdateApi<MerchantCommodityForm>('merchantcommodity')
export const deleteMerchantCommodity = createDeleteApi('merchantcommodity')

export const getMerchantUserList = createListApi<
  MerchantUserItem,
  {
    /** 旧版字段：用户名 */
    uname?: string
    /** 旧版字段：CODE */
    ucode?: string | number
    /** 旧版字段：店铺名 */
    unick?: string
    /** 旧版字段：公司名 */
    name?: string
    /** 旧版字段：状态 */
    state?: number | string
    /** 兼容：通用搜索字段 */
    keyword?: string
  }
>('merchantyoushanuser')
export const queryMerchantUser = createQueryApi<MerchantUserForm>('merchantyoushanuser')
export const addMerchantUser = createAddApi<MerchantUserForm>('merchantyoushanuser')
export const updateMerchantUser = createUpdateApi<MerchantUserForm>('merchantyoushanuser')
export const deleteMerchantUser = createDeleteApi('merchantyoushanuser')

export const getMerchantRequisitionList = createListApi<
  MerchantRequisitionItem,
  {
    keyword?: string
    id?: string
    username?: string
    rdate?: string
    type?: number | string
    state?: number | string
    sort?: { prop: string; order: string }
  }
>('requisition')
export const queryMerchantRequisition = createQueryApi<MerchantRequisitionItem>('requisition')
export const updateMerchantRequisition = createUpdateApi<MerchantRequisitionItem>('requisition')
export function deleteMerchantRequisition(id: string | number) {
  return request.delete<void>(`/jee-fk/requisition/delete?id=${encodeURIComponent(String(id))}`)
}

export const getMerchantRefundList = createListApi<
  MerchantRefundItem,
  {
    keyword?: string
    oid?: string
    uname?: string
    state?: number | string
    category?: number | string
  }
>('refunder')
export const queryMerchantRefund = createQueryApi<MerchantRefundForm>('refunder')
export const updateMerchantRefund = createUpdateApi<MerchantRefundForm>('refunder')
export function deleteMerchantRefund(id: number) {
  return request.delete<void>(`/jee-fk/refunder/delete?id=${id}`)
}

export const getMerchantDepositList = createListApi<
  MerchantDepositItem,
  { keyword?: string; username?: string; state?: number | string }
>('deposit')
export const queryMerchantDeposit = createQueryApi<MerchantDepositForm>('deposit')
export const addMerchantDeposit = createAddApi<MerchantDepositForm>('deposit')
export const updateMerchantDeposit = createUpdateApi<MerchantDepositForm>('deposit')
export const deleteMerchantDeposit = createDeleteApi('deposit')

export function searchDepositBySender(sender: string) {
  return request.get<MerchantDepositSenderOption[]>(
    `/jee-fk/deposit/queryBySender?sender=${encodeURIComponent(sender)}`,
  )
}

export function searchMerchantUserByUnick(unick: string) {
  return request.get<Array<{ id: number; unick?: string; uname?: string; money?: number }>>(
    `/jee-fk/merchantyoushanuser/queryByUnick?unick=${encodeURIComponent(unick)}`,
  )
}

export const getMerchantCommodityDisList = (params: PageParams & MerchantCommodityDisListParams) =>
  createListApi<MerchantCommodityDisItem, Omit<MerchantCommodityDisListParams, 'page' | 'pageSize'>>(
    'merchantcommoditydis',
  )(params)

export const queryMerchantCommodityDis = createQueryApi<MerchantCommodityDisForm>('merchantcommoditydis')
export const addMerchantCommodityDis = createAddApi<MerchantCommodityDisForm>('merchantcommoditydis')
export const updateMerchantCommodityDis = createUpdateApi<MerchantCommodityDisForm>('merchantcommoditydis')
export const deleteMerchantCommodityDis = createDeleteApi('merchantcommoditydis')

export function searchMerchantUserByUname(uname: string) {
  return request.get<MerchantUserOption[]>(
    `/jee-fk/merchantyoushanuser/queryByUname?uname=${encodeURIComponent(uname)}`,
  )
}

export function searchMerchantUserByUcode(ucode: string) {
  return request.get<MerchantUserOption[]>(
    `/jee-fk/merchantyoushanuser/queryByUcode?ucode=${encodeURIComponent(ucode)}`,
  )
}

export function searchMerchantCommodityByTitle(title: string) {
  return request.get<MerchantCommodityOption[]>(
    `/jee-fk/merchantcommodity/querybyTitle?title=${encodeURIComponent(title)}`,
  )
}

export function getMerchantCommodityByCode(params: { code: string; userid: number | string }) {
  return request.post<MerchantCommodityByCodeItem[]>(
    '/jee-fk/merchantcommodity/getCommodityByCode',
    params,
  )
}

export function searchMerchantCommodityByUid(
  params: PageParams & { title?: string; code?: string; userid: number },
): Promise<PageResult<MerchantCommodityPickerItem>> {
  return request
    .post<LegacyListPayload<MerchantCommodityPickerItem>>('/jee-fk/merchantcommodity/queryByUid', {
      page: params.page,
      rows: params.pageSize,
      condition: {
        title: params.title ?? '',
        code: params.code ?? '',
        userid: params.userid,
      },
      sort: { prop: '', order: '' },
    })
    .then((payload) => normalizeListResult(payload))
}
