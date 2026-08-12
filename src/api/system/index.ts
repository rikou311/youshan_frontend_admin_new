import {
  createAddApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
  createUpdatePostApi,
} from '@/api/helpers/crud'
import request from '@/utils/request'

/** 后端主键多为 UUID 字符串，Mock 环境可能为数字 */
export type EntityId = string | number

export interface RoleItem {
  id: EntityId
  roleName: string
  active: number | null
}

export interface RoleForm {
  id?: EntityId
  roleName: string
  active: number | string
}

export interface SysUserItem {
  id: number
  username: string
  /** 旧字段 name，新字段可能是 realName */
  name?: string
  realName?: string
  sex?: string | number
  roleId?: EntityId
  roleName?: string
  role?: { id?: EntityId; roleName?: string }
  clientId?: EntityId
  client?: string
  title?: string
  mobile?: string
  email?: string
  avatar?: string
  expireDate?: string
  organizationId?: EntityId
  organization?: { id?: EntityId; name?: string; orgName?: string }
  active: number
}

export interface SysUserForm {
  id?: number
  username: string
  password?: string
  /** 后端主字段 */
  name?: string
  realName?: string
  sex?: string | number
  mobile?: string
  email?: string
  avatar?: string
  expireDate?: string
  title?: string
  active: number | string
  roleId?: string
  clientId?: string
  organizationId?: string
}

export interface OrganizationItem {
  id: EntityId
  /** 旧字段 name */
  name?: string
  orgName?: string
  code?: string
  type?: string | number
  superid?: EntityId | string | null
  superName?: string
  sort?: number | string
  address?: string
  active: number | string
  children?: OrganizationItem[] | null
  /** 组织树图展开状态 */
  extend?: boolean
}

export interface OrganizationForm {
  id?: EntityId
  code?: string
  name: string
  type?: string | number
  superid?: EntityId | string
  superName?: string
  sort?: number | string
  address?: string
  active: number | string
}

export interface ClientOption {
  id: EntityId
  clientId: string
  clientName?: string
  active?: number | null
}

export interface AuthorityItem {
  id: EntityId
  authName: string
  path: string
  icon?: string
  type?: number | string
  moduleCode?: string
  sort?: number | string
  ispublic?: number | string
  active?: number | string
  superid?: EntityId | string
  resource?: string
  resourceId?: EntityId | string
  resourceType?: string | number
  isLeaf?: boolean | number
  hasChildren?: boolean
  children?: AuthorityItem[]
  groupCode?: string
}

export interface AuthorityForm {
  id?: EntityId
  authName: string
  path: string
  icon?: string
  type: number | string
  moduleCode?: string
  sort: number | string
  ispublic: number | string
  active: number | string
  superid?: EntityId | string
  resourceId?: EntityId | string | null
  resource?: string
  groupCode?: string
}

export interface AuthorityTreeNode {
  id: number
  authName: string
  children?: AuthorityTreeNode[]
}

export interface AuthorityGrantPayload {
  relationId: EntityId
  authorityIds: number[]
}

export interface DictionaryItem {
  id: EntityId
  display: string
  value?: string
  groupCode?: string
  /** 兼容旧 stub */
  groupId?: string
  moduleCode?: string
  sort?: number | string
  active?: number | string
  superId?: EntityId | string
  isLeaf?: boolean | number
  hasChildren?: boolean
  children?: DictionaryItem[]
}

export interface DictionaryForm {
  id?: EntityId
  display: string
  value?: string
  groupCode?: string
  groupId?: string
  moduleCode?: string
  sort?: number | string
  active?: number | string
  superId?: EntityId | string
}

export const getRoleList = createListApi<RoleItem, { roleName?: string }>('role')
export const queryRole = createQueryApi<RoleForm>('role')
export const addRole = createAddApi<RoleForm>('role')
export const updateRole = createUpdateApi<RoleForm>('role')
export const deleteRole = createDeleteApi('role')
export function getAllRoles() {
  return request.get<RoleItem[]>('/jee-fk/role/all')
}

export const getSysUserList = createListApi<SysUserItem, { username?: string }>('sysuser')
export const querySysUser = createQueryApi<SysUserItem>('sysuser')
export const addSysUser = createAddApi<SysUserForm>('sysuser')
export const updateSysUser = createUpdateApi<SysUserForm>('sysuser')
export const deleteSysUser = createDeleteApi('sysuser')

export const getOrganizationList = createListApi<OrganizationItem, { orgName?: string }>('organization')
export const queryOrganization = createQueryApi<OrganizationItem>('organization')
export const addOrganization = createAddApi<OrganizationForm>('organization')
export const updateOrganization = createUpdatePostApi<OrganizationForm>('organization')
export const deleteOrganization = createDeleteApi('organization')

/** 旧版组织树：POST body 多为 {}，返回树形数组 */
export function searchOrganizationTrees(condition: Record<string, unknown> = {}) {
  return request.post<unknown>('/jee-fk/organization/index', condition)
}

export function getCurrentOrganizationTree() {
  return request.get<OrganizationItem>('/jee-fk/organization/currentOrganizationTree')
}

export function getAllClients() {
  return request.get<ClientOption[]>('/jee-fk/client/all')
}

export const getAuthorityList = createListApi<AuthorityItem, { authName?: string; superid?: string }>('authority')
export const queryAuthority = createQueryApi<AuthorityItem>('authority')
export const addAuthority = createAddApi<AuthorityForm>('authority')
export const updateAuthority = createUpdateApi<AuthorityForm>('authority')
export const deleteAuthority = createDeleteApi('authority')

/** 旧版权限树：POST body 为 { superid, authName }，返回数组 */
export function searchAuthorityNodes(condition: {
  superid?: string | number
  authName?: string
} = { superid: '0' }) {
  return request.post<AuthorityItem[]>('/jee-fk/authority/index', condition)
}

export function getAuthorityTrees(relationId: EntityId) {
  return request.post<{ trees: AuthorityTreeNode[]; grantedAuthorityIds: number[] }>(
    '/jee-fk/authority/trees',
    { relationId },
  )
}

export function grantAuthorities(data: AuthorityGrantPayload) {
  return request.post<void>('/jee-fk/authority/grant', data)
}

export function grantRoleAuthorities(roleId: EntityId, authorityIds: number[]) {
  return grantAuthorities({ relationId: roleId, authorityIds })
}
export const getDictionaryManageList = createListApi<
  DictionaryItem,
  { groupId?: string; display?: string; superId?: string }
>('dictionary')
export const queryDictionary = createQueryApi<DictionaryItem>('dictionary')
export const addDictionary = createAddApi<DictionaryForm>('dictionary')
export const updateDictionary = createUpdateApi<DictionaryForm>('dictionary')
export const deleteDictionary = createDeleteApi('dictionary')

/** 旧版字典树：POST body 为 { superId, display }，返回数组 */
export function searchDictionaryNodes(
  condition: { superId?: string | number; display?: string } = { superId: '0' },
) {
  return request.post<DictionaryItem[]>('/jee-fk/dictionary/index', condition)
}
