<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addTagTemplate, updateTagTemplate, type TagTemplateForm } from '@/api/tag'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: TagTemplateForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<TagTemplateForm>({
  name: '',
  width: 60,
  height: 40,
})

const rules: FormRules<TagTemplateForm> = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  width: [{ required: true, message: '请输入宽度', trigger: 'change' }],
  height: [{ required: true, message: '请输入高度', trigger: 'change' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return
    }
    Object.assign(
      form,
      props.mode === 'edit' && props.model ? props.model : { name: '', width: 60, height: 40 },
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
      await addTagTemplate({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateTagTemplate({ ...form })
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
    :title="mode === 'add' ? '新增标签模板' : '编辑标签模板'"
    width="520px"
    @close="closeDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="模板名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="宽度(mm)" prop="width">
        <el-input-number v-model="form.width" :min="10" :max="500" style="width: 100%" />
      </el-form-item>
      <el-form-item label="高度(mm)" prop="height">
        <el-input-number v-model="form.height" :min="10" :max="500" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
