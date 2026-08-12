import {
  createAddApi,
  createCrudApi,
  createDeleteApi,
  createListApi,
  createQueryApi,
  createUpdateApi,
  createUpdatePostApi,
  type CrudId,
} from '@/api/helpers/crud'
import request from '@/utils/request'

export interface AccessItem {
  id: CrudId
  resourceName: string
  resource: string
  /** 后端字典 access_resources_type，常见值 uri */
  type: string | number
  method: string
  moduleCode: string
  sort: number
  ispublic: number | string
  active: number | string
  authority?: string
  scope?: string
}

export interface AccessForm {
  id?: CrudId
  resourceName: string
  resource: string
  type: string | number
  method: string
  moduleCode: string
  sort: number | string
  ispublic: number | string
  active: number | string
  authority: string
}

export interface AccessLogItem {
  id: number
  uri?: string
  resource?: string
  username?: string
  cuname?: string
  method: string
  type?: string
  createdAt?: string
  createTime?: string
  status?: number
  statusCode?: number
  param?: string
  header?: string | Array<{ name: string; value: string }>
}

export interface AccessLogListParams extends Record<string, unknown> {
  uri?: string
  username?: string
}

export interface ClientItem {
  id: CrudId
  clientId: string
  /** 兼容旧 stub 字段；后端主字段为 clientId */
  clientName?: string
  scope?: string
  authority?: string
  authorizedGrantType?: string
  tokenValiditySeconds?: number | string
  refreshTokenSeconds?: number | string
  expireDate?: string
  mark?: string
  authorityLevel?: string
  active: number | string
}

export interface ClientForm {
  id?: CrudId
  clientId: string
  secret?: string
  scope: string
  /** 表单内多为多选数组，提交时转为逗号分隔字符串 */
  authority: string | string[]
  authorizedGrantType: string | string[]
  authorityLevel?: string
  tokenValiditySeconds: number | string
  refreshTokenSeconds: number | string
  expireDate: string
  mark?: string
  active: number | string
}

export interface ClientGrantPayload {
  clientId: CrudId
  resourceIds: Array<string | number>
}

export interface ClientAuthoritysResult {
  accesses: AccessItem[]
  resourceIds: Array<string | number>
}

export interface ModuleItem {
  id: number
  moduleName: string
  moduleCode: string
  version: string
  installed: number
}

export interface FirewallItem {
  id: number
  ruleName: string
  ip: string
  action: string
  active: number
}

export interface FirewallForm {
  id?: number
  ruleName: string
  ip: string
  action: string
  active: number
}

export interface StaticResourceItem {
  id: number
  /** 旧后端字段 */
  name?: string
  type?: string
  size?: number
  path?: string
  absolutePath?: string
  uploadUri?: string
  endpoint?: string
  moduleCode?: string
  createTime?: string
  active?: number | boolean
  delete?: number | boolean
  /** 兼容 mock / 新命名 */
  fileName?: string
  filePath?: string
  fileSize?: number
  createdAt?: string
  mimeType?: string
}

export interface ProcessDefinitionItem {
  id: number
  name: string
  key: string
  version: number
  rev?: number
  deploymentId?: string
  thumbnail?: string
  category?: string
  description?: string
  suspensionState?: number
  modelData?: string | Record<string, unknown>
}

export interface MemoryInfo {
  unit?: string
  dateTime?: string
  jvmUsed: number
  jvmMax: number
  jvmTotal?: number
  systemUsed?: number
  systemTotal?: number
  usedPhysical?: number
  totalPhysical?: number
  usedSwap?: number
  totalSwap?: number
  processCpu?: number
  systemCpu?: number
  /** 兼容旧统计字段 */
  cpuUsage?: number
}

export const accessApi = createCrudApi<AccessItem, { resourceName?: string }>('access')
export const getAccessList = accessApi.list
export const queryAccess = createQueryApi<AccessItem>('access')
export const addAccess = createAddApi<AccessForm>('access')
export const updateAccess = createUpdateApi<AccessForm>('access')
export const deleteAccess = createDeleteApi('access')

export function getAllAccess() {
  return request.get<AccessItem[]>('/jee-fk/access/all')
}

export const getAccessLogList = createListApi<AccessLogItem, AccessLogListParams>('accessLog')

export const clientApi = createCrudApi<ClientItem, { clientId?: string; clientName?: string }>('client')
export const getClientList = clientApi.list
export const queryClient = createQueryApi<ClientItem>('client')
export const addClient = createAddApi<ClientForm>('client')
export const updateClient = createUpdateApi<ClientForm>('client')
export const deleteClient = createDeleteApi('client')

export function getClientAuthoritys(clientId: CrudId) {
  return request.get<ClientAuthoritysResult>(
    `/jee-fk/client/authoritys?id=${encodeURIComponent(String(clientId))}`,
  )
}

export function grantClientResources(data: ClientGrantPayload) {
  return request.post<void>('/jee-fk/client/grant', data)
}

