import { computed, nextTick, ref } from 'vue'
import JsBarcode from 'jsbarcode'
import type {
  LabelBarcodeElement,
  LabelConfig,
  LabelElement,
  LabelImageElement,
  LabelTextElement,
} from '@/types/tag-label'
import { createDefaultLabelConfig } from '@/types/tag-label'

export function useLabelDesigner(initial?: {
  config?: LabelConfig
  elements?: LabelElement[]
}) {
  const labelConfig = ref<LabelConfig>(
    initial?.config ? { ...initial.config } : createDefaultLabelConfig(),
  )
  const designElements = ref<LabelElement[]>(
    initial?.elements ? JSON.parse(JSON.stringify(initial.elements)) : [],
  )
  const selectedElementIndex = ref(-1)
  const isDragging = ref(false)
  const dragStartPos = ref({ x: 0, y: 0 })
  const previewVisible = ref(false)
  const barcodeCanvasMap = new Map<number, HTMLCanvasElement>()

  const selectedElement = computed(() =>
    selectedElementIndex.value >= 0 ? designElements.value[selectedElementIndex.value] : null,
  )

  const hasBarcodeElement = computed(() =>
    designElements.value.some((element) => element.type === 'barcode'),
  )

  const canvasStyle = computed(() => ({
    width: `${labelConfig.value.width}${labelConfig.value.unit}`,
    height: `${labelConfig.value.height}${labelConfig.value.unit}`,
    border: '2px dashed #ccc',
    position: 'relative' as const,
    backgroundColor: labelConfig.value.backgroundColor,
  }))

  function setBarcodeCanvas(el: HTMLCanvasElement | null, index: number) {
    if (el) {
      barcodeCanvasMap.set(index, el)
      renderBarcode(index)
    } else {
      barcodeCanvasMap.delete(index)
    }
  }

  function loadFromData(config?: LabelConfig, elements?: LabelElement[]) {
    labelConfig.value = config ? { ...config } : createDefaultLabelConfig()
    designElements.value = elements ? JSON.parse(JSON.stringify(elements)) : []
    selectedElementIndex.value = -1
    nextTick(() => renderBarcodes())
  }

  function loadDefaultElements() {
    designElements.value = []
    addTextElement('商品名称', 10, 10)
    addTextElement('原材料: 面粉', 10, 25)
    addTextElement('数量: 500g', 10, 40)
    addTextElement('有效期: 2024-12-31', 10, 55)
    addBarcodeElement('1234567890123', 10, 70)
  }

  function addTextElement(content = '新文本', x = 10, y = 10) {
    const element: LabelTextElement = {
      type: 'text',
      content,
      x,
      y,
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      italic: false,
      textDirection: 'horizontal',
    }
    designElements.value.push(element)
    selectElement(designElements.value.length - 1)
  }

  function addBarcodeElement(content = '1234567890123', x = 10, y = 10) {
    const element: LabelBarcodeElement = {
      type: 'barcode',
      content,
      x,
      y,
      width: 80,
      height: 30,
      fontSize: 10,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      italic: false,
      textDirection: 'horizontal',
    }
    designElements.value.push(element)
    selectElement(designElements.value.length - 1)
    nextTick(() => renderBarcode(designElements.value.length - 1))
  }

  function addExpiryDateElement(x = 10, y = 10) {
    const element: LabelTextElement = {
      type: 'expiryDate',
      x,
      y,
      expiryDate: '2024-12-31',
      prefix: '保质期至',
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      italic: false,
      textDirection: 'horizontal',
    }
    designElements.value.push(element)
    selectElement(designElements.value.length - 1)
  }

  function addImageElement(x = 10, y = 10) {
    const element: LabelImageElement = {
      type: 'image',
      x,
      y,
      width: 50,
      height: 50,
      src: '',
      rotation: 0,
      align: 'left',
      tile: false,
    }
    designElements.value.push(element)
    selectElement(designElements.value.length - 1)
  }

  function selectElement(index: number) {
    selectedElementIndex.value = index
  }

  function deselectElement() {
    selectedElementIndex.value = -1
  }

  function deleteElement(index = selectedElementIndex.value) {
    if (index < 0) {
      return
    }
    designElements.value.splice(index, 1)
    deselectElement()
    nextTick(() => renderBarcodes())
  }

  function updateElement() {
    if (selectedElementIndex.value < 0 || !selectedElement.value) {
      return
    }
    designElements.value[selectedElementIndex.value] = {
      ...selectedElement.value,
    } as LabelElement
    if (selectedElement.value.type === 'barcode') {
      nextTick(() => renderBarcode(selectedElementIndex.value))
    }
  }

  function startDrag(event: MouseEvent) {
    if (selectedElementIndex.value < 0 || !selectedElement.value) {
      return
    }
    isDragging.value = true
    dragStartPos.value = {
      x: event.clientX - selectedElement.value.x,
      y: event.clientY - selectedElement.value.y,
    }
  }

  function onDrag(event: MouseEvent) {
    if (!isDragging.value || !selectedElement.value) {
      return
    }
    const maxX = labelConfig.value.width - 50
    const maxY = labelConfig.value.height - 20
    selectedElement.value.x = Math.max(0, Math.min(event.clientX - dragStartPos.value.x, maxX))
    selectedElement.value.y = Math.max(0, Math.min(event.clientY - dragStartPos.value.y, maxY))
    updateElement()
  }

  function endDrag() {
    isDragging.value = false
  }

  function renderBarcode(index: number) {
    const element = designElements.value[index]
    if (!element || element.type !== 'barcode') {
      return
    }
    const canvas = barcodeCanvasMap.get(index)
    if (!canvas) {
      return
    }
    try {
      JsBarcode(canvas, element.content || '1234567890123', {
        format: 'CODE128',
        width: 1.5,
        height: element.height || 30,
        displayValue: true,
        fontSize: element.fontSize || 10,
        margin: 0,
        background: '#ffffff',
      })
    } catch {
      // ignore invalid barcode content
    }
  }

  function renderBarcodes() {
    designElements.value.forEach((element, index) => {
      if (element.type === 'barcode') {
        renderBarcode(index)
      }
    })
  }

  function getElementStyle(element: LabelElement) {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${element.x}px`,
      top: `${element.y}px`,
      cursor: 'move',
      userSelect: 'none' as const,
    }
    if (element.type === 'barcode') {
      return {
        ...baseStyle,
        width: `${element.width || 80}px`,
        height: `${element.height || 30}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }
    return baseStyle
  }

  function getTextElementStyle(element: LabelTextElement) {
    const textStyle: Record<string, string> = {
      fontSize: `${element.fontSize || 12}px`,
      fontFamily: element.fontFamily || 'Arial',
      color: element.color || '#000000',
      fontWeight: element.bold ? 'bold' : 'normal',
      fontStyle: element.italic ? 'italic' : 'normal',
    }
    if (element.textDirection === 'vertical') {
      textStyle.writingMode = 'vertical-rl'
      textStyle.textOrientation = 'mixed'
      textStyle.whiteSpace = 'nowrap'
      textStyle.lineHeight = '1'
      textStyle.padding = '2px'
    }
    return textStyle
  }

  /** 对齐旧版：图片尺寸/对齐在内层，位置字段与外层相同 */
  function getImageElementStyle(element: LabelImageElement) {
    return {
      position: 'absolute' as const,
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width || 50}px`,
      height: `${element.height || 50}px`,
      cursor: 'move',
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent:
        element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start',
    }
  }

  function getImageStyle(element: LabelImageElement) {
    const imageStyle: Record<string, string> = {
      maxWidth: '100%',
      maxHeight: '100%',
    }
    if (element.tile) {
      imageStyle.objectFit = 'fill'
      imageStyle.width = '100%'
      imageStyle.height = '100%'
    } else {
      imageStyle.objectFit = 'contain'
    }
    if (element.rotation) {
      imageStyle.transform = `rotate(${element.rotation}deg)`
    }
    return imageStyle
  }

  function getElementIcon(type: LabelElement['type']) {
    const icons: Record<LabelElement['type'], string> = {
      text: 'Edit',
      barcode: 'Menu',
      expiryDate: 'Calendar',
      image: 'Picture',
    }
    return icons[type]
  }

  function getElementName(element: LabelElement) {
    const names: Record<LabelElement['type'], string> = {
      text: '文本',
      barcode: '条码',
      expiryDate: '保质期',
      image: '图片',
    }
    return names[element.type]
  }

  function getElementDisplayContent(element: LabelElement) {
    if (element.type === 'expiryDate') {
      return `${element.prefix || '保质期至'}${element.expiryDate || '2024-12-31'}`
    }
    if (element.type === 'text') {
      return element.content || '无内容'
    }
    if (element.type === 'barcode') {
      return element.content
    }
    if (element.type === 'image') {
      return element.src ? '已上传图片' : '未上传图片'
    }
    return '无内容'
  }

  function buildSavePayload(labelId?: number | string) {
    const barcode = designElements.value.find((item) => item.type === 'barcode')
    const now = new Date()
    return {
      id: labelId,
      name: labelConfig.value.name || '未命名标签',
      barcode: barcode && barcode.type === 'barcode' ? barcode.content : '',
      config: JSON.stringify(labelConfig.value),
      elements: JSON.stringify(designElements.value),
      // 对齐旧版：保存必传更新时间
      updateTime: now,
      updatetime: now,
    }
  }

  return {
    labelConfig,
    designElements,
    selectedElementIndex,
    selectedElement,
    hasBarcodeElement,
    canvasStyle,
    previewVisible,
    setBarcodeCanvas,
    loadFromData,
    loadDefaultElements,
    addTextElement,
    addBarcodeElement,
    addExpiryDateElement,
    addImageElement,
    selectElement,
    deselectElement,
    deleteElement,
    updateElement,
    startDrag,
    onDrag,
    endDrag,
    renderBarcodes,
    getElementStyle,
    getTextElementStyle,
    getImageElementStyle,
    getImageStyle,
    getElementIcon,
    getElementName,
    getElementDisplayContent,
    buildSavePayload,
  }
}
