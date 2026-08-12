export function parseCdata(str?: string) {
  if (!str) {
    return ''
  }
  return str.replace(/<!\[CDATA\[(.+)\]\]>/, '$1').replace(/&lt;!\[CDATA\[(.+)\]\]&gt;/, '$1')
}

export function stripFlowablePrefix(attrs: Record<string, unknown> = {}) {
  const result: Record<string, unknown> = { ...attrs }
  Object.keys(attrs).forEach((key) => {
    if (key.startsWith('flowable:')) {
      const nextKey = key.replace('flowable:', '')
      result[nextKey] = attrs[key]
      delete result[key]
    }
  })
  return result
}

export function splitCommaValues(value?: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

export function detectUserType(attrs: Record<string, unknown>) {
  if (attrs.assignee) {
    return 'assignee'
  }
  if (attrs.candidateUsers) {
    return 'candidateUsers'
  }
  if (attrs.candidateGroups) {
    return 'candidateGroups'
  }
  return 'assignee'
}

export type ModelerLike = {
  get: (name: string) => unknown
}

export type ElementLike = {
  type?: string
  businessObject?: {
    id?: string
    name?: string
    $attrs?: Record<string, unknown>
    conditionExpression?: { body?: string }
    [key: string]: unknown
  }
}

export function updateElementProperties(
  modeler: ModelerLike | null,
  element: ElementLike | null,
  properties: Record<string, unknown>,
) {
  if (!modeler || !element) {
    return
  }
  const modeling = modeler.get('modeling') as {
    updateProperties: (el: ElementLike, props: Record<string, unknown>) => void
  }
  modeling.updateProperties(element, properties)

  const attrs = element.businessObject?.$attrs
  if (!attrs) {
    return
  }
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key]
    if (value == null || value === '' || value === 'null') {
      delete attrs[key]
    }
  })
}

export function createConditionExpression(modeler: ModelerLike | null, expression: string) {
  if (!modeler) {
    return null
  }
  const moddle = modeler.get('moddle') as {
    create: (type: string, attrs: Record<string, unknown>) => unknown
  }
  return moddle.create('bpmn:FormalExpression', {
    body: `<![CDATA[${expression}]]>`,
  })
}
