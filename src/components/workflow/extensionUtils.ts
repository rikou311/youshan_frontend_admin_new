import type { ElementLike, ModelerLike } from './propertyUtils'
import { updateElementProperties } from './propertyUtils'

export interface ListenerParam {
  name: string
  type: 'stringValue' | 'expression'
  value: string
}

export interface ListenerItem {
  event: string
  type: 'class' | 'expression' | 'delegateExpression'
  className: string
  params: ListenerParam[]
}

export interface MultiInstanceForm {
  collection: string
  elementVariable: string
  isSequential: 'true' | 'false' | ''
  completionCondition: string
}

type ExtensionElement = {
  $type: string
  event?: string
  class?: string
  expression?: string
  delegateExpression?: string
  fields?: Array<{
    name?: string
    stringValue?: string
    expression?: string
  }>
  get?: (name: string) => unknown
}

type BusinessObjectExt = {
  get?: (name: string) => unknown
  extensionElements?: {
    values?: ExtensionElement[]
    get?: (name: string) => ExtensionElement[]
  }
  multiInstanceLoopCharacteristics?: {
    $attrs?: Record<string, unknown>
    completionCondition?: { body?: string }
    isSequential?: boolean | string
  }
}

type ExtensionElementsLike = {
  values?: ExtensionElement[]
  get?: (name: string) => ExtensionElement[]
}

type MultiInstanceLike = {
  $attrs: Record<string, unknown>
  completionCondition?: unknown
}

function getModdle(modeler: ModelerLike) {
  return modeler.get('moddle') as {
    create: (type: string, attrs?: Record<string, unknown>) => Record<string, unknown>
  }
}

function getBusinessObject(element: ElementLike) {
  return element.businessObject as BusinessObjectExt | undefined
}

function detectListenerType(item: ExtensionElement): ListenerItem['type'] | '' {
  if ('class' in item && item.class != null) {
    return 'class'
  }
  if ('expression' in item && item.expression != null) {
    return 'expression'
  }
  if ('delegateExpression' in item && item.delegateExpression != null) {
    return 'delegateExpression'
  }
  return ''
}

function mapFields(fields?: ExtensionElement['fields']): ListenerParam[] {
  return (
    fields?.map((field) => {
      let fieldType: ListenerParam['type'] = 'stringValue'
      if ('expression' in field && field.expression != null) {
        fieldType = 'expression'
      }
      return {
        name: field.name || '',
        type: fieldType,
        value: String(field[fieldType] ?? ''),
      }
    }) ?? []
  )
}

export function readListeners(element: ElementLike | null, listenerType: string): ListenerItem[] {
  const values = getBusinessObject(element || {})?.extensionElements?.values ?? []
  return values
    .filter((item) => item.$type === listenerType)
    .map((item) => {
      const type = detectListenerType(item)
      return {
        event: item.event || '',
        type: type || 'class',
        className: type ? String(item[type] ?? '') : '',
        params: mapFields(item.fields),
      }
    })
}

export function countListeners(element: ElementLike | null, listenerType: string) {
  return readListeners(element, listenerType).length
}

