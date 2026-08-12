<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormFieldPreview from '@/components/workflow/FormFieldPreview.vue'
import {
  createEmptyFormOptions,
  createFieldByType,
  defaultPreviewValue,
  downloadFormJson,
  flattenPreviewColumns,
  FORM_FIELD_PALETTE,
  parseFormModelData,
  type FormDesignOptions,
  type FormFieldItem,
  type FormFieldType,
} from '@/utils/form-design'

interface Props {
  modelValue?: string | Record<string, unknown> | FormDesignOptions | null
  height?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  height: '70vh',
})

const emit = defineEmits<{
  save: [options: FormDesignOptions]
}>()

const options = reactive<FormDesignOptions>(createEmptyFormOptions())
const selectedIndex = ref(-1)
const selectedChildIndex = ref(-1)
const importText = ref('')
const importVisible = ref(false)

const selectedField = computed(() =>
  selectedIndex.value >= 0 ? options.column[selectedIndex.value] : null,
)

const selectedChild = computed(() => {
  if (!selectedField.value?.children || selectedChildIndex.value < 0) {
    return null
  }
  return selectedField.value.children[selectedChildIndex.value] || null
})

const paletteGroups = computed(() => {
  const map = new Map<string, typeof FORM_FIELD_PALETTE>()
  FORM_FIELD_PALETTE.forEach((item) => {
    const list = map.get(item.group) || []
    list.push(item)
    map.set(item.group, list)
  })
  return [...map.entries()].map(([group, list]) => ({ group, list }))
})

const previewColumns = computed(() => flattenPreviewColumns(options))
const previewModel = reactive<Record<string, unknown>>({})

function collectFields(list: FormFieldItem[], acc: FormFieldItem[] = []) {
  list.forEach((item) => {
    acc.push(item)
    if (item.children?.length && item.type === 'group') {
      collectFields(item.children, acc)
    }
  })
  return acc
}

function syncPreviewModel() {
  Object.keys(previewModel).forEach((key) => {
    delete previewModel[key]
  })
  collectFields(previewColumns.value).forEach((item) => {
    if (!item.prop || item.type === 'title' || item.type === 'group') {
      return
    }
    previewModel[item.prop] = defaultPreviewValue(item)
  })
}

function loadOptions(raw?: Props['modelValue']) {
  Object.assign(options, parseFormModelData(raw as string | Record<string, unknown> | null))
  selectedIndex.value = options.column.length ? 0 : -1
  selectedChildIndex.value = -1
  syncPreviewModel()
}

watch(
  () => props.modelValue,
  (value) => loadOptions(value),
  { immediate: true },
)

function addField(type: FormFieldType) {
  options.column.push(createFieldByType(type))
  selectedIndex.value = options.column.length - 1
  selectedChildIndex.value = -1
  syncPreviewModel()
}

function selectField(index: number) {
  selectedIndex.value = index
  selectedChildIndex.value = -1
}

function removeField(index: number) {
  options.column.splice(index, 1)
  if (!options.column.length) {
    selectedIndex.value = -1
  } else if (selectedIndex.value >= options.column.length) {
    selectedIndex.value = options.column.length - 1
  }
  selectedChildIndex.value = -1
  syncPreviewModel()
}

function moveField(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= options.column.length) {
    return
  }
  const [item] = options.column.splice(index, 1)
  options.column.splice(target, 0, item)
  selectedIndex.value = target
}

function clearFields() {
  options.column = []
  options.group = []
  selectedIndex.value = -1
  selectedChildIndex.value = -1
  syncPreviewModel()
}

function updateSelected(patch: Partial<FormFieldItem>) {
  if (!selectedField.value) {
    return
  }
  Object.assign(selectedField.value, patch)
  syncPreviewModel()
}

function updateSelectedChild(patch: Partial<FormFieldItem>) {
  if (!selectedChild.value) {
    return
  }
  Object.assign(selectedChild.value, patch)
  syncPreviewModel()
}

function addOption(target: FormFieldItem | null = selectedField.value) {
  if (!target) {
    return
  }
  if (!target.dicData) {
    target.dicData = []
  }
  target.dicData.push({
    label: `选项${target.dicData.length + 1}`,
    value: String(target.dicData.length + 1),
  })
}

