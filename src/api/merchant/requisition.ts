import request from '@/utils/request'

export interface RequisitionSaveItem {
  id: string
  requestob: string
  datalist: string
  moneytotal: number
  taxtotal: number
  rdate: string | Date
  mtotal: string
  username: number
  type: number
  creater: string
  updateuser: string
  state: number
  reqmoney: number
  depositmoney: number
  refundertotal: string | null
  pid?: string
  ld: number
  yf: number
  svf: number
  othercost?: string
  pointtotal: number
  point: number
}

export function addRequisitionBatch(items: RequisitionSaveItem[]) {
  return request.post<void>('/jee-fk/requisition/add', items)
}

export function getReqIdsByUids(payload: { ids: number[]; date: string }) {
  return request.post<Record<string, string>>('/jee-fk/requisition/reqIdsByUids', payload)
}

export function getReqMoneyDepositMoney(payload: { ids: number[]; date: string }) {
  return request.post<Record<string, [number, number, unknown]>>(
    '/jee-fk/requisition/reqmoneydepositmoney',
    payload,
  )
}

export function getRefundGoodsByUserIds(payload: { uids: number[] }) {
  return request.post<
    Array<{
      uid: number
      rid: string
      total: number
      refunded: number
    }>
  >('/jee-fk/refunder/getRefundGoodsByUserIds', payload)
}