export function writeListeners(
  modeler: ModelerLike | null,
  element: ElementLike | null,
  listenerType: 'flowable:ExecutionListener' | 'flowable:TaskListener',
  listeners: ListenerItem[],
) {
  if (!modeler || !element?.businessObject) {
    return
  }

  const moddle = getModdle(modeler)
  const businessObject = getBusinessObject(element)
  let extensionElements = businessObject?.extensionElements as ExtensionElementsLike | undefined

  if (!extensionElements) {
    extensionElements = moddle.create('bpmn:ExtensionElements') as unknown as ExtensionElementsLike
  }

  const existingValues = extensionElements.values ?? []
  const kept = existingValues.filter((item) => item.$type !== listenerType)

  if (listeners.length) {
    const created = listeners.map((item) => {
      const listener = moddle.create(listenerType) as unknown as ExtensionElement & {
        get: (name: string) => unknown[]
      }
      listener.event = item.event
      listener[item.type] = item.className
      if (!listener.fields) {
        listener.fields = []
      }
      const fields = (typeof listener.get === 'function'
        ? (listener.get('fields') as unknown[])
        : listener.fields) as Array<Record<string, unknown>>
      item.params.forEach((field) => {
        const fieldElement = moddle.create('flowable:Field') as {
          name?: string
          stringValue?: string
          expression?: string
        }
        fieldElement.name = field.name
        fieldElement[field.type] = field.value
        fields.push(fieldElement)
      })
      return listener
    })
    extensionElements.values = [...kept, ...created]
    updateElementProperties(modeler, element, { extensionElements })
    return
  }

  extensionElements.values = kept
  if (!kept.length) {
    updateElementProperties(modeler, element, { extensionElements: undefined })
  } else {
    updateElementProperties(modeler, element, { extensionElements })
  }
}

export function hasMultiInstance(element: ElementLike | null) {
  return Boolean(getBusinessObject(element || {})?.multiInstanceLoopCharacteristics)
}

export function readMultiInstance(element: ElementLike | null): MultiInstanceForm {
  const mi = getBusinessObject(element || {})?.multiInstanceLoopCharacteristics
  const attrs = { ...(mi?.$attrs || {}) } as Record<string, unknown>
  Object.keys(attrs).forEach((key) => {
    if (key.startsWith('flowable:')) {
      attrs[key.replace('flowable:', '')] = attrs[key]
      delete attrs[key]
    }
  })
  return {
    collection: String(attrs.collection ?? ''),
    elementVariable: String(attrs.elementVariable ?? ''),
    isSequential: (attrs.isSequential != null ? String(attrs.isSequential) : '') as MultiInstanceForm['isSequential'],
    completionCondition: mi?.completionCondition?.body || '',
  }
}

export function writeMultiInstance(
  modeler: ModelerLike | null,
  element: ElementLike | null,
  form: MultiInstanceForm,
) {
  if (!modeler || !element) {
    return
  }

  if (!form.isSequential) {
    updateElementProperties(modeler, element, {
      multiInstanceLoopCharacteristics: undefined,
    })
    return
  }

  const moddle = getModdle(modeler)
  let multiInstance = getBusinessObject(element)?.multiInstanceLoopCharacteristics as
    | MultiInstanceLike
    | undefined

  if (!multiInstance) {
    multiInstance = moddle.create('bpmn:MultiInstanceLoopCharacteristics') as unknown as MultiInstanceLike
  }
  if (!multiInstance.$attrs) {
    multiInstance.$attrs = {}
  }

  multiInstance.$attrs.isSequential = form.isSequential
  multiInstance.$attrs['flowable:collection'] = form.collection || undefined
  multiInstance.$attrs['flowable:elementVariable'] = form.elementVariable || undefined

  if (form.completionCondition) {
    multiInstance.completionCondition = moddle.create('bpmn:Expression', {
      body: form.completionCondition,
    })
  } else {
    multiInstance.completionCondition = undefined
  }

  updateElementProperties(modeler, element, {
    multiInstanceLoopCharacteristics: multiInstance,
  })
}

export const EXECUTION_EVENT_OPTIONS = [
  { label: 'start', value: 'start' },
  { label: 'end', value: 'end' },
  { label: 'take', value: 'take' },
]

export const TASK_EVENT_OPTIONS = [
  { label: 'create', value: 'create' },
  { label: 'assignment', value: 'assignment' },
  { label: 'complete', value: 'complete' },
  { label: 'delete', value: 'delete' },
]

export const LISTENER_TYPE_OPTIONS = [
  { label: '类', value: 'class' },
  { label: '表达式', value: 'expression' },
  { label: '委托表达式', value: 'delegateExpression' },
]

export const PARAM_TYPE_OPTIONS = [
  { label: '字符串', value: 'stringValue' },
  { label: '表达式', value: 'expression' },
]
