<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadInstance, UploadProps, UploadUserFile } from 'element-plus'
import { getFlowUploadHeaders, getPublicUploadUrl } from '@/utils/upload'

interface Props {
  visible: boolean
  title?: string
  accept: string
  tip: string
  deploy: (data: unknown) => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  title: '上传并部署',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const uploadRef = ref<UploadInstance>()
const uploading = ref(false)
const fileList = ref<UploadUserFile[]>([])

const uploadUrl = getPublicUploadUrl()
const uploadHeaders = getFlowUploadHeaders()

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      fileList.value = []
      uploadRef.value?.clearFiles()
      uploading.value = false
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

const handleSuccess: UploadProps['onSuccess'] = async (response) => {
  const payload = response as { code?: number; data?: unknown; message?: string }
  if (payload.code !== 200 && payload.code !== 0) {
    ElMessage.error(payload.message || '上传失败')
    uploading.value = false
    return
  }

  try {
    await props.deploy(payload.data)
    ElMessage.success('部署成功')
    emit('success')
    closeDialog()
  } finally {
    uploading.value = false
  }
}

function handleError() {
  uploading.value = false
  ElMessage.error('上传失败')
}

function beforeUpload(file: File) {
  const extension = props.accept.replace(/\./g, '').split(',').map((item) => item.trim())
  const matched = extension.some((item) => file.name.toLowerCase().endsWith(`.${item}`))
  if (!matched) {
    ElMessage.error(`只能上传 ${props.accept} 文件`)
    return false
  }
  return true
}

function submitUpload() {
  if (!fileList.value.length) {
    ElMessage.warning('请先选择文件')
    return
  }
  uploading.value = true
  uploadRef.value?.submit()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-upload
      ref="uploadRef"
      v-model:file-list="fileList"
      class="workflow-deploy-dialog__upload"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :accept="accept"
      :auto-upload="false"
      :limit="1"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
    >
      <template #trigger>
        <el-button type="primary">选取文件</el-button>
      </template>
      <el-button
        class="workflow-deploy-dialog__submit"
        type="success"
        :loading="uploading"
        @click="submitUpload"
      >
        上传并部署
      </el-button>
      <template #tip>
        <div class="workflow-deploy-dialog__tip">{{ tip }}</div>
      </template>
    </el-upload>
  </el-dialog>
</template>

<style scoped lang="scss">
.workflow-deploy-dialog {
  &__upload {
    width: 100%;
  }

  &__submit {
    margin-left: 12px;
  }

  &__tip {
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
  }
}
</style>