export const moduleApi = createCrudApi<ModuleItem, { moduleName?: string }>('module')
export const getModuleList = moduleApi.list

export const firewallApi = createCrudApi<FirewallItem, { ruleName?: string }>('firewall')
export const getFirewallList = firewallApi.list
export const queryFirewall = createQueryApi<FirewallForm>('firewall')
export const addFirewall = createAddApi<FirewallForm>('firewall')
export const updateFirewall = createUpdatePostApi<FirewallForm>('firewall')
export const deleteFirewall = createDeleteApi('firewall')

export const getStaticResourceList = createListApi<
  StaticResourceItem,
  { fileName?: string; name?: string }
>('staticResource')
export const queryStaticResource = createQueryApi<StaticResourceItem>('staticResource')
export const deleteStaticResource = createDeleteApi('staticResource')
export function deleteStaticResources(ids: number[]) {
  return request.delete<void>('/jee-fk/staticResource/deletes', { data: ids })
}

export const queryAccessLog = createQueryApi<AccessLogItem>('accessLog')

export interface ProcessDefinitionModelForm {
  id?: number
  name: string
  key: string
  category?: string
  description?: string
  modelData: string
  rev?: number
}

export const getProcessDefinitionModelList = createListApi<ProcessDefinitionItem, { name?: string }>(
  'processDefinitionModel',
)
export const queryProcessDefinitionModel = createQueryApi<ProcessDefinitionItem>('processDefinitionModel')
export const addProcessDefinitionModel = createAddApi<ProcessDefinitionModelForm>('processDefinitionModel')
export const updateProcessDefinitionModel = createUpdateApi<ProcessDefinitionModelForm>(
  'processDefinitionModel',
)
export const deleteProcessDefinitionModel = createDeleteApi('processDefinitionModel')

export const getProcessDeploymentList = createListApi<ProcessDefinitionItem, { name?: string }>(
  'processDeployment',
)
export const queryProcessDeployment = createQueryApi<ProcessDefinitionItem>('processDeployment')
export const deleteProcessDeployment = createDeleteApi('processDeployment')

export function suspendProcessDeployment(id: number) {
  return request.put<void>(`/jee-fk/processDeployment/suspend?id=${id}`)
}

export function activateProcessDeployment(id: number) {
  return request.put<void>(`/jee-fk/processDeployment/active?id=${id}`)
}

export function deployProcessDeployment(data: unknown) {
  return request.post<void>('/jee-fk/processDeployment/deployment', data, {
    headers: { 'Jee-Upload-Endpoint-Name': 'flow' },
  })
}

export function removeProcessDeployment(id: string | number) {
  return request.delete<void>(`/jee-fk/processDeployment/delete?id=${id}`)
}

export interface FormDefinitionModelForm {
  id?: number
  name: string
  key: string
  description?: string
  modelData: string
  rev?: number
}

export const getFormDefinitionModelList = createListApi<ProcessDefinitionItem, { name?: string }>(
  'formDefinitionModel',
)
export const queryFormDefinitionModel = createQueryApi<ProcessDefinitionItem>('formDefinitionModel')
export const addFormDefinitionModel = createAddApi<FormDefinitionModelForm>('formDefinitionModel')
export const updateFormDefinitionModel = createUpdateApi<FormDefinitionModelForm>('formDefinitionModel')
export const deleteFormDefinitionModel = createDeleteApi('formDefinitionModel')

export const getFormDeploymentList = createListApi<ProcessDefinitionItem, { name?: string }>(
  'formDeployment',
)
export const queryFormDeployment = createQueryApi<ProcessDefinitionItem>('formDeployment')
export const deleteFormDeployment = createDeleteApi('formDeployment')

export function suspendFormDeployment(id: number) {
  return request.put<void>(`/jee-fk/formDeployment/suspend?id=${id}`)
}

export function activateFormDeployment(id: number) {
  return request.put<void>(`/jee-fk/formDeployment/active?id=${id}`)
}

export function deployFormDeployment(data: unknown) {
  return request.post<void>('/jee-fk/formDeployment/deployment', data, {
    headers: { 'Jee-Upload-Endpoint-Name': 'flow' },
  })
}

export function getMemoryInfo(unit = 'MB') {
  return request.get<MemoryInfo>(`/jee-fk/control/memory/info?unit=${unit}`)
}

export function reloadFirewall() {
  return request.get<void>('/jee-fk/control/reload/firewall')
}

export function reloadCache() {
  return request.get<void>('/jee-fk/control/reload/cache')
}

export function reloadAccessResource() {
  return request.get<void>('/jee-fk/control/reload/accessResource')
}

export function installModule(id: number) {
  return request.get<void>(`/jee-fk/module/install?id=${id}`)
}

export function uninstallModule(id: number) {
  return request.get<void>(`/jee-fk/module/uninstall?id=${id}`)
}
