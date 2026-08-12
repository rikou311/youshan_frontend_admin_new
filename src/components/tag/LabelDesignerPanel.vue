<script setup lang="ts">
import { Calendar, Delete, Edit, Menu, Picture, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { nextTick, onMounted, watch } from 'vue'
import LabelPreview from '@/components/tag/LabelPreview.vue'
import { useLabelDesigner } from '@/composables/useLabelDesigner'
import type { LabelConfig, LabelElement } from '@/types/tag-label'
import {
  getPublicUploadUrl,
  getUploadHeaders,
  resolveUploadImageUrl,
} from '@/utils/upload'
import { printBySelector } from '@/utils/print'

interface Props {
  initialConfig?: LabelConfig
  initialElements?: LabelElement[]
}

const props = defineProps<Props>()

const {
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
  getElementName,
  getElementDisplayContent,
  buildSavePayload,
} = useLabelDesigner()

const uploadUrl = getPublicUploadUrl()
const uploadHeaders = getUploadHeaders()

watch(
  () => [props.initialConfig, props.initialElements] as const,
  ([config, elements]) => {
    if (config || elements?.length) {
      loadFromData(config, elements)
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.initialElements?.length) {
    nextTick(() => renderBarcodes())
    return
  }
  if (!props.initialConfig?.name) {
    loadDefaultElements()
  } else {
    nextTick(() => renderBarcodes())
  }
})

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

function handleImageSuccess(response: { code?: number; data?: Array<{ url: string }> }) {
  const imageUrl = resolveUploadImageUrl(response)
  if (!imageUrl || !selectedElement.value || selectedElement.value.type !== 'image') {
    ElMessage.error('图片上传失败')
    return
  }
  selectedElement.value.src = imageUrl
  updateElement()
  ElMessage.success('图片上传成功')
}

function removeImage() {
  if (selectedElement.value?.type === 'image') {
    selectedElement.value.src = ''
    updateElement()
  }
}

function handlePrintPreview() {
  printBySelector('#labelPreviewPrintArea')
}

defineExpose({
  buildSavePayload,
  loadFromData,
})
</script>

<template>
  <div class="label-designer">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never" class="label-designer__card">
          <template #header>设计工具</template>

          <el-card shadow="never" class="label-designer__section">
            <template #header>添加元素</template>
            <el-button-group style="width: 100%">
              <el-button style="width: 50%" @click="addTextElement()">
                <el-icon><Edit /></el-icon> 文本
              </el-button>
              <el-button style="width: 50%" :disabled="hasBarcodeElement" @click="addBarcodeElement()">
                <el-icon><Menu /></el-icon> 条码
              </el-button>
            </el-button-group>
            <el-button-group style="width: 100%; margin-top: 10px">
              <el-button style="width: 50%" @click="addExpiryDateElement()">
                <el-icon><Calendar /></el-icon> 保质期
              </el-button>
              <el-button style="width: 50%" @click="addImageElement()">
                <el-icon><Picture /></el-icon> 图片
              </el-button>
            </el-button-group>
          </el-card>

          <el-card v-if="selectedElement" shadow="never" class="label-designer__section">
            <template #header>元素属性</template>
            <el-form size="small" label-width="64px">
              <el-form-item v-if="selectedElement.type === 'text'" label="内容">
                <el-input v-model="selectedElement.content" @input="updateElement" />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'barcode'" label="内容">
                <el-input v-model="selectedElement.content" @input="updateElement" />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'expiryDate'" label="日期">
                <el-date-picker
                  v-model="selectedElement.expiryDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  @change="updateElement"
                />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'expiryDate'" label="前缀">
                <el-input
                  v-model="selectedElement.prefix"
                  placeholder="如：保质期至"
                  @input="updateElement"
                />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'image'" label="图片">
                <div class="label-designer__image-upload">
                  <el-upload
                    class="label-designer__uploader"
                    :action="uploadUrl"
                    :headers="uploadHeaders"
                    :show-file-list="false"
                    accept="image/*"
                    :before-upload="beforeImageUpload"
                    :on-success="handleImageSuccess"
                  >
                    <img v-if="selectedElement.src" :src="selectedElement.src" class="label-designer__thumb">
                    <el-icon v-else class="label-designer__uploader-icon"><Plus /></el-icon>
                  </el-upload>
                  <el-button
                    v-if="selectedElement.src"
                    size="small"
                    type="danger"
                    @click="removeImage"
                  >
                    删除图片
                  </el-button>
                </div>
              </el-form-item>
              <template v-if="selectedElement.type !== 'image'">
                <el-form-item label="字体">
                  <el-select v-model="selectedElement.fontFamily" style="width: 100%" @change="updateElement">
                    <el-option label="默认" value="Arial" />
                    <el-option label="宋体" value="SimSun" />
                    <el-option label="黑体" value="SimHei" />
                    <el-option label="微软雅黑" value="Microsoft YaHei" />
                  </el-select>
                </el-form-item>
                <el-form-item label="大小">
                  <el-input-number
                    v-model="selectedElement.fontSize"
                    :min="8"
                    :max="72"
                    style="width: 100%"
                    @change="updateElement"
                  />
                </el-form-item>
                <el-form-item label="颜色">
                  <el-color-picker v-model="selectedElement.color" @change="updateElement" />
                </el-form-item>
                <el-form-item label="粗体">
                  <el-switch v-model="selectedElement.bold" @change="updateElement" />
                </el-form-item>
                <el-form-item label="斜体">
                  <el-switch v-model="selectedElement.italic" @change="updateElement" />
                </el-form-item>
                <el-form-item label="方向">
                  <el-radio-group v-model="selectedElement.textDirection" @change="updateElement">
                    <el-radio value="horizontal">横向</el-radio>
                    <el-radio value="vertical">竖向</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>
              <el-form-item label="位置">
                <el-input-number v-model="selectedElement.x" style="width: 45%" @change="updateElement" />
                <el-input-number
                  v-model="selectedElement.y"
                  style="width: 45%; margin-left: 8px"
                  @change="updateElement"
                />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'barcode'" label="尺寸">
                <el-input-number v-model="selectedElement.width" :min="20" :max="200" style="width: 45%" @change="updateElement" />
                <el-input-number
                  v-model="selectedElement.height"
                  :min="10"
                  :max="100"
                  style="width: 45%; margin-left: 8px"
                  @change="updateElement"
                />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'image'" label="尺寸">
                <el-input-number v-model="selectedElement.width" :min="1" style="width: 45%" @change="updateElement" />
                <el-input-number
                  v-model="selectedElement.height"
                  :min="1"
                  style="width: 45%; margin-left: 8px"
                  @change="updateElement"
                />
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'image'" label="方向">
                <el-radio-group v-model="selectedElement.rotation" @change="updateElement">
                  <el-radio :value="0">0°</el-radio>
                  <el-radio :value="90">90°</el-radio>
                  <el-radio :value="180">180°</el-radio>
                  <el-radio :value="270">270°</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'image'" label="对齐">
                <el-radio-group v-model="selectedElement.align" @change="updateElement">
                  <el-radio value="left">左对齐</el-radio>
                  <el-radio value="center">居中</el-radio>
                  <el-radio value="right">右对齐</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="selectedElement.type === 'image'" label="平铺">
                <el-switch v-model="selectedElement.tile" @change="updateElement" />
              </el-form-item>
              <el-form-item>
                <el-button type="danger" size="small" @click="deleteElement()">删除元素</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card shadow="never" class="label-designer__section">
            <template #header>标签属性</template>
            <el-form size="small" label-width="64px">
              <el-form-item label="名称">
                <el-input v-model="labelConfig.name" maxlength="50" show-word-limit />
              </el-form-item>
              <el-form-item label="单位">
                <el-select v-model="labelConfig.unit" style="width: 100%">
                  <el-option label="像素 (px)" value="px" />
                  <el-option label="毫米 (mm)" value="mm" />
                  <el-option label="厘米 (cm)" value="cm" />
                  <el-option label="英寸 (in)" value="in" />
                </el-select>
              </el-form-item>
              <el-form-item label="宽度">
                <el-input-number v-model="labelConfig.width" :min="0" style="width: 100%" />
              </el-form-item>
              <el-form-item label="高度">
                <el-input-number v-model="labelConfig.height" :min="0" style="width: 100%" />
              </el-form-item>
              <el-form-item label="背景">
                <el-color-picker v-model="labelConfig.backgroundColor" />
              </el-form-item>
            </el-form>
          </el-card>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never" class="label-designer__card">
          <template #header>
            <div class="label-designer__header">
              <span>标签设计器</span>
              <el-button size="small" @click="previewVisible = true">预览</el-button>
            </div>
          </template>
          <div class="label-designer__canvas-wrap">
            <div
              class="label-designer__canvas"
              :style="canvasStyle"
              @mousedown="startDrag"
              @mousemove="onDrag"
              @mouseup="endDrag"
              @click="deselectElement"
            >
              <div
                v-for="(element, index) in designElements"
                :key="index"
                class="label-designer__element design-element"
                :class="{ 'is-selected': selectedElementIndex === index }"
                :style="getElementStyle(element)"
                :data-direction="element.type === 'text' || element.type === 'expiryDate' ? element.textDirection : undefined"
                @mousedown.stop="selectElement(index)"
                @click.stop="selectElement(index)"
              >
                <template v-if="element.type === 'text'">
                  <span :style="getTextElementStyle(element)">{{ element.content }}</span>
                </template>
                <template v-else-if="element.type === 'barcode'">
                  <div class="barcode-container">
                    <canvas
                      :ref="(el) => setBarcodeCanvas(el as HTMLCanvasElement | null, index)"
                      class="barcode-canvas"
                    />
                  </div>
                </template>
                <template v-else-if="element.type === 'expiryDate'">
                  <span :style="getTextElementStyle(element)">
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
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="never" class="label-designer__card">
          <template #header>元素列表</template>
          <div
            v-for="(element, index) in designElements"
            :key="index"
            class="label-designer__list-item"
            :class="{ 'is-active': selectedElementIndex === index }"
            @click="selectElement(index)"
          >
            <div>
              <strong>{{ getElementName(element) }}</strong>
              <div class="label-designer__list-desc">{{ getElementDisplayContent(element) }}</div>
            </div>
            <el-button type="danger" link :icon="Delete" @click.stop="deleteElement(index)" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="previewVisible" title="标签预览" width="600px" append-to-body>
      <div id="labelPreviewPrintArea" class="label-designer__preview-wrap">
        <LabelPreview :design-elements="designElements" :label-config="labelConfig" />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="handlePrintPreview">打印</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.label-designer {
  &__card,
  &__section {
    margin-bottom: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__canvas-wrap {
    display: flex;
    justify-content: center;
    min-height: 420px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  &__canvas {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  &__element {
    border: 1px solid transparent;
    padding: 2px 4px;
    box-sizing: border-box;
    transition: all 0.2s;

    &:hover {
      border-color: var(--el-color-primary);
    }

    &.is-selected {
      border-color: var(--el-color-primary);
      background: rgba(64, 158, 255, 0.1);
    }
  }

  &__list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;

    &.is-active,
    &:hover {
      background: #f5f7fa;
    }
  }

  &__list-desc {
    color: #909399;
    font-size: 12px;
    margin-top: 4px;
  }

  &__image-upload {
    width: 100%;
  }

  &__uploader {
    width: 100%;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.3s;
    margin-bottom: 8px;

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  &__uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 100%;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__thumb {
    display: block;
    width: 100%;
    max-height: 120px;
    object-fit: contain;
  }

  &__preview-wrap {
    display: flex;
    justify-content: center;
    padding: 12px;
  }
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
}

.barcode-canvas {
  width: 100%;
  height: 100%;
  display: block;
  box-sizing: border-box;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
  min-width: 40px;
  min-height: 40px;
}

.image-element {
  border: 1px solid transparent;
  box-sizing: border-box;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
