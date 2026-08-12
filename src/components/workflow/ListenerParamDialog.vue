<script setup lang="ts">
import { reactive, watch } from 'vue'
import { PARAM_TYPE_OPTIONS, type ListenerParam } from './extensionUtils'

interface Props {
  visible: boolean
  value?: ListenerParam[]
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [value: ListenerParam[]]
}>()

const rows = reactive<ListenerParam[]>([])

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    rows.splice(0, rows.length, ...props.value.map((item) => ({ ...item })))
    if (!rows.length) {
      rows.push({ name: '', type: 'stringValue', value: '' })
    }
  },
)

function addRow() {
  rows.push({ name: '', type: 'stringValue', value: '' })
}

function removeRow(index: number) {
  rows.splice(index, 1)
}

function handleConfirm() {
  const cleaned = rows.filter((item) => item.name && item.value)
  emit('confirm', cleaned)
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="监听器参数"
    width="720px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="listener-param-dialog__actions">
      <el-button type="primary" size="small" @click="addRow">添加参数</el-button>
    </div>
    <el-table :data="rows" border>
      <el-table-column label="类型" width="160">
        <template #default="{ row }">
          <el-select v-model="row.type" style="width: 100%">
            <el-option
              v-for="item in PARAM_TYPE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="140">
        <template #default="{ row }">
          <el-input v-model="row.name" />
        </template>
      </el-table-column>
      <el-table-column label="值" min-width="180">
        <template #default="{ row }">
          <el-input v-model="row.value" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ $index }">
          <el-button type="danger" link @click="removeRow($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.listener-param-dialog {
  &__actions {
    margin-bottom: 12px;
  }
}
</style>
