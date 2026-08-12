<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentPath = computed(() => route.path)
</script>

<template>
  <el-card shadow="never">
    <el-result icon="info" title="页面迁移中" sub-title="该页面路径已接入路由，功能正在逐步迁移。">
      <template #extra>
        <div>当前路径：{{ currentPath }}</div>
      </template>
    </el-result>
  </el-card>
</template>
