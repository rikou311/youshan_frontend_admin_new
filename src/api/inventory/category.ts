import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import type { InventoryCategoryItem, InventoryCategoryListParams } from '@/types/api'

export interface InventoryCategoryForm {
  id?: number | string
  title: string
  url?: string
  titleen?: string
  kind?: number | string
  type?: number | string
  image?: string
  imagedel?: string[]
}

export const getInventoryCategoryList = (params: InventoryCategoryListParams) =>
  createListApi<InventoryCategoryItem, { title?: string }>('yscategory')(params)

export const queryInventoryCategory = createQueryApi<InventoryCategoryForm>('yscategory')
export const addInventoryCategory = createAddApi<InventoryCategoryForm>('yscategory')
export const updateInventoryCategory = createUpdateApi<InventoryCategoryForm>('yscategory')
export const deleteInventoryCategory = createDeleteApi('yscategory')
