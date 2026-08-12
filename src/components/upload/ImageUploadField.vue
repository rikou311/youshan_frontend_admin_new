<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  getPublicUploadUrl,
  getResourceImgUrl,
  getUploadHeaders,
  resolveUploadImageUrl,
} from '@/utils/upload'

interface Props {
  modelValue?: string
  tip?: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uploadUrl = getPublicUploadUrl()
const uploadHeaders = getUploadHeaders()

function displayUrl(value?: string) {
  return getResourceImgUrl(value)
}

function beforeUpload(file: File) {
  const ok = file.type.startsWith('image/')
  if (!ok) {
    ElMessage.error('只能上传图片文件')
  }
  return ok
}

function handleSuccess(response: { code?: number; data?: Array<{ url: string }> }) {
  const url = resolveUploadImageUrl(response)
  if (!url && response.code !== 200) {
    ElMessage.error('上传失败')
    return
  }
  emit('update:modelValue', url)
}

function clearImage() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="image-upload-field">
    <el-upload
      :action="uploadUrl"
      :headers="uploadHeaders"
      :show-file-list="false"
      accept="image/*"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
    >
      <el-button type="primary">上传图片</el-button>
    </el-upload>
    <div v-if="tip" class="image-upload-field__tip">{{ tip }}</div>
    <div v-if="modelValue" class="image-upload-field__preview">
      <img :src="displayUrl(modelValue)" alt="preview">
      <el-button type="danger" link @click="clearImage">清除</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.image-upload-field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__tip {
    color: #909399;
    font-size: 12px;
  }

  &__preview {
    display: flex;
    align-items: flex-start;
    gap: 8px;

    img {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #ebeef5;
    }
  }
}
</style>
