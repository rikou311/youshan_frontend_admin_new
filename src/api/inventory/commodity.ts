import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import type { InventoryCommodityItem } from '@/types/api'

export interface InventoryCommodityForm {
  id?: number
  title: string
  weight: number
  homeArr?: Array<string | number>
  categoryArr?: Array<string | number>
  special?: string
  brand?: string
  vender?: string
  pid?: string
  limittime?: string
  tax?: string | number
  price: number
  priced: number
  unit?: string
  total: number
  summary?: string
  content?: string
  serviceview?: string
  banner?: string
  image?: string
  image1?: string
  image2?: string
  image3?: string
  image4?: string
  image5?: string
  imagedel?: string[]
  category?: string
  home?: string
  sold?: number | string
  viewed?: number | string
  fl?: string
  authenaddress?: string
  authenip?: string
  authenlocation?: string
  authenoperator?: string
  authenstamp?: string
}

export const getInventoryCommodityList = createListApi<InventoryCommodityItem, { title?: string }>('commodity')

export const queryInventoryCommodity = createQueryApi<InventoryCommodityForm>('commodity')
export const addInventoryCommodity = createAddApi<InventoryCommodityForm>('commodity')
export const updateInventoryCommodity = createUpdateApi<InventoryCommodityForm>('commodity')
export const deleteInventoryCommodity = createDeleteApi('commodity')
