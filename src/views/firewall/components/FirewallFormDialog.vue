<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addFirewall, updateFirewall, type FirewallForm } from '@/api/platform'
import { getDictionaryOptions } from '@/utils/dictionary'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: FirewallForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<FirewallForm>({
  ruleName: '',
  ip: '',
  action: 'ALLOW',
  active: 1,
})

const yesNoOptions = getDictionaryOptions('yes_no')
const actionOptions = [
  { label: '允许', value: 'ALLOW' },
  { label: '拒绝', value: 'DENY' },
]

const rules: FormRules<FirewallForm> = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ip: [{ required: true, message: '请输入 IP', trigger: 'blur' }],
  action: [{ required: true, message: '请选择动作', trigger: 'change' }],
  active: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    Object.assign(
      form,
      props.mode === 'edit' && props.model
        ? props.model
        : { ruleName: '', ip: '', action: 'ALLOW', active: 1 },
    )
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    if (props.mode === 'add') {
      await addFirewall({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateFirewall({ ...form })
      ElMessage.success('更新成功')
    }
    emit('success')
    closeDialog()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'add' ? '新增防火墙规则' : '编辑防火墙规则'"
    width="520px"
    @close="closeDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="规则名称" prop="ruleName">
        <el-input v-model="form.ruleName" />
      </el-form-item>
      <el-form-item label="IP" prop="ip">
        <el-input v-model="form.ip" placeholder="如 192.168.0.0/16" />
      </el-form-item>
      <el-form-item label="动作" prop="action">
        <el-select v-model="form.action" style="width: 100%">
          <el-option v-for="item in actionOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="有效" prop="active">
        <el-radio-group v-model="form.active">
          <el-radio v-for="item in yesNoOptions" :key="item.value" :value="Number(item.value)">
            {{ item.display }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
