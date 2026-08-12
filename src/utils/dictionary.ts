import { getDictionary, saveDictionary } from '@/utils/storage'

export interface DictionaryOption {
  display: string
  value: number | string
}

export function getDictionaryMap(groupId: string) {
  const items = getDictionary<DictionaryOption[]>(groupId) ?? []
  const map: Record<string, string> = {}
  items.forEach((item) => {
    map[String(item.value)] = item.display
  })
  return map
}

export function getDictionaryOptions(groupId: string) {
  return getDictionary<DictionaryOption[]>(groupId) ?? []
}

const FALLBACK_SEX_OPTIONS: DictionaryOption[] = [
  { display: '男', value: 'MALE' },
  { display: '女', value: 'FEMALE' },
]

const FALLBACK_YESNO_OPTIONS: DictionaryOption[] = [
  { display: '否', value: '0' },
  { display: '是', value: '1' },
]

const FALLBACK_OAUTH2_AUTHORITY: DictionaryOption[] = [
  { display: '读', value: 'READ' },
  { display: '写', value: 'WRITE' },
  { display: '执行', value: 'EXECUTE' },
  { display: '删除', value: 'DELETE' },
]

const FALLBACK_OAUTH2_GRANT_TYPE: DictionaryOption[] = [
  { display: '密码模式', value: 'password' },
  { display: '授权码模式', value: 'authorization_code' },
  { display: '刷新令牌', value: 'refresh_token' },
  { display: '客户端模式', value: 'client_credentials' },
  { display: '简化模式', value: 'implicit' },
]

const FALLBACK_OAUTH2_AUTHORITY_LEVEL: DictionaryOption[] = [
  { display: '角色', value: 'ROLE' },
  { display: '公开', value: 'PUBLIC' },
]

const FALLBACK_ACCESS_RESOURCES_TYPE: DictionaryOption[] = [
  { display: 'URI', value: 'uri' },
]

/** 性别字典；未加载时回退 MALE/FEMALE（与后端枚举一致） */
export function getSexOptions() {
  const options = getDictionaryOptions('sex')
  return options.length ? options : FALLBACK_SEX_OPTIONS
}

/** 是否有效字典；兼容 yes_no / yesno 组名 */
export function getYesNoOptions() {
  const fromYesNo = getDictionaryOptions('yes_no')
  if (fromYesNo.length) {
    return fromYesNo
  }
  const fromYesno = getDictionaryOptions('yesno')
  return fromYesno.length ? fromYesno : FALLBACK_YESNO_OPTIONS
}

export function getOauth2AuthorityOptions() {
  const options = getDictionaryOptions('oauth2_authority')
  return options.length ? options : FALLBACK_OAUTH2_AUTHORITY
}

export function getOauth2GrantTypeOptions() {
  const options = getDictionaryOptions('oauth2_grant_type')
  return options.length ? options : FALLBACK_OAUTH2_GRANT_TYPE
}

export function getOauth2AuthorityLevelOptions() {
  const options = getDictionaryOptions('oauth2_authority_level')
  return options.length ? options : FALLBACK_OAUTH2_AUTHORITY_LEVEL
}

export function getAccessResourcesTypeOptions() {
  const options = getDictionaryOptions('access_resources_type')
  // 旧站该字典通常只有 uri；若本地残留错误 mock（1/2/3），回退到 URI
  const looksLikeWrongMock =
    options.length > 0 &&
    options.every((item) => ['1', '2', '3'].includes(String(item.value)))
  if (!options.length || looksLikeWrongMock) {
    if (looksLikeWrongMock) {
      saveDictionary('access_resources_type', FALLBACK_ACCESS_RESOURCES_TYPE)
    }
    return FALLBACK_ACCESS_RESOURCES_TYPE
  }
  return options
}

function resolveDictionaryLabel(groupId: string, value: string) {
  const mapped = getDictionaryMap(groupId)[value]
  if (mapped) {
    return mapped
  }
  const fallbackMap: Record<string, DictionaryOption[]> = {
    oauth2_authority: FALLBACK_OAUTH2_AUTHORITY,
    oauth2_grant_type: FALLBACK_OAUTH2_GRANT_TYPE,
    oauth2_authority_level: FALLBACK_OAUTH2_AUTHORITY_LEVEL,
    access_resources_type: FALLBACK_ACCESS_RESOURCES_TYPE,
  }
  const fallback = fallbackMap[groupId]?.find((item) => String(item.value) === value)
  return fallback?.display ?? value
}

export function formatDictionary(groupId: string, value: number | string | null | undefined) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  return resolveDictionaryLabel(groupId, String(value))
}

/** 逗号分隔的多值字典（如 oauth2 权限、授权方式） */
export function formatMultiDictionary(groupId: string, value?: string | null) {
  if (!value) {
    return ''
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolveDictionaryLabel(groupId, item))
    .join(',')
}
