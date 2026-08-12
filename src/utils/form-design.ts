export type FormFieldType =
  | 'input'
  | 'password'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'datetime'
  | 'time'
  | 'daterange'
  | 'datetimerange'
  | 'cascader'
  | 'upload'
  | 'ueditor'
  | 'rate'
  | 'slider'
  | 'title'
  | 'group'
  | 'dynamic'

export interface FormFieldOption {
  label: string
  value: string | number | boolean
  children?: FormFieldOption[]
}

export interface FormFieldItem {
  type: FormFieldType
  label: string
  prop?: string
  span?: number
  display?: boolean
  required?: boolean
  placeholder?: string
  value?: string | number | boolean | string[] | number[]
  tip?: string
  dicData?: FormFieldOption[]
  multiple?: boolean
  controls?: boolean
  labelWidth?: string
  styles?: Record<string, string>
  /** upload */
  accept?: string
  limit?: number
  listType?: 'text' | 'picture' | 'picture-card'
  /** rate / slider */
  max?: number
  min?: number
  step?: number
  /** cascader */
  checkStrictly?: boolean
  /** group / dynamic 子字段 */
  children?: FormFieldItem[]
}

export interface FormDesignOptions {
  name?: string
  key?: string
  description?: string
  labelWidth?: number | string
  labelPosition?: 'left' | 'right' | 'top'
  size?: 'large' | 'default' | 'small'
  column: FormFieldItem[]
  /** Avue 兼容：顶层分组（若存在则与 column 一并展示） */
  group?: Array<{
    label: string
    prop?: string
    column?: FormFieldItem[]
  }>
}

export interface FormFieldPaletteItem {
  type: FormFieldType
  label: string
  group: string
}

export const FORM_FIELD_PALETTE: FormFieldPaletteItem[] = [
  { type: 'input', label: '单行文本', group: '输入' },
  { type: 'password', label: '密码', group: '输入' },
  { type: 'textarea', label: '多行文本', group: '输入' },
  { type: 'number', label: '计数器', group: '输入' },
  { type: 'ueditor', label: '富文本', group: '输入' },
  { type: 'select', label: '下拉选择', group: '选择' },
  { type: 'radio', label: '单选框组', group: '选择' },
  { type: 'checkbox', label: '多选框组', group: '选择' },
  { type: 'cascader', label: '级联选择', group: '选择' },
  { type: 'switch', label: '开关', group: '选择' },
  { type: 'rate', label: '评分', group: '选择' },
  { type: 'slider', label: '滑块', group: '选择' },
  { type: 'date', label: '日期', group: '时间' },
  { type: 'datetime', label: '日期时间', group: '时间' },
  { type: 'time', label: '时间', group: '时间' },
  { type: 'daterange', label: '日期范围', group: '时间' },
  { type: 'datetimerange', label: '日期时间范围', group: '时间' },
  { type: 'upload', label: '图片上传', group: '上传' },
  { type: 'title', label: '标题', group: '布局' },
  { type: 'group', label: '分组', group: '布局' },
  { type: 'dynamic', label: '动态子表', group: '布局' },
]

export function createEmptyFormOptions(): FormDesignOptions {
  return {
    name: '',
    key: '',
    description: '',
    labelWidth: 100,
    labelPosition: 'right',
    size: 'default',
    column: [],
    group: [],
  }
}

function randomProp(type: string) {
  return `${type}_${Math.random().toString(36).slice(-6)}`
}

function defaultDicData(withChildren = false): FormFieldOption[] {
  if (!withChildren) {
    return [
      { label: '选项一', value: '1' },
      { label: '选项二', value: '2' },
    ]
  }
  return [
    {
      label: '分类一',
      value: '1',
      children: [
        { label: '子项 A', value: '1-1' },
        { label: '子项 B', value: '1-2' },
      ],
    },
    {
      label: '分类二',
      value: '2',
      children: [{ label: '子项 C', value: '2-1' }],
    },
  ]
}

