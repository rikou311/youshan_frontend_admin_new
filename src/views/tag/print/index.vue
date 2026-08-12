<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TagTemplatePage from '@/views/tag/template/index.vue'
import TagPrintListPage from '@/views/tag/print/list/index.vue'

const route = useRoute()
const activeTab = ref(route.query.tab === 'list' ? 'list' : 'template')

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'list' || tab === 'template') {
      activeTab.value = tab
    }
  },
)
</script>

<template>
  <div class="tag-print-hub">
    <el-card shadow="never">
      <template #header>
        <span>标签打印系统</span>
      </template>
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="模板管理" name="template" lazy>
          <TagTemplatePage />
        </el-tab-pane>
        <el-tab-pane label="标签管理" name="list" lazy>
          <TagPrintListPage />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.tag-print-hub {
  :deep(.biz-page) {
    gap: 12px;
  }

  :deep(.el-card) {
    border: none;
    box-shadow: none;
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}
</style>
