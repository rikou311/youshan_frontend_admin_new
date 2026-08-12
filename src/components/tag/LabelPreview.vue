<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import type { LabelConfig, LabelElement, LabelImageElement, LabelTextElement } from '@/types/tag-label'
import { labelConfigToCssSize } from '@/types/tag-label'

interface Props {
  designElements: LabelElement[]
  labelConfig: LabelConfig
}

const props = defineProps<Props>()
const previewBarcodeRefs = ref<Record<number, HTMLImageElement | null>>({})

const previewLabelStyle = computed(() => {
  const { width, height } = labelConfigToCssSize(props.labelConfig)
  const scale = props.labelConfig.scale || 1
  return {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative' as const,
    backgroundColor: props.labelConfig.backgroundColor,
    // 对齐旧版：始终带上 scale，避免预览尺寸与旧项目不一致
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
})

function setPreviewBarcodeRef(el: HTMLImageElement | null, index: number) {
  previewBarcodeRefs.value[index] = el
}

function getElementStyle(element: LabelElement) {
  const scale = props.labelConfig.scale || 1
  const baseStyle = {
    position: 'absolute' as const,
    left: `${(element.x || 0) * scale}px`,
    top: `${(element.y || 0) * scale}px`,
  }
  if (element.type === 'barcode') {
    return {
      ...baseStyle,
      width: `${(element.width || 80) * scale}px`,
      height: `${(element.height || 30) * scale}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }
  return baseStyle
}

function getTextInlineStyle(element: LabelTextElement) {
  const scale = props.labelConfig.scale || 1
  return {
    fontSize: `${Math.max(8, Math.round((element.fontSize || 12) * scale))}px`,
    fontFamily: element.fontFamily || 'Arial',
    color: element.color || '#000000',
    fontWeight: element.bold ? 'bold' : 'normal',
    fontStyle: element.italic ? 'italic' : 'normal',
  }
}

function getImageElementStyle(element: LabelImageElement) {
  const scale = props.labelConfig.scale || 1
  return {
    position: 'absolute' as const,
    left: `${(element.x || 0) * scale}px`,
    top: `${(element.y || 0) * scale}px`,
    width: `${(element.width || 50) * scale}px`,
    height: `${(element.height || 50) * scale}px`,
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
    objectFit: element.tile ? 'fill' : 'contain',
  }
  if (element.tile) {
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

function renderPreviewBarcodes() {
  props.designElements.forEach((element, index) => {
    if (element.type !== 'barcode') {
      return
    }
    const img = previewBarcodeRefs.value[index]
    if (!img) {
      return
    }
    const scale = props.labelConfig.scale || 1
    const actualWidth = (element.width || 80) * scale
    const actualHeight = (element.height || 30) * scale
    const tempCanvas = document.createElement('canvas')
    const devicePixelRatio = window.devicePixelRatio || 1
    const canvasScale = Math.max(4, devicePixelRatio * 2)
    tempCanvas.width = actualWidth * canvasScale
    tempCanvas.height = actualHeight * canvasScale
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.scale(canvasScale, canvasScale)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, actualWidth, actualHeight)
    try {
      JsBarcode(tempCanvas, element.content || '1234567890123', {
        format: 'CODE128',
        width: 2,
        height: actualHeight,
        displayValue: true,
        fontSize: Math.max(12, (element.fontSize || 10) * 1.2),
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      })
      img.src = tempCanvas.toDataURL('image/png', 1)
      img.style.width = `${actualWidth}px`
      img.style.height = `${actualHeight}px`
    } catch {
      // ignore
    }
  })
}

watch(
  () => [props.designElements, props.labelConfig] as const,
  () => nextTick(() => renderPreviewBarcodes()),
  { deep: true },
)

onMounted(() => nextTick(() => renderPreviewBarcodes()))

defineExpose({
  renderPreviewBarcodes,
})
</script>

<template>
  <div class="preview-label" :style="previewLabelStyle">
    <div
      v-for="(element, index) in designElements"
      :key="index"
      class="preview-element design-element"
      :class="{ 'barcode-style': element.type === 'barcode' }"
      :style="getElementStyle(element)"
    >
      <template v-if="element.type === 'text'">
        <span
          class="tag-preview-text"
          :style="getTextInlineStyle(element)"
          :data-direction="element.textDirection || 'horizontal'"
        >
          {{ element.content }}
        </span>
      </template>
      <template v-else-if="element.type === 'barcode'">
        <div class="barcode-container">
          <img
            :ref="(el) => setPreviewBarcodeRef(el as HTMLImageElement | null, index)"
            class="barcode-image"
            alt=""
          >
        </div>
      </template>
      <template v-else-if="element.type === 'expiryDate'">
        <span
          class="tag-preview-text"
          :style="getTextInlineStyle(element)"
          :data-direction="element.textDirection || 'horizontal'"
        >
          {{ element.prefix || '保质期至' }}{{ element.expiryDate || '2024-12-31' }}
        </span>
      </template>
      <template v-else-if="element.type === 'image'">
        <div v-if="element.src" class="image-element" :style="getImageElementStyle(element)">
          <img :src="element.src" :style="getImageStyle(element)" alt="">
        </div>
        <div v-else class="image-placeholder">
          <span>图片</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
/* 对齐旧版 LabelPreview：非 scoped，保证预览/打印样式一致 */
.preview-label {
  box-sizing: border-box;
}

.preview-element {
  position: absolute;
  box-sizing: border-box;
}

.preview-element span[data-direction='vertical'] {
  writing-mode: vertical-rl !important;
  text-orientation: mixed !important;
  white-space: nowrap !important;
  line-height: 1.2 !important;
  padding: 2px !important;
  box-sizing: border-box;
  display: inline-block !important;
  transform: rotate(0deg) !important;
  transform-origin: center !important;
}

.barcode-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-radius: 2px;
  box-sizing: border-box;
  padding: 2px;
}

.barcode-image {
  max-width: 100%;
  max-height: 100%;
  display: block;
  box-sizing: border-box;
  width: auto;
  height: auto;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
  width: 100%;
  height: 100%;
}

.design-element {
  padding: 2px 4px;
  border: 1px solid transparent;
  transition: all 0.2s;
  box-sizing: border-box;
}

.image-element {
  border: 1px solid transparent;
  transition: all 0.2s;
  box-sizing: border-box;
}

.image-element img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
