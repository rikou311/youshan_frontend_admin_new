<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const workflowPages = [
  { title: '流程定义模型', path: '/processDefinitionModel/index' },
  { title: '流程部署', path: '/processDeployment/index' },
  { title: '表单定义模型', path: '/formDefinitionModel/index' },
  { title: '表单部署', path: '/formDeployment/index' },
]

function openPage(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="designer-page">
    <el-card shadow="never">
      <template #header>
        <span>流程设计器</span>
      </template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="BPMN 设计器与增强表单设计器均已接入。"
        description="流程定义支持 BPMN 编辑（含属性/监听器/多实例）；表单定义支持兼容旧版 { column/group } 结构，含上传、富文本、级联、评分、滑块、分组与动态子表等常用字段。"
        class="designer-page__alert"
      />
      <el-row :gutter="16">
        <el-col v-for="item in workflowPages" :key="item.path" :span="12" :lg="6">
          <el-card shadow="hover" class="designer-page__link-card" @click="openPage(item.path)">
            <div class="designer-page__link-title">{{ item.title }}</div>
            <el-button type="primary" link>进入</el-button>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.designer-page {
  min-height: 360px;

  &__alert {
    margin-bottom: 20px;
  }

  &__link-card {
    margin-bottom: 16px;
    cursor: pointer;
  }

  &__link-title {
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
  }
}
</style>
