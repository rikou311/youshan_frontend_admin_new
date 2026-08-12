<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const user = computed(() => userStore.userInfo)
</script>

<template>
  <div class="profile-page">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never">
          <div class="profile-page__avatar">{{ user?.nickname?.slice(0, 1) ?? 'U' }}</div>
          <h3>{{ user?.nickname ?? '-' }}</h3>
          <p class="profile-page__meta">用户名：{{ user?.username ?? '-' }}</p>
          <p class="profile-page__meta">姓名：{{ user?.realName ?? '-' }}</p>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="never" header="账号信息">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户 ID">{{ user?.id ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="登录名">{{ user?.username ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ user?.nickname ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="真实姓名">{{ user?.realName ?? '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.profile-page {
  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    margin-bottom: 12px;
    border-radius: 50%;
    background: var(--el-color-primary);
    color: #fff;
    font-size: 28px;
    font-weight: 600;
  }

  &__meta {
    margin: 4px 0;
    color: #606266;
    font-size: 14px;
  }
}
</style>