function removeOption(index: number, target: FormFieldItem | null = selectedField.value) {
  target?.dicData?.splice(index, 1)
}

function addChildField(type: FormFieldType = 'input') {
  if (!selectedField.value || !['group', 'dynamic'].includes(selectedField.value.type)) {
    return
  }
  if (!selectedField.value.children) {
    selectedField.value.children = []
  }
  selectedField.value.children.push(createFieldByType(type))
  selectedChildIndex.value = selectedField.value.children.length - 1
  syncPreviewModel()
}

function removeChildField(index: number) {
  selectedField.value?.children?.splice(index, 1)
  if (!selectedField.value?.children?.length) {
    selectedChildIndex.value = -1
  } else if (selectedChildIndex.value >= (selectedField.value.children?.length || 0)) {
    selectedChildIndex.value = (selectedField.value.children?.length || 1) - 1
  }
  syncPreviewModel()
}

function handleSave() {
  if (!(options.name || '').trim()) {
    ElMessage.warning('请输入表单名称')
    return
  }
  if (!(options.key || '').trim()) {
    ElMessage.warning('请输入表单 Key')
    return
  }
  if (!options.column.length && !(options.group || []).length) {
    ElMessage.warning('请至少添加一个表单项')
    return
  }
  emit('save', {
    ...options,
    column: options.column.map((item) => ({
      ...item,
      children: item.children?.map((child) => ({ ...child })),
    })),
    group: (options.group || []).map((g) => ({
      ...g,
      column: (g.column || []).map((item) => ({ ...item })),
    })),
  })
}

function handleExport() {
  downloadFormJson(options, options.key || options.name || 'form')
  ElMessage.success('已导出 JSON')
}

function openImport() {
  importText.value = JSON.stringify(options, null, 2)
  importVisible.value = true
}

function confirmImport() {
  try {
    const parsed = JSON.parse(importText.value)
    Object.assign(options, parseFormModelData(parsed))
    selectedIndex.value = options.column.length ? 0 : -1
    selectedChildIndex.value = -1
    syncPreviewModel()
    importVisible.value = false
    ElMessage.success('导入成功')
  } catch {
    ElMessage.error('JSON 格式错误')
  }
}

function fieldTypeLabel(type: string) {
  return FORM_FIELD_PALETTE.find((item) => item.type === type)?.label || type
}

const childPaletteTypes: FormFieldType[] = [
  'input',
  'number',
  'select',
  'date',
  'switch',
  'upload',
]
</script>

