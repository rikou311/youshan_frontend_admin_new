<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { getAllRoles, getSysUserList, type RoleItem, type SysUserItem } from '@/api/system'
import ExecutionListenerDialog from './ExecutionListenerDialog.vue'
import MultiInstanceDialog from './MultiInstanceDialog.vue'
import TaskListenerDialog from './TaskListenerDialog.vue'
import { NodeName } from './zh'
import { getNodeShowConfig, USER_TYPE_OPTIONS } from './showConfig'
import { countListeners, hasMultiInstance } from './extensionUtils'
import {
  createConditionExpression,
  detectUserType,
  parseCdata,
  splitCommaValues,
  stripFlowablePrefix,
  updateElementProperties,
  type ElementLike,
  type ModelerLike,
} from './propertyUtils'

interface Props {
  modeler: ModelerLike | null
  element: ElementLike | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const userOptions = ref<Array<{ id: number | string; name: string }>>([])
const groupOptions = ref<Array<{ id: number | string; name: string }>>([])
const userLoading = ref(false)
const executionListenerVisible = ref(false)
const taskListenerVisible = ref(false)
const multiInstanceVisible = ref(false)
const executionListenerLength = ref(0)
const taskListenerLength = ref(0)
const multiInstanceConfigured = ref(false)

const form = reactive({
  id: '',
  name: '',
  initiator: '',
  formKey: '',
  userType: 'assignee',
  assignee: '' as string | number,
  candidateUsers: [] as Array<string | number>,
  candidateGroups: [] as Array<string | number>,
  async: false,
  priority: '',
  skipExpression: '',
  dueDate: '',
  isForCompensation: false,
  triggerable: false,
  autoStoreVariables: false,
  ruleVariablesInput: '',
  rules: '',
  resultVariable: '',
  exclude: false,
  className: '',
  conditionExpression: '',
})

const elementType = computed(() => props.element?.type || '')
const showConfig = computed(() => getNodeShowConfig(elementType.value))
const isProcess = computed(() => !elementType.value || elementType.value === 'bpmn:Process')
const isStartEnd = computed(() =>
  ['bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent'].includes(elementType.value),
)
const isTask = computed(() =>
  [
    'bpmn:Task',
    'bpmn:UserTask',
    'bpmn:SendTask',
    'bpmn:ReceiveTask',
    'bpmn:ManualTask',
    'bpmn:BusinessRuleTask',
    'bpmn:ServiceTask',
    'bpmn:ScriptTask',
  ].includes(elementType.value),
)
const isSequenceFlow = computed(() => elementType.value === 'bpmn:SequenceFlow')
const isGateway = computed(() =>
  [
    'bpmn:ExclusiveGateway',
    'bpmn:ParallelGateway',
    'bpmn:InclusiveGateway',
    'bpmn:ComplexGateway',
    'bpmn:EventBasedGateway',
  ].includes(elementType.value),
)

const panelTitle = computed(() => {
  if (isProcess.value) {
    return '流程属性'
  }
  const dict = NodeName as Record<string, string>
  return dict[elementType.value] || `节点属性 (${elementType.value.replace('bpmn:', '')})`
})

function resetForm() {
  Object.assign(form, {
    id: '',
    name: '',
    initiator: '',
    formKey: '',
    userType: 'assignee',
    assignee: '',
    candidateUsers: [],
    candidateGroups: [],
    async: false,
    priority: '',
    skipExpression: '',
    dueDate: '',
    isForCompensation: false,
    triggerable: false,
    autoStoreVariables: false,
    ruleVariablesInput: '',
    rules: '',
    resultVariable: '',
    exclude: false,
    className: '',
    conditionExpression: '',
  })
}

const showTaskListener = computed(() => Boolean(showConfig.value.taskListener) || isTask.value)
const showMultiInstance = computed(() => isTask.value)
const showExecutionListener = computed(
  () => isTask.value || isStartEnd.value || isSequenceFlow.value || isGateway.value,
)

function refreshExtensionStats() {
  executionListenerLength.value = countListeners(props.element, 'flowable:ExecutionListener')
  taskListenerLength.value = countListeners(props.element, 'flowable:TaskListener')
  multiInstanceConfigured.value = hasMultiInstance(props.element)
}

function syncFromElement() {
  const element = props.element
  if (!element?.businessObject) {
    resetForm()
    return
  }

  const bo = element.businessObject
  const cache = stripFlowablePrefix({
    ...bo,
    ...(bo.$attrs || {}),
  }) as Record<string, unknown>

  form.id = String(cache.id ?? '')
  form.name = String(cache.name ?? '')
  form.initiator = String(cache.initiator ?? '')
  form.formKey = String(cache.formKey ?? '')
  form.userType = detectUserType(cache)
  form.assignee = (cache.assignee as string | number) ?? ''
  form.candidateUsers = splitCommaValues(cache.candidateUsers)
  form.candidateGroups = splitCommaValues(cache.candidateGroups)
  form.async = Boolean(cache.async)
  form.priority = String(cache.priority ?? '')
  form.skipExpression = String(cache.skipExpression ?? '')
  form.dueDate = String(cache.dueDate ?? '')
  form.isForCompensation = Boolean(cache.isForCompensation)
  form.triggerable = Boolean(cache.triggerable)
  form.autoStoreVariables = Boolean(cache.autoStoreVariables)
  form.ruleVariablesInput = String(cache.ruleVariablesInput ?? '')
  form.rules = String(cache.rules ?? '')
  form.resultVariable = String(cache.resultVariable ?? '')
  form.exclude = Boolean(cache.exclude)
  form.className = String(cache.class ?? '')
  form.conditionExpression = parseCdata(
    typeof cache.conditionExpression === 'object' && cache.conditionExpression
      ? (cache.conditionExpression as { body?: string }).body
      : String(cache.conditionExpression ?? ''),
  )

  if (form.assignee) {
    ensureUserOption(form.assignee)
  }
  form.candidateUsers.forEach((id) => ensureUserOption(id))
}

function ensureUserOption(id: string | number) {
  if (userOptions.value.some((item) => String(item.id) === String(id))) {
    return
  }
  userOptions.value.push({ id, name: String(id) })
}

function update(properties: Record<string, unknown>) {
  updateElementProperties(props.modeler, props.element, properties)
}

function clearUserAttrsExcept(keep?: string) {
  const types = ['assignee', 'candidateUsers', 'candidateGroups']
  types.forEach((type) => {
    if (type !== keep) {
      update({ [`flowable:${type}`]: undefined })
    }
  })
}

function onIdChange(value: string) {
  form.id = value
  update({ id: value || undefined })
}

function onNameChange(value: string) {
  form.name = value
  update({ name: value || undefined })
}

function onInitiatorChange(value: string) {
  form.initiator = value
  update({ 'flowable:initiator': value || undefined })
}

function onFormKeyChange(value: string) {
  form.formKey = value
  update({ 'flowable:formKey': value || undefined })
}

function onUserTypeChange(value: string) {
  form.userType = value
  form.assignee = ''
  form.candidateUsers = []
  form.candidateGroups = []
  clearUserAttrsExcept()
}

function onAssigneeChange(value: string | number) {
  form.assignee = value
  if (form.userType !== 'assignee') {
    return
  }
  clearUserAttrsExcept('assignee')
  update({ 'flowable:assignee': value || undefined })
}

function onCandidateUsersChange(value: Array<string | number>) {
  form.candidateUsers = value
  if (form.userType !== 'candidateUsers') {
    return
  }
  clearUserAttrsExcept('candidateUsers')
  update({ 'flowable:candidateUsers': value.length ? value.join(',') : undefined })
}

function onCandidateGroupsChange(value: Array<string | number>) {
  form.candidateGroups = value
  if (form.userType !== 'candidateGroups') {
    return
  }
  clearUserAttrsExcept('candidateGroups')
  update({ 'flowable:candidateGroups': value.length ? value.join(',') : undefined })
}

function onAsyncChange(value: boolean | string | number) {
  form.async = Boolean(value)
  update({ 'flowable:async': form.async })
}

function onPriorityChange(value: string) {
  form.priority = value
  update({ 'flowable:priority': value || undefined })
}

function onSkipExpressionChange(value: string) {
  form.skipExpression = value
  update({ 'flowable:skipExpression': value || undefined })
}

function onDueDateChange(value: string) {
  form.dueDate = value
  update({ 'flowable:dueDate': value || undefined })
}

function onIsForCompensationChange(value: boolean | string | number) {
  form.isForCompensation = Boolean(value)
  update({ isForCompensation: form.isForCompensation })
}

function onTriggerableChange(value: boolean | string | number) {
  form.triggerable = Boolean(value)
  update({ 'flowable:triggerable': form.triggerable })
}

function onAutoStoreVariablesChange(value: boolean | string | number) {
  form.autoStoreVariables = Boolean(value)
  update({ 'flowable:autoStoreVariables': form.autoStoreVariables })
}

function onRuleVariablesInputChange(value: string) {
  form.ruleVariablesInput = value
  update({ 'flowable:ruleVariablesInput': value || undefined })
}

function onRulesChange(value: string) {
  form.rules = value
  update({ 'flowable:rules': value || undefined })
}

function onResultVariableChange(value: string) {
  form.resultVariable = value
  update({ 'flowable:resultVariable': value || undefined })
}

function onExcludeChange(value: boolean | string | number) {
  form.exclude = Boolean(value)
  update({ 'flowable:exclude': form.exclude })
}

function onClassChange(value: string) {
  form.className = value
  update({ 'flowable:class': value || undefined })
}

function onConditionExpressionChange(value: string) {
  form.conditionExpression = value
  if (value) {
    update({ conditionExpression: createConditionExpression(props.modeler, value) })
  } else {
    update({ conditionExpression: undefined })
  }
}

async function remoteUsers(keyword: string) {
  userLoading.value = true
  try {
    const result = await getSysUserList({
      page: 1,
      pageSize: 20,
      username: keyword || undefined,
    })
    userOptions.value = result.list.map((item: SysUserItem) => ({
      id: item.id,
      name: item.username || item.realName || String(item.id),
    }))
  } finally {
    userLoading.value = false
  }
}

async function loadGroups() {
  try {
    const roles = await getAllRoles()
    groupOptions.value = roles.map((item: RoleItem) => ({
      id: item.id,
      name: item.roleName || String(item.id),
    }))
  } catch {
    groupOptions.value = []
  }
}

watch(
  () => props.element,
  () => {
    syncFromElement()
    refreshExtensionStats()
    if (showConfig.value.candidateGroups || showConfig.value.userType) {
      void loadGroups()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="bpmn-property-panel">
    <div class="bpmn-property-panel__title">{{ panelTitle }}</div>
    <el-form label-width="96px" size="small" :disabled="disabled">
      <template v-if="isProcess">
        <slot name="process" />
      </template>

      <template v-else>
        <el-form-item label="节点 ID">
          <el-input :model-value="form.id" @update:model-value="onIdChange" />
        </el-form-item>
        <el-form-item label="节点名称">
          <el-input :model-value="form.name" @update:model-value="onNameChange" />
        </el-form-item>

        <el-form-item v-if="showExecutionListener" label="执行监听器">
          <el-badge :value="executionListenerLength" :hidden="!executionListenerLength">
            <el-button size="small" :disabled="disabled" @click="executionListenerVisible = true">
              编辑
            </el-button>
          </el-badge>
        </el-form-item>

        <template v-if="isStartEnd">
          <el-form-item v-if="showConfig.initiator" label="发起人">
            <el-input :model-value="form.initiator" @update:model-value="onInitiatorChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.formKey" label="表单 Key">
            <el-input :model-value="form.formKey" @update:model-value="onFormKeyChange" />
          </el-form-item>
        </template>

        <template v-if="isTask">
          <el-form-item v-if="showConfig.userType" label="人员类型">
            <el-select :model-value="form.userType" style="width: 100%" @change="onUserTypeChange">
              <el-option
                v-for="item in USER_TYPE_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="showConfig.assignee && form.userType === 'assignee'"
            label="指定人员"
          >
            <el-select
              :model-value="form.assignee"
              filterable
              remote
              clearable
              :remote-method="remoteUsers"
              :loading="userLoading"
              style="width: 100%"
              @change="onAssigneeChange"
              @focus="remoteUsers('')"
            >
              <el-option
                v-for="item in userOptions"
                :key="String(item.id)"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="showConfig.candidateUsers && form.userType === 'candidateUsers'"
            label="候选人员"
          >
            <el-select
              :model-value="form.candidateUsers"
              multiple
              filterable
              remote
              clearable
              :remote-method="remoteUsers"
              :loading="userLoading"
              style="width: 100%"
              @change="onCandidateUsersChange"
              @focus="remoteUsers('')"
            >
              <el-option
                v-for="item in userOptions"
                :key="String(item.id)"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="showConfig.candidateGroups && form.userType === 'candidateGroups'"
            label="候选组"
          >
            <el-select
              :model-value="form.candidateGroups"
              multiple
              filterable
              clearable
              style="width: 100%"
              @change="onCandidateGroupsChange"
            >
              <el-option
                v-for="item in groupOptions"
                :key="String(item.id)"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="showTaskListener" label="任务监听器">
            <el-badge :value="taskListenerLength" :hidden="!taskListenerLength">
              <el-button size="small" :disabled="disabled" @click="taskListenerVisible = true">
                编辑
              </el-button>
            </el-badge>
          </el-form-item>
          <el-form-item v-if="showMultiInstance" label="多实例">
            <el-badge is-dot :hidden="!multiInstanceConfigured">
              <el-button size="small" :disabled="disabled" @click="multiInstanceVisible = true">
                编辑
              </el-button>
            </el-badge>
          </el-form-item>
          <el-form-item v-if="showConfig.async" label="异步">
            <el-switch :model-value="form.async" @change="onAsyncChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.priority" label="优先级">
            <el-input :model-value="form.priority" @update:model-value="onPriorityChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.formKey" label="表单 Key">
            <el-input :model-value="form.formKey" @update:model-value="onFormKeyChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.skipExpression" label="跳过表达式">
            <el-input
              :model-value="form.skipExpression"
              @update:model-value="onSkipExpressionChange"
            />
          </el-form-item>
          <el-form-item v-if="showConfig.dueDate" label="到期时间">
            <el-date-picker
              :model-value="form.dueDate"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
              @update:model-value="onDueDateChange(String($event || ''))"
            />
          </el-form-item>
          <el-form-item v-if="showConfig.isForCompensation" label="是否补偿">
            <el-switch :model-value="form.isForCompensation" @change="onIsForCompensationChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.triggerable" label="可触发">
            <el-switch :model-value="form.triggerable" @change="onTriggerableChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.autoStoreVariables" label="自动存储变量">
            <el-switch :model-value="form.autoStoreVariables" @change="onAutoStoreVariablesChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.ruleVariablesInput" label="输入变量">
            <el-input
              :model-value="form.ruleVariablesInput"
              @update:model-value="onRuleVariablesInputChange"
            />
          </el-form-item>
          <el-form-item v-if="showConfig.rules" label="规则">
            <el-input :model-value="form.rules" @update:model-value="onRulesChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.resultVariable" label="结果变量">
            <el-input
              :model-value="form.resultVariable"
              @update:model-value="onResultVariableChange"
            />
          </el-form-item>
          <el-form-item v-if="showConfig.exclude" label="排除">
            <el-switch :model-value="form.exclude" @change="onExcludeChange" />
          </el-form-item>
          <el-form-item v-if="showConfig.class" label="类">
            <el-input :model-value="form.className" @update:model-value="onClassChange" />
          </el-form-item>
        </template>

        <template v-if="isSequenceFlow">
          <el-form-item label="跳转条件">
            <el-input
              :model-value="form.conditionExpression"
              type="textarea"
              :rows="2"
              placeholder="${condition == true}"
              @update:model-value="onConditionExpressionChange"
            />
          </el-form-item>
          <el-form-item label="跳过表达式">
            <el-input
              :model-value="form.skipExpression"
              @update:model-value="onSkipExpressionChange"
            />
          </el-form-item>
        </template>

        <template v-if="isGateway">
          <el-form-item label="异步">
            <el-switch :model-value="form.async" @change="onAsyncChange" />
          </el-form-item>
        </template>
      </template>
    </el-form>

    <ExecutionListenerDialog
      v-model:visible="executionListenerVisible"
      :modeler="modeler"
      :element="element"
      @saved="refreshExtensionStats"
    />
    <TaskListenerDialog
      v-model:visible="taskListenerVisible"
      :modeler="modeler"
      :element="element"
      @saved="refreshExtensionStats"
    />
    <MultiInstanceDialog
      v-model:visible="multiInstanceVisible"
      :modeler="modeler"
      :element="element"
      @saved="refreshExtensionStats"
    />
  </div>
</template>

<style scoped lang="scss">
.bpmn-property-panel {
  &__title {
    margin-bottom: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__tip {
    margin-top: 8px;
  }
}
</style>
