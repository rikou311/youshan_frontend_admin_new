import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAuthorityMenus } from '@/api/permission'
import {
  buildDynamicRoutes,
  buildSidebarMenusForSystem,
  findSystemPathForRoute,
  resolveDefaultSystemPath,
} from '@/router/dynamic-routes'
import type { RouteRecordRaw } from 'vue-router'
import type { LegacyAuthorityNode, MenuItem, PageButtonMap, SystemNavItem } from '@/types/permission'

export const usePermissionStore = defineStore('permission', () => {
  const systems = ref<LegacyAuthorityNode[]>([])
  const activeSystemPath = ref('')
  const dynamicRoutes = ref<RouteRecordRaw[]>([])
  const sidebarMenus = ref<MenuItem[]>([])
  const pageButtons = ref<PageButtonMap>({})
  const isRoutesLoaded = ref(false)

  const systemNavItems = computed<SystemNavItem[]>(() =>
    systems.value.map((system) => ({
      path: system.path,
      title: system.authName,
      icon: system.icon,
    })),
  )

  const flatPermissions = computed(() =>
    dynamicRoutes.value
      .map((item) => item.meta?.permission)
      .filter((permission): permission is string => typeof permission === 'string'),
  )

  function applySystemMenus(systemPath: string) {
    const system =
      systems.value.find((item) => item.path === systemPath) ?? systems.value[0]

    if (!system) {
      activeSystemPath.value = ''
      sidebarMenus.value = []
      return
    }

    activeSystemPath.value = system.path
    sidebarMenus.value = buildSidebarMenusForSystem(system)
  }

  async function loadMenusAndRoutes(routePath = '/') {
    const data = await getAuthorityMenus()
    systems.value = Array.isArray(data) ? data : []
    const built = buildDynamicRoutes(systems.value)
    dynamicRoutes.value = built.routes
    pageButtons.value = built.pageButtons
    applySystemMenus(resolveDefaultSystemPath(systems.value, routePath))
    isRoutesLoaded.value = true
  }

  function switchSystem(systemPath: string) {
    if (systemPath === activeSystemPath.value) {
      return false
    }
    applySystemMenus(systemPath)
    return true
  }

  function syncSystemByRoute(routePath: string) {
    if (routePath === '/dashboard' || routePath.startsWith('/profile')) {
      return
    }

    const matched = findSystemPathForRoute(systems.value, routePath)
    if (matched !== null && matched !== activeSystemPath.value) {
      applySystemMenus(matched)
    }
  }

  function resetPermission() {
    systems.value = []
    activeSystemPath.value = ''
    dynamicRoutes.value = []
    sidebarMenus.value = []
    pageButtons.value = {}
    isRoutesLoaded.value = false
  }

  return {
    systems,
    activeSystemPath,
    dynamicRoutes,
    sidebarMenus,
    menus: sidebarMenus,
    pageButtons,
    isRoutesLoaded,
    systemNavItems,
    flatPermissions,
    loadMenusAndRoutes,
    switchSystem,
    syncSystemByRoute,
    resetPermission,
  }
})
