import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import type { Component } from 'vue'
import { hasSvgIcon } from '@/icons'

const epIcons = ElementPlusIconsVue as Record<string, Component>

/** 旧版 Element UI 类名 → Element Plus Icons */
const EL_ICON_ALIAS: Record<string, string> = {
  'el-icon-s-home': 'House',
  'el-icon-s-order': 'List',
  'el-icon-s-goods': 'Goods',
  'el-icon-s-shop': 'Shop',
  'el-icon-s-marketing': 'TrendCharts',
  'el-icon-s-finance': 'Wallet',
  'el-icon-s-cooperation': 'Connection',
  'el-icon-s-platform': 'Monitor',
  'el-icon-s-fold': 'Fold',
  'el-icon-s-unfold': 'Expand',
  'el-icon-s-operation': 'Operation',
  'el-icon-s-promotion': 'Promotion',
  'el-icon-s-custom': 'Avatar',
  'el-icon-s-tools': 'Tools',
  'el-icon-s-check': 'Select',
  'el-icon-s-grid': 'Grid',
  'el-icon-s-data': 'DataLine',
  'el-icon-s-opportunity': 'Opportunity',
  'el-icon-menu': 'Menu',
  'el-icon-setting': 'Setting',
  'el-icon-user': 'User',
  'el-icon-user-solid': 'UserFilled',
  'el-icon-edit': 'Edit',
  'el-icon-edit-outline': 'EditPen',
  'el-icon-delete': 'Delete',
  'el-icon-search': 'Search',
  'el-icon-plus': 'Plus',
  'el-icon-document': 'Document',
  'el-icon-tickets': 'Tickets',
  'el-icon-printer': 'Printer',
  'el-icon-message': 'Message',
  'el-icon-date': 'Calendar',
  'el-icon-time': 'Clock',
  'el-icon-location': 'Location',
  'el-icon-picture': 'Picture',
  'el-icon-upload': 'Upload',
  'el-icon-download': 'Download',
  'el-icon-folder': 'Folder',
  'el-icon-folder-opened': 'FolderOpened',
  'el-icon-files': 'Files',
  'el-icon-collection': 'Collection',
  'el-icon-link': 'Link',
  'el-icon-lock': 'Lock',
  'el-icon-unlock': 'Unlock',
  'el-icon-view': 'View',
  'el-icon-star-on': 'StarFilled',
  'el-icon-star-off': 'Star',
  'el-icon-warning': 'Warning',
  'el-icon-info': 'InfoFilled',
  'el-icon-success': 'SuccessFilled',
  'el-icon-error': 'CircleCloseFilled',
  'el-icon-question': 'QuestionFilled',
  'el-icon-phone': 'Phone',
  'el-icon-mobile-phone': 'Iphone',
  'el-icon-service': 'Service',
  'el-icon-s-help': 'QuestionFilled',
  'el-icon-share': 'Share',
  'el-icon-refresh': 'Refresh',
  'el-icon-loading': 'Loading',
  'el-icon-box': 'Box',
  'el-icon-money': 'Money',
  'el-icon-coin': 'Coin',
  'el-icon-shopping-cart-2': 'ShoppingCart',
  'el-icon-shopping-bag-1': 'ShoppingBag',
  'el-icon-truck': 'Van',
  'el-icon-office-building': 'OfficeBuilding',
  'el-icon-school': 'School',
  'el-icon-house': 'House',
  'el-icon-goods': 'Goods',
  'el-icon-notebook-1': 'Notebook',
  'el-icon-notebook-2': 'Notebook',
  'el-icon-reading': 'Reading',
  'el-icon-data-line': 'DataLine',
  'el-icon-data-board': 'DataBoard',
  'el-icon-pie-chart': 'PieChart',
}

function toPascalCase(value: string) {
  return value
    .replace(/^el-icon-/, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function resolveEpIcon(name: string): Component | null {
  if (epIcons[name]) {
    return epIcons[name]
  }

  const alias = EL_ICON_ALIAS[name]
  if (alias && epIcons[alias]) {
    return epIcons[alias]
  }

  const pascal = toPascalCase(name)
  if (epIcons[pascal]) {
    return epIcons[pascal]
  }

  // el-icon-s-xxx → 去掉 S 前缀再试
  if (pascal.startsWith('S') && pascal.length > 1) {
    const withoutS = pascal.slice(1)
    if (epIcons[withoutS]) {
      return epIcons[withoutS]
    }
  }

  return null
}

export type ResolvedMenuIcon =
  | { type: 'ep'; component: Component }
  | { type: 'svg'; name: string }
  | null

export function resolveMenuIcon(name?: string | null): ResolvedMenuIcon {
  if (!name) {
    return null
  }

  const ep = resolveEpIcon(name)
  if (ep) {
    return { type: 'ep', component: ep }
  }

  // 旧版 svg-icon：dashboard / user / form ...
  const svgName = name.replace(/^el-icon-/, '')
  if (hasSvgIcon(name)) {
    return { type: 'svg', name }
  }
  if (hasSvgIcon(svgName)) {
    return { type: 'svg', name: svgName }
  }

  return null
}
