<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ListenerParamDialog from './ListenerParamDialog.vue'
import {
  LISTENER_TYPE_OPTIONS,
  TASK_EVENT_OPTIONS,
  readListeners,
  writeListeners,
  type ListenerItem,
  type ListenerParam,
} from './extensionUtils'
import type { ElementLike, ModelerLike } from './propertyUtils'

interface Props {
  visible: boolean
  modeler: ModelerLike | null
  element: ElementLike | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const rows = reactive<ListenerItem[]>([])
const paramVisible = ref(false)
const editingIndex = ref(-1)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    rows.splice(0, rows.length, ...readListeners(props.element, 'flowable:TaskListener'))
  },
)

function addRow() {
  rows.push({
    event: 'create',
    type: 'class',
    className: '',
    params: [],
  })
}

function removeRow(index: number) {
  rows.splice(index, 1)
}

function openParams(index: number) {
  editingIndex.value = index
  paramVisible.value = true
}

function onParamsConfirm(params: ListenerParam[]) {
  if (editingIndex.value < 0) {
    return
  }
  rows[editingIndex.value].params = params
  editingIndex.value = -1
}

function handleConfirm() {
  const invalid = rows.some((item) => !item.event || !item.type || !item.className)
  if (invalid) {
    ElMessage.warning('请完整填写监听器事件、类型与类名/表达式')
    return
  }
  writeListeners(props.modeler, props.element, 'flowable:TaskListener', [...rows])
  emit('saved')
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="任务监听器"
    width="900px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="listener-dialog__tip"
      title="create / assignment / complete / delete 分别在任务创建、指派、完成、删除时触发"
    />
    <div class="listener-dialog__actions">
      <el-button type="primary" size="small" @click="addRow">添加监听器</el-button>
    </div>
    <el-table :data="rows" border>
      <el-table-column label="事件" width="150">
        <template #default="{ row }">
          <el-select v-model="row.event" style="width: 100%">
            <el-option
              v-for="item in TASK_EVENT_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="150">
        <template #default="{ row }">
          <el-select v-model="row.type" style="width: 100%">
            <el-option
              v-for="item in LISTENER_TYPE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="类名 / 表达式" min-width="220">
        <template #default="{ row }">
          <el-input v-model="row.className" placeholder="com.example.MyTaskListener 或 ${bean}" />
        </template>
      </el-table-column>
      <el-table-column label="参数" width="110">
        <template #default="{ row, $index }">
          <el-badge :value="row.params.length" type="primary">
            <el-button size="small" @click="openParams($index)">配置</el-button>
          </el-badge>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ $index }">
          <el-button type="danger" link @click="removeRow($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>

    <ListenerParamDialog
      v-model:visible="paramVisible"
      :value="editingIndex >= 0 ? rows[editingIndex]?.params : []"
      @confirm="onParamsConfirm"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
.listener-dialog {
  &__tip {
    margin-bottom: 12px;
  }

  &__actions {
    margin-bottom: 12px;
  }
}
</style>
