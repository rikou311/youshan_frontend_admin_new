<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/tag/template/index')
})
</script>

<template>
  <el-card shadow="never">
    <el-result icon="info" title="正在跳转模板管理" sub-title="旧路径 /tag/print/template 已合并至 /tag/template/index" />
  </el-card>
</template>
