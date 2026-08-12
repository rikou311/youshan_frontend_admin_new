import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LocationQuery, RouteLocationNormalizedLoaded } from 'vue-router'

export interface TagView {
  path: string
  fullPath: string
  name?: string | symbol | null
  title: string
  query?: LocationQuery
  meta?: {
    title?: string
    affix?: boolean
    noCache?: boolean
    keepAlive?: boolean
    hidden?: boolean
  }
}

function toTagView(view: RouteLocationNormalizedLoaded | TagView): TagView {
  return {
    path: view.path,
    fullPath: view.fullPath,
    name: view.name,
    title: view.meta?.title || (view as TagView).title || 'no-name',
    query: view.query,
    meta: { ...view.meta },
  }
}

export const useTagsViewStore = defineStore('tagsView', () => {
  const visitedViews = ref<TagView[]>([])
  const cachedViews = ref<string[]>([])

  function addVisitedView(view: RouteLocationNormalizedLoaded | TagView) {
    if (visitedViews.value.some((item) => item.path === view.path)) {
      return
    }
    visitedViews.value.push(toTagView(view))
  }

  function addCachedView(view: RouteLocationNormalizedLoaded | TagView) {
    const name = view.name ? String(view.name) : ''
    if (!name || cachedViews.value.includes(name)) {
      return
    }
    if (view.meta?.noCache) {
      return
    }
    if (view.meta?.keepAlive || view.meta?.affix) {
      cachedViews.value.push(name)
      return
    }
    // 默认缓存已打开页签，贴近旧版 tagsView 行为
    cachedViews.value.push(name)
  }

  function addView(view: RouteLocationNormalizedLoaded | TagView) {
    addVisitedView(view)
    addCachedView(view)
  }

  function delVisitedView(view: TagView) {
    const index = visitedViews.value.findIndex((item) => item.path === view.path)
    if (index > -1) {
      visitedViews.value.splice(index, 1)
    }
  }

  function delCachedView(view: TagView) {
    const name = view.name ? String(view.name) : ''
    const index = cachedViews.value.indexOf(name)
    if (index > -1) {
      cachedViews.value.splice(index, 1)
    }
  }

  function delView(view: TagView) {
    delVisitedView(view)
    delCachedView(view)
    return {
      visitedViews: [...visitedViews.value],
      cachedViews: [...cachedViews.value],
    }
  }

  function delOthersViews(view: TagView) {
    visitedViews.value = visitedViews.value.filter(
      (item) => item.meta?.affix || item.path === view.path,
    )
    const name = view.name ? String(view.name) : ''
    cachedViews.value = name ? [name] : []
    return {
      visitedViews: [...visitedViews.value],
      cachedViews: [...cachedViews.value],
    }
  }

  function delAllViews() {
    visitedViews.value = visitedViews.value.filter((item) => item.meta?.affix)
    cachedViews.value = []
    return {
      visitedViews: [...visitedViews.value],
      cachedViews: [...cachedViews.value],
    }
  }

  function updateVisitedView(view: RouteLocationNormalizedLoaded | TagView) {
    const target = visitedViews.value.find((item) => item.path === view.path)
    if (target) {
      Object.assign(target, toTagView(view))
    }
  }

  function resetTagsView() {
    visitedViews.value = []
    cachedViews.value = []
  }

  return {
    visitedViews,
    cachedViews,
    addView,
    addVisitedView,
    addCachedView,
    delView,
    delVisitedView,
    delCachedView,
    delOthersViews,
    delAllViews,
    updateVisitedView,
    resetTagsView,
  }
})
