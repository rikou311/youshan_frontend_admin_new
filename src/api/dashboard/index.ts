import request from '@/utils/request'
import { normalizeListResult, unwrapArrayData } from '@/utils/legacy'
import type { PageResult } from '@/types/api'

export interface DashboardSalesVolumeItem {
  date?: string
  total?: number | string
}

export interface DashboardSalesIndexResult {
  salesVolume?: DashboardSalesVolumeItem[]
}

export interface DashboardProductDetailItem {
  title?: string
  count?: number | string
  price?: number | string
  image?: string
}

export interface DashboardProductRankingItem {
  title?: string
  count?: number | string
  price?: number | string
  image?: string
}

export interface DashboardMerchantRankingItem {
  uid?: number | string
  unick?: string
  total?: number | string
}

export interface DashboardMerchantDetailItem {
  title?: string
  total?: number | string
  price?: number | string
  image?: string
}

export interface DashboardFilterParams {
  dateRange?: Array<string | number>
  category?: string | number
}

/** 销售趋势：POST body { dateList: [start, end] } */
export function getDashboardSalesIndex(data: { dateList: Array<string | number | Date> }) {
  return request.post<DashboardSalesIndexResult>('/jee-fk/dashboard/index', data)
}

/** 单日商品销售明细 */
export function getDashboardSalesDetail(data: { date: Date | string }) {
  return request.post<DashboardProductDetailItem[] | { data?: DashboardProductDetailItem[] }>(
    '/jee-fk/dashboard/detail',
    data,
  ).then((payload) => unwrapArrayData<DashboardProductDetailItem>(payload))
}

/** 热销商品排行（分页） */
export async function getDashboardProductRanking(query: {
  page: number
  rows: number
  condition: {
    dateList?: Array<string | number>
    categoryId?: string | number | null
  }
}): Promise<PageResult<DashboardProductRankingItem>> {
  const payload = await request.post('/jee-fk/dashboard/indexProductRanking', query)
  return normalizeListResult<DashboardProductRankingItem>(payload)
}

/** 商家排行（分页） */
export async function getDashboardMerchantRanking(query: {
  page: number
  rows: number
  condition: {
    createTimeArr?: Array<string | number>
    categoryId?: string | number | null
  }
}): Promise<PageResult<DashboardMerchantRankingItem>> {
  const payload = await request.post('/jee-fk/dashboard/indexMerchantRanking', query)
  return normalizeListResult<DashboardMerchantRankingItem>(payload)
}

/** 商家销售明细 */
export function getDashboardMerchantDetail(data: {
  uid: string | number
  createTimeArr?: Array<string | number>
}) {
  return request
    .post<DashboardMerchantDetailItem[] | { data?: DashboardMerchantDetailItem[] }>(
      '/jee-fk/dashboard/detailMerchantRanking',
      data,
    )
    .then((payload) => unwrapArrayData<DashboardMerchantDetailItem>(payload))
}
