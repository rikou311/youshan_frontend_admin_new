import { createAddApi, createDeleteApi, createListApi, createQueryApi, createUpdateApi } from '@/api/helpers/crud'
import type { PageParams } from '@/types/api'

export interface CashManagementItem {
  id: number
  month?: number
  mdate?: string
  week?: number
  amount: number
  type: number
  staff?: string
  content?: string
  remark?: string
  createTime?: string
}

export interface CashManagementForm {
  id?: number
  month?: number
  mdate?: string
  week?: number
  amount: number
  type: number | string
  staff?: string
  content?: string
  remark?: string
}

export interface CashManagementListParams extends Record<string, unknown> {
  id?: string
  mdate?: string
  year?: string
  month?: string
  week?: string
  type?: string | number
}

export interface CashListItem {
  id: number
  amount: number
  quantity: number
  beforequantity?: number
  updateTime?: string
}

export interface CashListForm {
  id?: number
  amount: number
  quantity: number
  beforequantity?: number
}

export interface CashTakeRecordItem {
  id: number
  takeTime?: string
  amount: number
  content?: string
  createTime?: string
}

export interface CashTakeRecordForm {
  id?: number
  takeTime?: string
  amount: number
  content?: string
}

export const getCashManagementList = (params: PageParams & CashManagementListParams) =>
  createListApi<CashManagementItem, Omit<CashManagementListParams, 'page' | 'pageSize'>>('cashmanagement')(
    params,
  )

export const queryCashManagement = createQueryApi<CashManagementForm>('cashmanagement')
export const addCashManagement = createAddApi<CashManagementForm>('cashmanagement')
export const updateCashManagement = createUpdateApi<CashManagementForm>('cashmanagement')
export const deleteCashManagement = createDeleteApi('cashmanagement')

export const getCashList = (params: PageParams) =>
  createListApi<CashListItem, Record<string, unknown>>('cashlist')({
    page: params.page,
    pageSize: params.pageSize,
  })

export const queryCashList = createQueryApi<CashListForm>('cashlist')
export const addCashList = createAddApi<CashListForm>('cashlist')
export const updateCashList = createUpdateApi<CashListForm>('cashlist')
export const deleteCashList = createDeleteApi('cashlist')

export interface CashTakeRecordListParams extends Record<string, unknown> {
  id?: string
  takeTime?: string
  amount?: string | number
  content?: string
}

export const getCashTakeRecordList = (params: PageParams & CashTakeRecordListParams) =>
  createListApi<CashTakeRecordItem, Omit<CashTakeRecordListParams, 'page' | 'pageSize'>>(
    'cashtakerecord',
  )(params)
export const queryCashTakeRecord = createQueryApi<CashTakeRecordForm>('cashtakerecord')
export const addCashTakeRecord = createAddApi<CashTakeRecordForm>('cashtakerecord')
export const updateCashTakeRecord = createUpdateApi<CashTakeRecordForm>('cashtakerecord')
export const deleteCashTakeRecord = createDeleteApi('cashtakerecord')
