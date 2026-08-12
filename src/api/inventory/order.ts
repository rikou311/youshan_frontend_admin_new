import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import type { PageParams } from '@/types/api'
import type {
  InventoryOrderDetail,
  InventoryOrderListItem,
  InventoryOrderListParams,
} from '@/types/inventory-order'

export type { InventoryOrderDetail, InventoryOrderListItem, InventoryOrderListParams }

export const getInventoryOrderList = (params: PageParams & InventoryOrderListParams) =>
  createListApi<InventoryOrderListItem, Omit<InventoryOrderListParams, 'page' | 'pageSize'>>('order')(
    params,
  )

export const queryInventoryOrder = createQueryApi<InventoryOrderDetail>('order')
export const addInventoryOrder = createAddApi<Record<string, unknown>>('order')
export const updateInventoryOrder = createUpdateApi<Record<string, unknown>>('order')
export const deleteInventoryOrder = createDeleteApi('order')
