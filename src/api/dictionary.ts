import request from '@/utils/request'
import type { DictionaryOption } from '@/utils/dictionary'

export function queryDictionaryGroups(groupIds: string[]) {
  return request.post<Record<string, DictionaryOption[]>>('/jee-fk/dictionary/queryByGroupIds', {
    groupIds,
  })
}
