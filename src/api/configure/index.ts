import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import request from '@/utils/request'
import { normalizeListResult, type LegacyListPayload } from '@/utils/legacy'

export interface PaymentItem {
  id: number
  title: string
  image?: string
  demoimage?: string
  demomemo?: string
  state: number
}

export interface PaymentForm {
  id?: number
  title: string
  image?: string
  demoimage?: string
  demomemo?: string
  state: number | string
}

export interface FareItem {
  id: number
  title: string
  fare: number
  type?: number | string
  /** 旧版后端字段 */
  usertype?: number | string
  /** 兼容误写字段 */
  userType?: number | string
  display?: string | number
}

export interface FareForm {
  id?: number
  title: string
  fare: number
  type?: number | string
  usertype?: number | string
}

export const getPaymentList = createListApi<PaymentItem, { title?: string }>('payment')
export const queryPayment = createQueryApi<PaymentForm>('payment')
export const addPayment = createAddApi<PaymentForm>('payment')
export const updatePayment = createUpdateApi<PaymentForm>('payment')
export const deletePayment = createDeleteApi('payment')

export const getFareList = createListApi<FareItem, { title?: string }>('fare')
export const queryFare = createQueryApi<FareForm>('fare')
export const addFare = createAddApi<FareForm>('fare')
export const updateFare = createUpdateApi<FareForm>('fare')
export const deleteFare = createDeleteApi('fare')

export function searchFares(condition: { usertype?: number | string } = { usertype: 1 }) {
  return request
    .post<LegacyListPayload<FareItem>>('/jee-fk/fare/index', {
      page: 1,
      rows: 1000,
      condition,
      sort: { prop: '', order: '' },
    })
    .then((payload) => normalizeListResult<FareItem>(payload).list)
}