<template>
  <div class="form-designer" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
    <div class="form-designer__toolbar">
      <div class="form-designer__meta">
        <el-input v-model="options.name" placeholder="表单名称" style="width: 180px" />
        <el-input v-model="options.key" placeholder="表单 Key" style="width: 180px" />
        <el-input v-model="options.description" placeholder="描述" style="width: 220px" />
      </div>
      <div class="form-designer__actions">
        <el-button @click="openImport">导入 JSON</el-button>
        <el-button @click="handleExport">导出 JSON</el-button>
        <el-button @click="clearFields">清空字段</el-button>
        <el-button type="primary" @click="handleSave">保存模型</el-button>
      </div>
    </div>

    <div class="form-designer__body">
      <aside class="form-designer__palette">
        <div class="form-designer__panel-title">组件库</div>
        <div v-for="group in paletteGroups" :key="group.group" class="form-designer__group">
          <div class="form-designer__group-title">{{ group.group }}</div>
          <div class="form-designer__palette-list">
            <el-button
              v-for="item in group.list"
              :key="item.type"
              size="small"
              @click="addField(item.type)"
            >
              {{ item.label }}
            </el-button>
          </div>
        </div>
      </aside>

      <main class="form-designer__canvas">
        <div class="form-designer__panel-title">表单预览</div>
        <el-empty v-if="!previewColumns.length" description="从左侧添加字段" />
        <el-form
          v-else
          :model="previewModel"
          :label-width="`${options.labelWidth}px`"
          :label-position="options.labelPosition"
          :size="options.size"
        >
          <div
            v-for="(field, index) in options.column"
            :key="`${field.prop || field.type}-${index}`"
            class="form-designer__field"
            :class="{ 'is-active': selectedIndex === index }"
            @click="selectField(index)"
          >
            <div class="form-designer__field-tools">
              <el-tag size="small">{{ fieldTypeLabel(field.type) }}</el-tag>
              <div>
                <el-button link size="small" @click.stop="moveField(index, -1)">上移</el-button>
                <el-button link size="small" @click.stop="moveField(index, 1)">下移</el-button>
                <el-button type="danger" link size="small" @click.stop="removeField(index)">
                  删除
                </el-button>
              </div>
            </div>
            <FormFieldPreview :field="field" :model="previewModel" />
          </div>
        </el-form>
      </main>

      <aside class="form-designer__config">
        <div class="form-designer__panel-title">字段配置</div>
        <el-empty v-if="!selectedField" description="请选择字段" />
        <el-form v-else label-width="84px" size="small">
          <el-form-item label="类型">
            <el-tag>{{ fieldTypeLabel(selectedField.type) }}</el-tag>
          </el-form-item>
          <el-form-item label="标题">
            <el-input
              :model-value="selectedField.label"
              @update:model-value="updateSelected({ label: String($event || '') })"
            />
          </el-form-item>
          <el-form-item v-if="selectedField.type !== 'title'" label="字段名">
            <el-input
              :model-value="selectedField.prop"
              @update:model-value="updateSelected({ prop: String($event || '') })"
            />
          </el-form-item>
          <el-form-item v-if="selectedField.type === 'title'" label="内容">
            <el-input
              :model-value="String(selectedField.value ?? '')"
              @update:model-value="updateSelected({ value: String($event || '') })"
            />
          </el-form-item>
          <el-form-item
            v-if="!['title', 'switch', 'checkbox', 'radio', 'rate', 'slider', 'group', 'dynamic', 'upload'].includes(selectedField.type)"
            label="占位符"
          >
            <el-input
              :model-value="selectedField.placeholder"
              @update:model-value="updateSelected({ placeholder: String($event || '') })"
            />
          </el-form-item>
          <el-form-item v-if="!['title', 'group'].includes(selectedField.type)" label="必填">
            <el-switch
              :model-value="Boolean(selectedField.required)"
              @change="updateSelected({ required: Boolean($event) })"
            />
          </el-form-item>
          <el-form-item label="栅格">
            <el-slider
              :model-value="selectedField.span || 24"
              :min="6"
              :max="24"
              :step="6"
              @update:model-value="updateSelected({ span: Number($event) })"
            />
          </el-form-item>

          <template v-if="selectedField.type === 'upload'">
            <el-form-item label="接受类型">
              <el-input
                :model-value="selectedField.accept"
                @update:model-value="updateSelected({ accept: String($event || '') })"
              />
            </el-form-item>
            <el-form-item label="数量上限">
              <el-input-number
                :model-value="selectedField.limit || 1"
                :min="1"
                :max="20"
                @update:model-value="updateSelected({ limit: Number($event || 1) })"
              />
            </el-form-item>
          </template>

          <template v-if="selectedField.type === 'rate' || selectedField.type === 'slider'">
            <el-form-item label="最大值">
              <el-input-number
                :model-value="selectedField.max ?? (selectedField.type === 'rate' ? 5 : 100)"
                :min="1"
                @update:model-value="updateSelected({ max: Number($event || 1) })"
              />
            </el-form-item>
            <el-form-item v-if="selectedField.type === 'slider'" label="最小值">
              <el-input-number
                :model-value="selectedField.min ?? 0"
                @update:model-value="updateSelected({ min: Number($event || 0) })"
              />
            </el-form-item>
            <el-form-item v-if="selectedField.type === 'slider'" label="步长">
              <el-input-number
                :model-value="selectedField.step ?? 1"
                :min="1"
                @update:model-value="updateSelected({ step: Number($event || 1) })"
              />
            </el-form-item>
          </template>

          <template v-if="selectedField.type === 'cascader'">
            <el-form-item label="任意一级">
              <el-switch
                :model-value="Boolean(selectedField.checkStrictly)"
                @change="updateSelected({ checkStrictly: Boolean($event) })"
              />
            </el-form-item>
          </template>

          <template v-if="['select', 'radio', 'checkbox', 'cascader'].includes(selectedField.type)">
            <el-divider content-position="left">选项</el-divider>
            <div
              v-for="(opt, optIndex) in selectedField.dicData || []"
              :key="optIndex"
              class="form-designer__option"
            >
              <el-input v-model="opt.label" placeholder="标签" />
              <el-input v-model="opt.value as string" placeholder="值" />
              <el-button type="danger" link @click="removeOption(optIndex)">删</el-button>
            </div>
            <el-button type="primary" link @click="addOption()">添加选项</el-button>
            <div v-if="selectedField.type === 'cascader'" class="form-designer__tip">
              级联子节点可在导出 JSON 后手动维护 children
            </div>
          </template>

          <template v-if="['group', 'dynamic'].includes(selectedField.type)">
            <el-divider content-position="left">子字段</el-divider>
            <div class="form-designer__child-actions">
              <el-button
                v-for="type in childPaletteTypes"
                :key="type"
                size="small"
                @click="addChildField(type)"
              >
                + {{ fieldTypeLabel(type) }}
              </el-button>
            </div>
            <div
              v-for="(child, childIndex) in selectedField.children || []"
              :key="`${child.prop}-${childIndex}`"
              class="form-designer__child"
              :class="{ 'is-active': selectedChildIndex === childIndex }"
              @click="selectedChildIndex = childIndex"
            >
              <span>{{ child.label }} ({{ fieldTypeLabel(child.type) }})</span>
              <el-button type="danger" link size="small" @click.stop="removeChildField(childIndex)">
                删
              </el-button>
            </div>
            <template v-if="selectedChild">
              <el-divider content-position="left">子字段配置</el-divider>
              <el-form-item label="标题">
                <el-input
                  :model-value="selectedChild.label"
                  @update:model-value="updateSelectedChild({ label: String($event || '') })"
                />
              </el-form-item>
              <el-form-item label="字段名">
                <el-input
                  :model-value="selectedChild.prop"
                  @update:model-value="updateSelectedChild({ prop: String($event || '') })"
                />
              </el-form-item>
            </template>
          </template>
        </el-form>

        <el-divider />
        <div class="form-designer__panel-title">表单配置</div>
        <el-form label-width="84px" size="small">
          <el-form-item label="标签宽">
            <el-input-number v-model="options.labelWidth as number" :min="60" :max="200" />
          </el-form-item>
          <el-form-item label="标签位置">
            <el-select v-model="options.labelPosition" style="width: 100%">
              <el-option label="右对齐" value="right" />
              <el-option label="左对齐" value="left" />
              <el-option label="顶部" value="top" />
            </el-select>
          </el-form-item>
          <el-form-item label="尺寸">
            <el-select v-model="options.size" style="width: 100%">
              <el-option label="默认" value="default" />
              <el-option label="大" value="large" />
              <el-option label="小" value="small" />
            </el-select>
          </el-form-item>
        </el-form>
      </aside>
    </div>

    <el-dialog v-model="importVisible" title="导入表单 JSON" width="720px">
      <el-input v-model="importText" type="textarea" :rows="16" />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.form-designer {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  background: #fff;

  &__toolbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  &__meta,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__body {
    display: grid;
    grid-template-columns: 220px 1fr 300px;
    gap: 12px;
    min-height: 0;
    flex: 1;
    margin-top: 12px;
  }

  &__palette,
  &__canvas,
  &__config {
    min-height: 0;
    overflow: auto;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    padding: 12px;
    background: #fafafa;
  }

  &__canvas {
    background: #fff;
  }

  &__panel-title {
    margin-bottom: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__group {
    margin-bottom: 12px;
  }

  &__group-title {
    margin-bottom: 8px;
    color: #909399;
    font-size: 12px;
  }

  &__palette-list,
  &__child-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__child-actions {
    margin-bottom: 8px;
  }

  &__field {
    margin-bottom: 12px;
    padding: 10px;
    border: 1px dashed #dcdfe6;
    border-radius: 6px;
    cursor: pointer;

    &.is-active {
      border-color: #409eff;
      background: #ecf5ff;
    }
  }

  &__field-tools {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__option {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 6px;
    margin-bottom: 8px;
  }

  &__child {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    margin-bottom: 6px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;

    &.is-active {
      border-color: #409eff;
    }
  }

  &__tip {
    margin-top: 6px;
    color: #909399;
    font-size: 12px;
  }
}
</style>
