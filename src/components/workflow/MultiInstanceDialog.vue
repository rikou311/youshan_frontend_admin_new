<script setup lang="ts">
import { reactive, watch } from 'vue'
import {
  hasMultiInstance,
  readMultiInstance,
  writeMultiInstance,
  type MultiInstanceForm,
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

const form = reactive<MultiInstanceForm>({
  collection: '',
  elementVariable: '',
  isSequential: '',
  completionCondition: '',
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    Object.assign(form, readMultiInstance(props.element))
  },
)

function clearForm() {
  form.collection = ''
  form.elementVariable = ''
  form.isSequential = ''
  form.completionCondition = ''
}

function handleConfirm() {
  writeMultiInstance(props.modeler, props.element, { ...form })
  emit('saved')
  emit('update:visible', false)
}

function handleClear() {
  clearForm()
  writeMultiInstance(props.modeler, props.element, { ...form })
  emit('saved')
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="多实例配置"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert type="info" :closable="false" show-icon class="multi-instance-dialog__tip">
      <template #title>
        按 BPMN2.0 规范，多实例会提供 nrOfInstances / nrOfActiveInstances /
        nrOfCompletedInstances / loopCounter 等变量。
      </template>
    </el-alert>

    <el-form label-width="100px">
      <el-form-item label="集合">
        <el-input v-model="form.collection" placeholder="集合表达式或变量名" />
      </el-form-item>
      <el-form-item label="元素变量">
        <el-input v-model="form.elementVariable" placeholder="局部变量名，通常与指派变量一致" />
      </el-form-item>
      <el-form-item label="执行方式">
        <el-radio-group v-model="form.isSequential">
          <el-radio value="true">串行</el-radio>
          <el-radio value="false">并行</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="完成条件">
        <el-input
          v-model="form.completionCondition"
          type="textarea"
          :rows="2"
          placeholder="${nrOfCompletedInstances/nrOfInstances >= 0.6}"
        />
      </el-form-item>
      <el-form-item v-if="hasMultiInstance(element)" label="当前状态">
        <el-tag type="success" size="small">已配置多实例</el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button @click="handleClear">清空</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.multi-instance-dialog {
  &__tip {
    margin-bottom: 16px;
  }
}
</style>
