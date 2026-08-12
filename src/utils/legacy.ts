import type { PageParams, PageResult } from '@/types/api'

export interface LegacyPageQuery {
  page: number
  rows: number
  condition: Record<string, unknown>
  sort?: {
    prop: string
    order: string
  }
}

export interface LegacyListPayload<T> {
  data?: T[] | LegacyListPayload<T>
  list?: T[]
  records?: T[]
  rows?: T[]
  items?: T[]
  total?: number
  count?: number
}

export function toLegacyPageQuery<T extends Record<string, unknown>>(
  params: PageParams & T,
): LegacyPageQuery {
  const {
    page,
    pageSize,
    sort,
    sortProp,
    sortOrder,
    ...condition
  } = params as PageParams &
    T & {
      sort?: { prop?: string; order?: string }
      sortProp?: string
      sortOrder?: string
    }

  return {
    page,
    rows: pageSize,
    condition,
    sort: {
      prop: String(sort?.prop ?? sortProp ?? ''),
      order: String(sort?.order ?? sortOrder ?? ''),
    },
  }
}

export function normalizeListResult<T>(payload: unknown): PageResult<T> {
  if (Array.isArray(payload)) {
    return {
      list: payload as T[],
      total: payload.length,
    }
  }

  if (!payload || typeof payload !== 'object') {
    return { list: [], total: 0 }
  }

  const record = payload as LegacyListPayload<T> & Record<string, unknown>
  const nested =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as LegacyListPayload<T>)
      : null

  const list = unwrapArrayData<T>(nested ?? record)
  const total = Number(
    nested?.total ??
      nested?.count ??
      record.total ??
      record.count ??
      list.length ??
      0,
  )

  return {
    list,
    total: Number.isFinite(total) ? total : list.length,
  }
}

/** 兼容后端多种列表响应：数组 / { data } / { list } */
export function unwrapArrayData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const record = payload as Record<string, unknown>
  for (const key of ['data', 'list', 'records', 'rows', 'items']) {
    const nested = record[key]
    if (Array.isArray(nested)) {
      return nested as T[]
    }
  }
  return []
}

/** 兼容组织树：单节点 / 数组 / { data: node } */
export function unwrapTreeData(payload: unknown): unknown {
  if (payload == null) {
    return null
  }
  if (Array.isArray(payload)) {
    return payload
  }
  if (typeof payload !== 'object') {
    return payload
  }
  const record = payload as Record<string, unknown>
  if (
    'id' in record ||
    'orgId' in record ||
    'orgName' in record ||
    'name' in record ||
    'children' in record ||
    'childList' in record
  ) {
    return payload
  }
  for (const key of ['data', 'list', 'records']) {
    if (key in record) {
      return unwrapTreeData(record[key])
    }
  }
  return payload
}
