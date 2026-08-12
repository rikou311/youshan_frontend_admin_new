import type { RouteComponent, RouteRecordRaw } from 'vue-router'
import type {
  DynamicRouteBuildResult,
  LegacyAuthorityNode,
  MenuItem,
  PageButtonMap,
} from '@/types/permission'

const viewModules = import.meta.glob('/src/views/**/*.vue')

/** 后端菜单 path → views 相对路径（去掉 src/views/ 前缀） */
const VIEW_ALIASES: Record<string, string> = {
  '/office/business-office/user': 'user/index',
  '/office/business-office/user/index': 'user/index',
  '/user': 'user/index',
  '/office/business-office/client': 'client/index',
  '/office/business-office/client/index': 'client/index',
  '/client': 'client/index',
  '/office/business-office/role': 'role/index',
  '/office/business-office/role/index': 'role/index',
  '/role': 'role/index',
  '/role/index': 'role/index',
  '/office/business-office/access': 'access/index',
  '/office/business-office/access/index': 'access/index',
  '/access': 'access/index',
  '/office/business-office/authority': 'authority/index',
  '/office/business-office/authority/index': 'authority/index',
  '/authority': 'authority/index',
  '/authority/index': 'authority/index',
  '/office/data-office/dictionary': 'dictionary/index',
  '/office/data-office/dictionary/index': 'dictionary/index',
  '/dictionary': 'dictionary/index',
  '/dictionary/index': 'dictionary/index',
  '/office/data-office/organization': 'organization/index',
  '/office/data-office/organization/index': 'organization/index',
  '/organization': 'organization/index',
  '/organization/index': 'organization/index',
  '/configure/payment': 'configure/payment/index',
  '/configure/payment/index': 'configure/payment/index',
  '/inventory/configure/configure/payment': 'configure/payment/index',
  '/inventory/configure/configure/payment/index': 'configure/payment/index',
  '/configure/fare': 'configure/fare/index',
  '/configure/fare/index': 'configure/fare/index',
  '/inventory/configure/configure/fare': 'configure/fare/index',
  '/inventory/configure/configure/fare/index': 'configure/fare/index',
  '/merchant/commodity': 'merchant/commodity/index',
  '/merchant/commodity/index': 'merchant/commodity/index',
  '/inventory/merchantManagement/merchant/commodity': 'merchant/commodity/index',
  '/inventory/merchantManagement/merchant/commodity/index': 'merchant/commodity/index',
  '/merchant/user': 'merchant/user/index',
  '/merchant/user/index': 'merchant/user/index',
  '/inventory/merchantManagement/merchant/user': 'merchant/user/index',
  '/inventory/merchantManagement/merchant/user/index': 'merchant/user/index',
  '/merchant/order': 'merchant/order/index',
  '/merchant/order/index': 'merchant/order/index',
  '/inventory/merchantManagement/merchant/order': 'merchant/order/index',
  '/inventory/merchantManagement/merchant/order/index': 'merchant/order/index',
}

function joinPath(base: string, segment: string) {
  return `${base}${segment}`.replace(/\/+/g, '/')
}

function toRouteName(path: string) {
  return path
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
}

