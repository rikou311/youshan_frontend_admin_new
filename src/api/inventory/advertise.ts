import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'

export interface InventoryAdvertiseItem {
  id: number | string
  title: string
  url?: string
  type?: number | string
  image?: string
}

export interface InventoryAdvertiseForm {
  id?: number | string
  title: string
  url?: string
  type?: number | string
  image?: string
  /** 旧版上传清空时记录待删图片 */
  imagedel?: string[]
}

export interface InventoryAdvertiseListParams extends Record<string, unknown> {
  title?: string
}

export const getInventoryAdvertiseList = createListApi<
  InventoryAdvertiseItem,
  InventoryAdvertiseListParams
>('advertise')

export const queryInventoryAdvertise = createQueryApi<InventoryAdvertiseForm>('advertise')
export const addInventoryAdvertise = createAddApi<InventoryAdvertiseForm>('advertise')
export const updateInventoryAdvertise = createUpdateApi<InventoryAdvertiseForm>('advertise')
export const deleteInventoryAdvertise = createDeleteApi('advertise')
