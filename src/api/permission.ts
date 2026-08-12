import request from '@/utils/request'
import { unwrapArrayData } from '@/utils/legacy'
import type { LegacyAuthorityNode } from '@/types/permission'

/** 兼容后端菜单：数组 / { data|list } / 下标对象（旧版 for...in） */
export function normalizeAuthorityMenus(payload: unknown): LegacyAuthorityNode[] {
  if (Array.isArray(payload)) {
    return payload as LegacyAuthorityNode[]
  }

  const fromList = unwrapArrayData<LegacyAuthorityNode>(payload)
  if (fromList.length) {
    return fromList
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload as Record<string, unknown>).filter(
      (item): item is LegacyAuthorityNode =>
        Boolean(item) &&
        typeof item === 'object' &&
        'path' in (item as Record<string, unknown>) &&
        'authName' in (item as Record<string, unknown>),
    )
  }

  return []
}

export async function getAuthorityMenus() {
  const payload = await request.get<unknown>('/jee-fk/authority/authoritys')
  return normalizeAuthorityMenus(payload)
}
