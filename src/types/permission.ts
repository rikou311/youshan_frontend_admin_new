import type { RouteRecordRaw } from 'vue-router'

export interface LegacyAuthorityNode {
  authName: string
  path: string
  icon?: string
  children?: LegacyAuthorityNode[]
}

export interface PageButton {
  authName: string
  path: string
  icon?: string
}

export type PageButtonMap = Record<string, Record<string, PageButton>>

export interface MenuItem {
  path: string
  title: string
  icon?: string
  permission?: string
  /** 对齐旧版 alwaysShow：即使只有一个子页也展开为子菜单 */
  alwaysShow?: boolean
  children?: MenuItem[]
}

export interface SystemNavItem {
  path: string
  title: string
  icon?: string
}

export interface DynamicRouteBuildResult {
  routes: RouteRecordRaw[]
  menus: MenuItem[]
  pageButtons: PageButtonMap
}
