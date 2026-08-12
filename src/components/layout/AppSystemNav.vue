<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import MenuIcon from '@/components/MenuIcon.vue'
import { usePermissionStore } from '@/stores/permission'
import { useTagsViewStore } from '@/stores/tags-view'

const route = useRoute()
const router = useRouter()
const permissionStore = usePermissionStore()
const tagsViewStore = useTagsViewStore()

async function handleSelect(systemPath: string) {
  if (systemPath === permissionStore.activeSystemPath) {
    return
  }

  permissionStore.switchSystem(systemPath)
  tagsViewStore.resetTagsView()
  if (route.path !== '/dashboard') {
    await router.push('/dashboard')
  } else {
    // 仍在首页时主动补回固定页签
    tagsViewStore.addView(route)
  }
}
</script>

<template>
  <el-menu
    :key="permissionStore.activeSystemPath"
    :default-active="permissionStore.activeSystemPath"
    class="app-system-nav"
    mode="horizontal"
    :ellipsis="false"
    @select="handleSelect"
  >
    <el-menu-item
      v-for="system in permissionStore.systemNavItems"
      :key="system.path || system.title"
      :index="system.path"
    >
      <MenuIcon :name="system.icon" />
      <span>{{ system.title }}</span>
    </el-menu-item>
  </el-menu>
</template>

<style scoped lang="scss">
.app-system-nav {
  flex: 1;
  min-width: 0;
  height: var(--layout-header-height);
  border-bottom: none;
  background: transparent;

  :deep(.el-menu-item) {
    display: flex;
    align-items: center;
    height: var(--layout-header-height);
    line-height: var(--layout-header-height);
    border-bottom: 2px solid transparent;
    color: #5a5e66;
    font-size: 15px;

    &:hover,
    &.is-active {
      color: var(--el-color-primary);
      background: rgb(0 0 0 / 2.5%);
    }

    &.is-active {
      border-bottom-color: var(--el-color-primary);
    }
  }
}
</style>
