<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { queryDictionaryGroups } from '@/api/dictionary'
import { addRole, updateRole, type RoleForm } from '@/api/system'
import { getYesNoOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: RoleForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const form = reactive<{
  id?: number | string
  roleName: string
  active: string
}>({
  roleName: '',
  active: '1',
})

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})

const rules: FormRules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['yesno'])
    Object.entries(data || {}).forEach(([groupId, values]) => {
      if (Array.isArray(values) && values.length) {
        saveDictionary(groupId, values)
      }
    })
  } catch {
    // ignore，走 getYesNoOptions 回退
  } finally {
    dictTick.value += 1
  }
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    roleName: '',
    active: '1',
  })
  formRef.value?.clearValidate()
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, {
        id: props.model.id,
        roleName: props.model.roleName ?? '',
        // 对齐旧版：radio 绑定字符串
        active: String(props.model.active ?? '1'),
      })
    } else {
      resetForm()
    }
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
    const payload: RoleForm = {
      id: form.id as RoleForm['id'],
      roleName: form.roleName,
      active: form.active,
    }
    if (props.mode === 'add') {
      await addRole({ roleName: payload.roleName, active: payload.active })
      ElMessage.success('新增成功')
    } else {
      await updateRole(payload)
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
    :title="mode === 'add' ? '新增角色' : '编辑角色'"
    width="520px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="角色名称" prop="roleName">
        <el-input v-model="form.roleName" placeholder="请输入角色名称" />
      </el-form-item>
      <el-form-item label="有效" prop="active">
        <el-radio-group v-model="form.active">
          <el-radio
            v-for="item in yesNoOptions"
            :key="String(item.value)"
            :value="String(item.value)"
          >
            {{ item.display }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
