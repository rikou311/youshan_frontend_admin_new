import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuard } from './guard'
import { constantRoutes, rootLayoutRoute } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 404 必须在动态路由注册之后再 add，否则刷新深链会先命中 catch-all
  routes: [...constantRoutes, rootLayoutRoute],
})

setupRouterGuard(router)

export default router
