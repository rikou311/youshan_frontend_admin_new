<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getModuleList, installModule, uninstallModule } from '@/api/platform'
import { useTableList } from '@/composables/useTableList'
import { getModuleUploadUrl, getUploadHeaders } from '@/utils/upload'
import type { ModuleItem } from '@/api/platform'
import type { UploadInstance } from 'element-plus'

const searchForm = reactive({ moduleName: '' })
const uploadRef = ref<UploadInstance>()
const uploadUrl = getModuleUploadUrl()
const uploadHeaders = getUploadHeaders()
const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => getModuleList({ ...params, moduleName: searchForm.moduleName || undefined }),
    () => ({}),
  )

async function handleInstall(row: ModuleItem) {
  await ElMessageBox.confirm(`确认安装模块「${row.moduleName}」吗？`, '安装', { type: 'info' })
  await installModule(row.id)
  ElMessage.success('安装成功')
  await fetchList()
}

async function handleUninstall(row: ModuleItem) {
  await ElMessageBox.confirm(`确认卸载模块「${row.moduleName}」吗？`, '卸载', { type: 'warning' })
  await uninstallModule(row.id)
  ElMessage.success('卸载成功')
  await fetchList()
}

function handleUploadSuccess() {
  ElMessage.success('模块上传成功')
  uploadRef.value?.clearFiles()
  fetchList()
}

function beforeModuleUpload(file: File) {
  const isZip = file.name.endsWith('.zip')
  if (!isZip) {
    ElMessage.error('只能上传 zip 文件')
  }
  return isZip
}

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="模块名称">
          <el-input v-model="searchForm.moduleName" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-upload
            ref="uploadRef"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            accept=".zip"
            :before-upload="beforeModuleUpload"
            :on-success="handleUploadSuccess"
          >
            <el-button type="success">上传模块</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="moduleName" label="模块名称" min-width="160" />
        <el-table-column prop="moduleCode" label="编码" min-width="140" />
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="installed" label="已安装" width="90">
          <template #default="{ row }">
            <el-tag :type="row.installed ? 'success' : 'info'">
              {{ row.installed ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.installed" type="primary" link @click="handleInstall(row)">
              安装
            </el-button>
            <el-button v-else type="danger" link @click="handleUninstall(row)">卸载</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="biz-page__pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.biz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