function resolveView(path: string): RouteComponent {
  const alias = VIEW_ALIASES[path] || VIEW_ALIASES[path.replace(/\/index$/, '')]
  const segments = (alias || path).replace(/^\//, '').replace(/\.vue$/, '').split('/')
  const normalizedCandidates = [
    alias || path.replace(/^\//, '').replace(/\.vue$/, ''),
    segments.length >= 2 ? segments.slice(-2).join('/') : '',
    segments[segments.length - 1] ?? '',
  ].filter(Boolean)

  const fileCandidates = normalizedCandidates.flatMap((normalized) => [
    `/src/views/${normalized}.vue`,
    `/src/views/${normalized}/index.vue`,
  ])

  for (const file of fileCandidates) {
    const loader = viewModules[file]
    if (loader) {
      return loader as RouteComponent
    }
  }

  return (() => import('@/views/migrate/index.vue')) as RouteComponent
}

function extractButtons(pagePath: string, pageNode: LegacyAuthorityNode, pageButtons: PageButtonMap) {
  if (!pageNode.children?.length) {
    return
  }

  const buttons: PageButtonMap[string] = {}
  for (const button of pageNode.children) {
    let buttonName = button.path
    if (buttonName.startsWith(pageNode.path)) {
      buttonName = buttonName.replace(`${pageNode.path}/`, '').replace(/^\//, '')
    } else {
      buttonName = buttonName.replace(/^\//, '')
    }
    if (!buttonName) {
      buttonName = 'index'
    }
    buttons[buttonName] = {
      authName: button.authName,
      path: button.path,
      icon: button.icon,
    }
  }
  pageButtons[pagePath] = buttons
  const altPath = pagePath.endsWith('/index')
    ? pagePath.replace(/\/index$/, '') || pagePath
    : `${pagePath}/index`
  if (!pageButtons[altPath]) {
    pageButtons[altPath] = buttons
  }
}

function toMenuPath(pagePath: string) {
  return pagePath.endsWith('/index') ? pagePath.replace(/\/index$/, '') || pagePath : pagePath
}

/** 对齐旧版 permission.js：仅系统 → 模块 → 页面 两级子菜单 */
export function buildDynamicRoutes(systems: LegacyAuthorityNode[]): DynamicRouteBuildResult {
  const routes: RouteRecordRaw[] = []
  const menus: MenuItem[] = []
  const pageButtons: PageButtonMap = {}
  const list = Array.isArray(systems) ? systems : []

  for (const system of list) {
    const systemPath = joinPath('', system.path)
    const systemMenu: MenuItem = {
      path: systemPath,
      title: system.authName,
      icon: system.icon,
      children: [],
    }

    for (const module of system.children ?? []) {
      const modulePath = joinPath(systemPath, module.path)
      const moduleMenu: MenuItem = {
        path: modulePath,
        title: module.authName,
        icon: module.icon,
        children: [],
      }

      for (const page of module.children ?? []) {
        const pagePath = joinPath(modulePath, page.path)
        const routePath = pagePath.replace(/^\//, '')
        routes.push({
          path: routePath,
          name: toRouteName(pagePath),
          component: resolveView(pagePath),
          meta: {
            title: page.authName,
            icon: page.icon,
            permission: pagePath,
          },
        })
        if (routePath.endsWith('/index')) {
          const shortPath = routePath.replace(/\/index$/, '')
          if (shortPath && !routes.some((item) => item.path === shortPath)) {
            routes.push({
              path: shortPath,
              name: toRouteName(`/${shortPath}`),
              component: resolveView(pagePath),
              meta: {
                title: page.authName,
                icon: page.icon,
                permission: pagePath,
              },
            })
          }
        }
        extractButtons(pagePath, page, pageButtons)
        moduleMenu.children?.push({
          path: toMenuPath(pagePath),
          title: page.authName,
          icon: page.icon,
          permission: pagePath,
        })
      }

      if (moduleMenu.children?.length) {
        systemMenu.children?.push(moduleMenu)
      }
    }

    if (systemMenu.children?.length) {
      menus.push(systemMenu)
    }
  }

  return { routes, menus, pageButtons }
}

function collectPagePaths(system: LegacyAuthorityNode): string[] {
  const systemPath = joinPath('', system.path)
  const paths: string[] = []

  for (const module of system.children ?? []) {
    const modulePath = joinPath(systemPath, module.path)
    for (const page of module.children ?? []) {
      paths.push(joinPath(modulePath, page.path))
    }
  }

  return paths
}

/** 对齐旧版侧栏：当前系统下模块 → 页面，不展开更深层级 */
export function buildSidebarMenusForSystem(system: LegacyAuthorityNode): MenuItem[] {
  const systemPath = joinPath('', system.path)
  const menus: MenuItem[] = []

  for (const module of system.children ?? []) {
    const modulePath = joinPath(systemPath, module.path)
    const moduleMenu: MenuItem = {
      path: modulePath,
      title: module.authName,
      icon: module.icon,
      alwaysShow: true,
      children: [],
    }

    for (const page of module.children ?? []) {
      const pagePath = joinPath(modulePath, page.path)
      moduleMenu.children?.push({
        path: toMenuPath(pagePath),
        title: page.authName,
        icon: page.icon,
        permission: pagePath,
      })
    }

    if (moduleMenu.children?.length) {
      menus.push(moduleMenu)
    }
  }

  return menus
}

export function findSystemPathForRoute(systems: LegacyAuthorityNode[], routePath: string): string | null {
  let matchedPath: string | null = null
  let matchedPrefixLength = -1
  const list = Array.isArray(systems) ? systems : []

  for (const system of list) {
    const prefix = joinPath('', system.path)
    if (!prefix) {
      continue
    }
    if (routePath === prefix || routePath.startsWith(`${prefix}/`)) {
      if (prefix.length > matchedPrefixLength) {
        matchedPath = system.path
        matchedPrefixLength = prefix.length
      }
    }
  }

  if (matchedPath !== null) {
    return matchedPath
  }

  for (const system of list) {
    if (system.path) {
      continue
    }
    const pagePaths = collectPagePaths(system)
    if (pagePaths.some((pagePath) => routePath === pagePath || routePath.startsWith(`${pagePath}/`))) {
      return system.path
    }
  }

  return null
}

export function resolveDefaultSystemPath(
  systems: LegacyAuthorityNode[],
  routePath?: string,
): string {
  const list = Array.isArray(systems) ? systems : []
  if (routePath) {
    const matched = findSystemPathForRoute(list, routePath)
    if (matched !== null) {
      return matched
    }
  }

  const inventory = list.find((system) => system.path === '/inventory')
  if (inventory) {
    return inventory.path
  }

  return list[0]?.path ?? ''
}
