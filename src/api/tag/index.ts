import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
} from '@/api/helpers/crud'
import type { PageParams, TagTemplateItem } from '@/types/api'
import type { TagLabelRecord } from '@/types/tag-label'

export interface TagTemplateForm {
  id?: number | string
  name: string
  width: number
  height: number
  config?: string
  paperSize?: string
  labelSize?: string
  layout?: string
  selectedLabel?: string | number
  createTime?: string | Date | number
  createtime?: string | Date | number
}

export interface TagLabelForm {
  id?: number | string
  name: string
  barcode?: string
  config: string
  elements: string
  updateTime?: string | Date | number
  updatetime?: string | Date | number
}

export const getTagTemplateList = (params: PageParams & { keyword?: string; name?: string }) =>
  createListApi<TagTemplateItem, { keyword?: string; name?: string }>('tagTemplate')(params)

export const queryTagTemplate = createQueryApi<TagTemplateForm>('tagTemplate')
export const addTagTemplate = createAddApi<TagTemplateForm>('tagTemplate')
export const updateTagTemplate = createUpdateApi<TagTemplateForm>('tagTemplate')
export const deleteTagTemplate = createDeleteApi('tagTemplate')

export const getTagPrintList = (params: PageParams & { keyword?: string; name?: string }) =>
  createListApi<TagLabelRecord, { keyword?: string; name?: string }>('tagLabel')(params)

export const queryTagLabel = createQueryApi<TagLabelRecord>('tagLabel')
export const addTagLabel = createAddApi<TagLabelForm>('tagLabel')
export const updateTagLabel = createUpdateApi<TagLabelForm>('tagLabel')
export const deleteTagLabel = createDeleteApi('tagLabel')
