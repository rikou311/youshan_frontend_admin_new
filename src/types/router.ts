import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    permission?: string
    keepAlive?: boolean
    hidden?: boolean
    icon?: string
  }
}