export function createFieldByType(type: FormFieldType): FormFieldItem {
  const base: FormFieldItem = {
    type,
    label: FORM_FIELD_PALETTE.find((item) => item.type === type)?.label || type,
    span: 24,
    display: true,
    required: false,
  }

  if (type === 'title') {
    return {
      ...base,
      prop: undefined,
      labelWidth: '0px',
      value: '标题',
      styles: { fontSize: '18px', color: '#303133' },
    }
  }

  if (type === 'group') {
    return {
      ...base,
      prop: randomProp('group'),
      children: [],
    }
  }

  if (type === 'dynamic') {
    return {
      ...base,
      prop: randomProp('dynamic'),
      children: [
        createFieldByType('input'),
        {
          ...createFieldByType('number'),
          label: '数量',
        },
      ],
    }
  }

  if (type === 'select' || type === 'radio' || type === 'checkbox') {
    return {
      ...base,
      prop: randomProp(type),
      placeholder: `请选择${base.label}`,
      dicData: defaultDicData(),
      multiple: type === 'checkbox',
    }
  }

  if (type === 'cascader') {
    return {
      ...base,
      prop: randomProp(type),
      placeholder: '请选择',
      dicData: defaultDicData(true),
      checkStrictly: false,
    }
  }

  if (type === 'number') {
    return {
      ...base,
      prop: randomProp(type),
      controls: true,
      value: 0,
    }
  }

  if (type === 'switch') {
    return {
      ...base,
      prop: randomProp(type),
      value: false,
    }
  }

  if (type === 'rate') {
    return {
      ...base,
      prop: randomProp(type),
      max: 5,
      value: 0,
    }
  }

  if (type === 'slider') {
    return {
      ...base,
      prop: randomProp(type),
      min: 0,
      max: 100,
      step: 1,
      value: 0,
    }
  }

  if (type === 'upload') {
    return {
      ...base,
      prop: randomProp(type),
      accept: 'image/*',
      limit: 1,
      listType: 'picture-card',
      value: '',
    }
  }

  if (type === 'ueditor') {
    return {
      ...base,
      prop: randomProp(type),
      placeholder: '请输入内容',
      value: '',
    }
  }

  if (type === 'daterange' || type === 'datetimerange') {
    return {
      ...base,
      prop: randomProp(type),
      placeholder: '请选择',
      value: [],
    }
  }

  return {
    ...base,
    prop: randomProp(type),
    placeholder: `请输入${base.label}`,
  }
}

function normalizeField(item: FormFieldItem): FormFieldItem {
  return {
    ...item,
    display: item.display !== false,
    span: item.span ?? 24,
    children: Array.isArray(item.children) ? item.children.map(normalizeField) : item.children,
  }
}

export function parseFormModelData(raw?: string | Record<string, unknown> | null): FormDesignOptions {
  const empty = createEmptyFormOptions()
  if (!raw) {
    return empty
  }

  let data: Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return empty
    }
  } else {
    data = raw
  }

  const column = Array.isArray(data.column) ? (data.column as FormFieldItem[]) : []
  const group = Array.isArray(data.group)
    ? (data.group as Array<{ label: string; prop?: string; column?: FormFieldItem[] }>).map((g) => ({
        ...g,
        column: (g.column || []).map(normalizeField),
      }))
    : []

  return {
    ...empty,
    name: String(data.name ?? ''),
    key: String(data.key ?? ''),
    description: String(data.description ?? ''),
    labelWidth: (data.labelWidth as number | string) ?? 100,
    labelPosition: (data.labelPosition as FormDesignOptions['labelPosition']) || 'right',
    size: (data.size as FormDesignOptions['size']) || 'default',
    column: column.map(normalizeField),
    group,
  }
}

export function serializeFormOptions(options: FormDesignOptions) {
  return JSON.stringify(options)
}

export function downloadFormJson(options: FormDesignOptions, filename = 'form') {
  const blob = new Blob([JSON.stringify(options, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'form'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function flattenPreviewColumns(options: FormDesignOptions): FormFieldItem[] {
  const list = [...(options.column || [])]
  ;(options.group || []).forEach((g) => {
    list.push({
      type: 'group',
      label: g.label,
      prop: g.prop || randomProp('group'),
      children: g.column || [],
      span: 24,
      display: true,
    })
  })
  return list
}

export function defaultPreviewValue(item: FormFieldItem) {
  if (item.type === 'checkbox' || item.type === 'daterange' || item.type === 'datetimerange') {
    return Array.isArray(item.value) ? [...item.value] : []
  }
  if (item.type === 'cascader') {
    return []
  }
  if (item.type === 'switch') {
    return Boolean(item.value)
  }
  if (item.type === 'dynamic') {
    return [{}]
  }
  if (item.type === 'rate' || item.type === 'slider' || item.type === 'number') {
    return item.value ?? 0
  }
  return item.value ?? ''
}
