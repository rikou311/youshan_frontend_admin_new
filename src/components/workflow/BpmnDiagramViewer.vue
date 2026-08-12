<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

interface Props {
  xml?: string
  height?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  xml: '',
  height: 480,
})

const canvasRef = ref<HTMLElement>()
const renderError = ref('')
const currentZoom = ref(1)

let viewer: BpmnViewer | null = null

function getCanvas() {
  return viewer?.get('canvas') as { zoom: (value?: number | 'fit-viewport') => number } | undefined
}

async function renderDiagram(xml: string) {
  if (!viewer) {
    return
  }

  renderError.value = ''
  if (!xml.trim()) {
    return
  }

  try {
    await viewer.importXML(xml)
    await nextTick()
    currentZoom.value = getCanvas()?.zoom('fit-viewport') ?? 1
  } catch {
    renderError.value = 'BPMN XML 解析失败，请检查模型数据格式'
  }
}

function fitViewport() {
  currentZoom.value = getCanvas()?.zoom('fit-viewport') ?? currentZoom.value
}

function zoomIn() {
  currentZoom.value = getCanvas()?.zoom(currentZoom.value + 0.1) ?? currentZoom.value
}

function zoomOut() {
  currentZoom.value = getCanvas()?.zoom(Math.max(0.2, currentZoom.value - 0.1)) ?? currentZoom.value
}

onMounted(() => {
  if (!canvasRef.value) {
    return
  }
  viewer = new BpmnViewer({
    container: canvasRef.value,
  })
  if (props.xml) {
    void renderDiagram(props.xml)
  }
})

watch(
  () => props.xml,
  (xml) => {
    void renderDiagram(xml || '')
  },
)

onBeforeUnmount(() => {
  viewer?.destroy()
  viewer = null
})
</script>

<template>
  <div class="bpmn-viewer">
    <div v-if="xml" class="bpmn-viewer__toolbar">
      <el-button size="small" @click="fitViewport">适应屏幕</el-button>
      <el-button size="small" @click="zoomIn">放大</el-button>
      <el-button size="small" @click="zoomOut">缩小</el-button>
    </div>
    <el-empty v-if="!xml" description="暂无 BPMN 模型数据" />
    <el-alert
      v-else-if="renderError"
      type="error"
      :closable="false"
      :title="renderError"
      show-icon
      class="bpmn-viewer__error"
    />
    <div
      v-show="xml && !renderError"
      ref="canvasRef"
      class="bpmn-viewer__canvas"
      :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    />
  </div>
</template>

<style scoped lang="scss">
.bpmn-viewer {
  &__toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__error {
    margin-bottom: 12px;
  }

  &__canvas {
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    background: #fff;
    overflow: hidden;
  }

  :deep(.bjs-powered-by) {
    display: none;
  }
}
</style>
