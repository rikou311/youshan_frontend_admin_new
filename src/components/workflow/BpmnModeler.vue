<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Back,
  Download,
  FolderOpened,
  Picture,
  Plus,
  Rank,
  Right,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import type { ElementLike } from 'diagram-js/lib/model/Types'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import customTranslate from './customTranslate'
import flowableModdle from './flowable.json'
import BpmnPropertyPanel from './BpmnPropertyPanel.vue'
import {
  createEmptyBpmnXml,
  downloadTextFile,
} from '@/utils/bpmn-xml'

export interface BpmnProcessMeta {
  id: string
  name: string
  category?: string
  description?: string
}

export interface BpmnSavePayload {
  process: BpmnProcessMeta
  xml: string
  svg?: string
}

interface Props {
  xml?: string
  isView?: boolean
  height?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  xml: '',
  isView: false,
  height: '72vh',
})

const emit = defineEmits<{
  save: [payload: BpmnSavePayload]
}>()

const canvasRef = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()
const loading = ref(false)
const selectedElement = ref<ElementLike | null>(null)
const processForm = reactive({
  id: '',
  name: '',
  category: '',
  description: '',
})

let modeler: BpmnModeler | null = null
let zoom = 1
let selectionHandler: ((event: { newSelection: ElementLike[] }) => void) | null = null

const modelerRef = computed(() => modeler as unknown as { get: (name: string) => unknown } | null)

function getCanvas() {
  return modeler?.get('canvas') as {
    zoom: (value?: number | 'fit-viewport') => number
    viewbox: (box?: { x: number; y: number; width: number; height: number }) => {
      x: number
      y: number
      width: number
      height: number
    }
  }
}

function getModeling() {
  return modeler?.get('modeling') as {
    updateProperties: (element: ElementLike, properties: Record<string, unknown>) => void
  }
}

function getProcessElement() {
  const definitions = modeler?.getDefinitions() as {
    rootElements: Array<{
      id?: string
      name?: string
      $attrs?: Record<string, string>
    }>
  }
  return definitions?.rootElements?.[0]
}

function syncProcessFormFromElement() {
  const process = getProcessElement()
  if (!process) {
    return
  }
  processForm.id = process.id || ''
  processForm.name = process.name || ''
  processForm.category = process.$attrs?.['flowable:processCategory'] || ''
  processForm.description = process.$attrs?.['flowable:description'] || ''
}

function updateProcessAttr(key: string, value: string) {
  if (!modeler || props.isView) {
    return
  }
  const elementRegistry = modeler.get('elementRegistry') as {
    get: (id: string) => ElementLike | undefined
  }
  const process = getProcessElement()
  if (!process?.id) {
    return
  }
  const element = elementRegistry.get(process.id)
  if (!element) {
    return
  }
  getModeling()?.updateProperties(element, {
    [key]: value || undefined,
  })
}

function onProcessIdChange(value: string) {
  updateProcessAttr('id', value)
}

function onProcessNameChange(value: string) {
  updateProcessAttr('name', value)
}

function onProcessCategoryChange(value: string) {
  updateProcessAttr('flowable:processCategory', value)
}

function onProcessDescriptionChange(value: string) {
  updateProcessAttr('flowable:description', value)
}

async function importXml(data: string) {
  if (!modeler) {
    return
  }
  loading.value = true
  try {
    const normalized = data.replace(/<!\[CDATA\[(.+)]]>/g, '&lt;![CDATA[$1]]&gt;')
    await modeler.importXML(normalized)
    await nextTick()
    fitViewport()
    syncProcessFormFromElement()
  } catch (error) {
    console.error(error)
    ElMessage.error('BPMN XML 加载失败')
  } finally {
    loading.value = false
  }
}

function newDiagram() {
  void importXml(createEmptyBpmnXml())
}

function fitViewport() {
  const canvas = getCanvas()
  if (!canvas) {
    return
  }
  zoom = canvas.zoom('fit-viewport')
}

function zoomViewport(zoomIn = true) {
  const canvas = getCanvas()
  if (!canvas) {
    return
  }
  zoom = canvas.zoom()
  zoom += zoomIn ? 0.1 : -0.1
  canvas.zoom(zoom)
}

function undo() {
  const commandStack = modeler?.get('commandStack') as { undo: () => void }
  commandStack?.undo()
}

function redo() {
  const commandStack = modeler?.get('commandStack') as { redo: () => void }
  commandStack?.redo()
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    void importXml(String(reader.result || ''))
  }
  reader.readAsText(file, 'utf-8')
}

async function exportXml(download = false) {
  if (!modeler) {
    return ''
  }
  try {
    const result = await modeler.saveXML({ format: true })
    let xml = result.xml || ''
    xml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    if (download && xml) {
      const process = getProcessElement()
      downloadTextFile(`${process?.name || 'process'}.bpmn20.xml`, xml, 'application/xml')
    }
    return xml
  } catch (error) {
    console.error(error)
    ElMessage.error('导出 XML 失败')
    return ''
  }
}

async function exportSvg(download = false) {
  if (!modeler) {
    return ''
  }
  try {
    const { svg } = await modeler.saveSVG()
    if (download) {
      const process = getProcessElement()
      downloadTextFile(`${process?.name || 'process'}.svg`, svg, 'image/svg+xml')
    }
    return svg
  } catch (error) {
    console.error(error)
    return ''
  }
}

