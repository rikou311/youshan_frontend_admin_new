export type LabelElementType = 'text' | 'barcode' | 'expiryDate' | 'image'

export interface LabelConfig {
  name: string
  width: number
  height: number
  unit: 'px' | 'mm' | 'cm' | 'in'
  backgroundColor: string
  scale?: number
}

export interface LabelTextElement {
  type: 'text' | 'expiryDate'
  content?: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  textDirection: 'horizontal' | 'vertical'
  expiryDate?: string
  prefix?: string
}

export interface LabelBarcodeElement {
  type: 'barcode'
  content: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontFamily: string
  color: string
  bold?: boolean
  italic?: boolean
  textDirection?: 'horizontal' | 'vertical'
}

export interface LabelImageElement {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  src: string
  rotation: number
  align: 'left' | 'center' | 'right'
  tile: boolean
}

export type LabelElement = LabelTextElement | LabelBarcodeElement | LabelImageElement

export interface TagLabelRecord {
  id: number | string
  name: string
  barcode?: string
  config: string | LabelConfig
  elements: string | LabelElement[]
  updateTime?: string
  updatetime?: string
  updatedAt?: string
}

export function createDefaultLabelConfig(): LabelConfig {
  return {
    name: '',
    width: 250,
    height: 60,
    unit: 'px',
    backgroundColor: '#ffffff',
  }
}

export function parseLabelConfig(raw?: string | LabelConfig | null): LabelConfig {
  if (!raw) {
    return createDefaultLabelConfig()
  }
  if (typeof raw === 'string') {
    try {
      return { ...createDefaultLabelConfig(), ...JSON.parse(raw) }
    } catch {
      return createDefaultLabelConfig()
    }
  }
  return { ...createDefaultLabelConfig(), ...raw }
}

export function parseLabelElements(raw?: string | LabelElement[] | null): LabelElement[] {
  if (!raw) {
    return []
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as LabelElement[]
    } catch {
      return []
    }
  }
  return JSON.parse(JSON.stringify(raw)) as LabelElement[]
}

export function labelConfigToCssSize(config: LabelConfig) {
  let width = config.width
  let height = config.height
  if (config.unit === 'mm') {
    width = Math.round(width * 3.779527559)
    height = Math.round(height * 3.779527559)
  }
  return { width, height }
}
