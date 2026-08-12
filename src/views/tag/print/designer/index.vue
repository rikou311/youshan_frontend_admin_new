<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import LabelDesignerPanel from '@/components/tag/LabelDesignerPanel.vue'
import { addTagLabel, queryTagLabel, updateTagLabel } from '@/api/tag'
import { parseLabelConfig, parseLabelElements } from '@/types/tag-label'

const route = useRoute()
const router = useRouter()
const designerRef = ref<InstanceType<typeof LabelDesignerPanel>>()
const loading = ref(false)
const ready = ref(false)
const labelId = ref<number | string>()

const initialConfig = ref(parseLabelConfig())
const initialElements = ref(parseLabelElements())

async function loadLabel() {
  const id = Number(route.query.id || 0)
  if (!id) {
    ready.value = true
    return
  }
  loading.value = true
  try {
    const record = await queryTagLabel(id)
    labelId.value = record.id
    initialConfig.value = parseLabelConfig(record.config)
    initialElements.value = parseLabelElements(record.elements)
    if (!initialConfig.value.name && record.name) {
      initialConfig.value.name = record.name
    }
  } finally {
    loading.value = false
    ready.value = true
  }
}

async function handleSave() {
  const payload = designerRef.value?.buildSavePayload(labelId.value)
  if (!payload) {
    return
  }
  if (!payload.name.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  if (labelId.value) {
    await updateTagLabel({ ...payload, id: labelId.value })
  } else {
    await addTagLabel(payload)
  }
  ElMessage.success('保存成功')
  router.push({ path: '/inventory/tagManagement/tag/print', query: { tab: 'list' } })
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadLabel()
})
</script>

<template>
  <div v-loading="loading" class="tag-designer-page">
    <el-card shadow="never">
      <template #header>
        <div class="tag-designer-page__header">
          <span>{{ labelId ? '编辑标签' : '新建标签' }}</span>
          <div>
            <el-button @click="goBack">返回</el-button>
            <el-button type="primary" @click="handleSave">保存</el-button>
          </div>
        </div>
      </template>
      <LabelDesignerPanel
        v-if="ready"
        ref="designerRef"
        :initial-config="initialConfig"
        :initial-elements="initialElements"
      />
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.tag-designer-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
