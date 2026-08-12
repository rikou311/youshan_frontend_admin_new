<script setup lang="ts">
import { useRouter } from 'vue-router'
import Hamburger from '@/components/Hamburger.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import AppSystemNav from './AppSystemNav.vue'

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

async function handleLogout() {
  await userStore.logout()
  await router.push('/login')
}
</script>

<template>
  <el-header class="app-header">
    <div class="app-header__left">
      <Hamburger :is-active="appStore.sidebarOpened" @toggle-click="appStore.toggleSideBar" />
      <AppSystemNav />
    </div>

    <div class="app-header__actions">
      <router-link to="/profile/index" class="app-header__username">
        {{ userStore.userInfo?.nickname || userStore.userInfo?.username }}
      </router-link>
      <el-button type="primary" link @click="handleLogout">退出登录</el-button>
    </div>
  </el-header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: var(--layout-header-height);
  padding: 0 var(--page-padding);
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 4px rgb(0 21 41 / 8%);

  &__left {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 12px;
  }

  &__username {
    color: #606266;
    font-size: 14px;
    text-decoration: none;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
