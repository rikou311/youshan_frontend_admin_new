import type { RouteRecordRaw } from 'vue-router'

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限', hidden: true },
  },
]

export const rootLayoutRoute: RouteRecordRaw = {
  path: '/',
  name: 'RootLayout',
  component: () => import('@/components/layout/AppLayout.vue'),
  redirect: '/dashboard',
  children: [
    {
      path: 'redirect/:path(.*)',
      name: 'Redirect',
      component: () => import('@/views/redirect/index.vue'),
      meta: { title: 'Redirect', hidden: true },
    },
    {
      path: 'dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
      meta: { title: '首页', icon: 'House', affix: true, keepAlive: true },
    },
    {
      path: 'profile/index',
      name: 'Profile',
      component: () => import('@/views/profile/index.vue'),
      meta: { title: '个人中心', hidden: true },
    },
    {
      path: 'tag/print/template/settings',
      name: 'TagTemplateSettings',
      component: () => import('@/views/tag/print/template/settings.vue'),
      meta: { title: '标签模板布局设置', hidden: true },
    },
    {
      path: 'tag/print/designer/index',
      name: 'TagPrintDesigner',
      component: () => import('@/views/tag/print/designer/index.vue'),
      meta: { title: '标签设计器', hidden: true },
    },
    {
      path: 'tag/print/editor/index',
      name: 'TagPrintEditor',
      component: () => import('@/views/tag/print/editor/index.vue'),
      meta: { title: '标签打印', hidden: true },
    },
    {
      path: 'tag/print/list/index',
      redirect: { path: '/inventory/tagManagement/tag/print', query: { tab: 'list' } },
    },
    {
      path: 'tag/template/index',
      name: 'TagTemplateIndex',
      component: () => import('@/views/tag/print/index.vue'),
      meta: { title: '标签打印系统', hidden: true },
    },
  ],
}

export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'NotFound',
  component: () => import('@/views/error/404.vue'),
  meta: { title: '页面不存在', hidden: true },
}
