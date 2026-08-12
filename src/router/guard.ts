import type { Router, RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useDictionaryStore } from '@/stores/dictionary'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import { notFoundRoute } from './routes'

const whiteList = ['/login', '/403', '/404']

export function setupRouterGuard(router: Router) {
  NProgress.configure({ showSpinner: false })

  router.beforeEach(async (to, _from, next) => {
    NProgress.start()
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()
    const dictionaryStore = useDictionaryStore()
    const title = to.meta.title ? `${to.meta.title} - 有善管理后台` : '有善管理后台'
    document.title = title

    if (userStore.isLoggedIn) {
      if (to.path === '/login') {
        next({ path: '/' })
        return
      }

      if (!userStore.userInfo) {
        try {
          await userStore.fetchUserInfo()
        } catch {
          userStore.clearAuth()
          NProgress.done()
          next({ path: '/login', query: { redirect: to.fullPath } })
          return
        }
      }

      if (!permissionStore.isRoutesLoaded) {
        try {
          await permissionStore.loadMenusAndRoutes(to.path)
          if (!dictionaryStore.loaded) {
            await dictionaryStore.loadDictionaries()
          }
          permissionStore.dynamicRoutes.forEach((route) => {
            router.addRoute('RootLayout', route as RouteRecordRaw)
          })
          // catch-all 放在动态路由之后，避免刷新时抢先匹配
          if (!router.hasRoute('NotFound')) {
            router.addRoute(notFoundRoute)
          }
          // 不要 next({ ...to })：首次可能已匹配到 NotFound，展开后会带上 name 导致仍 404
          next({ path: to.fullPath, replace: true })
        } catch {
          userStore.clearAuth()
          permissionStore.resetPermission()
          NProgress.done()
          next({ path: '/login', query: { redirect: to.fullPath } })
        }
        return
      }

      permissionStore.syncSystemByRoute(to.path)

      if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
        next({ path: '/403' })
        return
      }

      next()
      return
    }

    if (whiteList.includes(to.path)) {
      next()
      return
    }

    next({ path: '/login', query: { redirect: to.fullPath } })
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
