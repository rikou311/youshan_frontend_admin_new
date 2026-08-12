import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import request from '@/utils/request'

export interface RawFoodItem {
  id: number | string
  title: string
  price: number | string
  weight?: string | number
  images?: string
}

export interface RawFoodForm {
  id?: number | string
  title: string
  price: number | string
  weight?: string | number
}

export interface RawFoodListParams extends Record<string, unknown> {
  name?: string
  sort?: { prop?: string; order?: string }
}

export interface RawFoodView {
  id?: number | string
  title?: string
  price?: number | string
}

export interface GoodsQuantityItem {
  id?: number | string
  quantity: number
  amount?: number | string
  total?: number | string
  updateTime?: string
  goodsId?: number | string
  rawFoodView?: RawFoodView
}

export interface GoodsQuantityForm {
  id?: number | string
  quantity: number
  goodsId?: number | string
  rawFoodView?: RawFoodView
}

export interface GoodsQuantityListParams extends Record<string, unknown> {
  sort?: { prop?: string; order?: string }
}

export interface GoodsQuantityChangeHistoryItem {
  name: string
  record: Record<string, string | number | null | undefined>
}

export const getRawFoodList = createListApi<RawFoodItem, RawFoodListParams>('rawFood')
export const queryRawFood = createQueryApi<RawFoodForm>('rawFood')
export const addRawFood = createAddApi<RawFoodForm>('rawFood')
export const updateRawFood = createUpdateApi<RawFoodForm>('rawFood')
export const deleteRawFood = createDeleteApi('rawFood')

export const getGoodsQuantityList = createListApi<GoodsQuantityItem, GoodsQuantityListParams>(
  'goodsQuantity',
)
export const queryGoodsQuantity = createQueryApi<GoodsQuantityForm>('goodsQuantity')
export const updateGoodsQuantity = createUpdateApi<GoodsQuantityForm>('goodsQuantity')

export const getGoodsQuantityChangeHistory = (data: { updateTime: Date | string }) =>
  request.post<GoodsQuantityChangeHistoryItem[] | { data?: GoodsQuantityChangeHistoryItem[] }>(
    '/jee-fk/goodsQuantityChangeHistory/index',
    data,
  )