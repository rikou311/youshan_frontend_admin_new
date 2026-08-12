<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import MenuIcon from '@/components/MenuIcon.vue'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import type { MenuItem } from '@/types/permission'

const route = useRoute()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const appStore = useAppStore()
const { isCollapse, withoutAnimation } = storeToRefs(appStore)

function filterMenus(items: MenuItem[]): MenuItem[] {
  return items
    .filter((item) => userStore.hasPermission(item.permission))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenus(item.children) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0)
}

const visibleMenus = computed(() => filterMenus(permissionStore.sidebarMenus))

const sidebarWidth = computed(() =>
  isCollapse.value ? 'var(--layout-sidebar-collapsed-width)' : 'var(--layout-sidebar-width)',
)

function menuIndex(item: MenuItem) {
  return item.path || item.title
}
</script>

<template>
  <el-aside
    class="app-sidebar"
    :class="{
      'is-collapse': isCollapse,
      'without-animation': withoutAnimation,
    }"
    :width="sidebarWidth"
  >
    <router-link to="/dashboard" class="app-sidebar__logo" :title="'有善管理后台'">
      <span v-if="!isCollapse">有善管理后台</span>
      <span v-else class="app-sidebar__logo-short">有</span>
    </router-link>
    <el-scrollbar class="app-sidebar__scroll">
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="app-sidebar__menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <template v-for="module in visibleMenus" :key="menuIndex(module)">
          <el-sub-menu
            v-if="module.children?.length && (module.alwaysShow || module.children.length > 1)"
            :index="menuIndex(module)"
          >
            <template #title>
              <MenuIcon :name="module.icon" />
              <span>{{ module.title }}</span>
            </template>
            <el-menu-item
              v-for="page in module.children"
              :key="page.path"
              :index="page.path"
            >
              <MenuIcon :name="page.icon" />
              <template #title>{{ page.title }}</template>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item
            v-else-if="module.children?.length === 1"
            :index="module.children[0].path"
          >
            <MenuIcon :name="module.icon || module.children[0].icon" />
            <template #title>{{ module.title }}</template>
          </el-menu-item>

          <el-menu-item v-else-if="module.path" :index="module.path">
            <MenuIcon :name="module.icon" />
            <template #title>{{ module.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </el-aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  display: flex;
  flex-direction: column;
  background: #304156;
  color: #fff;
  transition: width 0.28s;

  &.without-animation {
    transition: none;
  }

  &__logo {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: var(--layout-header-height);
    padding: 0 12px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    text-decoration: none;
    background: #2b2f3a;
    border-bottom: 1px solid rgb(255 255 255 / 8%);
    cursor: pointer;
  }

  &__logo-short {
    font-size: 18px;
  }

  &__scroll {
    flex: 1;
  }

  &__menu {
    width: 100% !important;
    border-right: none;
  }

  &.is-collapse {
    :deep(.menu-icon) {
      margin-right: 0;
    }
  }
}

:deep(.el-menu-item.is-active) {
  background: #263445 !important;
}

:deep(.el-sub-menu__title),
:deep(.el-menu-item) {
  display: flex;
  align-items: center;
}

:deep(.el-menu--collapse) {
  width: var(--layout-sidebar-collapsed-width);
}
</style>