async function handleSave() {
  const process = getProcessElement()
  if (!process) {
    ElMessage.warning('无法读取流程定义')
    return
  }
  const xml = await exportXml(false)
  if (!xml) {
    return
  }
  const svg = await exportSvg(false)
  emit('save', {
    process: {
      id: process.id || '',
      name: process.name || '',
      category: process.$attrs?.['flowable:processCategory'] || processForm.category,
      description: process.$attrs?.['flowable:description'] || processForm.description,
    },
    xml,
    svg,
  })
}

function bindSelection() {
  const eventBus = modeler?.get('eventBus') as {
    on: (event: string, handler: (e: { newSelection: ElementLike[] }) => void) => void
    off: (event: string, handler: (e: { newSelection: ElementLike[] }) => void) => void
  }
  selectionHandler = (event) => {
    const next = event.newSelection?.[0] || null
    selectedElement.value = next
    if (!next || next.type === 'bpmn:Process') {
      syncProcessFormFromElement()
    }
  }
  eventBus.on('selection.changed', selectionHandler)
}

onMounted(async () => {
  if (!canvasRef.value) {
    return
  }
  modeler = new BpmnModeler({
    container: canvasRef.value,
    additionalModules: [
      {
        translate: ['value', customTranslate],
      },
    ],
    moddleExtensions: {
      flowable: flowableModdle,
    },
  })
  bindSelection()
  if (props.xml) {
    await importXml(props.xml)
  } else {
    newDiagram()
  }
})

watch(
  () => props.xml,
  (value) => {
    if (value) {
      void importXml(value)
    } else {
      newDiagram()
    }
  },
)

onBeforeUnmount(() => {
  if (modeler && selectionHandler) {
    const eventBus = modeler.get('eventBus') as {
      off: (event: string, handler: (e: { newSelection: ElementLike[] }) => void) => void
    }
    eventBus.off('selection.changed', selectionHandler)
  }
  modeler?.destroy()
  modeler = null
})
</script>

<template>
  <div v-loading="loading" class="bpmn-modeler" :class="{ 'is-view': isView }">
    <div v-if="!isView" class="bpmn-modeler__toolbar">
      <div class="bpmn-modeler__toolbar-left">
        <el-tooltip content="加载 XML">
          <el-button :icon="FolderOpened" @click="openFilePicker" />
        </el-tooltip>
        <el-tooltip content="新建">
          <el-button :icon="Plus" @click="newDiagram" />
        </el-tooltip>
        <el-tooltip content="自适应">
          <el-button :icon="Rank" @click="fitViewport" />
        </el-tooltip>
        <el-tooltip content="放大">
          <el-button :icon="ZoomIn" @click="zoomViewport(true)" />
        </el-tooltip>
        <el-tooltip content="缩小">
          <el-button :icon="ZoomOut" @click="zoomViewport(false)" />
        </el-tooltip>
        <el-tooltip content="撤销">
          <el-button :icon="Back" @click="undo" />
        </el-tooltip>
        <el-tooltip content="重做">
          <el-button :icon="Right" @click="redo" />
        </el-tooltip>
      </div>
      <div class="bpmn-modeler__toolbar-right">
        <el-button :icon="Download" @click="exportXml(true)">下载 XML</el-button>
        <el-button :icon="Picture" @click="exportSvg(true)">下载 SVG</el-button>
        <el-button type="primary" @click="handleSave">保存模型</el-button>
      </div>
    </div>

    <div class="bpmn-modeler__body" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
      <div ref="canvasRef" class="bpmn-modeler__canvas" />
      <div class="bpmn-modeler__panel">
        <BpmnPropertyPanel
          :modeler="modelerRef"
          :element="selectedElement as never"
          :disabled="isView"
        >
          <template #process>
            <el-form-item label="流程标识">
              <el-input v-model="processForm.id" :disabled="isView" @change="onProcessIdChange" />
            </el-form-item>
            <el-form-item label="流程名称">
              <el-input v-model="processForm.name" :disabled="isView" @change="onProcessNameChange" />
            </el-form-item>
            <el-form-item label="流程分类">
              <el-input
                v-model="processForm.category"
                :disabled="isView"
                @change="onProcessCategoryChange"
              />
            </el-form-item>
            <el-form-item label="流程描述">
              <el-input
                v-model="processForm.description"
                type="textarea"
                :rows="3"
                :disabled="isView"
                @change="onProcessDescriptionChange"
              />
            </el-form-item>
          </template>
        </BpmnPropertyPanel>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".xml,.bpmn"
      style="display: none"
      @change="onFileChange"
    >
  </div>
</template>

<style scoped lang="scss">
.bpmn-modeler {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  background: #fff;

  &.is-view {
    :deep(.djs-palette),
    :deep(.bjs-powered-by) {
      display: none;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0 12px;
    border-bottom: 1px solid #ebeef5;
  }

  &__toolbar-left,
  &__toolbar-right {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__body {
    display: flex;
    margin-top: 12px;
    min-height: 480px;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    overflow: hidden;
  }

  &__canvas {
    flex: 1;
    min-width: 0;
    background: #fafafa;
  }

  &__panel {
    width: 340px;
    flex-shrink: 0;
    padding: 12px;
    border-left: 1px solid #ebeef5;
    background: #f5f7fa;
    overflow: auto;
  }

  :deep(.bjs-powered-by) {
    display: none;
  }

  :deep(.djs-palette) {
    left: 16px !important;
    top: 16px !important;
  }
}
</style>
