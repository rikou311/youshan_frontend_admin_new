<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCashTakeRecordList } from '@/api/cash'
import { useTableList } from '@/composables/useTableList'

const router = useRouter()

const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList((params) => getCashTakeRecordList(params), () => ({}))

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-alert
      title="取现记录已合并到「现金管理」页的第三个 Tab，此页面保留兼容旧菜单路径。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <el-card shadow="never">
      <el-form :inline="true">
        <el-form-item>
          <el-button type="primary" @click="handleSearch">刷新</el-button>
          <el-button @click="router.push('/cash/index')">前往现金管理</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="takeTime" label="日期" min-width="140" />
        <el-table-column prop="amount" label="金额" width="100" />
        <el-table-column prop="content" label="内容" min-width="180" />
        <el-table-column prop="createTime" label="创建时间" min-width="180" />
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
