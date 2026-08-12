import type { OrganizationItem } from '@/api/system'
import { unwrapArrayData, unwrapTreeData } from '@/utils/legacy'

type OrgRecord = Record<string, unknown>

export function resolveOrgId(node: OrgRecord): string | undefined {
  const raw = node.id ?? node.orgId ?? node.organizationId
  if (raw == null || raw === '') {
    return undefined
  }
  return String(raw)
}

function resolveOrgLabel(node: OrgRecord): string {
  return String(node.name ?? node.orgName ?? node.label ?? node.id ?? '')
}

function resolveSuperId(node: OrgRecord): string | null {
  const raw = node.superid ?? node.superId ?? node.parentId ?? node.parent_id
  if (raw == null || raw === '') {
    return null
  }
  return String(raw)
}

function cleanEmptyChildren(nodes: OrganizationItem[]) {
  nodes.forEach((node) => {
    if (node.children?.length) {
      cleanEmptyChildren(node.children)
      return
    }
    delete node.children
  })
}

function normalizeOrgNode(node: OrganizationItem): OrganizationItem {
  const record = node as unknown as OrgRecord
  const id = resolveOrgId(record) ?? String(node.id ?? '')
  const label = node.name || node.orgName || id
  const children = (node.children ?? []).map((child) => normalizeOrgNode(child))
  const result: OrganizationItem = {
    ...node,
    id,
    name: label,
    orgName: label,
    superid: node.superid != null && node.superid !== '' ? String(node.superid) : null,
    active: Number(node.active ?? 1),
  }
  if (children.length) {
    result.children = children
  }
  return result
}

/**
 * 对齐旧版：`Array.isArray(org) ? org : [org]`
 * 后端 currentOrganizationTree 返回单根对象（id 为 UUID 字符串）。
 */
export function prepareOrganizationTreeFromApi(data: unknown): OrganizationItem[] {
  if (!data) {
    return []
  }
  if (Array.isArray(data)) {
    return data.map((item) => normalizeOrgNode(item as OrganizationItem))
  }
  return [normalizeOrgNode(data as OrganizationItem)]
}

function buildTreeFromFlat(nodes: OrganizationItem[]): OrganizationItem[] {
  const byId = new Map(
    nodes.map((node) => [String(node.id), { ...node, children: [] as OrganizationItem[] }]),
  )
  const roots: OrganizationItem[] = []

  byId.forEach((node) => {
    const parentId = node.superid != null ? String(node.superid) : null
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children!.push(node)
      return
    }
    roots.push(node)
  })

  const result = roots.length ? roots : [...byId.values()]
  cleanEmptyChildren(result)
  return result
}

function withExtendFlag(node: OrganizationItem): OrganizationItem {
  const result: OrganizationItem = {
    ...node,
    extend: node.extend ?? true,
  }
  if (result.children?.length) {
    result.children = result.children.map((child) => withExtendFlag(child))
  }
  return result
}

/** 组织 index 接口：数组根节点 / 单根对象 / 扁平列表 */
export function normalizeOrganizationForest(data: unknown): OrganizationItem[] {
  const unwrapped = unwrapTreeData(data)
  if (!unwrapped) {
    return []
  }

  const array = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapArrayData<OrganizationItem>(unwrapped)

  if (array.length) {
    const hasNestedChildren = array.some(
      (item) => Array.isArray((item as OrganizationItem).children) && (item as OrganizationItem).children!.length > 0,
    )
    if (hasNestedChildren) {
      return array.map((item) => withExtendFlag(normalizeOrgNode(item as OrganizationItem)))
    }
    return buildTreeFromFlat(
      array.map((item) => normalizeOrgNode(item as OrganizationItem)),
    ).map((item) => withExtendFlag(item))
  }

  if (typeof unwrapped === 'object') {
    return [withExtendFlag(normalizeOrgNode(unwrapped as OrganizationItem))]
  }

  return []
}

/** 组织列表（扁平）转树，用于 currentOrganizationTree 不可用时的兜底 */
export function buildOrganizationTreeFromList(data: unknown): OrganizationItem[] {
  if (!data) {
    return []
  }

  const roots = Array.isArray(data) ? data : [data]
  const flatNodes = roots
    .map((item) => {
      const id = resolveOrgId(item as OrgRecord)
      if (!id) {
        return null
      }
      const label = resolveOrgLabel(item as OrgRecord)
      const node: OrganizationItem = {
        id,
        name: label,
        orgName: label,
        superid: resolveSuperId(item as OrgRecord),
        active: Number((item as OrgRecord).active ?? 1),
      }
      return node
    })
    .filter((item): item is OrganizationItem => item != null)

  return buildTreeFromFlat(flatNodes)
}

export function findOrganizationLabel(
  nodes: OrganizationItem[],
  organizationId?: string | number | null,
): string {
  if (organizationId == null || organizationId === '') {
    return ''
  }
  const target = String(organizationId)
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.shift()!
    if (String(node.id) === target) {
      return node.name || node.orgName || String(node.id)
    }
    if (node.children?.length) {
      stack.push(...node.children)
    }
  }
  return ''
}

export interface OrganizationOption {
  id: string
  label: string
}

/** 组织树拍平为下拉选项 */
export function flattenOrganizationOptions(
  nodes: OrganizationItem[],
  prefix = '',
): OrganizationOption[] {
  const result: OrganizationOption[] = []
  for (const node of nodes) {
    const id = String(node.id ?? '')
    if (!id) {
      continue
    }
    const name = node.name || node.orgName || id
    const label = prefix ? `${prefix} / ${name}` : name
    result.push({ id, label })
    if (node.children?.length) {
      result.push(...flattenOrganizationOptions(node.children, label))
    }
  }
  return result
}
