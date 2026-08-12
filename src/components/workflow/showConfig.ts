export const NODE_SHOW_CONFIG: Record<string, Record<string, boolean>> = {
  'bpmn:EndEvent': {},
  'bpmn:StartEvent': {
    initiator: true,
    formKey: true,
  },
  'bpmn:UserTask': {
    userType: true,
    assignee: true,
    candidateUsers: true,
    candidateGroups: true,
    async: true,
    priority: true,
    formKey: true,
    skipExpression: true,
    dueDate: true,
    taskListener: true,
  },
  'bpmn:ServiceTask': {
    async: true,
    skipExpression: true,
    isForCompensation: true,
    triggerable: true,
    class: true,
  },
  'bpmn:ScriptTask': {
    async: true,
    isForCompensation: true,
    autoStoreVariables: true,
  },
  'bpmn:ManualTask': {
    async: true,
    isForCompensation: true,
  },
  'bpmn:ReceiveTask': {
    async: true,
    isForCompensation: true,
  },
  'bpmn:SendTask': {
    async: true,
    isForCompensation: true,
  },
  'bpmn:BusinessRuleTask': {
    async: true,
    isForCompensation: true,
    ruleVariablesInput: true,
    rules: true,
    resultVariable: true,
    exclude: true,
  },
}

export function getNodeShowConfig(type?: string) {
  if (!type) {
    return {}
  }
  return NODE_SHOW_CONFIG[type] ?? {}
}

export const USER_TYPE_OPTIONS = [
  { label: '指定人员', value: 'assignee' },
  { label: '候选人员', value: 'candidateUsers' },
  { label: '候选组', value: 'candidateGroups' },
]
