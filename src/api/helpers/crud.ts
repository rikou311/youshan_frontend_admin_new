import request from '@/utils/request'
import { normalizeListResult, toLegacyPageQuery, type LegacyListPayload } from '@/utils/legacy'
import type { PageParams, PageResult } from '@/types/api'

/** 后端主键多为 UUID 字符串，Mock 环境可能为数字 */
export type CrudId = string | number

export function createListApi<T, Q extends Record<string, unknown> = Record<string, unknown>>(
  modulePath: string,
) {
  return async (params: PageParams & Q): Promise<PageResult<T>> => {
    const payload = await request.post<LegacyListPayload<T>>(
      `/jee-fk/${modulePath}/index`,
      toLegacyPageQuery(params),
    )
    return normalizeListResult(payload)
  }
}

export function createDeleteApi(modulePath: string) {
  return (id: CrudId) =>
    request.delete<void>(`/jee-fk/${modulePath}/delete?id=${encodeURIComponent(String(id))}`)
}

export function createQueryApi<T>(modulePath: string) {
  return (id: CrudId) =>
    request.get<T>(`/jee-fk/${modulePath}/query?id=${encodeURIComponent(String(id))}`)
}

export function createAddApi<T>(modulePath: string) {
  return (data: T) => request.post<void>(`/jee-fk/${modulePath}/add`, data)
}

export function createUpdateApi<T>(modulePath: string) {
  return (data: T) => request.put<void>(`/jee-fk/${modulePath}/update`, data)
}

export function createUpdatePostApi<T>(modulePath: string) {
  return (data: T) => request.post<void>(`/jee-fk/${modulePath}/update`, data)
}

export function createCrudApi<T, Q extends Record<string, unknown> = Record<string, unknown>>(
  modulePath: string,
) {
  return {
    list: createListApi<T, Q>(modulePath),
    query: createQueryApi<T>(modulePath),
    add: createAddApi<T>(modulePath),
    update: createUpdateApi<T>(modulePath),
    delete: createDeleteApi(modulePath),
  }
}
